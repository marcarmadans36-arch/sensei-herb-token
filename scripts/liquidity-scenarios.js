// Escenarios teóricos de un pool x·y=k (Uniswap V2, 0,30 %). Sin red, sin transacciones.
// Uso: ETH_USD=<precio actual> node scripts/liquidity-scenarios.js  (los importes se expresan en USD)
const AMM = require("../web/amm.js");
const SUPPLY = 100_000_000;

const pools = [
  { usd: 50, tokens: 15_000_000 },
  { usd: 80, tokens: 15_000_000 },
  { usd: 150, tokens: 15_000_000 },
  { usd: 80, tokens: 5_000_000 },
];
const sells = [10_000, 100_000, 1_000_000, 5_000_000];
const buys = [10, 50];
const n = (x, d = 2) => x.toLocaleString("es-ES", { maximumFractionDigits: d, minimumFractionDigits: d });
const sci = (x) => x.toExponential(3).replace("e", "·10^");

for (const p of pools) {
  const price = p.usd / p.tokens;
  console.log(`\n### Pool: ${n(p.tokens, 0)} SENSEI + ${p.usd} USD en ETH`);
  console.log(`Precio inicial: ${sci(price)} USD/SENSEI · Valor total del pool: ${2 * p.usd} USD · FDV teórica: ${n(price * SUPPLY)} USD · Cap. circulante (solo tokens del pool): ${n(price * p.tokens)} USD\n`);
  console.log("| Operación | Recibe | Valor a precio mostrado | Precio medio | Slippage | Impacto en precio |");
  console.log("|---|---|---|---|---|---|");
  for (const b of buys) {
    const s = AMM.simulateBuy(b, p.tokens, p.usd);
    console.log(`| Compra ${b} USD | ${n(s.received, 0)} SENSEI | ${n(b / price, 0)} SENSEI | ${sci(s.avgPrice)} | ${n(s.slippage * 100)} % | +${n(s.priceImpact * 100)} % |`);
  }
  for (const t of sells) {
    const s = AMM.simulateSell(t, p.tokens, p.usd);
    console.log(`| Venta ${n(t, 0)} SENSEI | ${n(s.received)} USD | ${n(s.valueAtSpot)} USD | ${sci(s.avgPrice)} | ${n(s.slippage * 100)} % | −${n(s.priceImpact * 100)} % |`);
  }
}
const s = AMM.simulateSell(30_000_000, 15_000_000, 80);
console.log(`\nReferencia: los 30.000.000 SENSEI del fundador "valen" ${n(30_000_000 * 80 / 15_000_000)} USD al precio mostrado de un pool de 80 USD, pero venderlos todos devolvería como mucho ${n(s.received)} USD (el pool solo contiene 80 USD).`);
