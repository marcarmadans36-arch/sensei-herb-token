// Carga el registro de despliegue y, si es una red real, lee los datos en vivo por JSON-RPC.
// Prioridad: red principal (data/base.json) > red de pruebas (data/baseSepolia.json) > demo local (data/demo.json).
(function () {
  const SOURCES = ["data/base.json", "data/baseSepolia.json", "data/demo.json"];
  const RPC = { 8453: "https://mainnet.base.org", 84532: "https://sepolia.base.org" };
  const NET_NAME = { 8453: "Base (red principal)", 84532: "Base Sepolia (red de pruebas)", 31337: "Hardhat local (demo)" };
  const COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"];
  const E18 = 10n ** 18n;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtTok = (wei) => Number(BigInt(wei) / E18).toLocaleString("es-ES");
  const fmtNum = (x, d = 2) => x.toLocaleString("es-ES", { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmtSci = (x) => (x === 0 ? "0" : x.toExponential(3));

  async function rpc(url, to, data) {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }) });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    return j.result;
  }
  const pad = (addr) => addr.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const balanceOf = (url, token, who) => rpc(url, token, "0x70a08231" + pad(who)).then(BigInt);
  const totalSupply = (url, token) => rpc(url, token, "0x18160ddd").then(BigInt);
  async function reserves(url, pair, token) {
    const r = await rpc(url, pair, "0x0902f1ac");
    const t0 = "0x" + (await rpc(url, pair, "0x0dfe1681")).slice(26);
    const r0 = BigInt("0x" + r.slice(2, 66)), r1 = BigInt("0x" + r.slice(66, 130));
    const tokenIs0 = t0.toLowerCase() === token.toLowerCase();
    return { tokenReserve: tokenIs0 ? r0 : r1, ethReserve: tokenIs0 ? r1 : r0 };
  }

  async function loadRecord() {
    for (const src of SOURCES) {
      try { const r = await fetch(src, { cache: "no-store" }); if (r.ok) return { src, rec: await r.json() }; } catch (_) { /* siguiente */ }
    }
    return null;
  }

  function link(rec, kind, value) {
    if (!rec.explorer) return `<code>${esc(value)}</code>`;
    return `<a href="${esc(rec.explorer)}/${kind}/${esc(value)}" target="_blank" rel="noopener"><code>${esc(value)}</code></a>`;
  }

  function lockText(a) {
    if (!a.vesting) return { founder: "Ninguno: libre desde el despliegue", liquidity: "Libre (destinada al pool)" }[a.key] || "Sin vesting (cartera multifirma)";
    return a.vesting.cliffMonths > 0 ? `Cliff ${a.vesting.cliffMonths} m + lineal hasta ${a.vesting.durationMonths} m` : `Lineal ${a.vesting.durationMonths} meses`;
  }

  async function render() {
    const loaded = await loadRecord();
    if (!loaded) {
      $("status-deploy").textContent = "Aún no desplegado. No hay direcciones publicadas.";
      $("status-liq").textContent = "Sin pool de liquidez.";
      $("banner").hidden = false; $("banner").textContent = "Token aún no desplegado: no existe ninguna dirección oficial.";
      return;
    }
    const { src, rec } = loaded;
    const url = RPC[rec.chainId];
    const live = !rec.demo && !!url;
    const tag = rec.demo ? '<span class="tag demo">DEMO</span>' : live ? '<span class="tag live">EN VIVO</span>' : '<span class="tag rec">REGISTRO</span>';
    if (rec.demo) { $("banner").hidden = false; $("banner").textContent = "DATOS DE DEMOSTRACIÓN · red local de pruebas · estas direcciones no existen en Base"; }
    else if (rec.chainId === 84532) { $("banner").hidden = false; $("banner").textContent = "Red de pruebas Base Sepolia · los tokens no tienen valor"; }

    // Saldos: en vivo si es red real, si no, la instantánea del registro demo.
    let supply = BigInt(rec.token.maxSupply), balances = {}, pool = null, liveOk = false;
    if (live) {
      try {
        supply = await totalSupply(url, rec.token.address);
        for (const a of rec.allocations) balances[a.holder] = await balanceOf(url, rec.token.address, a.holder);
        if (rec.liquidity) pool = await reserves(url, rec.liquidity.pair, rec.token.address);
        liveOk = true;
      } catch (e) { console.warn("RPC no disponible", e); }
    }
    if (!liveOk && rec.snapshot) {
      for (const [k, v] of Object.entries(rec.snapshot.balances)) balances[k] = BigInt(v);
      if (rec.snapshot.pool) pool = { tokenReserve: BigInt(rec.snapshot.pool.tokenReserve), ethReserve: BigInt(rec.snapshot.pool.ethReserve) };
    }
    const haveBalances = Object.keys(balances).length > 0;

    $("st-supply").innerHTML = fmtTok(supply) + " " + tag;
    if (haveBalances) {
      // El saldo del fundador es libre y cuenta como circulante; el resto de carteras de asignación no.
      const notCirc = rec.allocations.filter((a) => a.key !== "founder").reduce((s, a) => s + (balances[a.holder] ?? 0n), 0n);
      $("st-circ").textContent = fmtTok(supply - notCirc);
      $("st-circ-note").textContent = "incluye los tokens libres del fundador";
    } else { $("st-circ").textContent = "n/d"; }
    if (pool && pool.tokenReserve > 0n) {
      const price = Number(pool.ethReserve) / Number(pool.tokenReserve);
      $("st-price").textContent = fmtSci(price) + " ETH";
      $("st-price-note").textContent = "precio marginal del pool, no precio de venta";
      $("st-fdv").textContent = fmtNum(price * Number(supply / E18), 4) + " ETH";
    } else { $("st-price").textContent = "Sin pool"; $("st-fdv").textContent = "n/d"; }

    $("alloc-bar").innerHTML = rec.allocations.map((a, i) => `<span style="width:${a.bps / 100}%;background:${COLORS[i % 4]}" title="${esc(a.label)}"></span>`).join("");
    $("alloc-body").innerHTML = rec.allocations.map((a, i) => `<tr>
      <td><span class="dot" style="background:${COLORS[i % 4]}"></span>${esc(a.label)}</td>
      <td>${(a.bps / 100).toFixed(0)} %</td><td>${fmtTok(a.amount)}</td><td>${esc(lockText(a))}</td>
      <td>${balances[a.holder] !== undefined ? fmtTok(balances[a.holder]) : "n/d"}</td></tr>`).join("");

    const when = new Date(rec.deployedAt).toLocaleString("es-ES");
    $("status-deploy").innerHTML = `${tag} Desplegado en <b>${esc(NET_NAME[rec.chainId] || rec.network)}</b>${rec.blockNumber ? ` (bloque ${rec.blockNumber})` : ""}, ${esc(when)}.`;
    $("status-liq").innerHTML = rec.liquidity
      ? `${tag} Pool ${esc(rec.liquidity.dex)}: ${pool ? `${fmtTok(pool.tokenReserve)} SENSEI / ${fmtNum(Number(pool.ethReserve) / 1e18, 6)} ETH` : "reservas no disponibles"}.`
      : "Sin pool de liquidez creado. No hay mercado para el token.";

    const rows = [["Token SENSEI", rec.token.address]];
    for (const a of rec.allocations) {
      if (a.vesting) rows.push([`Vesting · ${a.label}`, a.vesting.contract], [`Beneficiario · ${a.label}`, a.beneficiary]);
      else rows.push([`Cartera · ${a.label}`, a.holder]);
    }
    if (rec.liquidity) rows.push(["Par de liquidez", rec.liquidity.pair]);
    $("addr-list").innerHTML = rows.map(([k, v]) => `<li><span>${esc(k)} ${tag}</span>${link(rec, "address", v)}</li>`).join("");
    $("data-source").textContent = `Fuente de datos: ${src}${liveOk ? " + lectura en vivo de " + url : rec.demo ? " (instantánea de demostración)" : ""}.`;

    if (pool && pool.tokenReserve > 0n) $("c-tok").value = Number(pool.tokenReserve / E18);
    calc();
  }

  function calc() {
    const tok = +$("c-tok").value, usd = +$("c-usd").value, sell = +$("c-sell").value, buy = +$("c-buy").value;
    if (!(tok > 0 && usd > 0)) return;
    founderTable(tok, usd);
    const s = SenseiAMM.simulateSell(sell || 0, tok, usd);
    const b = SenseiAMM.simulateBuy(buy || 0, tok, usd);
    $("c-sell-out").innerHTML = sell > 0 ? `
      <dt>Precio mostrado</dt><dd>${fmtSci(s.spotBefore)} USD</dd>
      <dt>Valor «en pantalla»</dt><dd>${fmtNum(s.valueAtSpot)} USD</dd>
      <dt>Recibirías</dt><dd><b>${fmtNum(s.received)} USD</b></dd>
      <dt>Precio medio</dt><dd>${fmtSci(s.avgPrice)} USD</dd>
      <dt>Slippage</dt><dd>${fmtNum(s.slippage * 100)} %</dd>
      <dt>Caída del precio</dt><dd>−${fmtNum(s.priceImpact * 100)} %</dd>` : "<dt>Introduce una cantidad</dt><dd></dd>";
    $("c-buy-out").innerHTML = buy > 0 ? `
      <dt>Recibirías</dt><dd><b>${fmtNum(b.received, 0)} SENSEI</b></dd>
      <dt>Precio medio</dt><dd>${fmtSci(b.avgPrice)} USD</dd>
      <dt>Slippage</dt><dd>${fmtNum(b.slippage * 100)} %</dd>
      <dt>Subida del precio</dt><dd>+${fmtNum(b.priceImpact * 100)} %</dd>` : "<dt>Introduce una cantidad</dt><dd></dd>";
  }

  function founderTable(tok, usd) {
    $("founder-sell").innerHTML = [1e6, 5e6, 10e6, 30e6].map((t) => {
      const s = SenseiAMM.simulateSell(t, tok, usd);
      return `<tr><td>${fmtNum(t, 0)} (${fmtNum((t / 30e6) * 100, 1)} %)</td><td>${fmtNum(s.valueAtSpot)} USD</td>
        <td><b>${fmtNum(s.received)} USD</b></td><td>−${fmtNum(s.priceImpact * 100, 1)} %</td></tr>`;
    }).join("");
  }

  document.getElementById("calc").addEventListener("input", calc);
  render().catch((e) => { console.error(e); calc(); });
})();
