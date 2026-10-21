# TOKENOMICS — Sensei Herb (SENSEI)

> Propuesta inicial, no definitiva. Todos los parámetros se cambian en `.env` **antes** del despliegue. Después, el suministro y la distribución inicial son inmutables.

## Parámetros

| Parámetro | Valor |
|---|---|
| Red | Base (L2 de Ethereum), estándar ERC-20 |
| Nombre / símbolo | Sensei Herb / SENSEI |
| Decimales | 18 |
| Suministro máximo | **100.000.000 SENSEI** (= 100.000.000 × 10¹⁸ unidades) |
| Emisión posterior | **Imposible**: el contrato no tiene función `mint`, ni `owner`, ni proxy actualizable |

## Distribución exacta

| Categoría | % | Tokens | Unidades mínimas | Destino en el despliegue | Bloqueo |
|---|---|---|---|---|---|
| Fundador | 30 % | 30.000.000 | 30.000.000 × 10¹⁸ | Contrato `SenseiVesting` (beneficiario: `FOUNDER_ADDRESS`) | Cliff 12 meses; lineal hasta el mes 48 |
| Comunidad | 30 % | 30.000.000 | 30.000.000 × 10¹⁸ | `COMMUNITY_ADDRESS` (Safe multisig recomendado) | Sin contrato de bloqueo; reparto público según campañas |
| Tesorería y desarrollo | 25 % | 25.000.000 | 25.000.000 × 10¹⁸ | Contrato `SenseiVesting` (beneficiario: `TREASURY_ADDRESS`) | Lineal 24 meses, sin cliff |
| Liquidez y distribución | 15 % | 15.000.000 | 15.000.000 × 10¹⁸ | `LIQUIDITY_ADDRESS` | Libre; destinada al pool del DEX |
| **Total** | **100 %** | **100.000.000** | | | |

Meses de 30 días. Calendario del fundador: 0 tokens hasta el día 360; en ese momento ya se han devengado 7,5 M (25 %), y el resto se libera de forma continua hasta el día 1.440. Tesorería: ≈ 1,04 M al mes durante 24 meses.

### Por qué cada asignación

- **Fundador (30 %)**: compensación a largo plazo por crear y mantener Sensei Herb. El cliff de 12 meses y el vesting de 4 años alinean al fundador con el proyecto e impiden una venta inmediata. Es un porcentaje alto comparado con otros proyectos; se publica para que cada comprador lo valore.
- **Comunidad (30 %)**: recompensas a usuarios de la app, colaboradores, creadores de contenido y campañas. Cada reparto será una transacción pública desde la cartera de comunidad.
- **Tesorería y desarrollo (25 %)**: financiar desarrollo, infraestructura, auditorías y gastos legales. El vesting lineal limita cuánto puede venderse cada mes.
- **Liquidez y distribución (15 %)**: emparejar con ETH en el pool de Uniswap V2. Lo que no se ponga en el pool se queda en la misma cartera y se informará de su uso.

## Reservados frente a circulantes

| Concepto | Definición | Al lanzamiento |
|---|---|---|
| Suministro total | Todos los tokens que existen | 100.000.000 |
| Reservado / bloqueado | En contratos de vesting o en carteras del proyecto sin repartir | Fundador 30 M + tesorería 25 M (bloqueados por contrato) + comunidad 30 M (reservados, no bloqueados por contrato) |
| Circulante | Tokens que cualquiera puede comprar o vender | **Solo los tokens depositados en el pool** (máx. 15 M) |
| Capitalización de mercado | precio × circulante | Con 15 M en un pool de 80 USD: ≈ 80 USD |
| FDV (valoración totalmente diluida) | precio × suministro total | Con el mismo pool: ≈ 533 USD |

**Advertencias explícitas**

- Los tokens reservados **no son liquidez**. La liquidez es únicamente el ETH que hay en el pool.
- La FDV y el "valor" de la asignación del fundador son cifras teóricas: el pool no contiene ese dinero. Ver `docs/LIQUIDITY.md`: vender los 30 M del fundador contra un pool de 80 USD devolvería como máximo ≈ 53 USD.
- La web calcula el circulante como *suministro − saldos de las carteras de asignación*, con datos en cadena.

## Lo que el contrato NO hace

No tiene impuestos de compraventa, listas negras, pausa, límites por cartera, funciones de mint ni de quema administrativa, roles de administrador, ni posibilidad de actualización. Lo comprueba la prueba `no expone ninguna función de mint, owner, pausa, blacklist ni impuestos`, que compara la ABI completa.

## Transparencia en cadena

- Evento `InitialAllocation(category, recipient, amount)` por cada categoría, más los `Transfer` desde `0x0` estándar.
- Lectura pública `allocationCount()` y `allocation(i)` con la categoría, el destinatario y la cantidad.
- Los contratos de vesting son `VestingWalletCliff` de OpenZeppelin 5.6.1 sin modificaciones (`contracts/SenseiVesting.sol` solo pasa los parámetros al constructor).
