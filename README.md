# Sensei Herb Token (SENSEI)

Token ERC-20 de suministro fijo en **Base** para financiar el desarrollo de Sensei Herb. Incluye contratos, pruebas, scripts de despliegue con confirmación explícita, scripts de liquidez para Uniswap V2 y una web estática de transparencia.

> Estado a 21-10-2026: **probado en red local. No desplegado en ninguna red pública.** No existe ninguna dirección oficial del token todavía.

| Documento | Contenido |
|---|---|
| [TOKENOMICS.md](TOKENOMICS.md) | Distribución exacta, vesting, circulante, capitalización y FDV |
| [SECURITY.md](SECURITY.md) | Modelo de permisos, gestión de claves y validación |
| [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) | Pasos pendientes para testnet, mainnet y pool |
| [docs/LIQUIDITY.md](docs/LIQUIDITY.md) | DEX, escenarios de precio, slippage y ventas |
| [docs/FOUNDER_SELL_SIMULATION.md](docs/FOUNDER_SELL_SIMULATION.md) | Cuánto recibiría el fundador al vender sus tokens libres |

## Elección de la blockchain: Base

| Criterio | Solana (SPL Token) | Base (ERC-20) |
|---|---|---|
| Coste de creación | Muy bajo (≈ 0,01–0,05 SOL con metadatos) | Muy bajo (≈ 2,3 M de gas, normalmente < 1 USD) |
| Herramientas | `spl-token` CLI, Metaplex para metadatos | Hardhat/Foundry + OpenZeppelin, las más usadas y auditadas |
| Vesting / bloqueo | Requiere programas de terceros (Streamflow, Bonfida) | `VestingWalletCliff` de OpenZeppelin, en el propio repositorio |
| Crear un pool | Raydium/Meteora; crear un pool CPMM en Raydium cuesta ≈ 0,15–0,3 SOL de comisión | Uniswap V2: solo gas, sin comisión de creación |
| Verificación pública | Metadatos verificables; no hay "código verificado" de un token SPL | Código fuente verificado en Basescan y Sourcify |
| Carteras | Phantom, Solflare, Backpack | MetaMask, Coinbase Wallet, Rabby, Safe… cualquier cartera EVM |

**Decisión: Base.**
1. ERC-20 + OpenZeppelin es el estándar más usado y auditado para tokens fungibles.
2. El suministro fijo se garantiza por código (no hay función de mint), en lugar de depender de revocar la autoridad de mint como en SPL.
3. El vesting de la tesorería se hace con un contrato estándar de OpenZeppelin, sin servicios externos. La asignación del fundador no tiene vesting.
4. El código fuente se verifica en Basescan: cualquiera puede leer exactamente qué se desplegó.
5. Desplegar cuesta céntimos y crear el pool en Uniswap V2 no tiene tasa de creación, así que casi todo el presupuesto va a la liquidez.
6. Compatible con cualquier cartera EVM y con Safe multisig para la tesorería.
7. Retirar ETH directamente a Base desde exchanges grandes evita los puentes.
8. Hardhat permite probarlo todo (incluido un pool Uniswap V2 real) en local, sin coste.
9. Solana sería igual de barata, pero el vesting y la verificación requieren más piezas de terceros.
10. Se implementa una sola red para no duplicar trabajo.

## Instalación

Requisitos: Node.js ≥ 20 y npm.

```bash
git clone https://github.com/marcarmadans36-arch/sensei-herb-token.git
cd sensei-herb-token
npm ci
npm run compile
npm test
```

El compilador `solc` 0.8.28 se instala desde npm (no se descarga en tiempo de compilación), así que la compilación es reproducible y funciona sin red.

## Uso

| Comando | Qué hace | ¿Coste real? |
|---|---|---|
| `npm test` | 31 pruebas automatizadas | No |
| `npm run deploy:local` | Despliegue simulado en red efímera, con plan y estimación de gas | No |
| `npm run demo:local` | Despliegue + Uniswap V2 local + pool; escribe `web/data/demo.json` | No |
| `npm run scenarios` | Tabla de escenarios de liquidez | No |
| `npm run founder-sell` | Simula la venta de los tokens del fundador (reservas hipotéticas) | No |
| `ETH_USD=… npm run founder-sell:base` | La misma simulación con las reservas reales del pool (solo lectura) | No |
| `npm run web` | Sirve la web en http://localhost:8080 | No |
| `npm run check:secrets` | Busca claves en archivos versionados | No |
| `npm run deploy:sepolia` / `verify:sepolia` | Red de pruebas Base Sepolia | No (ETH de faucet) |
| `npm run deploy:base` | **Red principal**. Pide escribir `DESPLEGAR 8453` | **Sí** |
| `npm run verify:base` | Verificación en Basescan | No |
| `npm run liquidity:base` | **Crea el pool**. Pide escribir `CREAR POOL 8453` | **Sí** |

Con `DRY_RUN=true` delante, los scripts de despliegue y de liquidez muestran el plan y la estimación sin enviar nada.

## Despliegue

1. `cp .env.example .env` y rellena las direcciones (ver [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)). La clave de despliegue solo va en `.env`, nunca en el chat ni en git.
2. `DRY_RUN=true npm run deploy:sepolia` → revisa el plan.
3. `npm run deploy:sepolia` → confirma escribiendo `DESPLEGAR 84532`.
4. `npm run verify:sepolia`.
5. Repite con `base` cuando la red de pruebas esté validada.

El script despliega primero el contrato de vesting de tesorería y después el token, que acuña todo el suministro repartido en una sola transacción. El fundador recibe sus 30 M directamente en esa transacción, libres desde ese bloque. Luego comprueba en cadena el suministro y cada saldo, y guarda `deployments/<red>.json` y `web/data/<red>.json`.

## Web

`web/` es estática (HTML, CSS y JS sin dependencias). Busca `data/base.json`, después `data/baseSepolia.json` y, si no encuentra ninguno, `data/demo.json`. Con un despliegue real lee en vivo por RPC el suministro, los saldos de cada asignación y las reservas del pool. Los datos de demostración se marcan con un banner y etiquetas **DEMO**. Se puede publicar gratis en GitHub Pages, Vercel o Netlify.

## Costes

Precio del ETH no consultado (la red de este entorno no permite acceder a RPC ni a APIs de precios). Las cifras en USD suponen ETH entre 2.000 y 5.000 USD y un gas en Base de 0,005–0,05 gwei. **Recálculalas con `DRY_RUN=true` el día del lanzamiento.**

| Concepto | Estimado | Verificado |
|---|---|---|
| Gas de despliegue (1 vesting + token ≈ 1.682.671 gas, medido en local) | 0,05 – 1 USD + comisión de datos L1 (céntimos) | 0 USD (no ejecutado) |
| Verificación en Basescan / Sourcify | 0 USD | 0 USD (no ejecutado) |
| Crear 2 Safe multisig en Base | 0,05 – 1 USD | 0 USD (no ejecutado) |
| Comisión de retirada de ETH a Base desde un exchange | 0 – 5 USD (según exchange) | — |
| Gas de `approve` + `addLiquidityETH` | 0,05 – 1 USD | 0 USD (no ejecutado) |
| **ETH aportado al pool** (decisión tuya) | 50 – 150 USD | — |
| Hosting de la web | 0 USD | — |
| Dominio propio (opcional) | 10 – 15 USD/año | — |
| **Total realista** | **≈ 60 – 160 USD**, casi todo liquidez | **0 USD gastados** |

## Estructura

```
contracts/          SenseiHerbToken.sol, SenseiVesting.sol
config/             tokenomics.js (parámetros desde .env), dex.js (Uniswap V2)
scripts/            deploy.js, verify.js, add-liquidity.js, demo-local.js, liquidity-scenarios.js, check-secrets.js
scripts/lib/        lógica compartida por scripts y pruebas
test/               SenseiHerbToken.test.js, Liquidity.test.js
web/                index.html, styles.css, app.js, amm.js, data/
deployments/        registros de despliegues reales (se versionan)
docs/               LIQUIDITY.md
```

## Registro de progreso (21-10-2026)

- **Fase A, auditoría:** Node 22.22, npm 10.9, Python 3.13 y Chromium disponibles; sin Foundry ni Solana CLI. El entorno solo tiene acceso al registro npm: los RPC de Base, Basescan y binaries.soliditylang.org están bloqueados, así que se usa solcjs desde npm y las pruebas son locales.
- **Fase B, desarrollo:** contratos, configuración, scripts, 29 pruebas y web.
- **Fase C, validación:** compilación correcta, 29/29 pruebas, distribución comprobada en cadena (local), sin secretos versionados, revisión de permisos.
- **Fase D, despliegue de prueba:** despliegue completo y pool Uniswap V2 en la red local de Hardhat. **Base Sepolia no**: este entorno no puede conectarse a su RPC y no hay cartera con fondos de faucet.
- **Fase E:** comandos de mainnet preparados con confirmación obligatoria. No se ha ejecutado ninguna transacción real.
- **Cambio de tokenomics (21-10-2026):** se elimina el vesting del fundador. Sus 30 M van directamente a `FOUNDER_ADDRESS` y están disponibles desde el bloque de despliegue. Se elimina el contrato de vesting del fundador (queda solo el de tesorería). Se añade la simulación de venta del fundador. 31/31 pruebas. Sin despliegues ni transacciones reales.
