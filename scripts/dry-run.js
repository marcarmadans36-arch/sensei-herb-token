// Ejecuta otro script con DRY_RUN=true sin depender de la sintaxis de la shell
// (PowerShell, cmd y bash usan formas distintas de definir variables de entorno).
// Uso: npx hardhat run scripts/dry-run.js --network <red>   con DRY_TARGET=deploy|liquidity (por defecto deploy)
process.env.DRY_RUN = "true";
const target = { deploy: "./deploy.js", liquidity: "./add-liquidity.js" }[process.env.DRY_TARGET || "deploy"];
require(target);
