// Demo completa en la red local de Hardhat (sin coste, sin fondos reales):
// despliega vesting + token, despliega Uniswap V2 local, crea el pool y escribe web/data/demo.json.
// Uso: npx hardhat run scripts/demo-local.js
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");
const { loadTokenomics } = require("../config/tokenomics");
const { deploySenseiHerb, verifyDistribution } = require("./lib/deploy-core");
const { deployLocalUniswap } = require("./lib/uniswap-local");
const { addLiquidity, readPool } = require("./lib/liquidity-core");

async function main() {
  if (network.name !== "hardhat") throw new Error("demo-local.js solo se ejecuta en la red local 'hardhat'.");
  const [deployer, founder, community, treasury, liquidity] = await ethers.getSigners();
  for (const k of ["FOUNDER", "COMMUNITY", "TREASURY", "LIQUIDITY"]) delete process.env[`${k}_ADDRESS`];
  const cfg = loadTokenomics({ founder: founder.address, community: community.address, treasury: treasury.address, liquidity: liquidity.address });
  const start = BigInt((await ethers.provider.getBlock("latest")).timestamp + 600);
  const { token, vestings, recipients, txs } = await deploySenseiHerb(cfg, deployer, start);
  const problems = await verifyDistribution(cfg, token, recipients);
  if (problems.length) throw new Error(problems.join("; "));

  const { weth, factory, router } = await deployLocalUniswap(deployer);
  const tokenAmount = cfg.categories.find((c) => c.key === "liquidity").amount;
  const ethAmount = ethers.parseEther(process.env.DEMO_LP_ETH || "0.03");
  const res = await addLiquidity({ token, routerAddr: await router.getAddress(), signer: liquidity, tokenAmount, ethAmount, slippageBps: 100n, to: liquidity.address });
  const pool = await readPool(ethers.provider, await factory.getAddress(), await token.getAddress(), await weth.getAddress());

  const balances = {};
  for (let i = 0; i < recipients.length; i++) balances[recipients[i]] = (await token.balanceOf(recipients[i])).toString();
  const record = {
    demo: true,
    note: "DATOS DE DEMOSTRACIÓN generados en una red local efímera de Hardhat. Las direcciones NO existen en Base.",
    network: "hardhat", chainId: 31337, explorer: null, deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    token: { address: await token.getAddress(), name: cfg.name, symbol: cfg.symbol, decimals: 18, maxSupply: cfg.maxSupply.toString() },
    vestingStart: Number(start),
    allocations: await Promise.all(cfg.categories.map(async (c, i) => ({
      key: c.key, label: c.label, bps: Number(c.bps), amount: c.amount.toString(), holder: recipients[i], beneficiary: c.address,
      vesting: c.vesting ? { contract: await vestings[c.key].getAddress(), cliffMonths: Number(c.cliffMonths), durationMonths: Number(c.vestingMonths) } : null,
    }))),
    transactions: txs,
    snapshot: { balances, pool: { tokenReserve: pool.tokenReserve.toString(), ethReserve: pool.ethReserve.toString() } },
    liquidity: { dex: "Uniswap V2 (local)", router: await router.getAddress(), factory: await factory.getAddress(), pair: pool.pair, lpRecipient: liquidity.address, ...res },
  };
  fs.writeFileSync(path.join(__dirname, "..", "web", "data", "demo.json"), JSON.stringify(record, null, 2) + "\n");
  console.log(`Token ${record.token.address} · pool ${pool.pair}`);
  console.log(`Reservas: ${ethers.formatUnits(pool.tokenReserve, 18)} SENSEI / ${ethers.formatEther(pool.ethReserve)} WETH`);
  console.log("Escrito web/data/demo.json (marcado como demo).");
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
