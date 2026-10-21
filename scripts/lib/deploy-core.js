// Lógica de despliegue compartida por scripts/deploy.js y las pruebas.
const { ethers } = require("hardhat");

/** Despliega un SenseiVesting por cada categoría con vesting (hoy solo tesorería) y el token. Devuelve direcciones y recibos. */
async function deploySenseiHerb(cfg, signer, startTimestamp) {
  const Vesting = await ethers.getContractFactory("SenseiVesting", signer);
  const Token = await ethers.getContractFactory("SenseiHerbToken", signer);

  const recipients = [];
  const vestings = {};
  const txs = {};
  for (const c of cfg.categories) {
    if (c.vesting) {
      const v = await Vesting.deploy(c.address, startTimestamp, c.durationSeconds, c.cliffSeconds);
      await v.waitForDeployment();
      vestings[c.key] = v;
      txs[`${c.key}Vesting`] = v.deploymentTransaction().hash;
      recipients.push(await v.getAddress());
    } else {
      recipients.push(c.address);
    }
  }

  const token = await Token.deploy(
    cfg.name,
    cfg.symbol,
    cfg.maxSupply,
    cfg.categories.map((c) => c.label),
    recipients,
    cfg.categories.map((c) => c.amount),
  );
  await token.waitForDeployment();
  txs.token = token.deploymentTransaction().hash;
  return { token, vestings, recipients, txs };
}

/** Comprueba en cadena que el suministro y cada asignación coinciden con la configuración. */
async function verifyDistribution(cfg, token, recipients) {
  const problems = [];
  const supply = await token.totalSupply();
  if (supply !== cfg.maxSupply) problems.push(`totalSupply ${supply} != ${cfg.maxSupply}`);
  if ((await token.MAX_SUPPLY()) !== cfg.maxSupply) problems.push("MAX_SUPPLY no coincide");
  if ((await token.name()) !== cfg.name) problems.push("name no coincide");
  if ((await token.symbol()) !== cfg.symbol) problems.push("symbol no coincide");
  for (let i = 0; i < cfg.categories.length; i++) {
    const c = cfg.categories[i];
    const bal = await token.balanceOf(recipients[i]);
    if (bal !== c.amount) problems.push(`${c.key}: saldo ${bal} != ${c.amount}`);
    const a = await token.allocation(i);
    if (a.recipient !== recipients[i] || a.amount !== c.amount || a.category !== c.label)
      problems.push(`${c.key}: registro allocation(${i}) no coincide`);
  }
  return problems;
}

module.exports = { deploySenseiHerb, verifyDistribution };
