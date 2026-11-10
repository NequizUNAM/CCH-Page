/* ==========================================================================
   PANEL DEL EXAMEN DE CIBERNÉTICA 1 · vive en el Dashboard de Asistencias
   --------------------------------------------------------------------------
   El Dashboard (index.html → Admin → Examen Cibernética 1) abre la página del examen en un marco
   con ?panel=1, le pasa el token de administrador y carga este archivo dentro del marco:
   así el panel usa el motor del examen (reconstruir exámenes, procedimientos, métricas)
   sin que el código del panel esté en la página que ven los alumnos.
   Es el mismo panel de antes (Resumen, Métricas, Resultados, Por alumno, Contraseñas,
   Vista previa); solo cambia dónde vive y que «Salir» ahora regresa al Dashboard.
   ========================================================================== */
document.body.insertAdjacentHTML('beforeend', '<div id="scr-admin" class="screen">\n  <header class="exam-bar"><div class="container"><div class="inner">\n    <div class="d-flex align-items-center gap-2 me-auto"><i class="bi bi-shield-check fs-4" style="color:var(--cy)"></i><div class="lh-sm"><div class="fw-bold">Panel del administrador</div><small class="opacity-75">Examen de Cibernética 1</small></div></div>\n    <button class="btn btn-sm btn-outline-light rounded-pill" id="ad-refresh"><i class="bi bi-arrow-clockwise me-1"></i>Actualizar</button>\n  </div></div></header>\n  <main class="container py-4" style="max-width:1150px"><ul class="nav nav-pills admin-tabs mb-3" id="ad-tabs"></ul><div id="ad-body"></div></main>\n</div>');
/* ==========================================================================
   PANEL DEL ADMINISTRADOR
   ========================================================================== */
const AD = { tab: 'resumen', par: '0', rows: [], cfg: null, q: '', pvP: 1, pvT: 'A', pvSeed: 20250101 };
const ADTABS = [['resumen', 'bi-bar-chart-line-fill', 'Resumen'], ['met', 'bi-clipboard-data-fill', 'Métricas'], ['res', 'bi-table', 'Resultados'], ['alu', 'bi-person-lines-fill', 'Por alumno'], ['clv', 'bi-key-fill', 'Contraseñas'], ['prev', 'bi-eye-fill', 'Vista previa']];
async function openAdmin() { show('admin'); await loadAdmin(); }
/* El panel se actualiza como máximo cada minuto (también con F5): mientras, se muestran los últimos datos guardados en este equipo. */
const AD_WAIT = 60000, ADK = 'eq_adm_' + (CFG.MATERIA || 'cib');
const adCache = { get() { try { return JSON.parse(LS.get(ADK) || 'null'); } catch (e) { return null; } }, set(o) { LS.set(ADK, JSON.stringify(o)); } };
const mmss = ms => { const x = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); };
let adTimer = null;
function adStamp() {
  const b = $('#ad-refresh'); if (!b) return; clearInterval(adTimer);
  const tick = () => { const c = adCache.get(), left = c ? AD_WAIT - (Date.now() - c.t) : 0;
    if (left > 0) { b.innerHTML = `<i class="bi bi-hourglass-split me-1"></i>Actualizar en ${mmss(left)}`; b.title = 'Para no saturar el servidor, el panel se actualiza como máximo cada minuto'; }
    else { b.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Actualizar'; b.title = ''; clearInterval(adTimer); } };
  tick(); adTimer = setInterval(tick, 1000);
}
async function adApi(action, data = {}) { const r = await api(action, { token: ADMIN, ...data }); if (!r.ok && r.code === 'auth') { showAlert('Sesión expirada', MSG.auth, 'bi-clock-history', '#d97706'); adminLogout(); } return r; }
async function loadAdmin(force) {
  const c = adCache.get(), age = c ? Date.now() - c.t : Infinity;
  if (force !== true && c && c.d && c.c && age < AD_WAIT) {
    AD.rows = c.d.rows || []; AD.cfg = c.c.cfg; renderAdmin(); adStamp();
    toast(`Espera: los datos se cargaron recientemente (hace ${mmss(age)}). Podrás actualizar en ${mmss(AD_WAIT - age)}.`, 'bi-hourglass-split', 4200);
    return;
  }
  $('#ad-body').innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div><div class="mt-2 text-muted">Cargando datos de la hoja…</div></div>';
  const [d, cf] = await Promise.all([adApi('admin_data'), adApi('admin_cfg')]);
  if (!d.ok || !cf.ok) {
    if (c && c.d && c.c) { AD.rows = c.d.rows || []; AD.cfg = c.c.cfg; renderAdmin(); toast('No se pudieron traer datos nuevos; se muestran los últimos guardados.', 'bi-cloud-slash-fill', 4200); return; }
    $('#ad-body').innerHTML = `<div class="alert alert-danger">${MSG[d.code || cf.code] || d.msg || cf.msg || 'No se pudieron cargar los datos.'}</div>`; renderTabs(); return;
  }
  adCache.set({ t: Date.now(), d, c: cf }); AD.rows = d.rows || []; AD.cfg = cf.cfg; renderAdmin(); adStamp();
}
function adminLogout() { ADMIN = null; try { parent.postMessage({ cchExam: 'logout' }, location.origin); } catch (e) { } }
$('#ad-refresh').onclick = () => loadAdmin(false);
function renderTabs() { $('#ad-tabs').innerHTML = ADTABS.map(([k, ic, n]) => `<li class="nav-item"><button class="nav-link ${AD.tab === k ? 'active' : ''}" data-adtab="${k}"><i class="bi ${ic} me-1"></i>${n}</button></li>`).join(''); }
function renderAdmin() { renderTabs(); ({ resumen: adResumen, met: adMetricas, res: adResultados, alu: adAlumno, clv: adClaves, prev: adPrev })[AD.tab](); }
document.addEventListener('click', e => { const t = e.target.closest('[data-adtab]'); if (t) { AD.tab = t.dataset.adtab; renderAdmin(); } });
const parBtns = () => `<div class="d-flex flex-wrap gap-2 mb-3">${[['0', 'Todos'], ['1', 'Parcial 1'], ['2', 'Parcial 2']].map(([k, n]) => `<button class="btn-chip ${AD.par === k ? 'on' : ''}" data-adpar="${k}">${n}</button>`).join('')}</div>`;
document.addEventListener('click', e => { const t = e.target.closest('[data-adpar]'); if (t) { AD.par = t.dataset.adpar; renderAdmin(); } });
const rowsSel = () => AD.rows.filter(r => AD.par === '0' || String(r.parcial) === AD.par);
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

/* ===== Métricas: qué falló (por bloque o unidad, teoría vs. aplicación, nivel de Bloom, tipo de pregunta y preguntas más falladas) =====
   Se reconstruye el examen de cada alumno con su tipo y su semilla, y se cruza con su detalle de aciertos (1 = bien, 0 = mal o sin responder). */
const plainQ = h => String(h).replace(/<sub>(\d+)<\/sub>/g, (m, d) => [...d].map(c => '₀₁₂₃₄₅₆₇₈₉'[c]).join('')).replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<table[\s\S]*?<\/table>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const TEORIA = ['Recordar', 'Comprender'];
document.addEventListener('click', e => { const t = e.target.closest('[data-adgrp]'); if (t) { AD.grp = t.dataset.adgrp; renderAdmin(); } });
function adMetricas() {
  const base = rowsSel().filter(r => r.estado === 'Entregado'), grupos = [...new Set(base.map(r => String(r.grupo || '')))].sort();
  if (AD.grp && !grupos.includes(AD.grp)) AD.grp = '';
  const grpBtns = grupos.length > 1 ? `<div class="d-flex flex-wrap gap-2 mb-3"><span class="small fw-bold text-muted align-self-center me-1">Grupo:</span>${[['', 'Todos'], ...grupos.map(g => [g, g || '(sin grupo)'])].map(([k, n]) => `<button class="btn-chip ${(AD.grp || '') === k ? 'on' : ''}" data-adgrp="${esc(k)}">${esc(n)}</button>`).join('')}</div>` : '';
  const sel = base.filter(r => !AD.grp || String(r.grupo || '') === AD.grp);
  const conDet = sel.filter(r => r.det);
  if (!sel.length) { $('#ad-body').innerHTML = parBtns() + grpBtns + '<div class="alert alert-info">Aún no hay exámenes entregados para calcular métricas.</div>'; return; }
  if (!conDet.length) { $('#ad-body').innerHTML = parBtns() + grpBtns + '<div class="alert alert-warning">Para ver las métricas actualiza el script de Apps Script (nueva versión de la implementación): el panel necesita el detalle de aciertos de cada alumno.</div>'; return; }
  const acc = (o, k, extra) => (o[k] = o[k] || Object.assign({ n: 0, ok: 0 }, extra));
  const SEC = {}, NIV = {}, TIP = {}, TA = {}, PQ = {}, OPSM = {}; let nAl = 0, nQ = 0, nOk = 0, nProc = 0;
  conDet.forEach(r => {
    let ex; try { ex = buildExam(+r.parcial, r.tipo, +r.seed, +r.total); } catch (e) { return; }
    const det = String(r.det), secs = EXAMS[r.parcial].secs; nAl++;
    if (r.resp) { const A = parseResp(r.resp, ex), PR = parseProc(r.proc); if (Object.keys(PR).length) nProc++;          // operaciones del procedimiento (casilla por casilla)
      ex.forEach(q => { if (!procKind(q)) return; Object.entries(procCheck(q, PR[q.id] || {}, A[q.id]).ops).forEach(([k, o]) => { const t = OPSM[k] = OPSM[k] || { n: 0, ok: 0, a: new Set() }; t.n += o.n; t.ok += o.ok; t.a.add(r.cuenta); }); }); }
    ex.forEach((q, i) => {
      if (q.bonus || det[i] === undefined) return; const ok = det[i] === '1' ? 1 : 0, s = secs.find(x => x.id === q.sec) || { t: q.sec, c: '#64748b' };
      const lv = q.bl || 'Sin nivel', ta = TEORIA.includes(lv) ? 'teo' : 'apl', kd = q.kind === 'mc' ? 'Opción múltiple' : 'Respuesta abierta';
      [acc(SEC, r.parcial + '|' + q.sec, { t: s.t, c: s.c, p: +r.parcial }), acc(NIV, lv, { t: lv }), acc(TIP, kd, { t: kd }), acc(TA, ta, { t: ta }),
       acc(PQ, q.sec + '|' + plainQ(q.html).replace(/-?\d+(?:[.,]\d+)?/g, '#').slice(0, 140), { t: plainQ(q.html), s: s.t, c: s.c, p: +r.parcial })].forEach(o => { o.n++; o.ok += ok; });
      nQ++; nOk += ok;
    });
  });
  const pct = o => o.n ? o.ok / o.n * 100 : 0, colOf = p => p >= 80 ? '#16a34a' : p >= 60 ? '#d97706' : '#dc2626';
  const bar = p => `<div class="mbar"><i style="width:${p.toFixed(1)}%;background:${colOf(p)}"></i></div>`;
  const secArr = Object.values(SEC).sort((a, b) => pct(a) - pct(b)), weak = secArr.filter(x => x.n >= 3).slice(0, 2).map(x => x.t);
  const secRows = Object.values(SEC).sort((a, b) => a.p - b.p || 0).map(x => `<tr><td><span class="mdot" style="background:${x.c}"></span>${AD.par === '0' ? `<span class="badge text-bg-light me-1">P${x.p}</span>` : ''}${esc(x.t)}${weak.includes(x.t) ? ' <span class="badge text-bg-danger ms-1">Reforzar</span>' : ''}</td><td class="text-center">${x.n}</td><td style="min-width:160px">${bar(pct(x))}</td><td class="text-end fw-bold" style="color:${colOf(pct(x))}">${pct(x).toFixed(1)} %</td></tr>`).join('');
  const BL = ['Recordar', 'Comprender', 'Aplicar', 'Analizar', 'Evaluar', 'Crear'], nivRows = Object.values(NIV).sort((a, b) => (BL.indexOf(a.t) + 9) % 15 - (BL.indexOf(b.t) + 9) % 15).map(x => `<tr><td>${esc(x.t)} <span class="small text-muted">${TEORIA.includes(x.t) ? '· teoría' : '· aplicación'}</span></td><td class="text-center">${x.n}</td><td style="min-width:120px">${bar(pct(x))}</td><td class="text-end fw-bold" style="color:${colOf(pct(x))}">${pct(x).toFixed(1)} %</td></tr>`).join('');
  const tipRows = Object.values(TIP).map(x => `<tr><td>${esc(x.t)}</td><td class="text-center">${x.n}</td><td style="min-width:120px">${bar(pct(x))}</td><td class="text-end fw-bold" style="color:${colOf(pct(x))}">${pct(x).toFixed(1)} %</td></tr>`).join('');
  const taCard = (k, ic, n, d) => { const x = TA[k] || { n: 0, ok: 0 }, p = pct(x); return `<div class="col-md-6"><div class="nav-card h-100"><div class="d-flex align-items-center gap-2 mb-1"><i class="bi ${ic} fs-4" style="color:${colOf(p)}"></i><b>${n}</b><span class="ms-auto fs-4 fw-bold" style="color:${colOf(p)}">${x.n ? p.toFixed(1) + ' %' : '—'}</span></div>${bar(p)}<div class="small text-muted mt-1">${d} · ${x.n} respuestas</div></div></div>`; };
  const worst = Object.values(PQ).filter(x => x.n >= 3).sort((a, b) => pct(a) - pct(b)).slice(0, 8).map(x => `<div class="mal-item" style="--c:${x.c}"><span class="mal-n" style="background:${colOf(pct(x))};width:auto;min-width:46px;padding:0 6px;border-radius:999px;font-size:.78rem">${(100 - pct(x)).toFixed(0)}%</span><div><div class="small fw-bold" style="color:${x.c}">${AD.par === '0' ? 'P' + x.p + ' · ' : ''}${esc(x.s)}</div><div class="small">${esc(x.t.length > 150 ? x.t.slice(0, 147) + '…' : x.t)}</div><div class="small text-muted">${x.n - x.ok} de ${x.n} la fallaron</div></div></div>`).join('') || '<div class="small text-muted">Aún no hay suficientes respuestas (mínimo 3 por pregunta).</div>';
  const card = (ic, c, v, k) => `<div class="col-6 col-lg-3"><div class="stat" style="--c:${c}"><i class="bi ${ic}"></i><div><b>${v}</b><span>${k}</span></div></div></div>`;
  $('#ad-body').innerHTML = parBtns() + grpBtns + `<div class="row g-3 mb-3">${card('bi-people-fill', '#2563eb', nAl, 'Alumnos analizados')}${card('bi-ui-checks', '#7c3aed', nQ, 'Respuestas calificadas')}${card('bi-bullseye', colOf(nQ ? nOk / nQ * 100 : 0), (nQ ? (nOk / nQ * 100).toFixed(1) : '0') + ' %', 'Acierto general')}${card('bi-exclamation-triangle-fill', '#dc2626', weak.length ? esc(weak[0].length > 22 ? weak[0].slice(0, 21) + '…' : weak[0]) : '—', 'Bloque más bajo')}</div>
  <div class="row g-3 mb-3">${taCard('teo', 'bi-book-half', 'Teoría', 'Preguntas de recordar y comprender (conceptos, definiciones)')}${taCard('apl', 'bi-calculator-fill', 'Aplicación', 'Preguntas de aplicar, analizar, evaluar y crear (cálculo y problemas)')}</div>
  <div class="nav-card mb-3"><b class="d-block mb-2"><i class="bi bi-diagram-3-fill me-1 text-primary"></i>Por bloque o unidad <span class="small text-muted fw-normal">(ordenado como en el examen · «Reforzar» = los 2 más bajos)</span></b><div class="table-responsive"><table class="table table-sm align-middle mb-0"><thead><tr><th>Bloque</th><th class="text-center">Respuestas</th><th>Acierto</th><th class="text-end">%</th></tr></thead><tbody>${secRows}</tbody></table></div></div>
  <div class="row g-3 mb-3"><div class="col-lg-7"><div class="nav-card h-100"><b class="d-block mb-2"><i class="bi bi-bar-chart-steps me-1 text-primary"></i>Por nivel cognitivo (Bloom)</b><table class="table table-sm align-middle mb-0"><thead><tr><th>Nivel</th><th class="text-center">Resp.</th><th>Acierto</th><th class="text-end">%</th></tr></thead><tbody>${nivRows}</tbody></table></div></div>
  <div class="col-lg-5"><div class="nav-card h-100"><b class="d-block mb-2"><i class="bi bi-input-cursor-text me-1 text-primary"></i>Por tipo de pregunta</b><table class="table table-sm align-middle mb-0"><thead><tr><th>Tipo</th><th class="text-center">Resp.</th><th>Acierto</th><th class="text-end">%</th></tr></thead><tbody>${tipRows}</tbody></table></div></div></div>
  <div class="nav-card"><b class="d-block mb-2"><i class="bi bi-x-octagon-fill me-1 text-danger"></i>Preguntas más falladas <span class="small text-muted fw-normal">(% de error · las que solo cambian de números se agrupan)</span></b>${worst}</div>
  <div class="nav-card mt-3"><b class="d-block mb-1"><i class="bi bi-pencil-square me-1 text-primary"></i>¿Qué operación les costó más? <span class="small text-muted fw-normal">(procedimiento obligatorio · ${nProc} de ${nAl} alumnos con procedimiento registrado · ordenado de menor a mayor acierto · no cambia la calificación)</span></b>
  <div class="small text-muted mb-2">Una casilla es correcta si coincide con el resultado correcto o con lo que sale de los datos que el propio alumno escribió en el paso anterior (un error no se cuenta dos veces). «Tabla · columna F» cuenta las salidas de todas las tablas de verdad, aunque no usen columnas intermedias.</div>${opsTable(OPSM, true)}</div>
  <div class="small text-muted mt-2">Las preguntas sin responder cuentan como error. No incluye la pregunta bonus.</div>`;
}
function adResumen() {
  const all = rowsSel(), ent = all.filter(r => r.estado === 'Entregado'), cur = all.filter(r => r.estado !== 'Entregado');
  const notas = ent.map(r => +r.nota), prom = avg(notas), apr = notas.filter(n => n >= 6).length;
  const card = (ic, c, v, k) => `<div class="col-6 col-lg-3"><div class="stat" style="--c:${c}"><i class="bi ${ic}"></i><div><b>${v}</b><span>${k}</span></div></div></div>`;
  const buckets = Array(11).fill(0); notas.forEach(n => buckets[Math.min(10, Math.floor(n))]++); const mx = Math.max(1, ...buckets);
  const by = (key, label) => { const m = {}; ent.forEach(r => { (m[r[key]] = m[r[key]] || []).push(+r.nota); }); return Object.keys(m).sort().map(k => `<tr><td>${esc(label ? label(k) : k)}</td><td>${m[k].length}</td><td><b>${avg(m[k]).toFixed(2)}</b></td></tr>`).join('') || '<tr><td colspan="3" class="text-muted">Sin datos</td></tr>'; };
  $('#ad-body').innerHTML = parBtns() + `<div class="row g-3 mb-3">${card('bi-check2-circle', '#16a34a', ent.length, 'Entregados')}${card('bi-hourglass-split', '#d97706', cur.length, 'En curso / sin entregar')}${card('bi-mortarboard-fill', '#7c3aed', ent.length ? prom.toFixed(2) : '—', 'Promedio (0–10)')}${card('bi-award-fill', '#0891b2', ent.length ? Math.round(apr / ent.length * 100) + '%' : '—', 'Aprobados (≥ 6)')}${card('bi-stopwatch-fill', '#2563eb', ent.length ? fmtT(avg(ent.map(segOf).filter(Number.isFinite)) * 1000) : '—', 'Tiempo promedio')}${card('bi-box-arrow-up-right', '#dc2626', ent.length ? avg(ent.map(r => +r.salidas || 0)).toFixed(1) : '—', 'Salidas de pestaña (prom.)')}${card('bi-trophy-fill', '#16a34a', notas.length ? Math.max(...notas).toFixed(1) : '—', 'Calificación más alta')}${card('bi-graph-down', '#dc2626', notas.length ? Math.min(...notas).toFixed(1) : '—', 'Calificación más baja')}</div>
  <div class="row g-3"><div class="col-lg-7"><div class="nav-card h-100"><b class="mb-2 d-block"><i class="bi bi-bar-chart-fill me-1 text-primary"></i>Distribución de calificaciones</b><div class="hist">${buckets.map((c, i) => `<div class="hcol"><span class="hv">${c || ''}</span><div class="hbar ${i < 6 ? 'bad' : ''}" style="height:${c / mx * 100}%"></div><span class="hl">${i === 10 ? '10' : i}</span></div>`).join('')}</div></div></div>
  <div class="col-lg-5"><div class="nav-card mb-3"><b class="mb-2 d-block"><i class="bi bi-people-fill me-1 text-primary"></i>Por grupo</b><table class="table table-sm mb-0"><thead><tr><th>Grupo</th><th>Entregados</th><th>Promedio</th></tr></thead><tbody>${by('grupo')}</tbody></table></div>
  <div class="nav-card"><b class="mb-2 d-block"><i class="bi bi-file-earmark-text-fill me-1 text-primary"></i>Por tipo de examen</b><table class="table table-sm mb-0"><thead><tr><th>Tipo</th><th>Entregados</th><th>Promedio</th></tr></thead><tbody>${by('tipo', k => 'Tipo ' + k)}</tbody></table></div></div></div>`;
}
/* Tiempo que tardó cada alumno en SU examen: sale de los segundos guardados (o de entrega − inicio) y no depende de cómo la hoja guarde el texto */
const segOf = r => { let x = (r.seg === '' || r.seg == null) ? NaN : +r.seg; if (!(x >= 0)) { const a = Date.parse(r.inicio), b = Date.parse(r.entrega); x = a && b && b >= a ? (b - a) / 1000 : NaN; } return x; };
const tiempoOf = r => { const x = segOf(r); return Number.isFinite(x) ? fmtT(x * 1000) : ''; };
function adResultados() {
  const q = AD.q.toLowerCase(), rows = rowsSel().filter(r => !q || (r.nombre + ' ' + r.cuenta + ' ' + r.grupo).toLowerCase().includes(q)).sort((a, b) => String(b.inicio).localeCompare(String(a.inicio)));
  $('#ad-body').innerHTML = parBtns() + `<div class="nav-card"><div class="d-flex flex-wrap gap-2 mb-3 align-items-center"><div class="input-group" style="max-width:340px"><span class="input-group-text"><i class="bi bi-search"></i></span><input id="ad-q" class="form-control" placeholder="Buscar nombre, cuenta o grupo" value="${esc(AD.q)}" autocomplete="off"></div><span class="text-muted small">${rows.length} registro(s)</span><button class="btn btn-outline-success btn-sm ms-auto fw-bold rounded-pill" id="ad-csv"><i class="bi bi-filetype-csv me-1"></i>Descargar CSV</button></div>
  <div class="table-responsive"><table class="table table-hover table-sm align-middle mb-0 ad-tbl"><thead><tr><th>Parcial</th><th>Nombre</th><th>Cuenta</th><th>Grupo</th><th>Tipo</th><th>Estado</th><th>Calif.</th><th title="Tiempo que tardó en contestar (horas:minutos:segundos)">Tiempo</th><th>Salidas</th><th>Inicio</th><th>Entrega</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td>P${r.parcial}</td><td>${esc(r.nombre)}</td><td class="mono">${esc(r.cuenta)}</td><td>${esc(r.grupo)}</td><td>${r.tipo}</td><td><span class="badge ${r.estado === 'Entregado' ? 'text-bg-success' : 'text-bg-warning'}">${r.estado}</span></td><td><b>${r.estado === 'Entregado' ? (+r.nota).toFixed(1) : '—'}</b></td><td class="mono text-nowrap">${r.estado === 'Entregado' ? (tiempoOf(r) || '—') : '—'}</td><td>${r.salidas === '' || r.salidas === undefined ? '—' : (+r.salidas > CFG.SALIDAS_CIERRE ? `<span class="badge text-bg-danger">${r.salidas}</span>` : r.salidas)}</td><td class="small">${fmtDT(r.inicio)}</td><td class="small">${fmtDT(r.entrega)}</td><td class="text-nowrap">${r.estado !== 'Entregado' && +r.salidas > CFG.SALIDAS_CIERRE ? (r.motivo === 'CERRAR' ? '<span class="badge text-bg-secondary me-1" title="El examen se cerrará en cuanto el alumno tenga conexión (máx. 30 s con la pestaña abierta)">Cierre enviado</span>' : `<button class="btn btn-sm btn-danger rounded-pill me-1" data-cerrar="${r.parcial}|${esc(r.cuenta)}" title="Cerrar y entregar este examen: se calificará con lo que lleva respondido"><i class="bi bi-lock-fill"></i> Cerrar examen</button>`) : ''}${r.estado === 'Entregado' ? `<button class="btn btn-sm btn-outline-primary rounded-pill me-1" data-aver="${r.parcial}|${esc(r.cuenta)}" title="Ver su examen con aciertos y errores"><i class="bi bi-eye-fill"></i> Ver</button>` : ''}<button class="btn btn-sm btn-outline-danger rounded-pill" data-liberar="${r.parcial}|${esc(r.cuenta)}" title="Borrar el registro para que el alumno pueda presentar de nuevo"><i class="bi bi-unlock-fill"></i> Liberar</button></td></tr>`).join('') || '<tr><td colspan="12" class="text-center text-muted py-4">Sin registros</td></tr>'}</tbody></table></div></div>`;
  $('#ad-q').addEventListener('input', e => { AD.q = e.target.value; const p = e.target.selectionStart; adResultados(); const n = $('#ad-q'); n.focus(); n.setSelectionRange(p, p); });
  $('#ad-csv').onclick = () => {
    const H = ['Parcial', 'Nombre', 'Cuenta', 'Grupo', 'Tipo', 'Estado', 'Aciertos', 'Total', 'Calificación', 'Tiempo (hh:mm:ss)', 'Segundos', 'Salidas', 'Inicio', 'Entrega'], q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const csv = '﻿' + [H.map(q).join(',')].concat(rows.map(r => [r.parcial, r.nombre, r.cuenta, r.grupo, r.tipo, r.estado, r.aciertos, r.total, r.nota, tiempoOf(r), Number.isFinite(segOf(r)) ? Math.round(segOf(r)) : '', r.salidas, fmtDT(r.inicio), fmtDT(r.entrega)].map(q).join(','))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'resultados_examenes.csv'; document.body.appendChild(a); a.click(); a.remove();
  };
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-liberar]'); if (!b) return;
  const [parcial, cuenta] = b.dataset.liberar.split('|');
  if (!confirm(`¿Borrar el registro de la cuenta ${cuenta} (Parcial ${parcial})? El alumno podrá presentar el examen de nuevo.`)) return;
  const r = await adApi('admin_liberar', { parcial: +parcial, cuenta });
  if (r.ok) { toast('Registro liberado.', 'bi-check-circle-fill'); loadAdmin(true); } else showAlert('No se pudo liberar', r.msg || 'Inténtalo otra vez.');
});
const toLocalInput = iso => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };
function cfgExamenCard(p) {
  const c = AD.cfg, av = availOf(p), n = effN(c['preguntas' + p], av), on = c['cierreon' + p] === 'SI';
  return `<div class="col-lg-6"><div class="nav-card h-100"><div class="d-flex align-items-center gap-2 mb-3"><i class="bi bi-sliders2-vertical fs-5 text-primary"></i><h2 class="h6 fw-bold mb-0">Configuración · ${EXAMS[p].titulo}</h2></div>
    <label class="form-label small fw-bold" for="np-${p}">Preguntas habilitadas <span class="text-muted fw-normal">(de 1 a ${av}; tope ${CFG.MAX_PREG})</span></label>
    <input type="number" class="form-control mb-1" id="np-${p}" min="1" max="${av}" value="${n}" inputmode="numeric" autocomplete="off">
    <div class="small text-muted mb-3">Aplica igual a los tipos A, B y C. La calificación siempre sale sobre 10 con regla de tres: aciertos ÷ preguntas habilitadas × 10. Quien ya está contestando conserva sus preguntas.</div>
    <div class="form-check form-switch mb-2"><input class="form-check-input" type="checkbox" id="co-${p}" ${on ? 'checked' : ''} data-cotoggle="${p}"><label class="form-check-label fw-bold small" for="co-${p}">Activar fecha y hora de cierre</label></div>
    <input type="datetime-local" class="form-control mb-1" id="cd-${p}" value="${toLocalInput(c['cierre' + p])}" ${on ? '' : 'disabled'}>
    <div class="small text-muted mb-3">Con la fecha activa, el examen se cierra y se entrega en automático a esa hora (hora de tu equipo) y ya no admite alumnos nuevos. Sin fecha, o desactivada, cada alumno tiene ${CFG.DURACION_MIN / 60} horas desde que inicia.</div>
    <div class="small mb-2" id="ce-${p}" aria-live="polite"></div>
    <button class="btn btn-primary btn-sm fw-bold" data-cfgex="${p}"><i class="bi bi-save-fill me-1"></i>Guardar configuración</button></div></div>`;
}
document.addEventListener('change', e => { const t = e.target.closest('[data-cotoggle]'); if (t) { const i = $('#cd-' + t.dataset.cotoggle); if (i) i.disabled = !t.checked; } });
function adClaves() {
  const c = AD.cfg, card = p => `<div class="col-lg-6"><div class="nav-card h-100"><div class="d-flex align-items-center gap-2 mb-3"><span class="qnum" style="--c:${p === 1 ? '#7c3aed' : '#0891b2'}">${p}</span><h2 class="h5 fw-bold mb-0">${EXAMS[p].titulo}</h2><span class="badge ms-auto ${c['abierto' + p] === 'SI' ? 'text-bg-success' : 'text-bg-danger'}">${c['abierto' + p] === 'SI' ? 'Acceso abierto' : 'Acceso cerrado'}</span></div>
    <label class="form-label small fw-bold" for="new-${p}">Contraseña de este parcial <span class="text-muted fw-normal">(escribe aquí la nueva y pulsa Guardar)</span></label>
    <div class="input-group mb-2"><input type="text" class="form-control mono fw-bold" id="new-${p}" value="${esc(c['clave' + p])}" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="40" data-clave-input="${p}"><button class="btn btn-primary fw-bold" data-setclave="${p}" id="sv-${p}"><i class="bi bi-save-fill me-1"></i>Guardar</button></div>
    <div class="small mb-2" id="st-${p}" aria-live="polite"></div>
    <div class="small text-muted mb-3">Cambió ${c['cambios' + p]} ${c['cambios' + p] === 1 ? 'vez' : 'veces'}. Quien use la anterior verá: «La contraseña ha cambiado. Solicita la nueva a tu profesor(a)».</div>
    <button class="btn btn-sm ${c['abierto' + p] === 'SI' ? 'btn-outline-danger' : 'btn-outline-success'} fw-bold rounded-pill" data-abierto="${p}|${c['abierto' + p] === 'SI' ? 'NO' : 'SI'}"><i class="bi ${c['abierto' + p] === 'SI' ? 'bi-lock-fill' : 'bi-unlock-fill'} me-1"></i>${c['abierto' + p] === 'SI' ? 'Cerrar acceso' : 'Abrir acceso'}</button></div></div>`;
  const clk = c.reloj === 'SI';
  $('#ad-body').innerHTML = `<div class="alert alert-info shadow-sm small"><i class="bi bi-info-circle-fill me-1"></i>Cada contraseña abre un examen distinto. Se guardan en la hoja <b>Config</b> de tu hoja de cálculo. Al cambiarla, nadie puede entrar con la anterior; los alumnos que ya están contestando pueden terminar.</div><div class="row g-3">${card(1)}${card(2)}</div>
  <div class="row g-3 mt-0">${cfgExamenCard(1)}${cfgExamenCard(2)}</div>
  <div class="nav-card mt-3 d-flex flex-wrap align-items-center gap-3"><div class="me-auto"><b><i class="bi bi-stopwatch-fill me-1"></i>Cronómetro visible para los alumnos</b><div class="small text-muted">Por defecto está oculto. Aunque esté oculto, el examen se cierra y se entrega solo a los ${CFG.DURACION_MIN} minutos. El cambio llega a quienes ya contestan en menos de un minuto.</div></div><span class="badge ${clk ? 'text-bg-success' : 'text-bg-secondary'}">${clk ? 'Visible' : 'Oculto'}</span><button class="btn btn-sm ${clk ? 'btn-outline-danger' : 'btn-outline-success'} fw-bold rounded-pill" data-reloj="${clk ? 'NO' : 'SI'}"><i class="bi ${clk ? 'bi-eye-slash-fill' : 'bi-eye-fill'} me-1"></i>${clk ? 'Ocultar cronómetro' : 'Mostrar cronómetro'}</button></div>`;
}
document.addEventListener('click', async e => {
  const eye = e.target.closest('[data-eye]'); if (eye) { const i = $('#' + eye.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password'; }
  const sc = e.target.closest('[data-setclave]'); if (sc) saveClave(+sc.dataset.setclave);
  const cx = e.target.closest('[data-cfgex]'); if (cx) {
    const p = +cx.dataset.cfgex, st = $('#ce-' + p), av = availOf(p), n = parseInt($('#np-' + p).value, 10), on = $('#co-' + p).checked, v = $('#cd-' + p).value;
    const say = (ok, t) => { st.className = 'small mb-2 fw-bold ' + (ok ? 'text-success' : 'text-danger'); st.textContent = t; };
    if (!(n >= 1 && n <= av)) { say(false, `Escribe un número de preguntas entre 1 y ${av}.`); return; }
    if (on && (!v || isNaN(new Date(v)))) { say(false, 'Elige la fecha y la hora de cierre, o desactiva el cierre.'); return; }
    cx.disabled = true; const r = await adApi('admin_cfgexamen', { parcial: p, preguntas: n, cierreOn: on ? 'SI' : 'NO', cierre: on ? new Date(v).toISOString() : '' }); cx.disabled = false;
    if (r.ok) { toast('Configuración guardada.', 'bi-check-circle-fill', 3000); AD.cfg['preguntas' + p] = n; AD.cfg['cierreon' + p] = on ? 'SI' : 'NO'; AD.cfg['cierre' + p] = on ? new Date(v).toISOString() : ''; const s2 = $('#ce-' + p); if (s2) say(true, 'Guardado en la hoja Config. Se aplica a los alumnos que inicien desde ahora.'); }
    else say(false, r.code === 'accion' ? 'Actualiza el script de Apps Script (nueva versión de la implementación) para usar esta opción.' : (r.msg || MSG[r.code] || 'No se pudo guardar.'));
  }
  const ce = e.target.closest('[data-cerrar]'); if (ce) {
    const [parcial, cuenta] = ce.dataset.cerrar.split('|'), row = AD.rows.find(x => String(x.parcial) === parcial && String(x.cuenta) === cuenta);
    if (!confirm(`¿Cerrar el examen de ${row ? row.nombre : cuenta} (cuenta ${cuenta})? Se entregará y calificará con lo que lleva respondido.`)) return;
    const r = await adApi('admin_cerrar', { parcial: +parcial, cuenta });
    if (r.ok) { toast('Cierre enviado. El examen se entregará en cuanto el alumno sincronice.', 'bi-lock-fill', 4500); loadAdmin(true); }
    else toast(r.code === 'accion' ? 'Actualiza el script de Apps Script (nueva versión de la implementación) para usar esta opción.' : (r.msg || MSG[r.code] || 'No se pudo cerrar.'), 'bi-exclamation-triangle-fill', 4500);
  }
  const rl = e.target.closest('[data-reloj]'); if (rl) { const r = await adApi('admin_reloj', { valor: rl.dataset.reloj }); if (r.ok) { toast(rl.dataset.reloj === 'SI' ? 'Cronómetro visible para los alumnos.' : 'Cronómetro oculto.', 'bi-check-circle-fill'); loadAdmin(true); } else toast(r.code === 'accion' ? 'Actualiza el script de Apps Script (nueva versión de la implementación) para usar esta opción.' : (MSG[r.code] || r.msg || 'No se pudo cambiar.'), 'bi-exclamation-triangle-fill', 4500); }
  const ab = e.target.closest('[data-abierto]'); if (ab) { const [p, v] = ab.dataset.abierto.split('|'); const r = await adApi('admin_abierto', { parcial: +p, abierto: v }); if (r.ok) { toast(v === 'SI' ? 'Acceso abierto.' : 'Acceso cerrado.', 'bi-check-circle-fill'); loadAdmin(true); } }
});
async function saveClave(p) {
  const inp = $('#new-' + p), st = $('#st-' + p), btn = $('#sv-' + p), v = inp.value.trim();
  const say = (ok, t) => { st.className = 'small mb-2 fw-bold ' + (ok ? 'text-success' : 'text-danger'); st.innerHTML = `<i class="bi ${ok ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1"></i>${t}`; };
  if (v.length < 4) { say(false, 'La contraseña debe tener al menos 4 caracteres.'); return; }
  if (v === (AD.cfg['clave' + p] || '')) { say(true, 'Esa ya es la contraseña actual; no hay cambios.'); return; }
  btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando…'; st.textContent = '';
  const r = await adApi('admin_setclave', { parcial: p, clave: v });
  if (r.ok) { toast('Contraseña actualizada.', 'bi-check-circle-fill', 3000); AD.cfg['clave' + p] = v; AD.cfg['cambios' + p] = (AD.cfg['cambios' + p] || 0) + 1; adClaves(); const s2 = $('#st-' + p); if (s2) { s2.className = 'small mb-2 fw-bold text-success'; s2.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Guardada en la hoja Config. La contraseña anterior ya no funciona.'; } }
  else { btn.disabled = false; btn.innerHTML = '<i class="bi bi-save-fill me-1"></i>Guardar'; say(false, MSG[r.code] || r.msg || 'No se pudo guardar. Inténtalo otra vez.'); }
}
document.addEventListener('keydown', e => { const i = e.target.closest && e.target.closest('[data-clave-input]'); if (i && e.key === 'Enter') { e.preventDefault(); saveClave(+i.dataset.claveInput); } });
function adPrev() {
  const secs = EXAMS[AD.pvP].secs, ex = buildExam(AD.pvP, AD.pvT, AD.pvSeed, effN(AD.cfg && AD.cfg['preguntas' + AD.pvP], availOf(AD.pvP))), { html } = questionsHTML(ex, secs, { p: 'pv', key: true });
  $('#ad-body').innerHTML = `<div class="nav-card mb-3"><div class="d-flex flex-wrap gap-2 align-items-center"><b class="me-2"><i class="bi bi-eye-fill me-1 text-primary"></i>Vista previa con respuestas</b>${[1, 2].map(p => `<button class="btn-chip ${AD.pvP === p ? 'on' : ''}" data-pvp="${p}">Parcial ${p}</button>`).join('')}${['A', 'B', 'C'].map(t => `<button class="btn-chip ${AD.pvT === t ? 'on' : ''}" style="--c:#0891b2" data-pvt="${t}">Tipo ${t}</button>`).join('')}<button class="btn btn-outline-secondary btn-sm rounded-pill fw-bold ms-auto" data-pvnew><i class="bi bi-shuffle me-1"></i>Otra muestra al azar</button></div><div class="small text-muted mt-2">Así lo ve un alumno (${ex.length} preguntas); la respuesta correcta aparece marcada. No se guarda nada.</div></div><div style="max-width:860px;margin:auto">${html}</div>`;
}
document.addEventListener('click', e => {
  const p = e.target.closest('[data-pvp]'); if (p) { AD.pvP = +p.dataset.pvp; adPrev(); }
  const t = e.target.closest('[data-pvt]'); if (t) { AD.pvT = t.dataset.pvt; adPrev(); }
  if (e.target.closest('[data-pvnew]')) { AD.pvSeed = randBytes()[0] >>> 0; adPrev(); }
});

/* ===== Por alumno: vista previa del examen que entregó cada alumno, con aciertos (verde) y errores (rojo) =====
   Se reconstruye su examen con su tipo y su semilla y se le ponen sus respuestas (columna «Respuestas») y,
   si la usó, su hoja de procedimiento (columna «Procedimiento»). Se navega alumno por alumno. */
const parseResp = (s, ex) => { const a = {}; String(s || '').split(';').forEach(p => { const k = p.indexOf(':'); if (k < 1) return; const id = +p.slice(0, k), v = p.slice(k + 1), q = ex.find(x => x.id === id); if (!q || v === '-' || v === '') return; a[id] = q.kind === 'mc' ? String('ABCD'.indexOf(v)) : v; }); return a; };
const parseProc = s => { try { const o = JSON.parse(s || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
const HAS_PROC = typeof procCheck === 'function';
const aluKey = r => r.parcial + '|' + r.cuenta;
function aluList() {
  const q = (AD.aq || '').toLowerCase();
  return rowsSel().filter(r => r.estado === 'Entregado' && (!AD.grp || String(r.grupo || '') === AD.grp) && (!q || (r.nombre + ' ' + r.cuenta + ' ' + r.grupo).toLowerCase().includes(q)))
    .sort((a, b) => String(a.grupo).localeCompare(String(b.grupo), 'es', { numeric: true }) || String(a.nombre).localeCompare(String(b.nombre), 'es') || a.parcial - b.parcial);
}
/* Respuesta del alumno en una pregunta (con la correcta cuando falló) */
function revAns(q, v, P, ok) {
  let h = revAns0(q, v, P, ok); const k = HAS_PROC ? procKind(q) : '';
  if (!k) return h;
  const ck = procCheck(q, P, v), st = ck.done ? '<span class="pst ok"><i class="bi bi-check-circle-fill"></i> Completo</span>' : ck.used ? '<span class="pst pend"><i class="bi bi-exclamation-circle-fill"></i> Incompleto</span>' : '<span class="pst pend"><i class="bi bi-x-circle-fill"></i> No lo hizo</span>';
  if (k === 'tt') return h.replace('<!--PST-->', `<div class="mb-1"><b class="small text-muted">Procedimiento:</b> ${st}</div>`);
  return h + `<div class="proc rvp"><div class="rvp-h"><i class="bi bi-pencil-square me-1"></i>Su procedimiento ${st}</div>${ck.used ? `<div class="proc-b">${procBody(q, P, ck.R)}${ck.notes.length ? `<div class="rv-note">${ck.notes.map(esc).join('<br>')}</div>` : ''}</div>` : ''}</div>`;
}
function revAns0(q, v, P, ok) {
  const empty = v === undefined || v === null || v === '';
  if (q.kind === 'mc') return `<div class="${q.grid ? 'opt-grid' : ''}">` + q.opts.map((o, i) => { const me = !empty && +v === i, good = i === q.correct; return `<div class="opt rv ${me && good ? 'me-ok' : me ? 'me-bad' : good ? 'key' : ''}"><span class="mark">${'ABCD'[i]}</span><span class="flex-grow-1">${o}</span>${me ? `<span class="rv-tag ${good ? 'ok' : 'bad'}">${good ? '<i class="bi bi-check-lg"></i> Su respuesta' : '<i class="bi bi-x-lg"></i> Su respuesta'}</span>` : good ? '<span class="rv-tag ok">Correcta</span>' : ''}</div>`; }).join('') + '</div>' + (empty ? '<div class="rv-ans bad"><i class="bi bi-dash-circle me-1"></i>Sin responder</div>' : '');
  if (q.kind === 'tt' && HAS_PROC) { const ck = procCheck(q, P, v); return '<!--PST-->' + ttGrid(q, P || {}, ck.R, v || '') + (ck.notes.length ? `<div class="rv-note">${ck.notes.map(esc).join('<br>')}</div>` : '') + ''; }
  if (q.kind === 'fn') { const pr = fnParse(v || ''); return `<div class="rv-ans ${ok ? 'ok' : 'bad'}"><span>Escribió:</span> <b class="mono">${empty ? 'Sin responder' : 'F = ' + esc(v)}</b>${pr.ok ? ` <span class="small">(se lee como <span class="num">F = ${exprOf(pr.tree)}</span>)</span>` : !empty ? ` <span class="small">(${esc(pr.err || 'no se pudo leer')})</span>` : ''}</div>${ok ? '' : `<div class="rv-exp">Referencia: <b class="num">F = ${q.expect}</b> <span class="small text-muted">(o cualquier función equivalente)</span></div>`}`; }
  if (q.kind === 'circ') { const t = cbParse(v || ''); return `<div class="rv-ans ${ok ? 'ok' : 'bad'}"><span>Su circuito:</span>${empty ? ' <b>Sin responder</b>' : ''}</div>${t ? `<div class="circ-wrap rv-circ">${cbSVG(t)}</div>` : ''}${ok ? '' : `<div class="rv-exp">${circHTML(q, 'rv', true)}</div>`}`; }
  let h = `<div class="rv-ans ${ok ? 'ok' : 'bad'}"><span>Respondió:</span> <b class="mono">${empty ? 'Sin responder' : esc(String(v).replace(/_/g, '·'))}</b>${ok ? ' <i class="bi bi-check-circle-fill"></i>' : ''}</div>${ok ? '' : `<div class="rv-exp">Correcta: <b class="mono">${esc(q.expect)}</b></div>`}`;
  return h;
}
const opsTable = (OPS, alumnos) => {
  const arr = Object.entries(OPS).map(([k, o]) => ({ k, t: (typeof OPN !== 'undefined' && OPN[k]) || k, ...o, p: o.n ? o.ok / o.n * 100 : 0 })).filter(x => x.n).sort((a, b) => a.p - b.p);
  if (!arr.length) return '<div class="small text-muted">Sin procedimiento registrado.</div>';
  const col = p => p >= 80 ? '#16a34a' : p >= 60 ? '#d97706' : '#dc2626';
  return `<table class="table table-sm align-middle mb-0"><thead><tr><th>Operación</th><th class="text-center">Casillas</th>${alumnos ? '<th class="text-center">Alumnos</th>' : ''}<th>Acierto</th><th class="text-end">%</th></tr></thead><tbody>${arr.map(x => `<tr><td>${esc(x.t)}</td><td class="text-center">${x.ok}/${x.n}</td>${alumnos ? `<td class="text-center">${x.a ? x.a.size : ''}</td>` : ''}<td style="min-width:120px"><div class="mbar"><i style="width:${x.p.toFixed(1)}%;background:${col(x.p)}"></i></div></td><td class="text-end fw-bold text-nowrap" style="color:${col(x.p)}">${x.p.toFixed(0)} %</td></tr>`).join('')}</tbody></table>`;
};
function adAlumno() {
  const base = rowsSel().filter(r => r.estado === 'Entregado'), grupos = [...new Set(base.map(r => String(r.grupo || '')))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  if (AD.grp && !grupos.includes(AD.grp)) AD.grp = '';
  const L = aluList();
  if (AD.aluKey) { const k = L.findIndex(r => aluKey(r) === AD.aluKey); if (k >= 0) AD.ai = k; AD.aluKey = ''; }
  AD.ai = Math.max(0, Math.min(AD.ai || 0, L.length - 1));
  const grpBtns = grupos.length > 1 ? `<div class="d-flex flex-wrap gap-2 mb-3"><span class="small fw-bold text-muted align-self-center me-1">Grupo:</span>${[['', 'Todos'], ...grupos.map(g => [g, g || '(sin grupo)'])].map(([k, n]) => `<button class="btn-chip ${(AD.grp || '') === k ? 'on' : ''}" data-adgrp="${esc(k)}">${esc(n)}</button>`).join('')}</div>` : '';
  const nav = `<div class="nav-card mb-3"><div class="d-flex flex-wrap gap-2 align-items-center">
    <div class="input-group input-group-sm" style="max-width:260px"><span class="input-group-text"><i class="bi bi-search"></i></span><input id="ad-aq" class="form-control" placeholder="Buscar alumno" value="${esc(AD.aq || '')}" autocomplete="off"></div>
    <button class="btn btn-sm btn-outline-primary rounded-pill fw-bold" data-anav="-1" ${AD.ai <= 0 ? 'disabled' : ''} title="Alumno anterior (←)"><i class="bi bi-chevron-left"></i> Anterior</button>
    <select id="ad-asel" class="form-select form-select-sm" style="max-width:340px" aria-label="Elegir alumno">${L.map((r, i) => `<option value="${i}" ${i === AD.ai ? 'selected' : ''}>${esc((r.grupo ? r.grupo + ' · ' : '') + r.nombre)}${AD.par === '0' ? ' · P' + r.parcial : ''} · ${(+r.nota).toFixed(1)}</option>`).join('')}</select>
    <button class="btn btn-sm btn-outline-primary rounded-pill fw-bold" data-anav="1" ${AD.ai >= L.length - 1 ? 'disabled' : ''} title="Alumno siguiente (→)">Siguiente <i class="bi bi-chevron-right"></i></button>
    <span class="small text-muted fw-bold">${L.length ? AD.ai + 1 : 0} de ${L.length}</span>
    <div class="form-check form-switch ms-auto mb-0"><input class="form-check-input" type="checkbox" id="ad-aerr" ${AD.aerr ? 'checked' : ''}><label class="form-check-label small fw-bold" for="ad-aerr">Solo errores</label></div>
  </div></div>`;
  if (!L.length) { $('#ad-body').innerHTML = parBtns() + grpBtns + nav + '<div class="alert alert-info">No hay exámenes entregados con ese filtro.</div>'; aluBind(); return; }
  const r = L[AD.ai];
  if (!r.resp) { $('#ad-body').innerHTML = parBtns() + grpBtns + nav + '<div class="alert alert-warning">Para ver lo que contestó cada alumno actualiza el script de Apps Script (nueva versión de la implementación): el panel necesita la columna «Respuestas».</div>'; aluBind(); return; }
  let ex; try { ex = buildExam(+r.parcial, r.tipo, +r.seed, +r.total); } catch (e) { ex = null; }
  if (!ex || !ex.length) { $('#ad-body').innerHTML = parBtns() + grpBtns + nav + '<div class="alert alert-danger">No se pudo reconstruir el examen de este alumno (falta su semilla).</div>'; aluBind(); return; }
  const ans = parseResp(r.resp, ex), PR = parseProc(r.proc), det = String(r.det || ''), secs = EXAMS[r.parcial].secs;
  const SEC = {}, OPS = {}; let html = '', last = '', shown = 0;
  ex.forEach((q, i) => {
    const v = ans[q.id], empty = v === undefined || v === '', ok = det[i] !== undefined ? det[i] === '1' : gradeQ(q, v), sec = secs.find(s => s.id === q.sec) || { t: q.sec, c: '#64748b', ic: 'bi-question' }, P = PR[q.id] || PR[String(q.id)] || {};
    if (!q.bonus) { const o = SEC[q.sec] = SEC[q.sec] || { t: sec.t, c: sec.c, n: 0, ok: 0 }; o.n++; if (ok) o.ok++; }
    if (HAS_PROC && procKind(q)) Object.entries(procCheck(q, P, v).ops).forEach(([k, o]) => { const t = OPS[k] = OPS[k] || { n: 0, ok: 0 }; t.n += o.n; t.ok += o.ok; });
    if (AD.aerr && ok) return;
    if (q.sec !== last) { last = q.sec; html += `<div class="sec-head" style="--c:${sec.c}"><div class="sec-ico"><i class="bi ${sec.ic}"></i></div><div><h2 class="h6 fw-bold mb-0">${sec.t}</h2></div></div>`; }
    const st = ok ? 'ok' : empty ? 'none' : 'bad'; shown++;
    html += `<div class="qcard rvq ${st}" style="--c:${sec.c}"><div class="d-flex align-items-start gap-2"><span class="qnum">${q.id}</span><div class="flex-grow-1" style="min-width:0"><div class="d-flex flex-wrap gap-1 mb-1"><span class="rv-st ${st}">${ok ? '<i class="bi bi-check-circle-fill"></i> Correcta' : empty ? '<i class="bi bi-dash-circle-fill"></i> Sin responder' : '<i class="bi bi-x-circle-fill"></i> Incorrecta'}</span>${q.bl ? `<span class="bl bl-${q.bl}">${q.bl}</span>` : ''}${q.bonus && q.bl !== 'Bonus' ? '<span class="rv-st bon">Bonus</span>' : ''}</div><div class="qtext">${q.html}</div>${revAns(q, v, P, ok)}</div></div></div>`;
  });
  const nb = ex.filter(q => !q.bonus).length, okb = Object.values(SEC).reduce((s, o) => s + o.ok, 0), pc = +r.nota * 10, col = pc >= 60 ? '#16a34a' : '#dc2626';
  const secRows = Object.values(SEC).map(o => { const p = o.n ? o.ok / o.n * 100 : 0, c = p >= 80 ? '#16a34a' : p >= 60 ? '#d97706' : '#dc2626'; return `<tr><td><span class="mdot" style="background:${o.c}"></span>${esc(o.t)}</td><td class="text-center">${o.ok}/${o.n}</td><td style="min-width:110px"><div class="mbar"><i style="width:${p.toFixed(1)}%;background:${c}"></i></div></td><td class="text-end fw-bold text-nowrap" style="color:${c}">${p.toFixed(0)} %</td></tr>`; }).join('');
  const pq = HAS_PROC ? ex.filter(q => procKind(q) && ans[q.id] !== undefined && ans[q.id] !== '') : [], pdn = pq.filter(q => procDone(q, PR[q.id] || {})).length;
  $('#ad-body').innerHTML = parBtns() + grpBtns + nav + `<div class="nav-card mb-3"><div class="d-flex flex-wrap gap-3 align-items-center">
      <div class="grade-ring" style="--p:${pc};--gc:${col};width:96px;height:96px"><b style="color:${col}">${(+r.nota).toFixed(1)}</b><small class="text-muted fw-bold">de 10</small></div>
      <div class="flex-grow-1" style="min-width:220px"><div class="h5 fw-bold mb-1">${esc(r.nombre)}</div><div class="small text-muted">Cuenta <b class="mono">${esc(r.cuenta)}</b> · Grupo <b>${esc(r.grupo)}</b> · P${r.parcial} · Tipo ${esc(r.tipo)}</div>
        <div class="small mt-1">${r.aciertos} aciertos de ${r.total} · Tiempo <b class="mono">${tiempoOf(r) || '—'}</b> · Salidas <b>${r.salidas === '' ? '—' : r.salidas}</b>${r.motivo === 'admin' ? ' · <span class="badge text-bg-warning">Cerrado por el profesor(a)</span>' : r.motivo === 'tiempo' ? ' · <span class="badge text-bg-secondary">Se acabó el tiempo</span>' : ''} · Entregó ${fmtDT(r.entrega)}</div></div></div></div>
    <div class="row g-3 mb-3"><div class="col-lg-${HAS_PROC ? 6 : 12}"><div class="nav-card h-100"><b class="d-block mb-2"><i class="bi bi-diagram-3-fill me-1 text-primary"></i>Aciertos por bloque</b><table class="table table-sm align-middle mb-0"><tbody>${secRows}</tbody></table></div></div>
    ${HAS_PROC ? `<div class="col-lg-6"><div class="nav-card h-100"><b class="d-block mb-2"><i class="bi bi-pencil-square me-1 text-primary"></i>Operaciones de su procedimiento <span class="small text-muted fw-normal">(${pdn} de ${pq.length} procedimientos completos)</span></b>${opsTable(OPS)}</div></div>` : ''}</div>
    <div class="small text-muted mb-2"><span class="rv-st ok">Verde</span> = bien · <span class="rv-st bad">Rojo</span> = mal (abajo, en pequeño, lo que se esperaba)${HAS_PROC ? ' · En el procedimiento una casilla es correcta si coincide con el resultado correcto o con lo que sale de los datos que el propio alumno escribió en el paso anterior (un error no se cuenta dos veces).' : ''}</div>
    ${html || '<div class="alert alert-success fw-bold">Todas sus respuestas fueron correctas.</div>'}`;
  aluBind();
}
function aluBind() {
  const q = $('#ad-aq'); if (q) q.addEventListener('input', e => { AD.aq = e.target.value; AD.ai = 0; const p = e.target.selectionStart; adAlumno(); const n = $('#ad-aq'); n.focus(); n.setSelectionRange(p, p); });
  const s = $('#ad-asel'); if (s) s.addEventListener('change', e => { AD.ai = +e.target.value; adAlumno(); window.scrollTo({ top: 0 }); });
  const t = $('#ad-aerr'); if (t) t.addEventListener('change', e => { AD.aerr = e.target.checked; adAlumno(); });
}
document.addEventListener('click', e => {
  const n = e.target.closest('[data-anav]'); if (n) { AD.ai = (AD.ai || 0) + +n.dataset.anav; adAlumno(); window.scrollTo({ top: 0 }); }
  const v = e.target.closest('[data-aver]'); if (v) { AD.tab = 'alu'; AD.aluKey = v.dataset.aver; AD.grp = ''; AD.aq = ''; renderAdmin(); window.scrollTo({ top: 0 }); }
});
document.addEventListener('keydown', e => {
  if (AD.tab !== 'alu' || $('#scr-admin').classList.contains('d-none') || /INPUT|SELECT|TEXTAREA/.test((e.target.tagName || ''))) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const L = aluList().length, d = e.key === 'ArrowLeft' ? -1 : 1, k = (AD.ai || 0) + d; if (k >= 0 && k < L) { AD.ai = k; adAlumno(); window.scrollTo({ top: 0 }); } }
});
