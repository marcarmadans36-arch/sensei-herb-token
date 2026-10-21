const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { loadTokenomics, MONTH } = require("../config/tokenomics");
const { deploySenseiHerb, verifyDistribution } = require("../scripts/lib/deploy-core");

const E18 = 10n ** 18n;

async function deployFixture() {
  const [deployer, founder, community, treasury, liquidity, alice, bob] = await ethers.getSigners();
  const cfg = loadTokenomics({ founder: founder.address, community: community.address, treasury: treasury.address, liquidity: liquidity.address });
  const start = BigInt(await time.latest()) + 100n;
  const { token, vestings, recipients } = await deploySenseiHerb(cfg, deployer, start);
  return { cfg, token, vestings, recipients, start, deployer, founder, community, treasury, liquidity, alice, bob };
}

describe("SenseiHerbToken", function () {
  describe("Suministro y metadatos", function () {
    it("tiene nombre, símbolo y 18 decimales", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal("Sensei Herb");
      expect(await token.symbol()).to.equal("SENSEI");
      expect(await token.decimals()).to.equal(18n);
    });

    it("acuña exactamente 100.000.000 tokens y MAX_SUPPLY coincide", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.totalSupply()).to.equal(100_000_000n * E18);
      expect(await token.MAX_SUPPLY()).to.equal(100_000_000n * E18);
    });

    it("no expone ninguna función de mint, owner, pausa, blacklist ni impuestos", async function () {
      const { token } = await loadFixture(deployFixture);
      const fns = token.interface.fragments.filter((f) => f.type === "function").map((f) => f.name).sort();
      expect(fns).to.deep.equal([
        "MAX_SUPPLY", "allocation", "allocationCount", "allowance", "approve", "balanceOf",
        "decimals", "name", "symbol", "totalSupply", "transfer", "transferFrom",
      ].sort());
    });

    it("el suministro no cambia tras muchas transferencias", async function () {
      const { token, community, alice, bob } = await loadFixture(deployFixture);
      await token.connect(community).transfer(alice.address, 1000n * E18);
      await token.connect(alice).transfer(bob.address, 400n * E18);
      await token.connect(bob).transfer(community.address, 400n * E18);
      expect(await token.totalSupply()).to.equal(100_000_000n * E18);
    });
  });

  describe("Asignaciones iniciales", function () {
    it("reparte 30/30/25/15 millones a los destinatarios configurados", async function () {
      const { token, vestings, founder, community, liquidity } = await loadFixture(deployFixture);
      expect(await token.balanceOf(founder.address)).to.equal(30_000_000n * E18);
      expect(await token.balanceOf(community.address)).to.equal(30_000_000n * E18);
      expect(await token.balanceOf(await vestings.treasury.getAddress())).to.equal(25_000_000n * E18);
      expect(await token.balanceOf(liquidity.address)).to.equal(15_000_000n * E18);
    });

    it("el desplegador no recibe tokens ni privilegios", async function () {
      const { token, deployer } = await loadFixture(deployFixture);
      expect(await token.balanceOf(deployer.address)).to.equal(0n);
    });

    it("registra las asignaciones on-chain y la verificación no encuentra discrepancias", async function () {
      const { cfg, token, recipients } = await loadFixture(deployFixture);
      expect(await token.allocationCount()).to.equal(4n);
      const a0 = await token.allocation(0);
      expect(a0.category).to.equal("Fundador");
      expect(await verifyDistribution(cfg, token, recipients)).to.deep.equal([]);
    });

    it("emite InitialAllocation y Transfer desde la dirección cero por cada categoría", async function () {
      const { token, recipients } = await loadFixture(deployFixture);
      const tx = token.deploymentTransaction();
      const receipt = await tx.wait();
      const parsed = receipt.logs.map((l) => token.interface.parseLog(l)).filter(Boolean);
      const allocs = parsed.filter((e) => e.name === "InitialAllocation");
      const mints = parsed.filter((e) => e.name === "Transfer" && e.args.from === ethers.ZeroAddress);
      expect(allocs.length).to.equal(4);
      expect(mints.map((m) => m.args.to)).to.deep.equal(recipients);
    });
  });

  describe("Validaciones del constructor", function () {
    let Token, a;
    before(async function () {
      Token = await ethers.getContractFactory("SenseiHerbToken");
      a = (await ethers.getSigners()).slice(1, 3).map((s) => s.address);
    });

    it("revierte si la suma no coincide con el suministro", async function () {
      await expect(Token.deploy("X", "X", 100n, ["a", "b"], a, [50n, 49n]))
        .to.be.revertedWithCustomError(Token, "SupplyMismatch").withArgs(100n, 99n);
    });
    it("revierte con longitudes distintas", async function () {
      await expect(Token.deploy("X", "X", 100n, ["a"], a, [100n])).to.be.revertedWithCustomError(Token, "LengthMismatch");
    });
    it("revierte sin asignaciones", async function () {
      await expect(Token.deploy("X", "X", 0n, [], [], [])).to.be.revertedWithCustomError(Token, "NoAllocations");
    });
    it("revierte con destinatario cero", async function () {
      await expect(Token.deploy("X", "X", 100n, ["a", "b"], [a[0], ethers.ZeroAddress], [50n, 50n]))
        .to.be.revertedWithCustomError(Token, "ZeroRecipient").withArgs(1n);
    });
    it("revierte con cantidad cero", async function () {
      await expect(Token.deploy("X", "X", 100n, ["a", "b"], a, [100n, 0n]))
        .to.be.revertedWithCustomError(Token, "ZeroAmount").withArgs(1n);
    });
  });

  describe("Transferencias y aprobaciones (ERC-20 estándar)", function () {
    it("transfiere sin comisiones ocultas", async function () {
      const { token, community, alice } = await loadFixture(deployFixture);
      await expect(token.connect(community).transfer(alice.address, 123n * E18))
        .to.changeTokenBalances(token, [community, alice], [-123n * E18, 123n * E18]);
    });
    it("cualquier titular puede transferir libremente (no hay bloqueo de ventas)", async function () {
      const { token, community, alice, bob } = await loadFixture(deployFixture);
      await token.connect(community).transfer(alice.address, 10n * E18);
      await expect(token.connect(alice).transfer(bob.address, 10n * E18)).to.not.be.reverted;
    });
    it("revierte si el saldo es insuficiente", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);
      await expect(token.connect(alice).transfer(bob.address, 1n)).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
    it("transferFrom respeta la aprobación", async function () {
      const { token, community, alice, bob } = await loadFixture(deployFixture);
      await token.connect(community).approve(alice.address, 50n);
      await expect(token.connect(alice).transferFrom(community.address, bob.address, 51n))
        .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
      await token.connect(alice).transferFrom(community.address, bob.address, 50n);
      expect(await token.allowance(community.address, alice.address)).to.equal(0n);
      expect(await token.balanceOf(bob.address)).to.equal(50n);
    });
  });

  describe("Fundador: tokens disponibles desde el bloque de despliegue", function () {
    it("la cartera del fundador recibe los 30.000.000 SENSEI en el mismo bloque del despliegue", async function () {
      const { token, founder, recipients } = await loadFixture(deployFixture);
      const rc = await token.deploymentTransaction().wait();
      expect(recipients[0]).to.equal(founder.address);
      expect(await token.balanceOf(founder.address, { blockTag: rc.blockNumber })).to.equal(30_000_000n * E18);
      // El saldo procede de la propia transacción de despliegue (Transfer desde 0x0), no de una liberación posterior.
      const mint = rc.logs.map((l) => token.interface.parseLog(l)).find((e) => e?.name === "Transfer" && e.args.to === founder.address);
      expect(mint.args.from).to.equal(ethers.ZeroAddress);
      expect(mint.args.value).to.equal(30_000_000n * E18);
    });

    it("no se despliega ningún contrato de vesting para el fundador y su destinatario no es un contrato", async function () {
      const { vestings, founder, token } = await loadFixture(deployFixture);
      expect(Object.keys(vestings)).to.deep.equal(["treasury"]);
      expect(await ethers.provider.getCode(founder.address)).to.equal("0x");
      const a0 = await token.allocation(0);
      expect(a0.recipient).to.equal(founder.address);
    });

    it("el fundador puede transferir el 100 % inmediatamente, sin esperar tiempo", async function () {
      const { token, founder, alice } = await loadFixture(deployFixture);
      // Sin time.increase: siguiente bloque tras el despliegue.
      await expect(token.connect(founder).transfer(alice.address, 30_000_000n * E18))
        .to.changeTokenBalances(token, [founder, alice], [-30_000_000n * E18, 30_000_000n * E18]);
      expect(await token.totalSupply()).to.equal(100_000_000n * E18);
    });

    it("el fundador puede aprobar a terceros (p. ej. un router de DEX) desde el primer bloque", async function () {
      const { token, founder, alice, bob } = await loadFixture(deployFixture);
      await token.connect(founder).approve(alice.address, 1_000_000n * E18);
      await token.connect(alice).transferFrom(founder.address, bob.address, 1_000_000n * E18);
      expect(await token.balanceOf(bob.address)).to.equal(1_000_000n * E18);
    });

    it("rechaza las variables antiguas de vesting del fundador para evitar configuraciones ambiguas", function () {
      const saved = process.env.FOUNDER_CLIFF_MONTHS;
      process.env.FOUNDER_CLIFF_MONTHS = "12";
      try {
        expect(() => loadTokenomics({ founder: "0x" + "1".repeat(40), community: "0x" + "2".repeat(40), treasury: "0x" + "3".repeat(40), liquidity: "0x" + "4".repeat(40) }))
          .to.throw(/FOUNDER_CLIFF_MONTHS ya no existe/);
      } finally {
        if (saved === undefined) delete process.env.FOUNDER_CLIFF_MONTHS; else process.env.FOUNDER_CLIFF_MONTHS = saved;
      }
    });
  });

  describe("Vesting de tesorería (24 meses lineal, sin cliff)", function () {
    it("libera aproximadamente la mitad a los 12 meses", async function () {
      const { token, vestings, treasury, start } = await loadFixture(deployFixture);
      await time.increaseTo(start + 12n * BigInt(MONTH));
      await vestings.treasury["release(address)"](await token.getAddress());
      expect(await token.balanceOf(treasury.address)).to.be.closeTo(12_500_000n * E18, 20n * E18);
    });
  });
});

describe("loadTokenomics (configuración)", function () {
  const addrs = { founder: "0x" + "1".repeat(40), community: "0x" + "2".repeat(40), treasury: "0x" + "3".repeat(40), liquidity: "0x" + "4".repeat(40) };
  const withEnv = (vars, fn) => {
    const saved = {};
    for (const k of Object.keys(vars)) { saved[k] = process.env[k]; process.env[k] = vars[k]; }
    try { return fn(); } finally { for (const k of Object.keys(vars)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
  };

  it("calcula los importes exactos por defecto", function () {
    const cfg = loadTokenomics(addrs);
    expect(cfg.categories.map((c) => c.amount / E18)).to.deep.equal([30_000_000n, 30_000_000n, 25_000_000n, 15_000_000n]);
  });
  it("rechaza porcentajes que no suman 100 %", function () {
    expect(() => withEnv({ FOUNDER_BPS: "3100" }, () => loadTokenomics(addrs))).to.throw(/deben sumar 100/);
  });
  it("rechaza direcciones inválidas", function () {
    expect(() => withEnv({ TREASURY_ADDRESS: "0x123" }, () => loadTokenomics(addrs))).to.throw(/no es una dirección válida/);
  });
  it("permite cambiar nombre, símbolo y suministro", function () {
    const cfg = withEnv({ TOKEN_NAME: "Otro", TOKEN_SYMBOL: "OTR", MAX_SUPPLY: "1000" }, () => loadTokenomics(addrs));
    expect(cfg.name).to.equal("Otro");
    expect(cfg.maxSupply).to.equal(1000n * E18);
    expect(cfg.categories.reduce((s, c) => s + c.amount, 0n)).to.equal(1000n * E18);
  });
});
