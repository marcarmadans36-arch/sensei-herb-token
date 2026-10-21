// Despliega Uniswap V2 (artefactos oficiales de npm) en una red LOCAL para pruebas y demo.
const { ethers } = require("hardhat");
const Factory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const Router = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const WETH9 = require("@uniswap/v2-periphery/build/WETH9.json");

async function deployLocalUniswap(signer) {
  const weth = await new ethers.ContractFactory(WETH9.abi, WETH9.bytecode, signer).deploy();
  const factory = await new ethers.ContractFactory(Factory.abi, Factory.bytecode, signer).deploy(signer.address);
  const router = await new ethers.ContractFactory(Router.abi, Router.bytecode, signer).deploy(
    await factory.getAddress(), await weth.getAddress());
  await router.waitForDeployment();
  return { weth, factory, router };
}

module.exports = { deployLocalUniswap };
