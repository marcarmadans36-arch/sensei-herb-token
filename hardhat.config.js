require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
const path = require("path");
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

const SOLC_VERSION = "0.8.28";

// Usa el compilador solcjs fijado en package.json (node_modules/solc) en lugar de
// descargarlo de binaries.soliditylang.org. Hace la compilación reproducible y
// funciona sin acceso a red. Se comprueba que la versión coincide exactamente.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  if (args.solcVersion === SOLC_VERSION) {
    const solc = require("solc");
    const longVersion = solc.version();
    if (!longVersion.startsWith(SOLC_VERSION + "+")) {
      throw new Error(`solc npm ${longVersion} no coincide con ${SOLC_VERSION}`);
    }
    return {
      compilerPath: path.join(path.dirname(require.resolve("solc")), "soljson.js"),
      isSolcJs: true,
      version: SOLC_VERSION,
      longVersion: longVersion.replace(/\.Emscripten\.clang$/, ""),
    };
  }
  return runSuper();
});

const { DEPLOYER_PRIVATE_KEY, BASE_RPC_URL, BASE_SEPOLIA_RPC_URL, ETHERSCAN_API_KEY } = process.env;
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

module.exports = {
  solidity: {
    version: SOLC_VERSION,
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    baseSepolia: { url: BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org", chainId: 84532, accounts },
    base: { url: BASE_RPC_URL || "https://mainnet.base.org", chainId: 8453, accounts },
  },
  // Etherscan API V2: una sola clave sirve para Basescan (Base y Base Sepolia).
  etherscan: { apiKey: ETHERSCAN_API_KEY || "" },
  sourcify: { enabled: true },
  gasReporter: { enabled: process.env.REPORT_GAS === "true", currency: "USD" },
};
