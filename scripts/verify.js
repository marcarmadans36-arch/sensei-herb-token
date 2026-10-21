// Verifica el código fuente en Basescan (Etherscan API V2) y Sourcify.
// Uso: npx hardhat run scripts/verify.js --network baseSepolia|base   (requiere ETHERSCAN_API_KEY)
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", `${hre.network.name}.json`), "utf8"));
  const jobs = [];
  for (const a of dep.allocations.filter((a) => a.vesting)) {
    const months = (m) => BigInt(m) * 30n * 86400n;
    jobs.push({ address: a.vesting.contract, contract: "contracts/SenseiVesting.sol:SenseiVesting",
      constructorArguments: [a.beneficiary, dep.vestingStart, months(a.vesting.durationMonths), months(a.vesting.cliffMonths)] });
  }
  jobs.push({ address: dep.token.address, contract: "contracts/SenseiHerbToken.sol:SenseiHerbToken",
    constructorArguments: [dep.token.name, dep.token.symbol, dep.token.maxSupply, dep.allocations.map((a) => a.label), dep.allocations.map((a) => a.holder), dep.allocations.map((a) => a.amount)] });
  for (const j of jobs) {
    console.log(`Verificando ${j.contract} en ${j.address}…`);
    try { await hre.run("verify:verify", j); } catch (e) { console.log(`  ${e.message}`); }
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
