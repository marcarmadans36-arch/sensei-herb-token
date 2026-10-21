// ¿Cuánto recibiría el fundador al vender? Simulación sin transacciones.
//
// Reservas hipotéticas (por defecto, sin red):
//   node scripts/founder-sell-simulation.js
//   POOL_TOKENS=15000000 POOL_USD=80 node scripts/founder-sell-simulation.js
// Reservas REALES del pool registrado en deployments/<red>.json (solo lectura):
//   ETH_USD=<precio> npx hardhat run scripts/founder-sell-simulation.js --network base
//
// Descuenta: impacto de precio (x·y=k), comisión del pool 0,30 % y gas estimado (GAS_USD, por defecto 0,10 USD
// por venta). Supone que nadie más opera entre medias. Vender en varias partes no mejora el resultado en un
// pool x·y=k sin otras operaciones; solo añade gas.
const fs = require("fs");
const path = require("path");
const AMM = require("../web/amm.js");

const FOUNDER_TOKENS = 30_000_000;
const SELLS = [100_000, 1_000_000, 3_000_000, 5_000_000, 10_000_000, 30_000_000];
const GAS_USD = Number(process.env.GAS_USD ?? "0.10");
const n = (x, d = 2) => x.toLocaleString("es-ES", { maximumFractionDigits: d, minimumFractionDigits: d });

function table(label, poolTokens, poolQuote, unit, gas) {
  const spot = poolQuote / poolTokens;
  console.log(`\n### ${label}`);
  console.log(`Reservas: ${n(poolTokens, 0)} SENSEI / ${n(poolQuote, unit === "USD" ? 2 : 6)} ${unit} · precio mostrado ${spot.toExponential(3)} ${unit}/SENSEI`);
  console.log(`"Valor" de los 30 M del fundador a precio mostrado: ${n(FOUNDER_TOKENS * spot, unit === "USD" ? 2 : 6)} ${unit} (no realizable)\n`);
  console.log(`| Vende | % de su asignación | Valor a precio mostrado | Comisión pool 0,30 % | Pérdida por impacto | Gas | **Recibe neto** | Precio medio | Precio tras la venta |`);
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const t of SELLS) {
    const s = AMM.simulateSell(t, poolTokens, poolQuote);
    const noFee = (t * poolQuote) / (poolTokens + t); // misma venta sin comisión
    const fee = noFee - s.received;
    const impact = s.valueAtSpot - noFee;
    const net = Math.max(0, s.received - gas);
    const d = unit === "USD" ? 2 : 6;
    console.log(`| ${n(t, 0)} | ${n((t / FOUNDER_TOKENS) * 100, 1)} % | ${n(s.valueAtSpot, d)} ${unit} | ${n(fee, d)} | ${n(impact, d)} | ${n(gas, d)} | **${n(net, d)} ${unit}** | ${s.avgPrice.toExponential(3)} | ${s.spotAfter.toExponential(3)} (−${n(s.priceImpact * 100, 1)} %) |`);
  }
  const all = AMM.simulateSell(FOUNDER_TOKENS, poolTokens, poolQuote);
  console.log(`\nVender los 30 M deja en el pool ${n(poolQuote - all.received, unit === "USD" ? 2 : 6)} ${unit}: el fundador se llevaría el ${n((all.received / poolQuote) * 100, 1)} % de todo el ${unit} del pool.`);
}

async function realPool() {
  const hre = require("hardhat");
  const { ethers, network } = hre;
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(file)) throw new Error(`No existe ${file}: no hay despliegue registrado en ${network.name}.`);
  const dep = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!dep.liquidity?.pair) throw new Error(`El despliegue de ${network.name} no tiene pool registrado.`);
  const { readPool, ROUTER_ABI } = require("./lib/liquidity-core");
  const weth = await new ethers.Contract(dep.liquidity.router, ROUTER_ABI, ethers.provider).WETH();
  const pool = await readPool(ethers.provider, dep.liquidity.factory, dep.token.address, weth);
  if (!pool) throw new Error("El par no existe en cadena.");
  const tok = Number(ethers.formatUnits(pool.tokenReserve, 18));
  const eth = Number(ethers.formatEther(pool.ethReserve));
  const block = await ethers.provider.getBlockNumber();
  const ethUsd = Number(process.env.ETH_USD || "0");
  if (ethUsd > 0) table(`Pool REAL ${dep.liquidity.pair} en ${network.name}, bloque ${block} (ETH_USD=${ethUsd})`, tok, eth * ethUsd, "USD", GAS_USD);
  else table(`Pool REAL ${dep.liquidity.pair} en ${network.name}, bloque ${block} (define ETH_USD para ver USD)`, tok, eth, "ETH", 0);
}

async function main() {
  const net = process.env.HARDHAT_NETWORK;
  if (net && net !== "hardhat") return realPool();
  console.log("Reservas HIPOTÉTICAS (no hay pool real). Gas supuesto por venta:", GAS_USD, "USD");
  const custom = process.env.POOL_USD && process.env.POOL_TOKENS;
  const pools = custom ? [{ tokens: Number(process.env.POOL_TOKENS), usd: Number(process.env.POOL_USD) }]
    : [{ tokens: 15_000_000, usd: 50 }, { tokens: 15_000_000, usd: 80 }, { tokens: 15_000_000, usd: 150 }];
  for (const p of pools) table(`Pool hipotético: ${n(p.tokens, 0)} SENSEI + ${p.usd} USD en ETH`, p.tokens, p.usd, "USD", GAS_USD);
}

main().catch((e) => { console.error(e.message || e); process.exitCode = 1; });
