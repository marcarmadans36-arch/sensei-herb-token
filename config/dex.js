// Direcciones de Uniswap V2 por red. NO son de confianza por sí solas:
// scripts/add-liquidity.js comprueba en cadena que hay código, que router.factory()
// coincide y que router.WETH() es el WETH predeploy de Base antes de hacer nada.
// Fuente a revisar antes de usar: https://docs.uniswap.org/contracts/v2/reference/smart-contracts/v2-deployments
module.exports = {
  // WETH es un predeploy del OP Stack, idéntico en Base y Base Sepolia.
  WETH: "0x4200000000000000000000000000000000000006",
  8453: {
    name: "Uniswap V2 (Base)",
    factory: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
    router: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
  },
  // Base Sepolia: define UNISWAP_V2_ROUTER y UNISWAP_V2_FACTORY en .env tras consultar la documentación.
};
