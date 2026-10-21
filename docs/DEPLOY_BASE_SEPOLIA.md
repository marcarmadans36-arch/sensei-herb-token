# Despliegue en Base Sepolia (red de pruebas)

Base Sepolia (chainId **84532**) es la red de pruebas de Base. Sus ETH son gratuitos y **no tienen valor**: el objetivo es comprobar el proceso completo antes de gastar dinero real en Base.

Estado: **preparado, no desplegado.** El entorno en la nube de Claude no puede conectarse a `sepolia.base.org` (lo bloquea su política de red), así que hay dos formas de ejecutarlo.

## Opción A — Desde tu ordenador (recomendada)

Requisitos: Node.js ≥ 20 (`node -v`) y git.

**Windows PowerShell 5.1** no admite `&&` ni `VARIABLE=valor comando`: ejecuta **un comando por línea**, de uno en uno, y no pegues la guía entera de golpe (entre medias hay que pedir ETH al faucet y editar `.env`). Todos los comandos `npm run …` de esta guía funcionan igual en PowerShell, cmd y bash.

Clónalo **fuera** de la carpeta de la app (no dentro de `sensei-herb`):

```
cd $HOME
git clone -b claude/awesome-mccarthy-orqpwo https://github.com/marcarmadans36-arch/sensei-herb-token.git
cd sensei-herb-token
npm ci
npm test
```

### 1. Cartera de despliegue desechable

```
npm run wallet:new
```

Crea `.env` (si no existe) con una clave nueva **que no se muestra en pantalla**, solo la dirección. También rellena `LIQUIDITY_ADDRESS` con esa dirección si estaba vacío. `.env` queda con permisos 600 e ignorado por git. Si prefieres usar una cartera propia, pon su clave en `.env` a mano. **Nunca la pegues en el chat.**

### 2. ETH de prueba

Envía ETH de Base Sepolia a la dirección que ha mostrado el paso 1 usando un faucet. Busca los oficiales en la documentación de Base (docs.base.org → "Network Faucets"), por ejemplo el de Coinbase Developer Platform o el de Alchemy. Con **0,01 ETH de prueba** sobra: el despliegue gasta del orden de 0,0001 ETH o menos.

### 3. Rellenar `.env`

Ábrelo con `notepad .env` (Windows) o tu editor.

| Variable | En testnet |
|---|---|
| `FOUNDER_ADDRESS` | Una cartera tuya (p. ej. otra cuenta de MetaMask). Recibe 30 M libres |
| `COMMUNITY_ADDRESS` | Otra cartera tuya, o un Safe creado **en Base Sepolia** |
| `TREASURY_ADDRESS` | Otra cartera tuya, o un Safe en Base Sepolia. Beneficiario del vesting de 24 meses |
| `LIQUIDITY_ADDRESS` | Ya rellenada por `wallet:new` (la cartera de despliegue) |
| `ETHERSCAN_API_KEY` | Clave gratuita de etherscan.io (cuenta → API Keys). Sirve para Basescan (API V2) |

Usa direcciones distintas para cada categoría: así la web puede mostrar cada saldo por separado.

### 4. Chequeo previo (solo lectura)

```
npm run preflight:sepolia
```

Comprueba:
- que `.env` está ignorado por git;
- que el RPC responde con chainId 84532;
- el saldo y el nonce del desplegador;
- que la tokenomics es válida;
- que el fundador es una cartera normal (sin bloqueo indirecto);
- que no hay un despliegue previo registrado;
- el coste estimado con un 50 % de margen;
- que hay clave de Etherscan.

Termina en **LISTO** o **NO LISTO** y no envía nada.

### 5. Plan sin enviar

```
npm run deploy:sepolia:dry
```

Revisa la red (`baseSepolia (chainId 84532)`), cada dirección, que el fundador aparece como `directo` y el coste.

### 6. Desplegar

```
npm run deploy:sepolia
```

El script pide escribir exactamente `DESPLEGAR 84532`. Con cualquier otra respuesta se cancela sin enviar nada. Despliega 2 contratos (vesting de tesorería y token), verifica en cadena el suministro y cada saldo, y guarda:

- `deployments/baseSepolia.json` (registro con direcciones y hashes)
- `web/data/baseSepolia.json` (lo lee la web)

Si `deployments/baseSepolia.json` ya existe, el script se niega a desplegar otra vez: un segundo despliegue crearía **otro token distinto**.

### 7. Verificar el código fuente

```
npm run verify:sepolia
```

Publica el código en Basescan (con `ETHERSCAN_API_KEY`) y en Sourcify. Después, en `https://sepolia.basescan.org/address/<token>` deberías ver la pestaña *Contract* con el código verificado y, en *Events*, 4 eventos `InitialAllocation`.

### 8. Comprobaciones manuales

- [ ] En Basescan, `totalSupply` = 100000000000000000000000000 (100 M con 18 decimales).
- [ ] `FOUNDER_ADDRESS` tiene 30.000.000 SENSEI desde el bloque de creación del token.
- [ ] Añade el token a MetaMask (dirección del token) y envía una cantidad pequeña desde la cartera del fundador a otra: debe funcionar de inmediato.
- [ ] El contrato de vesting de tesorería tiene 25 M y su `owner()` es `TREASURY_ADDRESS`.
- [ ] `npm run web` → http://localhost:8080 muestra el aviso "Red de pruebas Base Sepolia", la etiqueta **EN VIVO** y los enlaces a sepolia.basescan.org.

### 9. Publicar el resultado

```
git status
git add deployments/baseSepolia.json web/data/baseSepolia.json
git commit -m "deploy: SENSEI en Base Sepolia"
git push
```

Estos archivos solo contienen direcciones y hashes públicos. **Comprueba con `git status` que `.env` no aparece.** Después, Claude puede revisar el despliegue a partir de esos archivos.

### Pool en testnet (opcional)

`add-liquidity.js` necesita `UNISWAP_V2_ROUTER` y `UNISWAP_V2_FACTORY` de Base Sepolia, que no están en el repositorio porque no se han podido verificar. Si los obtienes de la documentación oficial de Uniswap, el script comprueba en cadena que son coherentes antes de firmar. No es necesario para validar el token.

## Opción B — Que Claude lo ejecute desde este entorno

1. En la configuración del entorno en la nube (menú del entorno en la barra de título → *Edit*):
   - En *Network access*, añade a los dominios permitidos: `sepolia.base.org`, `api.etherscan.io` y `sourcify.dev`.
   - Añade como variables de entorno o secretos `DEPLOYER_PRIVATE_KEY` (**solo de una cartera de prueba desechable**), `ETHERSCAN_API_KEY` y las cuatro direcciones `*_ADDRESS`.
2. Abre una sesión nueva para que los cambios se apliquen.
3. Claude ejecutará el chequeo previo y `DRY_RUN`, te mostrará el plan y **solo desplegará cuando escribas en el chat la confirmación**.

No pegues nunca la clave en el chat; en esta opción vive en la configuración del entorno.

## Validado en este entorno (sin red pública)

Se ensayó el proceso completo contra un nodo local de Hardhat tratado como red pública:
- `wallet:new` crea `.env` 600 ignorado por git y se niega a sobrescribir una clave.
- El chequeo previo termina en LISTO, con avisos esperables.
- Una confirmación incorrecta cancela sin enviar nada.
- Con la confirmación correcta despliega, verifica en cadena y escribe los registros.
- Un segundo intento queda bloqueado.
- La web, con el registro como `baseSepolia.json`, lee en vivo por RPC el suministro y los saldos y enlaza a sepolia.basescan.org.

Contra Base Sepolia real **no se ha ejecutado nada**.
