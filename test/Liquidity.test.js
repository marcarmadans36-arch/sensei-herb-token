// Crea un pool real de Uniswap V2 (artefactos oficiales) en la red local de Hardhat y
// compara el resultado on-chain con la calculadora web/amm.js.
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { loadTokenomics } = require("../config/tokenomics");
const { deploySenseiHerb } = require("../scripts/lib/deploy-core");
const { deployLocalUniswap } = require("../scripts/lib/uniswap-local");
const { addLiquidity, readPool } = require("../scripts/lib/liquidity-core");
const AMM = require("../web/amm.js");

const E18 = 10n ** 18n;

async function poolFixture() {
  const [deployer, founder, community, treasury, liquidity, trader] = await ethers.getSigners();
  const cfg = loadTokenomics({ founder: founder.address, community: community.address, treasury: treasury.address, liquidity: liquidity.address });
  const { token } = await deploySenseiHerb(cfg, deployer, BigInt(Math.floor(Date.now() / 1000)));
  const { weth, factory, router } = await deployLocalUniswap(deployer);
  const tokenAmount = 15_000_000n * E18;
  const ethAmount = ethers.parseEther("0.03");
  await addLiquidity({ token, routerAddr: await router.getAddress(), signer: liquidity, tokenAmount, ethAmount, slippageBps: 100n, to: liquidity.address });
  return { token, weth, factory, router, founder, liquidity, trader, tokenAmount, ethAmount };
}

describe("Pool de liquidez Uniswap V2 (red local)", function () {
  it("crea el par con las reservas exactas aportadas", async function () {
    const { token, weth, factory, router, tokenAmount, ethAmount, liquidity } = await loadFixture(poolFixture);
    const pool = await readPool(ethers.provider, await factory.getAddress(), await token.getAddress(), await weth.getAddress());
    expect(pool).to.not.equal(null);
    expect(pool.tokenReserve).to.equal(tokenAmount);
    expect(pool.ethReserve).to.equal(ethAmount);
    expect(await token.balanceOf(liquidity.address)).to.equal(0n);
    // La aprobación al router se consume entera: no queda permiso residual.
    expect(await token.allowance(liquidity.address, await router.getAddress())).to.equal(0n);
  });

  it("una venta real recibe exactamente lo que predice la calculadora (getAmountOut)", async function () {
    const { token, weth, factory, router, trader } = await loadFixture(poolFixture);
    // Compra y venta de prueba SOLO en la red local, para validar la calculadora contra el contrato real.
    const r = new ethers.Contract(await router.getAddress(), [
      "function swapExactETHForTokens(uint,address[],address,uint) payable returns (uint[])",
      "function swapExactTokensForETH(uint,uint,address[],address,uint) returns (uint[])",
    ], trader);
    const path = [await weth.getAddress(), await token.getAddress()];
    const deadline = BigInt((await ethers.provider.getBlock("latest")).timestamp + 600);
    const before = await readPool(ethers.provider, await factory.getAddress(), await token.getAddress(), await weth.getAddress());
    const buyIn = ethers.parseEther("0.001");
    const expectedBuy = AMM.getAmountOutBig(buyIn, before.ethReserve, before.tokenReserve);
    await r.swapExactETHForTokens(0, path, trader.address, deadline, { value: buyIn });
    expect(await token.balanceOf(trader.address)).to.equal(expectedBuy);

    const mid = await readPool(ethers.provider, await factory.getAddress(), await token.getAddress(), await weth.getAddress());
    const sellIn = expectedBuy;
    const expectedSell = AMM.getAmountOutBig(sellIn, mid.tokenReserve, mid.ethReserve);
    await token.connect(trader).approve(await router.getAddress(), sellIn);
    const balBefore = await ethers.provider.getBalance(trader.address);
    const tx = await r.swapExactTokensForETH(sellIn, 0, [...path].reverse(), trader.address, deadline);
    const rc = await tx.wait();
    const gasCost = rc.gasUsed * rc.gasPrice;
    expect((await ethers.provider.getBalance(trader.address)) - balBefore + gasCost).to.equal(expectedSell);
    // Comprar y vender inmediatamente pierde ~0,6 % por comisiones.
    expect(expectedSell < buyIn).to.equal(true);
  });

  it("vender el 1 % del suministro en un pool pequeño hunde el precio (riesgo documentado)", async function () {
    const { tokenAmount, ethAmount } = await loadFixture(poolFixture);
    const sim = AMM.simulateSell(1_000_000, Number(tokenAmount / E18), Number(ethers.formatEther(ethAmount)));
    expect(sim.priceImpact).to.be.greaterThan(0.1);
    expect(sim.received).to.be.lessThan(sim.valueAtSpot);
  });

  it("el fundador puede vender en el pool en el bloque siguiente y recibe exactamente lo simulado", async function () {
    const { token, weth, factory, router, founder } = await loadFixture(poolFixture);
    const r = new ethers.Contract(await router.getAddress(),
      ["function swapExactTokensForETH(uint,uint,address[],address,uint) returns (uint[])"], founder);
    const before = await readPool(ethers.provider, await factory.getAddress(), await token.getAddress(), await weth.getAddress());
    const sellIn = 1_000_000n * E18;
    const expected = AMM.getAmountOutBig(sellIn, before.tokenReserve, before.ethReserve);
    await token.connect(founder).approve(await router.getAddress(), sellIn);
    const balBefore = await ethers.provider.getBalance(founder.address);
    const deadline = BigInt((await ethers.provider.getBlock("latest")).timestamp + 600);
    const rc = await (await r.swapExactTokensForETH(sellIn, expected, [await token.getAddress(), await weth.getAddress()], founder.address, deadline)).wait();
    expect((await ethers.provider.getBalance(founder.address)) - balBefore + rc.gasUsed * rc.gasPrice).to.equal(expected);
    // Lo recibido es menor que el "valor" a precio mostrado por impacto y comisión.
    expect(expected < (sellIn * before.ethReserve) / before.tokenReserve).to.equal(true);
  });
});
