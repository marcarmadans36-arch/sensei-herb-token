// Crea una cartera DESECHABLE para desplegar y guarda su clave privada directamente en .env.
// La clave no se imprime: solo se muestra la dirección pública para recargarla desde un faucet.
// Uso: npm run wallet:new
const fs = require("fs");
const path = require("path");
const { Wallet } = require("ethers");

const root = path.join(__dirname, "..");
const envFile = path.join(root, ".env");
const example = path.join(root, ".env.example");

if (!fs.existsSync(envFile)) {
  fs.copyFileSync(example, envFile);
  console.log("Creado .env a partir de .env.example");
}
let env = fs.readFileSync(envFile, "utf8");
const current = env.match(/^DEPLOYER_PRIVATE_KEY=(.*)$/m);
if (current && current[1].trim() !== "") {
  console.error("✖ .env ya tiene DEPLOYER_PRIVATE_KEY. No se sobrescribe para no perder acceso a esa cartera.");
  process.exit(1);
}

const w = Wallet.createRandom();
env = current ? env.replace(/^DEPLOYER_PRIVATE_KEY=.*$/m, `DEPLOYER_PRIVATE_KEY=${w.privateKey}`) : env + `\nDEPLOYER_PRIVATE_KEY=${w.privateKey}\n`;
// La cartera de despliegue también firma la creación del pool: se usa como LIQUIDITY_ADDRESS si está vacío.
if (/^LIQUIDITY_ADDRESS=\s*$/m.test(env)) env = env.replace(/^LIQUIDITY_ADDRESS=\s*$/m, `LIQUIDITY_ADDRESS=${w.address}`);
fs.writeFileSync(envFile, env, { mode: 0o600 });
fs.chmodSync(envFile, 0o600);

console.log(`✔ Cartera de despliegue creada: ${w.address}`);
console.log("  La clave privada se ha guardado SOLO en .env (permisos 600, ignorado por git). No la compartas.");
console.log("  Si LIQUIDITY_ADDRESS estaba vacío, ahora es esta misma dirección.");
console.log("  Siguiente paso: envía ETH de Base Sepolia (faucet) a esa dirección y ejecuta `npm run preflight:sepolia`.");
