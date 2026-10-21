// Parámetros de tokenomics. Todos se pueden cambiar en .env antes del despliegue.
// Después del despliegue el suministro y la distribución inicial son inmutables.
const { ethers } = require("ethers");

const MONTH = 30 * 24 * 60 * 60; // 1 mes = 30 días (convención documentada en TOKENOMICS.md)
const DECIMALS = 18n;

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function int(name, fallback) {
  const raw = env(name, String(fallback));
  if (!/^\d+$/.test(raw)) throw new Error(`${name} debe ser un entero no negativo (valor: "${raw}")`);
  return BigInt(raw);
}

/**
 * Devuelve la configuración validada.
 * @param {Record<string,string>} defaults direcciones por defecto (solo para redes locales)
 */
function loadTokenomics(defaults = {}) {
  const name = env("TOKEN_NAME", "Sensei Herb");
  const symbol = env("TOKEN_SYMBOL", "SENSEI");
  const maxSupplyTokens = int("MAX_SUPPLY", 100_000_000);
  if (maxSupplyTokens === 0n) throw new Error("MAX_SUPPLY no puede ser 0");
  const maxSupply = maxSupplyTokens * 10n ** DECIMALS;

  const categories = [
    { key: "founder", label: "Fundador", bps: int("FOUNDER_BPS", 3000), address: env("FOUNDER_ADDRESS", defaults.founder),
      cliffMonths: int("FOUNDER_CLIFF_MONTHS", 12), vestingMonths: int("FOUNDER_VESTING_MONTHS", 48) },
    { key: "community", label: "Comunidad", bps: int("COMMUNITY_BPS", 3000), address: env("COMMUNITY_ADDRESS", defaults.community),
      cliffMonths: 0n, vestingMonths: 0n },
    { key: "treasury", label: "Tesorería y desarrollo", bps: int("TREASURY_BPS", 2500), address: env("TREASURY_ADDRESS", defaults.treasury),
      cliffMonths: int("TREASURY_CLIFF_MONTHS", 0), vestingMonths: int("TREASURY_VESTING_MONTHS", 24) },
    { key: "liquidity", label: "Liquidez y distribución", bps: int("LIQUIDITY_BPS", 1500), address: env("LIQUIDITY_ADDRESS", defaults.liquidity),
      cliffMonths: 0n, vestingMonths: 0n },
  ];

  const totalBps = categories.reduce((s, c) => s + c.bps, 0n);
  if (totalBps !== 10000n) throw new Error(`Los porcentajes suman ${Number(totalBps) / 100}% y deben sumar 100%`);

  for (const c of categories) {
    if (!c.address) throw new Error(`Falta ${c.key.toUpperCase()}_ADDRESS en .env`);
    if (!ethers.isAddress(c.address)) throw new Error(`${c.key.toUpperCase()}_ADDRESS no es una dirección válida: ${c.address}`);
    if (c.address === ethers.ZeroAddress) throw new Error(`${c.key.toUpperCase()}_ADDRESS no puede ser la dirección cero`);
    c.address = ethers.getAddress(c.address);
    if (c.bps === 0n) throw new Error(`${c.key.toUpperCase()}_BPS no puede ser 0`);
    if (c.vestingMonths > 0n && c.cliffMonths > c.vestingMonths)
      throw new Error(`${c.key}: el cliff (${c.cliffMonths}) no puede superar la duración (${c.vestingMonths})`);
    if (c.vestingMonths === 0n && c.cliffMonths > 0n)
      throw new Error(`${c.key}: hay cliff sin periodo de vesting`);
    c.amount = (maxSupply * c.bps) / 10000n;
    c.vesting = c.vestingMonths > 0n;
    c.cliffSeconds = c.cliffMonths * BigInt(MONTH);
    c.durationSeconds = c.vestingMonths * BigInt(MONTH);
  }
  // El redondeo por bps nunca debe perder unidades: el resto va a la última categoría.
  const assigned = categories.reduce((s, c) => s + c.amount, 0n);
  categories[categories.length - 1].amount += maxSupply - assigned;

  const startRaw = env("VESTING_START", "");
  const vestingStart = startRaw === "" ? null : BigInt(startRaw);

  return { name, symbol, maxSupplyTokens, maxSupply, decimals: DECIMALS, categories, vestingStart };
}

module.exports = { loadTokenomics, MONTH };
