# SECURITY — Sensei Herb Token

## Superficie del código

| Contrato | Origen | Privilegios |
|---|---|---|
| `SenseiHerbToken` | `ERC20` de OpenZeppelin 5.6.1 + constructor de reparto | **Ninguno.** Sin owner, mint, pausa, blacklist, tasas ni proxy |
| `SenseiVesting` | `VestingWalletCliff` de OpenZeppelin 5.6.1, sin lógica propia | `owner` = beneficiario. Puede `release()` lo devengado y `transferOwnership()`. No puede adelantar el calendario |

- Solidity 0.8.28 fijado (`pragma solidity 0.8.28`), optimizador 200 runs, EVM `cancun`.
- Compilador `solc` 0.8.28 fijado en `package.json` y `package-lock.json` (solcjs), con comprobación de versión en `hardhat.config.js`.
- Todas las dependencias se instalan con versión exacta (`--save-exact`).
- **No hay auditoría externa.** No se debe afirmar lo contrario.

### Riesgos conocidos y decisiones

1. **`release()` es público** en VestingWallet: cualquiera puede llamarlo, pero los tokens siempre van al beneficiario. Es el comportamiento estándar.
2. **Transferir la titularidad del vesting** (`transferOwnership`) cambia quién cobra. Si se pierde la clave del beneficiario, los tokens devengados quedan inaccesibles. Usa un Safe multisig o una cartera hardware como beneficiario.
3. **ETH enviado a un contrato de vesting** también se libera con el mismo calendario. No envíes ETH por error.
4. **Tokens enviados al contrato del token** quedan bloqueados para siempre (no hay función de rescate, a propósito: rescatar requeriría un administrador).
5. **Front-running en la creación del pool**: si alguien crea el par SENSEI/WETH antes con otro precio, `add-liquidity.js` lo detecta y se detiene. Como los tokens solo los tiene el proyecto al principio, el riesgo es bajo.
6. **Tokens LP**: quien los tenga puede retirar la liquidez. Decide y publica su custodia antes de crear el pool (ver `docs/LIQUIDITY.md`).
7. `npm audit --omit=dev`: **0 vulnerabilidades** en lo que se despliega (OpenZeppelin). `npm audit` completo: 46 avisos (23 altos) en la cadena de herramientas de Hardhat 2 (`undici`, `adm-zip`, `lodash`, `serialize-javascript`, `tmp`…). Afectan a la máquina que ejecuta las herramientas cuando procesan entradas maliciosas, no a los contratos. Mitigación: la cuenta de despliegue es desechable y con saldo mínimo, y se usan RPC de confianza. Pendiente: valorar migrar a Hardhat 3 o Foundry.

## Gestión de claves

- **Nunca** guardes claves privadas ni frases semilla en el repositorio, ni las pegues en un chat (tampoco con Claude).
- `.env` está en `.gitignore`. `.env.example` no contiene secretos. `npm run check:secrets` revisa los archivos versionados.
- **Cuenta de despliegue desechable**: crea una cartera nueva solo para desplegar, recárgala con el ETH justo (≈ 2–5 USD) y no la uses para nada más. Tras el despliegue no tiene ningún privilegio sobre el token.
- **Carteras de asignación**: fundador en cartera hardware; comunidad y tesorería en un [Safe](https://app.safe.global) multisig (por ejemplo, 2 de 3 firmantes) en Base.
- Si una clave se filtra: mueve inmediatamente los fondos y, si es la de un beneficiario de vesting, transfiere la titularidad a una cartera nueva.

## Protecciones antes de cada transacción real

Los scripts `deploy.js` y `add-liquidity.js`:

1. Muestran red, chainId, cuenta firmante y saldo.
2. Validan direcciones (formato, checksum, no cero) y que los porcentajes sumen 100 %.
3. Estiman el gas y, en Base, la comisión de datos de L1 (oráculo `0x4200…000F`).
4. Explican qué permisos se crean (el despliegue no concede ninguno; el pool requiere un `approve` exacto al router, que se consume entero).
5. Exigen escribir `DESPLEGAR <chainId>` o `CREAR POOL <chainId>`. `DRY_RUN=true` permite ver todo sin enviar nada.
6. Después verifican en cadena el suministro, cada saldo y las reservas del pool, y guardan el registro en `deployments/`.

## Validación realizada (21-10-2026)

- `npm test`: 29 pruebas superadas (suministro, asignaciones, eventos, permisos/ABI, transferencias, aprobaciones, vesting, configuración, pool Uniswap V2 local).
- Revisión manual: sin `selfdestruct`, `delegatecall`, ensamblador, llamadas externas ni bucles sin límite en código propio (el bucle del constructor se ejecuta una sola vez con 4 elementos).
- `npm run check:secrets`: sin claves ni frases semilla en archivos versionados.

## Reportar una vulnerabilidad

Escribe al responsable del proyecto en privado antes de publicarla. No hay programa de recompensas.
