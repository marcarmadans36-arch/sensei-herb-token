# Liquidez y mercado — Sensei Herb Token

## DEX elegido: Uniswap V2 en Base

| Opción | Pros | Contras |
|---|---|---|
| **Uniswap V2** (elegida) | Contratos inmutables y muy auditados; pool de rango completo, sencillo; precio fácil de razonar (x·y=k); los agregadores (Uniswap, 1inch, Matcha) lo indexan | Comisión fija del 0,30 %; capital menos eficiente que V3 |
| Uniswap V3/V4 | Liquidez concentrada | Posiciones NFT con rangos: más fácil equivocarse con poco capital |
| Aerodrome | Principal DEX nativo de Base | Mecánica ve(3,3) y gauges: complejidad innecesaria para un MVP |

El script `scripts/add-liquidity.js` comprueba **en cadena**, antes de firmar nada, que el router y el factory tienen código, que `router.factory()` coincide y que `router.WETH()` es el WETH predeploy de Base (`0x4200…0006`). Revisa además las direcciones en la documentación oficial de Uniswap antes de usarlo.

Prueba realizada: `test/Liquidity.test.js` despliega los contratos **oficiales** de Uniswap V2 (paquetes npm `@uniswap/v2-core@1.0.1` y `@uniswap/v2-periphery@1.1.0-beta.0`) en la red local de Hardhat, crea el pool y comprueba que una compra y una venta reales devuelven **exactamente** lo que predice `web/amm.js`. No se ha creado ningún pool en Base.

## Precio mostrado frente a precio de ejecución

- **Precio mostrado (spot):** `reserva_ETH / reserva_SENSEI`. Es lo que enseñan las webs y los rastreadores.
- **Precio medio de ejecución:** lo que realmente obtienes, que empeora con el tamaño de la operación porque cada token vendido abarata el siguiente, y además se descuenta la comisión del 0,30 %.
- **Slippage:** diferencia entre ambos.
- **Impacto en precio:** cuánto cambia el precio mostrado después de la operación.

## Escenarios (generados con `npm run scenarios`)

Supuestos: pool Uniswap V2 SENSEI/WETH, comisión 0,30 %, sin otras operaciones y sin comisiones de red. Las cantidades en USD representan el ETH aportado valorado en USD en el momento de crear el pool. **Es un cálculo teórico, no una previsión de precio ni de demanda.**

### Pool: 15.000.000 SENSEI + 50 USD en ETH
Precio inicial: 3.333·10^-6 USD/SENSEI · Valor total del pool: 100 USD · FDV teórica: 333,33 USD · Cap. circulante (solo tokens del pool): 50,00 USD

| Operación | Recibe | Valor a precio mostrado | Precio medio | Slippage | Impacto en precio |
|---|---|---|---|---|---|
| Compra 10 USD | 2.493.747 SENSEI | 3.000.000 SENSEI | 4.010·10^-6 | 20,30 % | +43,93 % |
| Compra 50 USD | 7.488.733 SENSEI | 15.000.000 SENSEI | 6.677·10^-6 | 100,30 % | +299,40 % |
| Venta 10.000 SENSEI | 0,03 USD | 0,03 USD | 3.321·10^-6 | 0,37 % | −0,13 % |
| Venta 100.000 SENSEI | 0,33 USD | 0,33 USD | 3.301·10^-6 | 0,96 % | −1,32 % |
| Venta 1.000.000 SENSEI | 3,12 USD | 3,33 USD | 3.116·10^-6 | 6,51 % | −12,09 % |
| Venta 5.000.000 SENSEI | 12,47 USD | 16,67 USD | 2.494·10^-6 | 25,17 % | −43,71 % |

### Pool: 15.000.000 SENSEI + 80 USD en ETH
Precio inicial: 5.333·10^-6 USD/SENSEI · Valor total del pool: 160 USD · FDV teórica: 533,33 USD · Cap. circulante (solo tokens del pool): 80,00 USD

| Operación | Recibe | Valor a precio mostrado | Precio medio | Slippage | Impacto en precio |
|---|---|---|---|---|---|
| Compra 10 USD | 1.662.221 SENSEI | 1.875.000 SENSEI | 6.016·10^-6 | 12,80 % | +26,52 % |
| Compra 50 USD | 5.758.568 SENSEI | 9.375.000 SENSEI | 8.683·10^-6 | 62,80 % | +163,76 % |
| Venta 10.000 SENSEI | 0,05 USD | 0,05 USD | 5.314·10^-6 | 0,37 % | −0,13 % |
| Venta 100.000 SENSEI | 0,53 USD | 0,53 USD | 5.282·10^-6 | 0,96 % | −1,32 % |
| Venta 1.000.000 SENSEI | 4,99 USD | 5,33 USD | 4.986·10^-6 | 6,51 % | −12,09 % |
| Venta 5.000.000 SENSEI | 19,95 USD | 26,67 USD | 3.991·10^-6 | 25,17 % | −43,71 % |

### Pool: 15.000.000 SENSEI + 150 USD en ETH
Precio inicial: 1.000·10^-5 USD/SENSEI · Valor total del pool: 300 USD · FDV teórica: 1000,00 USD · Cap. circulante (solo tokens del pool): 150,00 USD

| Operación | Recibe | Valor a precio mostrado | Precio medio | Slippage | Impacto en precio |
|---|---|---|---|---|---|
| Compra 10 USD | 934.863 SENSEI | 1.000.000 SENSEI | 1.070·10^-5 | 6,97 % | +13,76 % |
| Compra 50 USD | 3.741.556 SENSEI | 5.000.000 SENSEI | 1.336·10^-5 | 33,63 % | +77,64 % |
| Venta 10.000 SENSEI | 0,10 USD | 0,10 USD | 9.963·10^-6 | 0,37 % | −0,13 % |
| Venta 100.000 SENSEI | 0,99 USD | 1,00 USD | 9.904·10^-6 | 0,96 % | −1,32 % |
| Venta 1.000.000 SENSEI | 9,35 USD | 10,00 USD | 9.349·10^-6 | 6,51 % | −12,09 % |
| Venta 5.000.000 SENSEI | 37,42 USD | 50,00 USD | 7.483·10^-6 | 25,17 % | −43,71 % |

### Pool: 5.000.000 SENSEI + 80 USD en ETH
Precio inicial: 1.600·10^-5 USD/SENSEI · Valor total del pool: 160 USD · FDV teórica: 1600,00 USD · Cap. circulante (solo tokens del pool): 80,00 USD

| Operación | Recibe | Valor a precio mostrado | Precio medio | Slippage | Impacto en precio |
|---|---|---|---|---|---|
| Compra 10 USD | 554.074 SENSEI | 625.000 SENSEI | 1.805·10^-5 | 12,80 % | +26,52 % |
| Compra 50 USD | 1.919.523 SENSEI | 3.125.000 SENSEI | 2.605·10^-5 | 62,80 % | +163,76 % |
| Venta 10.000 SENSEI | 0,16 USD | 0,16 USD | 1.592·10^-5 | 0,50 % | −0,40 % |
| Venta 100.000 SENSEI | 1,56 USD | 1,60 USD | 1.564·10^-5 | 2,25 % | −3,88 % |
| Venta 1.000.000 SENSEI | 13,30 USD | 16,00 USD | 1.330·10^-5 | 16,88 % | −30,52 % |
| Venta 5.000.000 SENSEI | 39,94 USD | 80,00 USD | 7.988·10^-6 | 50,08 % | −74,96 % |

Referencia: los 30.000.000 SENSEI del fundador "valen" 160,00 USD al precio mostrado de un pool de 80 USD, pero venderlos todos devolvería como mucho 53,28 USD (el pool solo contiene 80 USD).

## Conclusiones para el lanzamiento con 100 USD

1. Con 50–150 USD de liquidez el mercado es **muy poco profundo**. Una compra de 10 USD ya mueve el precio entre un 14 % y un 44 %, y una venta de 1 M de tokens (1 % del suministro) lo hunde más de un 12 %.
2. **No conviene depositar más ETH del que se esté dispuesto a perder**. El ETH del pool lo pueden retirar los compradores al vender: es su salida, no un ingreso del proyecto.
3. **El valor del fundador o de la FDV no es dinero realizable.** El pool solo contiene lo que se aportó más lo que hayan comprado otros.
4. Decidir qué hacer con los tokens LP antes de crear el pool:
   - Conservarlos en un Safe multisig: se puede retirar la liquidez. Debe declararse públicamente.
   - Bloquearlos en un servicio de bloqueo con fecha (a elección del usuario, investigar antes).
   - Enviarlos a una dirección quemada (`0x…dEaD`): la liquidez queda permanente e **irrecuperable**. Decisión irreversible.
5. Prohibido por diseño de este proyecto: volumen ficticio, wash trading, compras coordinadas, bots para sostener el precio.
