# LAUNCH CHECKLIST — Sensei Herb Token

Marca cada casilla tú mismo. Nada de esta lista se ha ejecutado en una red pública.

## 0. Decisiones (antes de gastar nada)
- [ ] Confirmar nombre, símbolo y suministro definitivos. Buscar en Basescan que no haya otro token "SENSEI" que pueda causar confusión.
- [ ] Confirmar porcentajes y calendarios de vesting (`TOKENOMICS.md`).
- [ ] Decidir cuánto ETH se aporta al pool y cuántos tokens (ver `docs/LIQUIDITY.md`).
- [ ] Decidir la custodia de los tokens LP (Safe, bloqueo temporal o quema irreversible) y publicarlo.
- [ ] Consultar con un asesor legal la normativa aplicable (en la UE, MiCA puede exigir un white paper y notificaciones para ofertas públicas de criptoactivos).

## 1. Carteras (coste ≈ 0–1 USD en Base)
- [ ] Cartera del fundador (hardware recomendada) → `FOUNDER_ADDRESS`.
- [ ] Safe multisig de comunidad en Base → `COMMUNITY_ADDRESS`.
- [ ] Safe multisig de tesorería en Base → `TREASURY_ADDRESS`.
- [ ] Cartera desechable de despliegue + liquidez → `DEPLOYER_PRIVATE_KEY` en `.env` y su dirección en `LIQUIDITY_ADDRESS`.
- [ ] Copiar `.env.example` a `.env` y rellenar. Comprobar `git status`: `.env` no debe aparecer.

## 2. Red de pruebas (gratis)
- [ ] Obtener ETH de Base Sepolia en un faucet (p. ej. el de Coinbase Developer Platform o Alchemy).
- [ ] `npm test`
- [ ] `DRY_RUN=true npm run deploy:sepolia`
- [ ] `npm run deploy:sepolia` → escribir `DESPLEGAR 84532`
- [ ] Clave de Etherscan en `.env` → `npm run verify:sepolia`
- [ ] Abrir los contratos en sepolia.basescan.org y comprobar código verificado, saldos y eventos `InitialAllocation`.
- [ ] Abrir la web (`npm run web`) y comprobar que muestra "Base Sepolia" con datos en vivo.
- [ ] Probar una transferencia desde la cartera de comunidad.

## 3. Red principal (coste real)
- [ ] Comprar ETH y retirarlo **directamente a la red Base** (muchos exchanges lo permiten; evita el puente desde Ethereum L1, que es más caro).
- [ ] Fondear la cartera de despliegue: ≈ 0,002 ETH para gas + el ETH destinado al pool.
- [ ] `npm audit` y `npm test` una última vez.
- [ ] `DRY_RUN=true npm run deploy:base` → revisar red (chainId 8453), direcciones y coste.
- [ ] `npm run deploy:base` → escribir `DESPLEGAR 8453`.
- [ ] `npm run verify:base` y comprobar en basescan.org.
- [ ] Commit de `deployments/base.json` y `web/data/base.json`.

## 4. Pool de liquidez (coste real, opcional)
- [ ] Revisar las direcciones de Uniswap V2 de `config/dex.js` en la documentación oficial de Uniswap.
- [ ] `LP_TOKEN_AMOUNT` y `LP_ETH_AMOUNT` en `.env`.
- [ ] `DRY_RUN=true npm run liquidity:base` → revisar precio inicial e impacto.
- [ ] `npm run liquidity:base` → escribir `CREAR POOL 8453`.
- [ ] Comprobar el par en Basescan y en la interfaz de Uniswap. Aplicar la decisión sobre los tokens LP.
- [ ] Commit del registro actualizado.

## 5. Publicación
- [ ] Publicar la carpeta `web/` (GitHub Pages, Vercel o Netlify: gratis).
- [ ] Publicar las direcciones oficiales solo desde canales propios, enlazando a Basescan.
- [ ] Opcional: enviar el logo y la información del token a Basescan ("Update token info") y a listas de tokens.
- [ ] No prometer revalorización, rendimientos ni liquidez. Mantener visible el aviso de riesgos.
