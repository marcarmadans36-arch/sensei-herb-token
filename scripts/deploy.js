// Uso:
//   npx hardhat run scripts/deploy.js --network hardhat      (simulación local, sin coste)
//   npx hardhat run scripts/deploy.js --network baseSepolia  (red de pruebas, pide confirmación)
//   npx hardhat run scripts/deploy.js --network base         (red principal, pide confirmación)
// Variables: ver .env.example. DRY_RUN=true solo muestra el plan y la estimación.
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const hre = require("hardhat");
const { ethers, network } = hre;
const { loadTokenomics } = require("../config/tokenomics");
const { deploySenseiHerb, verifyDistribution } = require("./lib/deploy-core");
const { estimateDeployment } = require("./lib/estimate");

const LOCAL = ["hardhat", "localhost"];
const EXPLORERS = { 8453: "https://basescan.org", 84532: "https://sepolia.basescan.org" };

const fmt = (wei) => ethers.formatUnits(wei, 18);

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

async function main() {
  const isLocal = LOCAL.includes(network.name);
  const recordFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!isLocal && fs.existsSync(recordFile) && process.env.FORCE_REDEPLOY !== "true")
    throw new Error(`Ya existe ${path.relative(process.cwd(), recordFile)}: este token ya está desplegado en ${network.name}. ` +
      "Un segundo despliegue crearía OTRO token distinto. Si es intencionado, mueve ese archivo o usa FORCE_REDEPLOY=true.");
  const signers = await ethers.getSigners();
  if (signers.length === 0) throw new Error("No hay cuenta de despliegue. Define DEPLOYER_PRIVATE_KEY en .env (nunca en el chat ni en git).");
  const deployer = signers[0];

  // En redes locales se usan cuentas de prueba de Hardhat si no hay direcciones en .env.
  const defaults = isLocal
    ? { founder: signers[1].address, community: signers[2].address, treasury: signers[3].address, liquidity: signers[4].address }
    : {};
  const cfg = loadTokenomics(defaults);

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const latest = await ethers.provider.getBlock("latest");
  const start = cfg.vestingStart ?? BigInt(latest.timestamp + 600); // 10 min de margen
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("\n=== PLAN DE DESPLIEGUE — Sensei Herb Token ===");
  console.log(`Red:            ${network.name} (chainId ${chainId})${isLocal ? "  [LOCAL / DEMO]" : ""}`);
  console.log(`Desplegador:    ${deployer.address}`);
  console.log(`Saldo:          ${fmt(balance)} ETH`);
  console.log(`Token:          ${cfg.name} (${cfg.symbol}), 18 decimales`);
  console.log(`Suministro:     ${cfg.maxSupplyTokens.toLocaleString("es-ES")} (fijo, sin mint posterior)`);
  console.log(`Inicio vesting (tesorería): ${start} (${new Date(Number(start) * 1000).toISOString()})\n`);
  for (const c of cfg.categories) {
    const sched = c.vesting
      ? `vesting ${c.vestingMonths} meses, cliff ${c.cliffMonths} → contrato SenseiVesting (beneficiario ${c.address})`
      : `directo a ${c.address}`;
    console.log(`  ${c.label.padEnd(24)} ${(Number(c.bps) / 100).toFixed(2).padStart(6)}%  ${fmt(c.amount).padStart(14)}  ${sched}`);
  }

  // El fundador recibe tokens libres. Si su dirección es un contrato (Safe u otro), ese contrato
  // decide cómo se mueven: se avisa para descartar un bloqueo indirecto no deseado.
  const founder = cfg.categories.find((c) => c.key === "founder");
  if ((await ethers.provider.getCode(founder.address)) !== "0x")
    console.log(`\n⚠️  FOUNDER_ADDRESS ${founder.address} es un contrato. Comprueba que lo controlas y que no impone bloqueos.`);
  else console.log(`\nFundador: ${founder.address} es una cartera normal (EOA). Sus tokens serán transferibles desde el primer bloque.`);

  // Estimación de gas de cada transacción de despliegue.
  const est = await estimateDeployment(cfg, deployer, start, chainId);
  console.log("\nTransacciones (crean contratos; no conceden aprobaciones ni permisos a nadie):");
  for (const t of est.txs) console.log(`  - ${t.label.padEnd(28)} gas ≈ ${t.gas.toString().padStart(9)}  datos ${t.bytes} bytes`);
  console.log(`\nPrecio de gas (máx.): ${ethers.formatUnits(est.gasPrice, "gwei")} gwei`);
  console.log(`Coste L2 estimado:    ${ethers.formatEther(est.l2Cost)} ETH`);
  if (est.l1Fee > 0n) console.log(`Comisión datos L1:    ${ethers.formatEther(est.l1Fee)} ETH`);
  console.log(`TOTAL estimado:       ${ethers.formatEther(est.total)} ETH (máximo; el coste real suele ser menor)`);
  if (balance < est.total) console.log("⚠️  El saldo del desplegador es insuficiente para el máximo estimado.");

  console.log("\nPermisos tras el despliegue:");
  console.log("  - El token NO tiene owner, mint, pausa, lista negra ni impuestos. El desplegador no conserva privilegios.");
  console.log("  - Los tokens del fundador llegan directamente a su cartera, sin contrato intermedio ni bloqueo.");
  console.log("  - El SenseiVesting de tesorería tiene como owner a su beneficiario: solo puede llamar release() según el calendario");
  console.log("    o transferir la titularidad. Nadie puede adelantar el desbloqueo.");

  if (process.env.DRY_RUN === "true") { console.log("\nDRY_RUN=true: no se envía ninguna transacción."); return; }

  if (!isLocal) {
    const expected = `DESPLEGAR ${chainId}`;
    console.log("\nEsta operación es IRREVERSIBLE y gasta fondos reales de la cuenta del desplegador.");
    const answer = await ask(`Revisa red, direcciones y coste. Escribe exactamente "${expected}" para continuar: `);
    if (answer !== expected) { console.log("Cancelado. No se ha enviado ninguna transacción."); return; }
  }

  const { token, vestings, recipients, txs } = await deploySenseiHerb(cfg, deployer, start);
  const tokenAddress = await token.getAddress();
  const receipt = await ethers.provider.getTransactionReceipt(txs.token);
  const problems = await verifyDistribution(cfg, token, recipients);

  console.log(`\nSenseiHerbToken: ${tokenAddress}  (bloque ${receipt.blockNumber})`);
  for (const [k, v] of Object.entries(vestings)) console.log(`SenseiVesting ${k}: ${await v.getAddress()}`);
  if (problems.length) { console.error("❌ La verificación en cadena ha fallado:\n  " + problems.join("\n  ")); process.exitCode = 1; }
  else console.log("✅ Verificación en cadena: suministro y asignaciones correctos.");

  const record = {
    demo: isLocal,
    network: network.name,
    chainId,
    explorer: EXPLORERS[chainId] ?? null,
    deployedAt: new Date().toISOString(),
    blockNumber: receipt.blockNumber,
    deployer: deployer.address,
    token: { address: tokenAddress, name: cfg.name, symbol: cfg.symbol, decimals: 18, maxSupply: cfg.maxSupply.toString() },
    vestingStart: Number(start),
    allocations: await Promise.all(cfg.categories.map(async (c, i) => ({
      key: c.key, label: c.label, bps: Number(c.bps), amount: c.amount.toString(),
      holder: recipients[i], beneficiary: c.address,
      vesting: c.vesting ? { contract: await vestings[c.key].getAddress(), cliffMonths: Number(c.cliffMonths), durationMonths: Number(c.vestingMonths) } : null,
    }))),
    transactions: txs,
    liquidity: null,
  };
  fs.writeFileSync(recordFile, JSON.stringify(record, null, 2) + "\n");
  console.log(`Registro guardado en deployments/${network.name}.json`);
  if (!isLocal) {
    fs.writeFileSync(path.join(__dirname, "..", "web", "data", `${network.name}.json`), JSON.stringify(record, null, 2) + "\n");
    console.log(`Copia pública para la web: web/data/${network.name}.json`);
  }
  if (!isLocal) console.log(`\nSiguiente paso: npx hardhat run scripts/verify.js --network ${network.name}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
