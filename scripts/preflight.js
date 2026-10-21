// Comprobación previa al despliegue. SOLO LECTURA: no firma ni envía ninguna transacción.
// Uso: npx hardhat run scripts/preflight.js --network baseSepolia   (o: npm run preflight:sepolia)
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const hre = require("hardhat");
const { ethers, network } = hre;
const { loadTokenomics } = require("../config/tokenomics");
const { estimateDeployment } = require("./lib/estimate");

const EXPECTED_CHAIN = { baseSepolia: 84532, base: 8453 };
const root = path.join(__dirname, "..");
const results = [];
const ok = (m) => results.push(["OK", m]);
const warn = (m) => results.push(["AVISO", m]);
const fail = (m) => results.push(["FALLO", m]);

function gitCheck() {
  const envFile = path.join(root, ".env");
  if (!fs.existsSync(envFile)) return fail(".env no existe. Ejecuta `cp .env.example .env` o `npm run wallet:new`.");
  try {
    execSync("git check-ignore -q .env", { cwd: root });
    ok(".env existe y git lo ignora");
  } catch { fail(".env NO está ignorado por git. Revisa .gitignore antes de continuar."); }
  try {
    const tracked = execSync("git ls-files .env", { cwd: root, encoding: "utf8" }).trim();
    if (tracked) fail(".env está versionado en git: elimínalo del índice (git rm --cached .env) y rota la clave.");
  } catch { /* fuera de un repositorio git */ }
}

async function main() {
  console.log(`\n=== PREFLIGHT (solo lectura) — red ${network.name} ===\n`);
  gitCheck();

  const expected = EXPECTED_CHAIN[network.name];
  if (!expected) warn(`La red ${network.name} no es baseSepolia ni base: comprobación limitada.`);

  let chainId;
  try {
    chainId = Number((await ethers.provider.getNetwork()).chainId);
    const block = await ethers.provider.getBlockNumber();
    if (expected && chainId !== expected) fail(`El RPC responde con chainId ${chainId}, se esperaba ${expected}. Revisa BASE_SEPOLIA_RPC_URL / BASE_RPC_URL.`);
    else ok(`RPC accesible: chainId ${chainId}, bloque ${block}`);
  } catch (e) {
    fail(`No se puede conectar al RPC de ${network.name}: ${e.shortMessage || e.message}`);
    return report();
  }

  const signers = await ethers.getSigners();
  if (signers.length === 0) { fail("Falta DEPLOYER_PRIVATE_KEY en .env (usa `npm run wallet:new`)."); return report(); }
  const deployer = signers[0];
  const balance = await ethers.provider.getBalance(deployer.address);
  const nonce = await ethers.provider.getTransactionCount(deployer.address);
  ok(`Desplegador ${deployer.address} · saldo ${ethers.formatEther(balance)} ETH · nonce ${nonce}`);

  let cfg;
  try { cfg = loadTokenomics(); ok(`Tokenomics válida: ${cfg.name} (${cfg.symbol}), ${cfg.maxSupplyTokens} tokens, porcentajes suman 100 %`); }
  catch (e) { fail(`Configuración: ${e.message}`); return report(); }

  const byAddr = {};
  for (const c of cfg.categories) (byAddr[c.address] ||= []).push(c.key);
  for (const [a, keys] of Object.entries(byAddr)) if (keys.length > 1) warn(`${keys.join(" y ")} usan la misma dirección ${a}: sus saldos no se podrán distinguir en la web.`);

  for (const c of cfg.categories) {
    const code = await ethers.provider.getCode(c.address);
    const isDeployer = c.address === deployer.address;
    if (c.key === "founder") {
      if (code !== "0x") warn(`FOUNDER_ADDRESS ${c.address} es un contrato en esta red: confirma que no impone bloqueos sobre los 30 M.`);
      else ok(`Fundador ${c.address}: cartera normal (EOA); recibirá 30 M libres desde el primer bloque`);
      if (isDeployer) warn("FOUNDER_ADDRESS es la cartera de despliegue (clave en .env). Aceptable en testnet; en mainnet usa una cartera hardware.");
    } else if (c.key === "liquidity") {
      if (isDeployer) ok(`Liquidez ${c.address}: es la cartera de despliegue (podrá firmar la creación del pool)`);
      else warn(`LIQUIDITY_ADDRESS ${c.address} no es la cartera de despliegue: para crear el pool tendrá que firmar esa otra cartera.`);
    } else {
      if (code === "0x") warn(`${c.key.toUpperCase()}_ADDRESS ${c.address} no tiene código en ${network.name}. Si es un Safe de otra red, no existe aquí; si es una cartera normal, ignora este aviso.`);
      else ok(`${c.key} ${c.address}: contrato presente (p. ej. Safe)`);
    }
  }

  const recordFile = path.join(root, "deployments", `${network.name}.json`);
  if (fs.existsSync(recordFile)) fail(`Ya existe deployments/${network.name}.json: el token ya está desplegado en esta red.`);
  else ok(`No hay despliegue previo registrado en ${network.name}`);

  const latest = await ethers.provider.getBlock("latest");
  const start = cfg.vestingStart ?? BigInt(latest.timestamp + 600);
  try {
    const est = await estimateDeployment(cfg, deployer, start, chainId);
    const needed = (est.total * 15n) / 10n; // margen del 50 % por variación del gas
    const line = `Coste estimado ${ethers.formatEther(est.total)} ETH (gas ${est.totalGas}, ${ethers.formatUnits(est.gasPrice, "gwei")} gwei` +
      `${est.l1Fee > 0n ? `, L1 ${ethers.formatEther(est.l1Fee)} ETH` : ""}); recomendado con margen ${ethers.formatEther(needed)} ETH`;
    if (balance >= needed) ok(line);
    else if (balance >= est.total) warn(line + " — saldo justo");
    else fail(line + ` — saldo insuficiente (${ethers.formatEther(balance)} ETH)`);
  } catch (e) { fail(`No se pudo estimar el gas: ${e.shortMessage || e.message}`); }

  if (process.env.ETHERSCAN_API_KEY) ok("ETHERSCAN_API_KEY definida (verificación en Basescan con Etherscan API V2)");
  else warn("Falta ETHERSCAN_API_KEY: el despliegue funciona, pero no podrás verificar el código en Basescan (Sourcify sí).");

  if (process.env.DRY_RUN === "true") warn("DRY_RUN=true en .env: deploy.js solo mostrará el plan. Quítalo para desplegar.");
  report();
}

function report() {
  console.log(results.map(([k, m]) => `${{ OK: "✔", AVISO: "!", FALLO: "✖" }[k]} [${k}] ${m}`).join("\n"));
  const fails = results.filter(([k]) => k === "FALLO").length;
  const warns = results.filter(([k]) => k === "AVISO").length;
  console.log(`\nResultado: ${fails ? "NO LISTO" : "LISTO"} — ${fails} fallos, ${warns} avisos. No se ha enviado ninguna transacción.`);
  if (!fails) console.log(`Siguiente: DRY_RUN=true npm run deploy:${network.name === "base" ? "base" : "sepolia"}  y después sin DRY_RUN.`);
  if (fails) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
