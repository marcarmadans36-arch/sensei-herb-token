// Crea el pool SENSEI/WETH en Uniswap V2 con la wallet de liquidez.
// Uso: npx hardhat run scripts/add-liquidity.js --network base
// Requiere: deployments/<red>.json (lo crea deploy.js), LP_TOKEN_AMOUNT y LP_ETH_AMOUNT en .env.
// La cuenta firmante (DEPLOYER_PRIVATE_KEY) debe ser LIQUIDITY_ADDRESS y tener los tokens y el ETH.
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { ethers, network } = require("hardhat");
const dex = require("../config/dex");
const { ROUTER_ABI, readPool, addLiquidity } = require("./lib/liquidity-core");
const AMM = require("../web/amm.js");

async function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) => rl.question(q, (a) => { rl.close(); r(a.trim()); }));
}

async function main() {
  if (["hardhat", "localhost"].includes(network.name)) throw new Error("Para pruebas locales usa scripts/demo-local.js o `npm test`.");
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(file)) throw new Error(`No existe ${file}. Despliega primero el token.`);
  const dep = JSON.parse(fs.readFileSync(file, "utf8"));
  const [signer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  if (chainId !== dep.chainId) throw new Error(`chainId ${chainId} no coincide con el registro (${dep.chainId})`);

  const routerAddr = process.env.UNISWAP_V2_ROUTER || dex[chainId]?.router;
  const factoryAddr = process.env.UNISWAP_V2_FACTORY || dex[chainId]?.factory;
  if (!routerAddr || !factoryAddr) throw new Error("Define UNISWAP_V2_ROUTER y UNISWAP_V2_FACTORY para esta red.");

  // Comprobaciones en cadena: el router es real y apunta al factory y al WETH esperados.
  for (const [n, a] of [["router", routerAddr], ["factory", factoryAddr]])
    if ((await ethers.provider.getCode(a)) === "0x") throw new Error(`No hay contrato en la dirección del ${n}: ${a}`);
  const router = new ethers.Contract(routerAddr, ROUTER_ABI, signer);
  const [rFactory, rWeth] = [await router.factory(), await router.WETH()];
  if (rFactory.toLowerCase() !== factoryAddr.toLowerCase()) throw new Error(`router.factory() = ${rFactory}, se esperaba ${factoryAddr}`);
  if (rWeth.toLowerCase() !== dex.WETH.toLowerCase()) throw new Error(`router.WETH() = ${rWeth}, se esperaba ${dex.WETH}`);

  const token = await ethers.getContractAt("SenseiHerbToken", dep.token.address, signer);
  const tokenAmount = ethers.parseUnits(process.env.LP_TOKEN_AMOUNT || "", 18);
  const ethAmount = ethers.parseEther(process.env.LP_ETH_AMOUNT || "");
  const slippageBps = BigInt(process.env.LP_SLIPPAGE_BPS || "100");
  const lpRecipient = ethers.getAddress(process.env.LP_RECIPIENT || signer.address);

  const existing = await readPool(ethers.provider, factoryAddr, dep.token.address, dex.WETH);
  if (existing && existing.lpSupply > 0n) throw new Error(`El par ya existe con liquidez (${existing.pair}). El precio lo fija el pool; no se añade liquidez automáticamente.`);

  const tokBal = await token.balanceOf(signer.address);
  const ethBal = await ethers.provider.getBalance(signer.address);
  if (tokBal < tokenAmount) throw new Error(`Saldo de tokens insuficiente: ${ethers.formatUnits(tokBal, 18)}`);
  const fee = await ethers.provider.getFeeData();
  const gasReserve = 400_000n * (fee.maxFeePerGas ?? fee.gasPrice);
  if (ethBal < ethAmount + gasReserve) throw new Error(`ETH insuficiente: ${ethers.formatEther(ethBal)} (necesario ≈ ${ethers.formatEther(ethAmount + gasReserve)})`);

  const tok = Number(ethers.formatUnits(tokenAmount, 18));
  const eth = Number(ethers.formatEther(ethAmount));
  console.log("\n=== CREACIÓN DE POOL — Uniswap V2 ===");
  console.log(`Red:              ${network.name} (chainId ${chainId})`);
  console.log(`Firmante:         ${signer.address}`);
  console.log(`Router:           ${routerAddr} (factory y WETH comprobados en cadena)`);
  console.log(`Token:            ${dep.token.address}`);
  console.log(`Aporte:           ${tok.toLocaleString("es-ES")} SENSEI + ${eth} ETH`);
  console.log(`Precio inicial:   ${(eth / tok).toExponential(4)} ETH por SENSEI`);
  console.log(`Tokens LP para:   ${lpRecipient}`);
  console.log(`Slippage máximo:  ${Number(slippageBps) / 100}%`);
  console.log("\nTransacciones que se firmarán:");
  console.log(`  1) approve(${routerAddr}, ${tok} SENSEI) — permiso EXACTO al router; se consume entero en el paso 2.`);
  console.log(`  2) addLiquidityETH(...) con ${eth} ETH — crea el par y entrega tokens LP a ${lpRecipient}.`);
  console.log("\nImpacto de ventas sobre este pool (antes de comisiones de red):");
  const supply = Number(ethers.formatUnits(dep.token.maxSupply, 18));
  for (const p of [0.001, 0.01, 0.05]) {
    const s = AMM.simulateSell(supply * p, tok, eth);
    console.log(`  vender ${(p * 100).toString().padStart(4)}% del suministro → recibe ${s.received.toFixed(6)} ETH, impacto ${(s.priceImpact * 100).toFixed(1)}%`);
  }
  console.log("\nEl ETH y los tokens aportados quedan en el pool. Cualquiera puede comprar o vender contra él;");
  console.log("quien tenga los tokens LP puede retirar la liquidez. Nada de esto garantiza precio ni demanda.");

  if (process.env.DRY_RUN === "true") return console.log("\nDRY_RUN=true: no se envía nada.");
  const expected = `CREAR POOL ${chainId}`;
  if ((await ask(`\nEscribe exactamente "${expected}" para firmar: `)) !== expected) return console.log("Cancelado.");

  const res = await addLiquidity({ token, routerAddr, signer, tokenAmount, ethAmount, slippageBps, to: lpRecipient });
  const pool = await readPool(ethers.provider, factoryAddr, dep.token.address, dex.WETH);
  if (!pool) throw new Error("El par no aparece tras la transacción. Revisa el explorador antes de reintentar.");
  console.log(`\n✅ Pool verificado en cadena: ${pool.pair}`);
  console.log(`   Reservas: ${ethers.formatUnits(pool.tokenReserve, 18)} SENSEI / ${ethers.formatEther(pool.ethReserve)} WETH`);
  dep.liquidity = { dex: dex[chainId]?.name || "Uniswap V2", router: routerAddr, factory: factoryAddr, pair: pool.pair, lpRecipient, ...res, verifiedAt: new Date().toISOString() };
  const json = JSON.stringify(dep, null, 2) + "\n";
  fs.writeFileSync(file, json);
  fs.writeFileSync(path.join(__dirname, "..", "web", "data", `${network.name}.json`), json);
}

main().catch((e) => { console.error(e.message || e); process.exitCode = 1; });
