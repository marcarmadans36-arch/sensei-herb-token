const { ethers } = require("hardhat");

const ROUTER_ABI = [
  "function factory() view returns (address)",
  "function WETH() view returns (address)",
  "function addLiquidityETH(address token,uint amountTokenDesired,uint amountTokenMin,uint amountETHMin,address to,uint deadline) payable returns (uint amountToken,uint amountETH,uint liquidity)",
];
const FACTORY_ABI = ["function getPair(address,address) view returns (address)"];
const PAIR_ABI = [
  "function getReserves() view returns (uint112,uint112,uint32)",
  "function token0() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

/** Lee el pool token/WETH. Devuelve null si el par no existe. */
async function readPool(provider, factoryAddr, tokenAddr, wethAddr) {
  const factory = new ethers.Contract(factoryAddr, FACTORY_ABI, provider);
  const pairAddr = await factory.getPair(tokenAddr, wethAddr);
  if (pairAddr === ethers.ZeroAddress) return null;
  const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
  const [r0, r1] = await pair.getReserves();
  const token0 = await pair.token0();
  const tokenIs0 = token0.toLowerCase() === tokenAddr.toLowerCase();
  return { pair: pairAddr, tokenReserve: tokenIs0 ? r0 : r1, ethReserve: tokenIs0 ? r1 : r0, lpSupply: await pair.totalSupply() };
}

/** Aprueba la cantidad EXACTA al router y crea el pool con addLiquidityETH. */
async function addLiquidity({ token, routerAddr, signer, tokenAmount, ethAmount, slippageBps, to }) {
  const router = new ethers.Contract(routerAddr, ROUTER_ABI, signer);
  const approveTx = await token.connect(signer).approve(routerAddr, tokenAmount);
  await approveTx.wait();
  const minToken = (tokenAmount * (10000n - slippageBps)) / 10000n;
  const minEth = (ethAmount * (10000n - slippageBps)) / 10000n;
  const deadline = BigInt((await signer.provider.getBlock("latest")).timestamp + 1200);
  const tx = await router.addLiquidityETH(await token.getAddress(), tokenAmount, minToken, minEth, to, deadline, { value: ethAmount });
  const receipt = await tx.wait();
  return { approveTx: approveTx.hash, addLiquidityTx: tx.hash, blockNumber: receipt.blockNumber };
}

module.exports = { ROUTER_ABI, FACTORY_ABI, PAIR_ABI, readPool, addLiquidity };
