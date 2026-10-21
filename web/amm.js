// Matemática de un pool de producto constante (Uniswap V2: x·y = k, comisión 0,30 %).
// Se usa en la web (calculadora) y en scripts/liquidity-scenarios.js. Sin dependencias.
(function (root) {
  const FEE_NUM = 997; // 1000 - 3 (0,30 %)
  const FEE_DEN = 1000;

  /** Cantidad recibida por `amountIn` (fórmula exacta de UniswapV2Library.getAmountOut, en BigInt). */
  function getAmountOutBig(amountIn, reserveIn, reserveOut) {
    const inWithFee = amountIn * BigInt(FEE_NUM);
    return (inWithFee * reserveOut) / (reserveIn * BigInt(FEE_DEN) + inWithFee);
  }

  /** Versión en coma flotante para escenarios y la interfaz. */
  function getAmountOut(amountIn, reserveIn, reserveOut) {
    const inWithFee = amountIn * FEE_NUM;
    return (inWithFee * reserveOut) / (reserveIn * FEE_DEN + inWithFee);
  }

  /**
   * Simula una venta de `tokensIn` en un pool con `tokenReserve` tokens y `quoteReserve` del activo de cotización.
   * Devuelve lo recibido, el precio medio de ejecución, el precio final y el deslizamiento frente al precio mostrado.
   */
  function simulateSell(tokensIn, tokenReserve, quoteReserve) {
    const spot = quoteReserve / tokenReserve;
    const out = getAmountOut(tokensIn, tokenReserve, quoteReserve);
    const avg = out / tokensIn;
    const newToken = tokenReserve + tokensIn;
    const newQuote = quoteReserve - out;
    return {
      received: out,
      valueAtSpot: tokensIn * spot,
      avgPrice: avg,
      spotBefore: spot,
      spotAfter: newQuote / newToken,
      slippage: 1 - avg / spot,
      priceImpact: 1 - newQuote / newToken / spot,
    };
  }

  /** Simula una compra gastando `quoteIn` del activo de cotización. */
  function simulateBuy(quoteIn, tokenReserve, quoteReserve) {
    const spot = quoteReserve / tokenReserve;
    const out = getAmountOut(quoteIn, quoteReserve, tokenReserve);
    const avg = quoteIn / out;
    const newToken = tokenReserve - out;
    const newQuote = quoteReserve + quoteIn;
    return {
      received: out,
      avgPrice: avg,
      spotBefore: spot,
      spotAfter: newQuote / newToken,
      slippage: avg / spot - 1,
      priceImpact: newQuote / newToken / spot - 1,
    };
  }

  const api = { getAmountOutBig, getAmountOut, simulateSell, simulateBuy, FEE: 1 - FEE_NUM / FEE_DEN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SenseiAMM = api;
})(typeof self !== "undefined" ? self : this);
