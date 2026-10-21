# Simulación: venta de los tokens del fundador

Los 30.000.000 SENSEI del fundador están **disponibles desde el bloque de despliegue**, sin vesting ni bloqueo. Esta simulación muestra cuánto recibiría el fundador si los vendiera contra el pool de Uniswap V2. **No ejecuta ninguna operación**, no crea liquidez y no simula volumen.

Comandos:

```bash
npm run founder-sell                                   # reservas hipotéticas (sin red)
POOL_TOKENS=15000000 POOL_USD=80 npm run founder-sell  # tu propio escenario
ETH_USD=<precio> npm run founder-sell:base             # reservas REALES del pool registrado en deployments/base.json (solo lectura)
```

Qué se descuenta:
- **Impacto de precio** (x·y = k): cada token vendido abarata el siguiente.
- **Comisión del pool:** 0,30 % de lo vendido.
- **Gas:** `GAS_USD` por venta (0,10 USD por defecto, supuesto).

Se supone que nadie más opera entre medias. En un pool x·y = k sin otras operaciones, vender en varias partes da el mismo resultado que vender de una vez (solo añade gas). El resultado solo mejoraría si otras personas compraran entre las ventas.

El modo de reservas reales se ha probado contra un pool Uniswap V2 creado en un nodo local de Hardhat. La prueba `el fundador puede vender en el pool en el bloque siguiente y recibe exactamente lo simulado` confirma que una venta real del fundador en local devuelve exactamente lo que predice la fórmula.

## Resultados con reservas hipotéticas (salida de `npm run founder-sell`)

### Pool hipotético: 15.000.000 SENSEI + 50 USD en ETH
Reservas: 15.000.000 SENSEI / 50,00 USD · precio mostrado 3.333e-6 USD/SENSEI
"Valor" de los 30 M del fundador a precio mostrado: 100,00 USD (no realizable)

| Vende | % de su asignación | Valor a precio mostrado | Comisión pool 0,30 % | Pérdida por impacto | Gas | **Recibe neto** | Precio medio | Precio tras la venta |
|---|---|---|---|---|---|---|---|---|
| 100.000 | 0,3 % | 0,33 USD | 0,00 | 0,00 | 0,10 | **0,23 USD** | 3.301e-6 | 3.289e-6 (−1,3 %) |
| 1.000.000 | 3,3 % | 3,33 USD | 0,01 | 0,21 | 0,10 | **3,02 USD** | 3.116e-6 | 2.930e-6 (−12,1 %) |
| 3.000.000 | 10,0 % | 10,00 USD | 0,02 | 1,67 | 0,10 | **8,21 USD** | 2.771e-6 | 2.316e-6 (−30,5 %) |
| 5.000.000 | 16,7 % | 16,67 USD | 0,03 | 4,17 | 0,10 | **12,37 USD** | 2.494e-6 | 1.876e-6 (−43,7 %) |
| 10.000.000 | 33,3 % | 33,33 USD | 0,04 | 13,33 | 0,10 | **19,86 USD** | 1.996e-6 | 1.201e-6 (−64,0 %) |
| 30.000.000 | 100,0 % | 100,00 USD | 0,03 | 66,67 | 0,10 | **33,20 USD** | 1.110e-6 | 3.711e-7 (−88,9 %) |

Vender los 30 M deja en el pool 16,70 USD: el fundador se llevaría el 66,6 % de todo el USD del pool.

### Pool hipotético: 15.000.000 SENSEI + 80 USD en ETH
Reservas: 15.000.000 SENSEI / 80,00 USD · precio mostrado 5.333e-6 USD/SENSEI
"Valor" de los 30 M del fundador a precio mostrado: 160,00 USD (no realizable)

| Vende | % de su asignación | Valor a precio mostrado | Comisión pool 0,30 % | Pérdida por impacto | Gas | **Recibe neto** | Precio medio | Precio tras la venta |
|---|---|---|---|---|---|---|---|---|
| 100.000 | 0,3 % | 0,53 USD | 0,00 | 0,00 | 0,10 | **0,43 USD** | 5.282e-6 | 5.263e-6 (−1,3 %) |
| 1.000.000 | 3,3 % | 5,33 USD | 0,01 | 0,33 | 0,10 | **4,89 USD** | 4.986e-6 | 4.688e-6 (−12,1 %) |
| 3.000.000 | 10,0 % | 16,00 USD | 0,03 | 2,67 | 0,10 | **13,20 USD** | 4.433e-6 | 3.706e-6 (−30,5 %) |
| 5.000.000 | 16,7 % | 26,67 USD | 0,05 | 6,67 | 0,10 | **19,85 USD** | 3.991e-6 | 3.002e-6 (−43,7 %) |
| 10.000.000 | 33,3 % | 53,33 USD | 0,06 | 21,33 | 0,10 | **31,84 USD** | 3.194e-6 | 1.922e-6 (−64,0 %) |
| 30.000.000 | 100,0 % | 160,00 USD | 0,05 | 106,67 | 0,10 | **53,18 USD** | 1.776e-6 | 5.938e-7 (−88,9 %) |

Vender los 30 M deja en el pool 26,72 USD: el fundador se llevaría el 66,6 % de todo el USD del pool.

### Pool hipotético: 15.000.000 SENSEI + 150 USD en ETH
Reservas: 15.000.000 SENSEI / 150,00 USD · precio mostrado 1.000e-5 USD/SENSEI
"Valor" de los 30 M del fundador a precio mostrado: 300,00 USD (no realizable)

| Vende | % de su asignación | Valor a precio mostrado | Comisión pool 0,30 % | Pérdida por impacto | Gas | **Recibe neto** | Precio medio | Precio tras la venta |
|---|---|---|---|---|---|---|---|---|
| 100.000 | 0,3 % | 1,00 USD | 0,00 | 0,01 | 0,10 | **0,89 USD** | 9.904e-6 | 9.868e-6 (−1,3 %) |
| 1.000.000 | 3,3 % | 10,00 USD | 0,03 | 0,63 | 0,10 | **9,25 USD** | 9.349e-6 | 8.791e-6 (−12,1 %) |
| 3.000.000 | 10,0 % | 30,00 USD | 0,06 | 5,00 | 0,10 | **24,84 USD** | 8.312e-6 | 6.948e-6 (−30,5 %) |
| 5.000.000 | 16,7 % | 50,00 USD | 0,08 | 12,50 | 0,10 | **37,32 USD** | 7.483e-6 | 5.629e-6 (−43,7 %) |
| 10.000.000 | 33,3 % | 100,00 USD | 0,11 | 40,00 | 0,10 | **59,79 USD** | 5.989e-6 | 3.604e-6 (−64,0 %) |
| 30.000.000 | 100,0 % | 300,00 USD | 0,10 | 200,00 | 0,10 | **99,80 USD** | 3.330e-6 | 1.113e-6 (−88,9 %) |

Vender los 30 M deja en el pool 50,10 USD: el fundador se llevaría el 66,6 % de todo el USD del pool.

## Lectura

- Con un pool de 80 USD, los 30 M del fundador "valen" 160 USD en pantalla, pero venderlos todos devolvería unos **53 USD** y dejaría el precio un 89 % más bajo.
- Cualquier venta del fundador retira ETH que de otro modo estaría disponible para el resto de vendedores. Los compradores pueden ver en el explorador que una sola cartera tiene el 30 % libre.
