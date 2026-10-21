// Estimación del coste de despliegue (gas L2 + comisión de datos L1 en Base). Solo lectura.
const { ethers } = require("hardhat");

// Predeploy GasPriceOracle de OP Stack (Base): calcula la comisión de datos en L1.
const GAS_PRICE_ORACLE = "0x420000000000000000000000000000000000000F";
const OP_STACK_CHAINS = [8453, 84532];

async function estimateDeployment(cfg, deployer, start, chainId) {
  const Vesting = await ethers.getContractFactory("SenseiVesting", deployer);
  const Token = await ethers.getContractFactory("SenseiHerbToken", deployer);
  const txReqs = [];
  for (const c of cfg.categories.filter((c) => c.vesting)) {
    txReqs.push({ label: `SenseiVesting (${c.key})`, req: await Vesting.getDeployTransaction(c.address, start, c.durationSeconds, c.cliffSeconds) });
  }
  const placeholder = cfg.categories.map((c) => c.address);
  txReqs.push({ label: "SenseiHerbToken", req: await Token.getDeployTransaction(cfg.name, cfg.symbol, cfg.maxSupply, cfg.categories.map((c) => c.label), placeholder, cfg.categories.map((c) => c.amount)) });

  const fee = await ethers.provider.getFeeData();
  const gasPrice = fee.maxFeePerGas ?? fee.gasPrice;
  const oracle = new ethers.Contract(GAS_PRICE_ORACLE, ["function getL1Fee(bytes) view returns (uint256)"], ethers.provider);
  const txs = [];
  let totalGas = 0n;
  let l1Fee = 0n;
  for (const t of txReqs) {
    const gas = await ethers.provider.estimateGas({ ...t.req, from: deployer.address });
    totalGas += gas;
    if (OP_STACK_CHAINS.includes(chainId)) {
      try { l1Fee += await oracle.getL1Fee(t.req.data); } catch { /* el oráculo no responde: se omite */ }
    }
    txs.push({ label: t.label, gas, bytes: (t.req.data.length - 2) / 2 });
  }
  const l2Cost = totalGas * gasPrice;
  return { txs, totalGas, gasPrice, l2Cost, l1Fee, total: l2Cost + l1Fee };
}

module.exports = { estimateDeployment };
