/* ============================================================
   Dashboard CCH — Frontend (JS puro + Bootstrap 5.3)
   ------------------------------------------------------------
   Vista ALUMNO:  asistencia · calificaciones (con popover de puntos
                  adicionales) · registro de equipos · evidencias
   Panel ADMIN:   asistencia (faltas en rojo) · captura · ponderaciones
                  · proyectos con estrellas · evidencias · alumnos
                  (ficha + comentarios) · grupos
   Toda la comunicación es POST (text/plain) al Web App de Apps Script.
   ============================================================ */

const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzRIZgmBVjWmPli3DObrzo-JZqyVhP3ePja0aRz_q4gdusi4S37Ad1aT4m4UZ2AsbAx/exec",
  REQUEST_TIMEOUT_MS: 45000,
  SEARCH_DEBOUNCE_MS: 200,
  RISK_THRESHOLD: 6,        // calificación menor a esto = en riesgo
  FALTAS_UMBRAL: 4,         // más de 4 faltas → número de cuenta en rojo pastel
  FALTAS_MAX_TONO: 8,       // a partir de umbral + 8 faltas el rojo ya no se intensifica
  IMAGE_MAX_PX: 1800,       // fotos grandes se reducen antes de subir
  PREFS_KEY: "cch.prefs",
  SESSION_KEY: "cch.session"
};

/* ============================================================
   ALMACENAMIENTO (siempre con try/catch: la página funciona sin él)
   ============================================================ */
const Prefs = {
  defaults: {
    theme: "auto",          // auto | light | dark
    compact: false,         // tablas compactas
    rows: 60,               // alumnos visibles por tabla antes del scroll (0 = todos)
    showHidden: true,       // admin: mostrar columnas "Oculto" del reporte
    remember: false,        // recordar el número de cuenta del alumno
    cuenta: "",
    stuTab: "avance",
    admTab: "asistencia",
    admGroup: "",
    evFilter: "Pendiente",
    cache: true
  },
  data: {},
  load() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CONFIG.PREFS_KEY) || "{}"); } catch (e) { saved = {}; }
    this.data = Object.assign({}, this.defaults, saved);
  },
  get(key) { return this.data[key]; },
  set(key, value) {
    this.data[key] = value;
    try { localStorage.setItem(CONFIG.PREFS_KEY, JSON.stringify(this.data)); } catch (e) { /* sin almacenamiento */ }
  },
  reset() {
    this.data = Object.assign({}, this.defaults);
    try { localStorage.removeItem(CONFIG.PREFS_KEY); } catch (e) { /* nada */ }
  }
};

const Session = {
  data: {},
  load() {
    try { this.data = JSON.parse(sessionStorage.getItem(CONFIG.SESSION_KEY) || "{}"); } catch (e) { this.data = {}; }
  },
  save() {
    try { sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(this.data)); } catch (e) { /* solo en memoria */ }
  },
  get(key) { return this.data[key] || null; },
  set(key, value) { this.data[key] = value; this.save(); },
  clear(key) { if (key) delete this.data[key]; else this.data = {}; this.save(); }
};

/* ============================================================
   UTILIDADES DOM
   ============================================================ */
const $ = (id) => document.getElementById(id);

/** Crea elementos sin innerHTML: h("div", { class: "x", onclick: fn }, hijos…) */
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      if (key === "class") el.className = value;
      else if (key === "text") el.textContent = value;
      else if (key === "style" && typeof value === "object") Object.assign(el.style, value);
      else if (key === "dataset") Object.assign(el.dataset, value);
      else if (key === "value") el.value = value;
      else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value);
      else if (value === true) el.setAttribute(key, "");
      else el.setAttribute(key, value);
    });
  }
  children.flat(Infinity).forEach(child => {
    if (child === null || child === undefined || child === false) return;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return el;
}

/** Hijos sin null/false (replaceChildren convertiría null en el texto "null"). */
const kids = (...list) => list.flat(Infinity).filter(x => x !== null && x !== undefined && x !== false);

const icon = (name, cls = "") => h("i", { class: `bi bi-${name} ${cls}`.trim(), "aria-hidden": "true" });

const Fmt = {
  grade(n) { return n === null || n === undefined ? "—" : Number(n).toFixed(1); },
  /** Entero sin redondear (trunca): 7.96 → 7. */
  int(n) { return n === null || n === undefined || !isFinite(n) ? "" : String(Math.floor(Number(n) + 1e-9)); },
  num(n) { return n === null || n === undefined ? "—" : String(Math.round(n * 100) / 100); },
  date(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  },
  escape(text) {
    return String(text ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  },
  normalize(value) {
    return String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
};

function debounce(fn, wait) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
}

/* ============================================================
   API
   ============================================================ */
const Api = {
  async call(action, params = {}, auth = null) {
    const token = auth === "admin" ? Session.get("admin")
      : auth === "student" ? (Session.get("student") || {}).token
      : undefined;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(Object.assign({ action, token }, params)),
        signal: controller.signal
      });
    } catch (error) {
      throw new Error(error.name === "AbortError" ? "El servidor tardó demasiado en responder." : "No fue posible conectar con el servidor.");
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) throw new Error(`El servidor respondió con error ${response.status}.`);

    let result;
    try { result = await response.json(); } catch (e) { throw new Error("La respuesta del servidor no es válida."); }

    if (auth === "admin" && !READ_ACTIONS.has(action)) { Cache.clear("g:"); Cache.clear("boot"); }

    if (result.status !== "success") {
      const error = new Error(result.message || "Ocurrió un error inesperado.");
      error.code = result.code;
      if (result.code === "AUTH") App.sessionExpired(auth, error.message);
      throw error;
    }
    return result;
  }
};

/* ============================================================
   UI GENERAL
   ============================================================ */
const UI = {
  toast(type, message, delay = 5000) {
    const colors = { success: "text-bg-success", danger: "text-bg-danger", warning: "text-bg-warning", info: "text-bg-dark" };
    const el = h("div", { class: `toast align-items-center border-0 ${colors[type] || colors.info}`, role: "alert", "aria-atomic": "true" },
      h("div", { class: "d-flex" },
        h("div", { class: "toast-body", style: { whiteSpace: "pre-line" }, text: message }),
        h("button", { type: "button", class: `btn-close ${type === "warning" ? "" : "btn-close-white"} me-2 m-auto`, "data-bs-dismiss": "toast", "aria-label": "Cerrar" })
      ));
    $("toasts").append(el);
    const toast = new bootstrap.Toast(el, { delay: type === "danger" ? 9000 : delay });
    el.addEventListener("hidden.bs.toast", () => el.remove());
    toast.show();
  },

  loading(target, text = "Cargando…") {
    target.replaceChildren(h("div", { class: "loading" }, h("span", { class: "spinner-border spinner-border-sm me-2" }), text));
  },

  empty(iconName, text) {
    return h("div", { class: "empty-state" }, icon(iconName), text);
  },

  /** Botón con spinner mientras corre la promesa. */
  async busy(button, fn) {
    const original = Array.from(button.childNodes).map(n => n.cloneNode(true));
    button.disabled = true;
    button.replaceChildren(h("span", { class: "spinner-border spinner-border-sm me-1" }), "Espera…");
    try { return await fn(); }
    finally { button.replaceChildren(...original); button.disabled = false; }
  },

  /** Modal genérico: devuelve { close } */
  modal({ title, body, footer = [], size = "" }) {
    const dialog = $("modal-generic-dialog");
    dialog.className = `modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`;
    $("modal-generic-title").replaceChildren(...[].concat(title));
    $("modal-generic-body").replaceChildren(...[].concat(body));
    $("modal-generic-footer").replaceChildren(...[].concat(footer));
    $("modal-generic-footer").classList.toggle("d-none", !footer.length);
    const instance = bootstrap.Modal.getOrCreateInstance($("modal-generic"));
    instance.show();
    return { close: () => instance.hide() };
  },

  confirm(message, { okText = "Aceptar", danger = false } = {}) {
    return new Promise(resolve => {
      let answered = false;
      const ok = h("button", { class: `btn ${danger ? "btn-danger" : "btn-primary"}`, type: "button", text: okText });
      const cancel = h("button", { class: "btn btn-secondary", type: "button", "data-bs-dismiss": "modal", text: "Cancelar" });
      const m = UI.modal({ title: "Confirmar", body: h("p", { class: "mb-0", style: { whiteSpace: "pre-line" }, text: message }), footer: [cancel, ok] });
      ok.addEventListener("click", () => { answered = true; m.close(); resolve(true); });
      $("modal-generic").addEventListener("hidden.bs.modal", () => { if (!answered) resolve(false); }, { once: true });
    });
  },

  /** Confirmación fuerte: el botón solo se habilita al escribir `word` exacto. Devuelve true/false. */
  confirmTyped({ title, body, word, okText = "Confirmar" }) {
    return new Promise(resolve => {
      let answered = false;
      const input = h("input", { class: "form-control mono", id: "confirm-word", autocomplete: "off", placeholder: word });
      const ok = h("button", { class: "btn btn-danger", type: "button", disabled: true }, icon("exclamation-triangle", "me-1"), okText);
      input.addEventListener("input", () => { ok.disabled = input.value.trim() !== word; });
      const m = UI.modal({
        title: [icon("exclamation-octagon-fill", "text-danger me-2"), title],
        body: h("div", {}, body,
          h("label", { class: "form-label mt-3", for: "confirm-word" }, "Para continuar escribe ", h("b", { class: "mono text-danger", text: word })),
          input),
        footer: [h("button", { class: "btn btn-secondary", type: "button", "data-bs-dismiss": "modal", text: "Cancelar" }), ok]
      });
      setTimeout(() => input.focus(), 300);
      ok.addEventListener("click", () => { answered = true; m.close(); resolve(true); });
      $("modal-generic").addEventListener("hidden.bs.modal", () => { if (!answered) resolve(false); }, { once: true });
    });
  },

  disposePopovers(root) {
    root.querySelectorAll("[data-pop]").forEach(el => {
      const instance = bootstrap.Popover.getInstance(el);
      if (instance) instance.dispose();
    });
  },

  /** Popover accesible (hover/foco/toque). content = HTML YA escapado. */
  popover(el, title, contentHtml) {
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.dataset.pop = "1";
    new bootstrap.Popover(el, { title, content: contentHtml, html: true, trigger: "hover focus", placement: "top", container: "body" });
  }
};

/* ---------- Piezas compartidas ---------- */
const Parts = {
  /** Estado → símbolo minimalista. Retardo (datos viejos) se muestra como asistencia. */
  statusInfo(value) {
    const key = Fmt.normalize(value);
    const map = {
      asistencia: { sym: "✓", cls: "st-asistencia", label: "Asistencia" },
      retardo: { sym: "✓", cls: "st-asistencia", label: "Asistencia (retardo)" },
      falta: { sym: "✗", cls: "st-falta", label: "Falta" },
      justificante: { sym: "J", cls: "st-justificante", label: "Justificante" },
      justificada: { sym: "J", cls: "st-justificante", label: "Justificante" },
      justificado: { sym: "J", cls: "st-justificante", label: "Justificante" },
      "n/d": { sym: "·", cls: "st-nd", label: "Sin lista" }
    };
    if (!key) return { sym: "", cls: "", label: "Sin registro" };
    return map[key] || { sym: String(value).slice(0, 3), cls: "st-otro", label: String(value) };
  },

  statusCell(value, dateLabel) {
    const info = Parts.statusInfo(value);
    return h("td", { class: `st ${info.cls}`, title: dateLabel ? `${dateLabel} · ${info.label}` : info.label, "aria-label": info.label, text: info.sym });
  },

  /** Tabla de una fila: cuenta (rojo por faltas) + una celda por fecha. */
  attendanceStrip(cuenta, dates, faltas) {
    const cell = h("td", { class: "sticky-col cuenta-cell", text: cuenta });
    Parts.applyFaltas(cell, faltas);
    return h("div", { class: "table-wrap auto-h" }, h("table", { class: "table table-bordered table-cch att-table mb-0" },
      h("thead", {}, h("tr", {}, h("th", { class: "sticky-col", text: "Cuenta" }), dates.map(d => h("th", { text: d.label })))),
      h("tbody", {}, h("tr", {}, cell, dates.map(d => Parts.statusCell(d.status, d.label))))));
  },

  pct(counts) {
    const total = counts.asistencia + counts.falta;
    return total ? Math.round(counts.asistencia / total * 100) : null;
  },

  /** Rojo pastel que se intensifica con cada falta por encima del umbral. */
  applyFaltas(cell, faltas) {
    if (!faltas || faltas <= CONFIG.FALTAS_UMBRAL) return;
    const level = Math.min(faltas - CONFIG.FALTAS_UMBRAL, CONFIG.FALTAS_MAX_TONO);
    const lightness = 94 - level * 3;            // 91% (5 faltas) … 70% (12+)
    const saturation = 70 + level * 2;
    cell.style.setProperty("background", `hsl(0 ${saturation}% ${lightness}%)`, "important");
    cell.classList.add("alert-faltas");
    cell.title = `${faltas} faltas`;
  },

  legend() {
    return h("div", { class: "legend" },
      h("span", { class: "st-asistencia", text: "✓ Asistencia" }),
      h("span", { class: "st-falta", text: "✗ Falta" }),
      h("span", { class: "st-justificante", text: "J Justificante" }),
      h("span", { class: "st-nd", text: "· Sin lista" }),
      h("span", { class: "border", style: { background: "hsl(0 74% 88%)", color: "#7f1d1d" }, text: `> ${CONFIG.FALTAS_UMBRAL} faltas` })
    );
  },

  starsReadonly(value) {
    const n = Number(value) || 0;
    const wrap = h("span", { class: "stars readonly", "aria-label": `${n} de 5 estrellas` });
    for (let i = 1; i <= 5; i++) wrap.append(icon(i <= n ? "star-fill" : "star", i <= n ? "on" : "off"));
    wrap.append(h("span", { class: `stars-score ${n >= 4 ? "hi" : n >= 3 ? "mid" : n ? "lo" : ""}`, text: `${n}/5` }));
    return wrap;
  },

  /** Estrellas editables; onChange(n). Clic en la misma estrella = 0. */
  starsInput(value, onChange, label) {
    let current = Number(value) || 0;
    const wrap = h("span", { class: "stars", role: "radiogroup", "aria-label": label });
    const paint = () => wrap.querySelectorAll("button").forEach((b, i) => {
      b.classList.toggle("on", i < current);
      b.firstChild.className = `bi bi-${i < current ? "star-fill" : "star"}`;
      b.setAttribute("aria-checked", String(i + 1 === current));
    });
    for (let i = 1; i <= 5; i++) {
      wrap.append(h("button", {
        type: "button", role: "radio", "aria-label": `${i} estrella${i > 1 ? "s" : ""}`,
        onclick: () => { current = current === i ? 0 : i; paint(); onChange(current); }
      }, icon("star")));
    }
    paint();
    return wrap;
  },

  /** HTML (escapado) del popover de puntos adicionales. */
  bonusHtml(item, comp) {
    const rows = item.bonusItems.map(b =>
      `<div class="d-flex justify-content-between gap-3"><span>${Fmt.escape(b.titulo)} <small class="text-body-secondary">(${Fmt.escape(b.tipo)})</small></span><b>+${Fmt.escape(Fmt.num(b.puntos))}</b></div>` +
      `<div class="small text-body-secondary mb-1">Aplicado ${Fmt.escape(Fmt.date(b.aplicado))}</div>`
    ).join("");
    const note = item.base === null
      ? `<div class="small mt-1 text-warning-emphasis">Se sumarán cuando haya calificación en ${Fmt.escape(comp.nombre)}.</div>`
      : `<div class="small mt-1 border-top pt-1">${Fmt.escape(Fmt.num(item.base))} + ${Fmt.escape(Fmt.num(item.bonus))} = ${Fmt.escape(Fmt.num(item.raw))} / ${comp.maximo}${item.base + item.bonus > comp.maximo ? " (tope)" : ""}</div>`;
    return rows + note;
  },

  /** Etiqueta "+0.5" con su popover (para la captura del admin). */
  bonusTag(item, comp) {
    if (!item || !(item.bonus > 0)) return null;
    const tag = h("span", { class: "bonus-tag" }, icon("stars"), `+${Fmt.num(item.bonus)}`);
    UI.popover(tag, "Puntos adicionales aplicados ✅", Parts.bonusHtml(item, comp));
    return tag;
  },

  /** Calificación (escala 10) con popover sobre ella si tiene puntos adicionales. */
  gradeWithBonus(item, comp) {
    const wrap = h("span", { class: "d-inline-flex align-items-center gap-1" });
    const low = item && item.score10 !== null && item.score10 < CONFIG.RISK_THRESHOLD;
    wrap.append(h("span", { class: `fw-semibold ${low ? "grade-low" : ""}`, text: Fmt.grade(item ? item.score10 : null) }));

    if (item && item.bonus > 0) {
      wrap.append(h("span", { class: "bonus-tag" }, icon("stars"), `+${Fmt.num(item.bonus)}`));
      wrap.classList.add("grade-with-bonus");
      UI.popover(wrap, "Puntos adicionales aplicados ✅", Parts.bonusHtml(item, comp));
    }
    return wrap;
  }
};

/* ============================================================
   EXCEL (.xlsx) SIN LIBRERÍAS
   Lee y escribe hojas sencillas (texto y números). Para leer usa
   DecompressionStream (Chrome, Edge, Firefox y Safari actuales).
   ============================================================ */
const Xlsx = {
  _crc: null,
  crc32(bytes) {
    if (!Xlsx._crc) {
      Xlsx._crc = new Uint32Array(256);
      for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; Xlsx._crc[n] = c >>> 0; }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = Xlsx._crc[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  },

  /** ZIP sin compresión (Excel lo abre sin problema). files: [{ name, text }] */
  zip(files) {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    files.forEach(f => {
      const name = enc.encode(f.name), data = enc.encode(f.text), crc = Xlsx.crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
      local.setUint16(8, 0, true); local.setUint32(14, crc, true); local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true); local.setUint16(26, name.length, true);
      parts.push(new Uint8Array(local.buffer), name, data);
      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true);
      cd.setUint32(16, crc, true); cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true);
      cd.setUint16(28, name.length, true); cd.setUint32(42, offset, true);
      central.push(new Uint8Array(cd.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  },

  async unzip(buffer) {
    const view = new DataView(buffer), bytes = new Uint8Array(buffer), dec = new TextDecoder();
    let eocd = -1;
    for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd === -1) throw new Error("El archivo no es un Excel (.xlsx) válido.");
    const count = view.getUint16(eocd + 10, true);
    let p = view.getUint32(eocd + 16, true);
    const out = {};
    for (let n = 0; n < count; n++) {
      const method = view.getUint16(p + 10, true), csize = view.getUint32(p + 20, true);
      const nameLen = view.getUint16(p + 28, true), extraLen = view.getUint16(p + 30, true), commentLen = view.getUint16(p + 32, true);
      const localOff = view.getUint32(p + 42, true);
      const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
      const start = localOff + 30 + view.getUint16(localOff + 26, true) + view.getUint16(localOff + 28, true);
      const raw = bytes.subarray(start, start + csize);
      if (method === 0) out[name] = raw;
      else if (method === 8) {
        if (typeof DecompressionStream === "undefined") throw new Error("Tu navegador no puede leer Excel; actualízalo o usa CSV.");
        const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        out[name] = new Uint8Array(await new Response(stream).arrayBuffer());
      }
      p += 46 + nameLen + extraLen + commentLen;
    }
    return out;
  },

  colIndex(ref) { let n = 0; for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; },
  colName(i) { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; },
  esc(t) { return String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); },

  /** → [{ name, rows: [[valor, …], …] }] */
  async read(file) {
    const files = await Xlsx.unzip(await file.arrayBuffer());
    const dec = new TextDecoder();
    const xml = name => files[name] ? new DOMParser().parseFromString(dec.decode(files[name]), "application/xml") : null;
    const all = (doc, tag) => Array.from(doc.getElementsByTagNameNS("*", tag));
    const shared = [];
    const ss = xml("xl/sharedStrings.xml");
    if (ss) all(ss, "si").forEach(si => shared.push(all(si, "t").map(t => t.textContent).join("")));
    const wb = xml("xl/workbook.xml"), rels = xml("xl/_rels/workbook.xml.rels");
    if (!wb) throw new Error("El archivo no es un Excel (.xlsx) válido.");
    const target = {};
    if (rels) all(rels, "Relationship").forEach(r => { target[r.getAttribute("Id")] = r.getAttribute("Target"); });
    return all(wb, "sheet").map((sh, i) => {
      const rid = sh.getAttribute("r:id") || sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      let path = target[rid] || `worksheets/sheet${i + 1}.xml`;
      path = path.startsWith("/") ? path.slice(1) : "xl/" + path.replace(/^\.\//, "");
      const doc = xml(path);
      const rows = [];
      if (doc) all(doc, "row").forEach(row => {
        const r = Number(row.getAttribute("r")) - 1;
        const arr = rows[r] || (rows[r] = []);
        all(row, "c").forEach(c => {
          const t = c.getAttribute("t"), v = all(c, "v")[0];
          let value = v ? v.textContent : "";
          if (t === "s") value = shared[Number(value)] || "";
          else if (t === "inlineStr") value = all(c, "t").map(x => x.textContent).join("");
          else if (t === "b") value = value === "1";
          else if (t !== "str" && value !== "" && !isNaN(Number(value))) value = Number(value);
          arr[Xlsx.colIndex(c.getAttribute("r"))] = value;
        });
      });
      return { name: sh.getAttribute("name"), rows: Array.from(rows, r => r || []) };
    });
  },

  /**
   * sheets: [{ name, rows: [[celda…]], widths: [n…], header: true }]
   * celda: valor o { v, s } con s = "head" | "miss" (amarillo) | undefined
   */
  write(sheets) {
    const styleIx = { head: 1, miss: 2 };
    const sheetXml = sh => {
      const rows = sh.rows.map((row, r) => `<row r="${r + 1}">` + row.map((cell, c) => {
        const o = cell !== null && typeof cell === "object" ? cell : { v: cell };
        const ref = Xlsx.colName(c) + (r + 1);
        const st = o.s ? ` s="${styleIx[o.s]}"` : "";
        if (o.v === "" || o.v === null || o.v === undefined) return `<c r="${ref}"${st}/>`;
        if (typeof o.v === "number" && isFinite(o.v)) return `<c r="${ref}"${st}><v>${o.v}</v></c>`;
        return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${Xlsx.esc(o.v)}</t></is></c>`;
      }).join("") + "</row>").join("");
      const cols = (sh.widths || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
      const pane = sh.header ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : "";
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols ? `<cols>${cols}</cols>` : ""}<sheetData>${rows}</sheetData></worksheet>`;
    };
    const files = [
      { name: "[Content_Types].xml", text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") + "</Types>" },
      { name: "_rels/.rels", text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: "xl/workbook.xml", text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map((sh, i) => `<sheet name="${Xlsx.esc(String(sh.name).replace(/[\\/?*[\]:]/g, " ").slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") + "</sheets></workbook>" },
      { name: "xl/_rels/workbook.xml.rels", text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: "xl/styles.xml", text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF212529"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF3CD"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf fillId="3" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' }
    ].concat(sheets.map((sh, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, text: sheetXml(sh) })));
    return Xlsx.zip(files);
  },

  download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = h("a", { href: url }); a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
};

/* ============================================================
   CACHÉ DEL PANEL (localStorage)
   Muestra al instante lo último que viste y actualiza en segundo plano.
   Se borra al guardar algo, al presionar Salir y desde Preferencias.
   ============================================================ */
const Cache = {
  PREFIX: "cch.cache.",
  TTL_MS: 12 * 60 * 60 * 1000,
  on() { return Prefs.get("cache") !== false; },
  get(key) {
    if (!Cache.on()) return null;
    try {
      const x = JSON.parse(localStorage.getItem(Cache.PREFIX + key) || "null");
      return x && Date.now() - x.t < Cache.TTL_MS ? x : null;
    } catch (e) { return null; }
  },
  set(key, data) {
    if (!Cache.on()) return;
    const value = JSON.stringify({ t: Date.now(), d: data });
    try { localStorage.setItem(Cache.PREFIX + key, value); }
    catch (e) { Cache.clear(); try { localStorage.setItem(Cache.PREFIX + key, value); } catch (e2) { /* sin espacio */ } }
  },
  clear(prefix = "") {
    try {
      Object.keys(localStorage).filter(k => k.startsWith(Cache.PREFIX + prefix)).forEach(k => localStorage.removeItem(k));
    } catch (e) { /* nada */ }
  }
};

// Acciones que solo leen; cualquier otra acción de admin invalida la caché de grupos
const READ_ACTIONS = new Set(["adminBootstrap", "groupData", "listEvidence", "columnsInfo", "studentProfile", "searchStudents", "maintenanceInfo", "backupPreview", "diagnose", "getReports", "adminLogin", "studentLogin", "studentData", "ping", "logout"]);

/* ============================================================
   EXPORTAR A PSI (psi.cch.unam.mx)
   Calcula sugerencias por alumno y genera un JS que se pega en la
   consola de la página del grupo en PSI. Empata por número de cuenta
   (solo dígitos). No presiona "Guardar": el profesor revisa y guarda.
   Campos PSI: c_ (avance), a_ (% asistencia), tareas_, dificultades_,
   asistencias_, atenci1-4 + motivo1-4 (derivación), r_ (riesgo).
   ============================================================ */
const Psi = {
  // Palabras en tus comentarios que sugieren situación psicoemocional
  KEYWORDS: /ansiedad|depresi|emocion|psic|autis|internad|hospital|salud|duelo|famili|enferm|crisis|bullying|acoso|llant|estr[eé]s|tdah|discapacidad|violencia/i,
  TAREAS: { "-1": "—", "1": "SI", "0": "NO", "4": "OCASIONAL", "5": "NO SE DEJAN" },
  RIESGO: { "0": ["Ninguno", "text-bg-light border"], "1": ["Bajo", "text-bg-info"], "2": ["Medio", "text-bg-warning"], "3": ["Alto", "text-bg-danger"] },
  AREAS: { 1: "Tutoría", 2: "Asesoría", 3: "Psicopedagogía", 4: "Actividad extracurricular" },

  /** Faltas seguidas al final (ignora días sin lista). */
  trailingAbsences(statuses) {
    let n = 0;
    for (let i = statuses.length - 1; i >= 0; i--) {
      const k = Fmt.normalize(statuses[i]);
      if (!k || k === "n/d") continue;
      if (k === "falta") n++; else break;
    }
    return n;
  },

  suggest(s, opts) {
    const c = s.counts || { asistencia: 0, falta: 0, justificante: 0 };
    const total = c.asistencia + c.falta;
    const pct = total ? Math.round(c.asistencia / total * 100) : null;
    const streak = Psi.trailingAbsences(s.statuses || []);
    const final = s.final;

    let asis = "";
    if (total && c.asistencia === 0) asis = "Nunca se presentó";
    else if (total && streak >= opts.dejoN) asis = "Dejó de asistir";
    else if (c.falta > 3) asis = "Más de tres faltas";
    else if (total) asis = "Asiste siempre";

    const avance = asis === "Nunca se presentó" ? "NP"
      : final === null || final === undefined ? "" : String(Math.min(10, Math.max(5, Math.floor(final + 1e-9))));

    let tareas = "-1";
    if (opts.tareas === "none") tareas = "5";
    else if (opts.tareas) {
      const it = s.items[opts.tareas];
      const v = it ? it.score10 : null;
      tareas = v === null || v === undefined ? "-1" : v >= 8 ? "1" : v >= 5 ? "4" : "0";
    }

    const psico = Psi.KEYWORDS.test((s.notas || []).join(" "));
    const low = final !== null && final !== undefined && final < 6;
    const dif = psico ? "Psicoemocional" : (low || tareas === "0") ? "Académico" : (total || final !== null) ? "Ninguno" : "";

    let score = 0;
    if (low) score += 2; else if (final !== null && final < 7) score += 1;
    if (asis === "Nunca se presentó" || asis === "Dejó de asistir") score += 3;
    else if (c.falta > 3) score += 2; else if (c.falta >= 2) score += 1;
    if (tareas === "0") score += 1;
    if (psico) score += 1;
    const r = score >= 4 ? "3" : score >= 2 ? "2" : score >= 1 ? "1" : "0";

    const m = {};
    if (c.falta > 3 || asis === "Dejó de asistir" || asis === "Nunca se presentó") {
      m[1] = `${c.falta} faltas${pct !== null ? ` (${pct}% asistencia)` : ""}; seguimiento de asistencia`;
    }
    if (low) {
      const weak = opts.components
        .filter(cp => s.items[cp.id] && s.items[cp.id].score10 !== null && cp.ponderacion > 0)
        .sort((a, b) => s.items[a.id].score10 - s.items[b.id].score10)[0];
      m[2] = `Promedio ${final.toFixed(1)}${weak ? `; reforzar ${weak.nombre}` : ""}`;
    }
    if (psico) m[3] = "Situación psicoemocional reportada por el docente";
    if (opts.extra && final !== null && final >= 9 && (pct === null || pct >= 90)) m[4] = "Buen desempeño; invitar a actividad extracurricular";

    return { cuenta: String(s.cuenta).replace(/\D/g, ""), nombre: s.nombre, c: avance, a: pct, t: tareas, d: dif, s: asis, r, m, final, faltas: c.falta };
  },

  /** Texto sugerido para «Observaciones generales» y «Acciones a realizar». */
  groupText(rows, g) {
    const n = rows.length;
    const withPct = rows.filter(x => x.a !== null);
    const avgPct = withPct.length ? Math.round(withPct.reduce((a, x) => a + x.a, 0) / withPct.length) : null;
    const finals = rows.map(x => x.final).filter(v => v !== null && v !== undefined);
    const avg = finals.length ? (finals.reduce((a, b) => a + b, 0) / finals.length).toFixed(1) : null;
    const cnt = f => rows.filter(f).length;
    const destacados = cnt(x => x.final >= 9 && (x.a === null || x.a >= 90));
    const regulares = cnt(x => x.s === "Asiste siempre");
    const faltas = cnt(x => x.s === "Más de tres faltas");
    const dejo = cnt(x => x.s === "Dejó de asistir");
    const nunca = cnt(x => x.s === "Nunca se presentó");
    const bajos = cnt(x => x.final !== null && x.final < 6);
    const psico = cnt(x => x.d === "Psicoemocional");
    const alto = cnt(x => x.r === "3");
    const weak = {};
    rows.forEach(x => { const m = x.m[2] && x.m[2].match(/reforzar (.+)$/); if (m) weak[m[1]] = (weak[m[1]] || 0) + 1; });
    const weakTop = Object.keys(weak).sort((a, b) => weak[b] - weak[a])[0];

    const fort = [];
    if (regulares) fort.push(`${regulares} de ${n} asisten con regularidad`);
    if (destacados) fort.push(`${destacados} con desempeño destacado (promedio ≥ 9)`);
    const prob = [];
    if (faltas) prob.push(`${faltas} con más de tres faltas`);
    if (dejo) prob.push(`${dejo} dejaron de asistir`);
    if (nunca) prob.push(`${nunca} nunca se presentaron`);
    if (bajos) prob.push(`${bajos} con promedio menor a 6${weakTop ? ` (principalmente en ${weakTop})` : ""}`);
    if (psico) prob.push(`${psico} con situación psicoemocional reportada`);

    const obs = `Grupo de ${n} alumnos.` +
      (avgPct !== null ? ` Asistencia promedio ${avgPct}%.` : "") +
      (avg !== null ? ` Promedio actual del grupo ${avg}.` : "") +
      (fort.length ? ` Fortalezas: ${fort.join("; ")}.` : "") +
      (prob.length ? ` Problemáticas: ${prob.join("; ")}.` : " Sin problemáticas relevantes.") +
      (alto ? ` ${alto} alumno(s) en riesgo alto.` : "");

    const acc = [];
    if (faltas + dejo + nunca) acc.push(`Tutoría y seguimiento de asistencia a ${faltas + dejo + nunca} alumno(s); contactar a quienes dejaron de asistir.`);
    if (bajos) acc.push(`Asesoría académica a ${bajos} alumno(s)${weakTop ? `, reforzando ${weakTop}` : ""}.`);
    if (psico) acc.push(`Canalizar a psicopedagogía a ${psico} alumno(s).`);
    acc.push("Continuar con evaluación continua y retroalimentación oportuna.");
    return { obs, acc: acc.join(" ") };
  },

  /** JS para pegar en la consola de PSI. */
  script(rows, meta) {
    const data = {};
    rows.forEach(x => { data[x.cuenta] = { c: x.c, a: x.a, t: x.t, d: x.d, s: x.s, r: x.r, m: x.m }; });
    return `// Dashboard CCH → PSI · ${meta.label} · grupo ${meta.grupo} · ${meta.periodo} · ${new Date().toLocaleString("es-MX")}
// Pega en la consola (F12) de la página del grupo en psi.cch.unam.mx. NO guarda: revisa y presiona "Guardar".
(() => {
  const DATA = ${JSON.stringify(data)};
  const dig = v => String(v || "").replace(/\\D/g, "");
  const set = (name, v) => {
    const el = document.querySelector('[name="' + name + '"]');
    if (!el || v === undefined || v === null || v === "") return;
    el.value = String(v);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const enPSI = [...document.querySelectorAll('select[name^="c_"]')].map(s => dig(s.name));
  if (!enPSI.length) { console.warn("No encontré el formulario de PSI en esta página."); return; }
  const G = ${JSON.stringify(meta.header || {})};
  if (G.fecha) set("fecha", G.fecha);
  if (G.tipo !== undefined) set("tipo", G.tipo);
  if (G.obs) set("observaciones", G.obs);
  if (G.acc) set("acciones", G.acc);
  let llenados = 0; const sinDatos = [];
  enPSI.forEach(c => {
    const d = DATA[c];
    if (!d) { sinDatos.push(c); return; }
    set("c_" + c, d.c); set("a_" + c, d.a); set("tareas_" + c, d.t);
    set("dificultades_" + c, d.d); set("asistencias_" + c, d.s); set("r_" + c, d.r);
    [1, 2, 3, 4].forEach(k => {
      const cb = document.getElementById("atenci" + k + "_" + c);
      const mo = document.getElementById("motivo" + k + "_" + c);
      if (!cb || !mo) return;
      const motivo = d.m && d.m[k];
      cb.checked = !!motivo; mo.disabled = !motivo; mo.value = motivo || "";
    });
    llenados++;
  });
  const fuera = Object.keys(DATA).filter(c => !enPSI.includes(c));
  const msg = "Dashboard CCH: " + llenados + " de " + enPSI.length + " alumnos llenados." +
    (sinDatos.length ? " Sin datos: " + sinDatos.join(", ") + "." : "") +
    (fuera.length ? " No están en PSI: " + fuera.join(", ") + "." : "") + " Revisa y presiona Guardar.";
  console.log(msg);
  const bar = document.createElement("div");
  bar.textContent = msg;
  bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#198754;color:#fff;padding:10px 16px;font:600 14px Arial;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.2)";
  bar.onclick = () => bar.remove();
  document.body.appendChild(bar);
})();
`;
  }
};

/* ============================================================
   APLICACIÓN: vistas, sesión, preferencias
   ============================================================ */
const App = {
  init() {
    Prefs.load();
    Session.load();
    App.applyTheme();
    App.applyRows();

    $("home-link").addEventListener("click", e => { e.preventDefault(); App.route(); });
    $("btn-admin").addEventListener("click", App.openAdmin);
    $("btn-logout").addEventListener("click", App.logout);
    $("btn-prefs").addEventListener("click", App.openPrefs);
    $("admin-login").addEventListener("submit", App.submitAdminLogin);
    $("student-login").addEventListener("submit", Student.login);

    if (Prefs.get("remember")) {
      $("login-cuenta").value = Prefs.get("cuenta") || "";
      $("login-remember").checked = true;
    }

    App.renderQr();

    window.addEventListener("beforeunload", e => {
      if (Admin.dirty && Admin.dirty.size) { e.preventDefault(); e.returnValue = ""; }
    });

    App.route();
  },

  /** QR con la dirección de esta página (sin #, sin parámetros). */
  renderQr() {
    const box = $("page-qr");
    if (!box) return;
    const url = location.origin + location.pathname;
    box.title = url;
    if (typeof QRCode === "undefined") {
      box.replaceChildren(h("a", { href: url, class: "small", text: url }));
      return;
    }
    box.replaceChildren();
    new QRCode(box, { text: url, width: 320, height: 320, colorDark: "#0f172a", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
  },

  show(view) {
    ["view-login", "view-student", "view-admin"].forEach(id => $(id).classList.toggle("d-none", id !== view));
    const logged = !!(Session.get("admin") || Session.get("student"));
    $("btn-logout").classList.toggle("d-none", !logged);
    $("btn-admin").querySelector("span").textContent = Session.get("admin") ? "Panel" : "Admin";
    document.body.classList.toggle("compact", !!Prefs.get("compact"));
  },

  route() {
    if (Session.get("admin")) return Admin.open();
    if (Session.get("student")) return Student.open();
    App.show("view-login");
  },

  openAdmin() {
    if (Session.get("admin")) return Admin.open();
    $("admin-login").reset();
    $("admin-error").classList.add("d-none");
    bootstrap.Modal.getOrCreateInstance($("modal-admin")).show();
    setTimeout(() => $("admin-pass").focus(), 300);
  },

  async submitAdminLogin(event) {
    event.preventDefault();
    const errorBox = $("admin-error");
    errorBox.classList.add("d-none");
    try {
      await UI.busy($("admin-submit"), async () => {
        const result = await Api.call("adminLogin", { password: $("admin-pass").value });
        Session.set("admin", result.token);
      });
      bootstrap.Modal.getOrCreateInstance($("modal-admin")).hide();
      Admin.open();
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove("d-none");
    } finally {
      $("admin-pass").value = "";
    }
  },

  async logout() {
    if (Admin.dirty && Admin.dirty.size && !(await UI.confirm("Tienes calificaciones sin guardar. ¿Salir de todos modos?", { okText: "Salir", danger: true }))) return;
    const tokens = [Session.get("admin"), (Session.get("student") || {}).token].filter(Boolean);
    tokens.forEach(token => Api.call("logout", { token }).catch(() => {}));
    Session.clear();
    Cache.clear();
    Admin.reset();
    Student.data = null;
    App.show("view-login");
    UI.toast("info", "Sesión cerrada.");
  },

  sessionExpired(auth, message) {
    Session.clear(auth === "admin" ? "admin" : "student");
    UI.toast("warning", message);
    App.route();
  },

  /** Alto de las tablas: N filas visibles antes del scroll (0 = sin límite). */
  applyRows() {
    const n = Number(Prefs.get("rows"));
    document.documentElement.style.setProperty("--rows", String(n > 0 ? n : 60));
    document.documentElement.classList.toggle("rows-all", !(n > 0));
  },

  applyTheme() {
    const pref = Prefs.get("theme");
    const dark = pref === "dark" || (pref === "auto" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-bs-theme", dark ? "dark" : "light");
  },

  openPrefs() {
    const sw = (key, label, help) => h("div", { class: "form-check form-switch mb-3" },
      h("input", {
        class: "form-check-input", type: "checkbox", id: `pref-${key}`, checked: !!Prefs.get(key),
        onchange: e => {
          Prefs.set(key, e.target.checked);
          if (key === "remember" && !e.target.checked) Prefs.set("cuenta", "");
          if (key === "cache" && !e.target.checked) Cache.clear();
          document.body.classList.toggle("compact", !!Prefs.get("compact"));
          if (key === "showHidden" && Session.get("admin")) Admin.renderTab();
        }
      }),
      h("label", { class: "form-check-label", for: `pref-${key}`, text: label }),
      help ? h("div", { class: "form-text", text: help }) : null
    );

    const theme = h("select", { class: "form-select", id: "pref-theme", onchange: e => { Prefs.set("theme", e.target.value); App.applyTheme(); } },
      [["auto", "Automático (sistema)"], ["light", "Claro"], ["dark", "Oscuro"]].map(([v, t]) => h("option", { value: v, selected: Prefs.get("theme") === v, text: t })));

    const rowsSel = h("select", { class: "form-select", id: "pref-rows", onchange: e => { Prefs.set("rows", Number(e.target.value)); App.applyRows(); } },
      [[15, "15"], [30, "30"], [60, "60 (recomendado)"], [100, "100"], [0, "Todos (sin scroll interno)"]].map(([v, t]) => h("option", { value: v, selected: Number(Prefs.get("rows")) === v, text: t })));

    $("prefs-body").replaceChildren(
      h("div", { class: "mb-3" }, h("label", { class: "form-label", for: "pref-theme", text: "Tema" }), theme),
      h("div", { class: "mb-3" }, h("label", { class: "form-label", for: "pref-rows", text: "Alumnos visibles por tabla" }), rowsSel),
      sw("compact", "Tablas compactas"),
      sw("remember", "Recordar mi número de cuenta", "Útil en tu celular; no lo actives en computadoras compartidas."),
      sw("showHidden", "Admin: mostrar columnas «Oculto» del reporte", "Se ven en gris; los alumnos nunca las ven."),
      sw("cache", "Admin: carga instantánea (guardar datos en este equipo)", "Abre el panel con lo último que viste y actualiza en segundo plano. Se borra al presionar Salir. Desactívalo en computadoras compartidas."),
      h("button", {
        class: "btn btn-sm btn-outline-danger", type: "button",
        onclick: () => { Prefs.reset(); App.applyTheme(); App.applyRows(); App.openPrefs(); UI.toast("info", "Preferencias restablecidas."); }
      }, icon("arrow-counterclockwise"), " Restablecer")
    );
    bootstrap.Modal.getOrCreateInstance($("modal-prefs")).show();
  }
};

/* ============================================================
   VISTA DEL ALUMNO
   ============================================================ */
const Student = {
  data: null,
  courseIndex: 0,

  async login(event) {
    event.preventDefault();
    const cuenta = $("login-cuenta").value.replace(/\D/g, "");
    const errorBox = $("login-error");
    errorBox.classList.add("d-none");

    if (!cuenta) {
      errorBox.textContent = "Escribe tu número de cuenta.";
      errorBox.classList.remove("d-none");
      return;
    }

    try {
      await UI.busy($("login-submit"), async () => {
        const result = await Api.call("studentLogin", { cuenta });
        Session.set("student", { token: result.token, cuenta: result.cuenta });
      });
      const remember = $("login-remember").checked;
      Prefs.set("remember", remember);
      Prefs.set("cuenta", remember ? cuenta : "");
      Student.open();
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove("d-none");
    }
  },

  async open() {
    App.show("view-student");
    $("stu-refresh").onclick = () => Student.load();
    $("stu-links").onclick = () => Student.openLinks();
    $("stu-tabs").onclick = e => {
      const btn = e.target.closest("[data-tab]");
      if (!btn) return;
      Prefs.set("stuTab", btn.dataset.tab);
      Student.render();
    };
    if (!Student.data) await Student.load();
    else Student.render();
  },

  async load() {
    UI.loading($("stu-content"), "Cargando tu información…");
    try {
      Student.data = await Api.call("studentData", {}, "student");
      Student.courseIndex = Math.min(Student.courseIndex, Math.max(Student.data.courses.length - 1, 0));
      Student.render();
    } catch (error) {
      if (error.code !== "AUTH") $("stu-content").replaceChildren(UI.empty("wifi-off", error.message));
    }
  },

  render() {
    const data = Student.data;
    if (!data) return;
    const tab = Prefs.get("stuTab");

    $("stu-name").textContent = data.student.nombre || "Alumno";
    $("stu-links-count").textContent = (data.links || []).length || "";
    $("stu-cuenta").textContent = data.student.cuenta;
    $("stu-tabs").querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === (tab === "evidencias" ? "evidencias" : "avance")));

    // Pastillas de grupos (solo si hay más de uno)
    const pills = $("stu-courses");
    pills.replaceChildren(...data.courses.map((c, i) => h("button", {
      class: `nav-link ${i === Student.courseIndex ? "active" : ""}`, type: "button",
      onclick: () => { Student.courseIndex = i; Student.render(); }
    }, c.label)));
    pills.classList.toggle("d-none", data.courses.length < 2 || tab === "evidencias");

    const content = $("stu-content");
    UI.disposePopovers(document.body);

    if (!data.courses.length && tab !== "evidencias") {
      content.replaceChildren(UI.empty("inbox", "No estás inscrito en ningún grupo activo. Si crees que es un error, avisa a tu profesor."));
      return;
    }

    const course = data.courses[Student.courseIndex];
    const view = tab === "evidencias" ? () => Student.renderEvidence() : () => Student.renderOverview(course);

    content.replaceChildren(view());
  },

  openLinks() {
    const links = (Student.data && Student.data.links) || [];
    UI.modal({
      title: [icon("link-45deg", "me-2"), "Enlaces"],
      body: links.length
        ? h("div", { class: "list-group" }, links.map(l => h("a", { class: "list-group-item list-group-item-action d-flex justify-content-between align-items-center", href: l.url, target: "_blank", rel: "noopener noreferrer" },
            h("span", { text: l.titulo }), icon("box-arrow-up-right", "text-body-secondary"))))
        : UI.empty("link", "Tu profesor aún no agrega enlaces.")
    });
  },

  /** Una sola tarjeta por curso: asistencia, calificaciones y equipos. */
  renderOverview(course) {
    const section = (title, iconName, ...children) => h("section", { class: "overview-section" },
      h("h2", { class: "overview-title" }, icon(iconName, "me-2"), title), ...children);
    return h("div", { class: "card card-soft overview-card" },
      h("div", { class: "card-header overview-header" },
        h("div", { class: "fw-semibold", text: course.label }),
        h("div", { class: "small opacity-75", text: `Ciclo ${course.ciclo}` })),
      h("div", { class: "card-body" },
        section("Asistencia", "calendar-check", Student.renderAttendance(course)),
        section("Calificaciones", "bar-chart", Student.renderGrades(course)),
        section("Equipos", "people", Student.renderTeams(course))));
  },

  renderAttendance(course) {
    const att = course.attendance;
    if (!att || !att.dates.length) return h("p", { class: "text-body-secondary small mb-0", text: "Aún no hay registro de asistencia." });

    const c = att.counts;
    const pct = Parts.pct(c);
    const stats = h("div", { class: "d-flex flex-wrap gap-2 mb-3" },
      h("span", { class: "stat" }, h("span", { class: "st-dot st-asistencia", text: "✓" }), h("b", { text: c.asistencia })),
      h("span", { class: "stat" }, h("span", { class: "st-dot st-falta", text: "✗" }), h("b", { text: c.falta })),
      h("span", { class: "stat" }, h("span", { class: "st-dot st-justificante", text: "J" }), h("b", { text: c.justificante })),
      pct !== null ? h("span", { class: "stat" }, h("b", { text: `${pct}%` }), " asistencia") : null);

    const warn = c.falta > CONFIG.FALTAS_UMBRAL
      ? h("div", { class: "alert alert-danger py-2 small" }, icon("exclamation-triangle", "me-1"), `${c.falta} faltas`)
      : null;

    return h("div", {}, stats, warn, Parts.attendanceStrip(Student.data.student.cuenta, att.dates, c.falta), h("div", { class: "mt-2" }, Parts.legend()));
  },

  renderGrades(course) {
    const comps = course.components;
    if (!comps.length) {
      if (course.legacy.length) {
        return h("table", { class: "table table-sm mb-0" }, h("tbody", {}, course.legacy.map(x => h("tr", {}, h("th", { text: x.label }), h("td", { class: "text-end", text: x.value || "—" })))));
      }
      return h("p", { class: "text-body-secondary small mb-0", text: "Tu profesor aún no publica la forma de evaluación." });
    }
    const typeHint = { asistencia: "según tu asistencia", proyectos: "según tu equipo" };
    const rows = comps.map(comp => {
      const item = course.items[comp.id] || { score10: null, bonus: 0 };
      const rawText = comp.tipo === "manual" && comp.maximo !== 10 && item.raw !== null ? `${Fmt.num(item.raw)} / ${comp.maximo}` : "";
      return h("tr", {},
        h("td", { class: "text-start" }, h("div", { class: "fw-semibold", text: comp.nombre }),
          typeHint[comp.tipo] ? h("div", { class: "small text-body-secondary", text: typeHint[comp.tipo] }) : null,
          rawText ? h("div", { class: "small text-body-secondary", text: rawText }) : null),
        h("td", { class: "text-body-secondary", text: `${Fmt.num(comp.ponderacion)}%` }),
        h("td", {}, Parts.gradeWithBonus(item, comp)));
    });
    const hasBonus = comps.some(c => course.items[c.id] && course.items[c.id].bonus > 0);
    return h("div", {},
      h("div", { class: "table-wrap auto-h" }, h("table", { class: "table table-cch table-hover mb-0" },
        h("thead", {}, h("tr", {}, h("th", { class: "text-start", text: "Componente" }), h("th", { text: "Peso" }), h("th", { text: "Calificación" }))),
        h("tbody", {}, rows))),
      hasBonus ? h("p", { class: "small text-body-secondary mt-2 mb-0" }, icon("info-circle", "me-1"), "Toca la etiqueta ", h("span", { class: "bonus-tag" }, icon("stars"), "+"), " para ver tus puntos extracurriculares.") : null);
  },

  renderTeams(course) {
    if (!course.projects.length) return h("p", { class: "text-body-secondary small mb-0", text: "No hay proyectos en equipo por ahora." });

    return h("div", { class: "row g-3" }, course.projects.map(project => {
      let body;
      if (project.team) {
        const t = project.team;
        body = h("div", {},
          h("div", { class: "d-flex justify-content-between align-items-start mb-2" },
            h("div", {}, h("div", { class: "small text-body-secondary", text: "Tu equipo" }), h("div", { class: "fw-semibold", text: t.nombre })),
            t.calificacion !== null
              ? h("span", { class: `badge fs-6 ${t.calificacion < CONFIG.RISK_THRESHOLD ? "text-bg-danger" : "text-bg-success"}`, text: Fmt.grade(t.calificacion) })
              : h("span", { class: "badge text-bg-secondary", text: "Por calificar" })),
          h("ul", { class: "list-unstyled small mb-2" }, t.members.map(m => h("li", {}, icon("person", "me-1"), h("span", { class: "mono me-1", text: m.cuenta }), m.nombre))),
          t.stars ? h("div", { class: "border-top pt-2" }, project.rubros.map(r => h("div", { class: "rubric-row small" }, h("span", { text: r }), Parts.starsReadonly(t.stars[r] || 0)))) : null,
        );
      } else if (project.abierto) {
        body = Student.teamForm(project);
      } else {
        body = h("p", { class: "text-body-secondary small mb-0" }, icon("lock", "me-1"), "El registro está cerrado. Si no tienes equipo, habla con tu profesor.");
      }

      return h("div", { class: "col-12 col-lg-6" }, h("div", { class: "mini-card h-100 p-3" }, h("div", {},
        h("h3", { class: "h6 mb-1", text: project.nombre }),
        h("div", { class: "mb-3" }, project.rubros.map(r => h("span", { class: "chip", text: r }))),
        body)));
    }));
  },

  teamForm(project) {
    const max = Student.data.maxTeamSize || 8;
    const list = h("div", { class: "vstack gap-2 mb-2" });
    const addInput = (value = "") => {
      if (list.children.length >= max - 1) return;
      const input = h("input", { class: "form-control form-control-sm", inputmode: "numeric", placeholder: "Cuenta del integrante", value, "aria-label": "Número de cuenta del integrante" });
      list.append(h("div", { class: "input-group input-group-sm" }, input,
        h("button", { class: "btn btn-outline-secondary", type: "button", "aria-label": "Quitar", onclick: e => e.currentTarget.parentElement.remove() }, icon("x"))));
    };
    addInput(); addInput();

    const name = h("input", { class: "form-control", required: true, maxlength: "50", placeholder: "Ej. Los Pitagóricos", id: `team-name-${project.id}` });
    const submit = h("button", { class: "btn btn-primary btn-sm", type: "submit" }, icon("check2", "me-1"), "Registrar equipo");

    const form = h("form", {
      onsubmit: async e => {
        e.preventDefault();
        const cuentas = Array.from(list.querySelectorAll("input")).map(i => i.value.replace(/\D/g, "")).filter(Boolean);
        try {
          const r = await UI.busy(submit, () => Api.call("registerTeam", { projectId: project.id, nombre: name.value, cuentas }, "student"));
          UI.toast("success", `${r.message}\n${r.members.map(m => `• ${m.nombre || m.cuenta}`).join("\n")}`);
          Student.load();
        } catch (error) {
          if (error.code !== "AUTH") UI.toast("danger", error.message);
        }
      }
    },
      h("div", { class: "mb-2" }, h("label", { class: "form-label small", for: name.id, text: "Nombre del equipo" }), name),
      h("label", { class: "form-label small mb-1", text: "Integrantes" }),
      h("div", { class: "input-group input-group-sm mb-2" }, h("span", { class: "input-group-text" }, icon("person-check")), h("input", { class: "form-control", value: `${Student.data.student.cuenta} (tú)`, disabled: true })),
      list,
      h("div", { class: "d-flex justify-content-between" },
        h("button", { class: "btn btn-link btn-sm px-0", type: "button", onclick: () => addInput() }, icon("plus-circle", "me-1"), "Agregar integrante"),
        submit),
      h("div", { class: "form-text", text: "Revisa bien los números de cuenta: solo tu profesor puede corregir un equipo ya registrado." })
    );
    return form;
  },

  renderEvidence() {
    const data = Student.data;
    const typeIcon = { Extracurricular: "trophy", Evento: "calendar-event", Proyecto: "kanban", Actividad: "activity", Otro: "three-dots" };
    const courseSelect = h("select", { class: "form-select", id: "ev-course", required: true },
      data.courses.map((c, i) => h("option", { value: c.idCurso, selected: i === Student.courseIndex, text: c.label })));
    const type = h("select", { class: "form-select", id: "ev-type" }, data.evidenceTypes.map(t => h("option", { value: t, text: t })));
    const title = h("input", { class: "form-control", id: "ev-title", required: true, maxlength: "120", placeholder: "Ej. Feria de Matemáticas, torneo, taller…" });
    const desc = h("textarea", { class: "form-control", id: "ev-desc", rows: "2", maxlength: "1000", placeholder: "¿Qué hiciste? (opcional)" });
    const file = h("input", { class: "form-control", type: "file", id: "ev-file", accept: "image/*,application/pdf" });
    const link = h("input", { class: "form-control", type: "url", id: "ev-link", placeholder: "https://… (opcional)" });
    const submit = h("button", { class: "btn btn-primary px-4", type: "submit" }, icon("send", "me-1"), "Enviar");

    const form = h("form", {
      class: "card card-soft ev-form mb-4",
      onsubmit: async e => {
        e.preventDefault();
        if (!data.courses.length) return UI.toast("warning", "No tienes grupos activos.");
        try {
          await UI.busy(submit, async () => {
            const payload = { idCurso: courseSelect.value, tipo: type.value, titulo: title.value, descripcion: desc.value, link: link.value.trim() };
            if (file.files[0]) payload.file = await Student.readFile(file.files[0], data.maxFileMb);
            if (!payload.file && !payload.link) throw new Error("Adjunta una foto/PDF o escribe un enlace.");
            const r = await Api.call("uploadEvidence", payload, "student");
            UI.toast("success", r.message);
          });
          form.reset();
          Student.load();
        } catch (error) {
          if (error.code !== "AUTH") UI.toast("danger", error.message);
        }
      }
    },
      h("div", { class: "card-header ev-form-header" }, icon("trophy", "me-2"), h("span", { class: "fw-semibold", text: "Registrar actividad extracurricular" })),
      h("div", { class: "card-body" },
        h("div", { class: "row g-3" },
          h("div", { class: "col-md-6" }, h("label", { class: "form-label small fw-semibold", for: "ev-course", text: "Grupo" }), courseSelect),
          h("div", { class: "col-md-6" }, h("label", { class: "form-label small fw-semibold", for: "ev-type", text: "Tipo" }), type),
          h("div", { class: "col-12" }, h("label", { class: "form-label small fw-semibold", for: "ev-title", text: "Actividad" }), title),
          h("div", { class: "col-12" }, h("label", { class: "form-label small fw-semibold", for: "ev-desc", text: "Descripción" }), desc),
          h("div", { class: "col-md-6" }, h("label", { class: "form-label small fw-semibold", for: "ev-file" }, icon("image", "me-1"), `Foto o PDF (máx. ${data.maxFileMb} MB)`), file),
          h("div", { class: "col-md-6" }, h("label", { class: "form-label small fw-semibold", for: "ev-link" }, icon("link-45deg", "me-1"), "o enlace"), link))),
      h("div", { class: "card-footer bg-transparent border-0 text-end pt-0 pb-3 px-3" }, submit));

    const state = { Pendiente: ["warning", "hourglass-split", "En revisión"], Aplicada: ["success", "check-circle-fill", "Puntos aplicados"], Rechazada: ["danger", "x-circle-fill", "No aplica"] };
    const list = data.evidences.length
      ? h("div", { class: "row g-3" }, data.evidences.map(ev => {
          const [color, ic, label] = state[ev.estado] || state.Pendiente;
          return h("div", { class: "col-12 col-md-6 col-xl-4" }, h("div", { class: `card card-soft ev-card h-100 border-start border-4 border-${color}` },
            h("div", { class: "card-body" },
              h("div", { class: "d-flex justify-content-between align-items-start gap-2 mb-2" },
                h("span", { class: "ev-type" }, icon(typeIcon[ev.tipo] || "star", "me-1"), ev.tipo),
                h("span", { class: `badge text-bg-${color}` }, icon(ic, "me-1"), label)),
              h("h3", { class: "h6 mb-1", text: ev.titulo }),
              h("div", { class: "small text-body-secondary", text: `${ev.grupo} · ${Fmt.date(ev.enviado)}` }),
              ev.estado === "Aplicada" ? h("div", { class: "ev-points mt-3" }, h("span", { class: "fs-4 fw-bold", text: `+${Fmt.num(ev.puntos)}` }), h("span", { class: "small ms-2", text: `en ${ev.componente || "un examen"}` })) : null,
              null)));
        }))
      : UI.empty("trophy", "Aún no registras actividades.");

    return h("div", {}, form, h("h2", { class: "h6 text-uppercase text-body-secondary mb-3", text: "Mis actividades" }), list);
  },

  /** Lee un archivo a base64; reduce fotos grandes para que suban rápido desde el celular. */
  async readFile(file, maxMb) {
    let blob = file;
    let type = file.type || "application/octet-stream";

    if (/^image\/(jpeg|png|webp)$/.test(type) && file.size > 1.2 * 1024 * 1024) {
      try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, CONFIG.IMAGE_MAX_PX / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.82));
        type = "image/jpeg";
      } catch (e) { blob = file; }
    }

    if (blob.size > maxMb * 1024 * 1024) throw new Error(`El archivo supera ${maxMb} MB.`);

    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
      reader.readAsDataURL(blob);
    });
    const name = type === "image/jpeg" && blob !== file ? file.name.replace(/\.\w+$/, "") + ".jpg" : file.name;
    return { name, type, data };
  }
};

/* ============================================================
   PANEL DE ADMINISTRADOR
   ============================================================ */
const Admin = {
  boot: null,
  group: null,         // groupData del grupo seleccionado
  dirty: new Map(),    // captura sin guardar: "cuenta|compId" → valor
  compDraft: null,     // borrador de ponderaciones
  evidence: null,
  wired: false,

  reset() {
    Admin.boot = null; Admin.group = null; Admin.dirty = new Map(); Admin.compDraft = null; Admin.evidence = null;
  },

  async open() {
    App.show("view-admin");
    if (!Admin.wired) {
      Admin.wired = true;
      $("adm-tabs").addEventListener("click", async e => {
        const btn = e.target.closest("[data-tab]");
        if (!btn || !(await Admin.leaveCapture())) return;
        Prefs.set("admTab", btn.dataset.tab);
        Admin.renderTab();
      });
      $("adm-group").addEventListener("change", async e => {
        if (!(await Admin.leaveCapture())) { e.target.value = Admin.group ? Admin.group.group.id : ""; return; }
        Prefs.set("admGroup", e.target.value);
        Admin.loadGroup();
      });
      $("adm-refresh").addEventListener("click", () => Admin.loadGroup());
      $("adm-sync").addEventListener("click", Admin.sync);
    }
    if (!Admin.boot) await Admin.loadBoot();
    else Admin.renderTab();
  },

  /** Panel: primero lo guardado en caché (instantáneo), luego lo fresco del servidor. */
  async loadBoot() {
    const cached = Cache.get("boot");
    if (cached) {
      Admin.boot = cached.d;
      Admin.renderGroupSelect();
      Admin.updateEvidenceBadge(Admin.boot.pendingEvidence);
      Admin.loadGroup();
    } else {
      UI.loading($("adm-content"), "Cargando panel…");
    }
    try {
      const fresh = await Api.call("adminBootstrap", {}, "admin");
      Cache.set("boot", fresh);
      const changed = !cached || JSON.stringify(cached.d) !== JSON.stringify(fresh);
      Admin.boot = fresh;
      if (changed) {
        Admin.renderGroupSelect();
        Admin.updateEvidenceBadge(fresh.pendingEvidence);
      }
      if (!cached) await Admin.loadGroup();
    } catch (error) {
      if (error.code !== "AUTH" && !cached) $("adm-content").replaceChildren(UI.empty("wifi-off", error.message));
    }
  },

  renderGroupSelect() {
    const groups = Admin.boot.groups;
    const saved = Prefs.get("admGroup");
    const current = groups.find(g => g.id === saved) || groups.find(g => g.active) || groups[0];
    const active = groups.filter(g => g.active), inactive = groups.filter(g => !g.active);
    $("adm-group").replaceChildren(
      active.length ? h("optgroup", { label: "Activos" }, active.map(g => h("option", { value: g.id, text: `${g.label}${g.ciclo ? ` (${g.ciclo})` : ""}` }))) : null,
      inactive.length ? h("optgroup", { label: "Inactivos" }, inactive.map(g => h("option", { value: g.id, text: `${g.label} (${g.ciclo})` }))) : null
    );
    if (current) $("adm-group").value = current.id;
  },

  updateEvidenceBadge(n) {
    const badge = $("adm-ev-badge");
    badge.textContent = n;
    badge.classList.toggle("d-none", !n);
  },

  async loadGroup() {
    const id = $("adm-group").value;
    Admin.dirty = new Map();
    Admin.compDraft = null;
    if (!id) { Admin.group = null; Admin.renderTab(); return; }
    const token = (Admin._loadToken = (Admin._loadToken || 0) + 1);
    const cached = Cache.get("g:" + id);
    if (cached) {
      Admin.group = cached.d;
      Admin.renderStats(true);
      Admin.renderTab();
    } else {
      UI.loading($("adm-content"));
      $("adm-toolbar").replaceChildren();
    }
    try {
      const fresh = await Api.call("groupData", { idCurso: id }, "admin");
      if (token !== Admin._loadToken) return;          // el usuario ya cambió de grupo
      Cache.set("g:" + id, fresh);
      const changed = !cached || JSON.stringify(cached.d) !== JSON.stringify(fresh);
      Admin.group = fresh;
      Admin.renderStats(false);
      if (!changed) return;
      const busy = Admin.dirty.size || $("modal-generic").classList.contains("show");
      if (busy) UI.toast("info", "Hay datos más recientes; se mostrarán al recargar.");
      else Admin.renderTab();
    } catch (error) {
      if (error.code !== "AUTH" && !cached) $("adm-content").replaceChildren(UI.empty("exclamation-octagon", error.message));
    }
  },

  async leaveCapture() {
    if (!Admin.dirty.size) return true;
    const ok = await UI.confirm(`Tienes ${Admin.dirty.size} calificación(es) sin guardar. ¿Descartarlas?`, { okText: "Descartar", danger: true });
    if (ok) Admin.dirty = new Map();
    return ok;
  },

  renderStats(refreshing) {
    const g = Admin.group;
    if (!g) return $("adm-stats").replaceChildren();
    const finals = g.students.map(s => s.final).filter(v => v !== null);
    const avg = finals.length ? finals.reduce((a, b) => a + b, 0) / finals.length : null;
    const risk = finals.filter(v => v < CONFIG.RISK_THRESHOLD).length;
    const faltas = g.students.filter(s => s.counts && s.counts.falta > CONFIG.FALTAS_UMBRAL).length;
    $("adm-stats").replaceChildren(...kids(
      h("span", { class: "stat" }, icon("people"), h("b", { text: g.students.length })),
      h("span", { class: "stat", title: "Promedio del grupo (sobre lo evaluado)" }, icon("graph-up"), h("b", { text: Fmt.grade(avg) })),
      h("span", { class: "stat", title: `Promedio menor a ${CONFIG.RISK_THRESHOLD}` }, icon("exclamation-triangle", "text-danger"), h("b", { text: risk })),
      h("span", { class: "stat", title: `Más de ${CONFIG.FALTAS_UMBRAL} faltas` }, icon("calendar-x", "text-danger"), h("b", { text: faltas })),
      refreshing ? h("span", { class: "stat text-body-secondary", title: "Mostrando datos guardados; actualizando…" }, h("span", { class: "spinner-border spinner-border-sm" })) : null
    ));
  },

  renderTab() {
    const tab = Prefs.get("admTab");
    $("adm-tabs").querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    UI.disposePopovers(document.body);
    $("adm-toolbar").replaceChildren();
    const content = $("adm-content");

    const global = { evidencias: Admin.tabEvidence, alumnos: Admin.tabStudents, grupos: Admin.tabGroups, mantenimiento: Admin.tabMaintenance };
    if (global[tab]) return global[tab](content);

    if (!Admin.group) {
      content.replaceChildren(UI.empty("collection", "Configura un grupo en la pestaña «Grupos»."));
      return;
    }
    const views = { asistencia: Admin.tabAttendance, lista: Admin.tabRollCall, captura: Admin.tabCapture, evaluacion: Admin.tabWeights, proyectos: Admin.tabProjects };
    (views[tab] || Admin.tabAttendance)(content);
  },

  searchBox(placeholder, onInput) {
    return h("input", { type: "search", class: "form-control form-control-sm", placeholder, "aria-label": placeholder, style: { maxWidth: "260px" }, oninput: debounce(e => onInput(Fmt.normalize(e.target.value)), CONFIG.SEARCH_DEBOUNCE_MS) });
  },

  /**
   * Celda de nombre con indicadores:
   *   azul   = comparte otro grupo contigo ESTE ciclo
   *   violeta = lo tuviste en un ciclo anterior (incluye ciclos ya archivados)
   *   ámbar  = tiene comentarios
   * El popover detalla grupos, ciclos y, si está archivado, final y faltas.
   */
  nameCell(s) {
    const links = s.links || [];
    const same = links.filter(l => l.rel === "mismo");
    const prev = links.filter(l => l.rel === "anterior");
    const other = links.filter(l => l.rel === "otro");

    const wrap = h("div", { class: "name-wrap" },
      h("a", { href: "#", class: "link-body-emphasis text-decoration-none", title: s.nombre, onclick: e => { e.preventDefault(); Admin.openProfile(s.cuenta); } }, s.nombre || "(sin nombre)"));

    if (links.length) {
      const badges = h("span", { class: "d-inline-flex gap-1" },
        same.length ? h("span", { class: "badge rel-same" }, icon("people-fill"), ` ${same.length}`) : null,
        prev.length ? h("span", { class: "badge rel-prev" }, icon("clock-history"), ` ${prev.length}`) : null,
        !same.length && !prev.length ? h("span", { class: "badge text-bg-light border" }, icon("diagram-3"), ` ${other.length}`) : null);
      const line = l => `<div>${Fmt.escape(l.label)} <small class="text-body-secondary">(${Fmt.escape(l.ciclo || "sin ciclo")})</small>` +
        (l.archivado ? ` <small class="text-body-secondary">· archivado${l.final !== null && l.final !== undefined ? ` · final ${Fmt.escape(Fmt.grade(l.final))}` : ""}${l.faltas !== null && l.faltas !== undefined ? ` · ${Fmt.escape(l.faltas)} faltas` : ""}</small>` : "") + "</div>";
      const section = (title, list, color) => list.length ? `<div class="fw-semibold small mt-1" style="color:${color}">${title}</div>${list.map(line).join("")}` : "";
      UI.popover(badges, s.nombre || s.cuenta,
        section("Comparte contigo este ciclo", same, "#1c7ed6") +
        section("Lo tuviste antes", prev, "#7048e8") +
        section("Otros ciclos", other, "#64748b"));
      wrap.append(badges);
    }
    if (s.comments) wrap.append(h("span", { class: "badge text-bg-warning", title: `${s.comments} comentario(s)` }, icon("chat-left-text"), ` ${s.comments}`));
    if (s.status) {
      const label = ((Admin.group && Admin.group.statuses) || []).find(x => x.value === s.status);
      wrap.append(h("span", { class: "badge status-badge", title: label ? label.label : s.status, text: s.status }));
    }

    const td = h("td", { class: "text-start name-cell" }, wrap);
    if (same.length) td.classList.add("has-same");
    if (prev.length) td.classList.add("has-prev");
    return td;
  },

  linksLegend() {
    return h("div", { class: "legend" },
      h("span", { class: "rel-same" }, icon("people-fill"), " Comparte grupo este ciclo"),
      h("span", { class: "rel-prev" }, icon("clock-history"), " Lo tuviste antes"),
      h("span", { class: "text-bg-warning" }, icon("chat-left-text"), " Comentarios"));
  },

  async sync() {
    const g = Admin.group;
    if (!g || !g.group.sheet) return UI.toast("warning", "Este grupo no tiene hoja Reporte_ ligada (pestaña Grupos).");
    try {
      const r = await UI.busy($("adm-sync"), () => Api.call("syncAttendance", { sheetName: g.group.sheet }, "admin"));
      UI.toast("success", r.message, 9000);
      Admin.loadGroup();
    } catch (error) {
      if (error.code !== "AUTH") UI.toast("danger", error.message);
    }
  },

  /* ---------------- Pestaña: Asistencia ---------------- */
  tabAttendance(content) {
    const g = Admin.group;
    const att = g.attendance;
    if (!att) {
      content.replaceChildren(UI.empty("calendar-x", "Este grupo no tiene una hoja Reporte_ ligada. Lígala en la pestaña «Grupos»."));
      return;
    }

    const showHidden = Prefs.get("showHidden");
    const dateCols = att.dates.map((d, i) => ({ d, i })).filter(x => showHidden || x.d.visible);
    const otherCols = att.others.map((o, i) => ({ o, i })).filter(x => showHidden || x.o.visible);

    const tbody = h("tbody");
    const draw = (q = "") => {
      const rows = g.students
        .filter(s => !q || s.cuenta.includes(q) || Fmt.normalize(s.nombre).includes(q))
        .map(s => {
          const cuenta = h("td", { class: "sticky-col cuenta-cell", text: s.cuenta });
          Parts.applyFaltas(cuenta, s.counts && s.counts.falta);
          return h("tr", {}, cuenta, Admin.nameCell(s),
            h("td", { class: s.counts && s.counts.falta > CONFIG.FALTAS_UMBRAL ? "fw-bold text-danger" : "", text: s.counts ? s.counts.falta : "" }),
            h("td", { text: s.counts ? s.counts.justificante : "" }),
            dateCols.map(x => Parts.statusCell(s.statuses[x.i], x.d.label)),
            otherCols.map(x => h("td", { text: s.others[x.i] || "" })));
        });
      tbody.replaceChildren(...(rows.length ? rows : [h("tr", {}, h("td", { colspan: 4 + dateCols.length + otherCols.length, class: "text-body-secondary py-4", text: "Sin coincidencias." }))]));
    };
    draw();

    const th = (text, visible, cls = "") => h("th", { class: `${cls} ${visible === false ? "col-hidden" : ""}`, title: visible === false ? "Oculto para alumnos" : null, text });
    // Encabezado de columna (no fecha) → clic abre la ponderación en un modal, resaltando su componente
    const linkTh = (text, visible) => {
      const link = (g.columns || []).find(l => Fmt.normalize(l.columna) === Fmt.normalize(text));
      const project = link && link.tipo === "proyecto" ? (g.projects || []).find(p => p.id === link.ref) : null;
      const focus = !link ? null : link.tipo === "componente" ? link.ref : project ? project.componentId : null;
      return h("th", { class: `col-linked ${visible === false ? "col-hidden" : ""}`, title: `${link ? `Enlazada a ${link.label} · ` : ""}clic para editar la ponderación` },
        h("button", { type: "button", class: "th-link", onclick: () => Admin.weightsModal(focus) }, link ? icon("link-45deg", "me-1") : null, text));
    };

    $("adm-toolbar").replaceChildren(h("div", { class: "d-flex flex-wrap align-items-center gap-2" },
      Admin.searchBox("Buscar cuenta o nombre…", draw),
      h("button", { class: "btn btn-sm btn-outline-secondary", type: "button", title: "Descargar reporte (Excel/CSV)", onclick: () => Admin.exportGroup() }, icon("download", "me-1"), "Exportar"),
      h("button", { class: "btn btn-sm btn-success", type: "button", title: "Llenar el formulario de PSI", onclick: () => Admin.psiModal() }, icon("send-check", "me-1"), "Exportar a PSI"),
      h("button", { class: "btn btn-sm btn-outline-primary", type: "button", onclick: () => Admin.addStudentModal() }, icon("person-plus", "me-1"), "Alumno"),
      h("button", { class: "btn btn-sm btn-outline-dark", type: "button", title: "Visibilidad y enlaces de columnas del reporte", onclick: () => Admin.columnsModal() }, icon("layout-three-columns", "me-1"), "Columnas"),
      h("div", { class: "ms-auto d-flex flex-column gap-1 align-items-end" }, Parts.legend(), Admin.linksLegend())));

    content.replaceChildren(h("div", { class: "table-wrap" }, h("table", { class: "table table-bordered table-hover table-cch att-table" },
      h("thead", {}, h("tr", {}, th("Cuenta", true, "sticky-col"), th("Nombre", true, "text-start"), th("F", true), th("J", true),
        dateCols.map(x => th(x.d.label, x.d.visible)), otherCols.map(x => linkTh(x.o.label, x.o.visible)))),
      tbody)));
  },

  /** Reporte del grupo (asistencia + calificaciones) como CSV que abre Excel. */
  exportGroup() {
    const g = Admin.group;
    const dates = g.attendance ? g.attendance.dates : [];
    const comps = g.components;
    const header = ["Cuenta", "Nombre"].concat(dates.map(d => d.key), ["Asistencias", "Faltas", "Justificantes", "% asistencia"],
      comps.map(c => `${c.nombre} (${c.ponderacion}%)`), ["Final (evaluado)", "Final (estricta)", "Calificación (entera)"]);
    const rows = g.students.map(s => {
      const c = s.counts || { asistencia: 0, falta: 0, justificante: 0 };
      const pct = Parts.pct(c);
      return [s.cuenta, s.nombre].concat(dates.map((d, i) => s.statuses[i] || ""), [c.asistencia, c.falta, c.justificante, pct === null ? "" : pct],
        comps.map(cp => { const it = s.items[cp.id]; return it && it.score10 !== null ? it.score10 : ""; }), [s.final ?? "", s.finalStrict ?? "", Fmt.int(s.finalStrict)]);
    });
    const esc = v => { const t = String(v ?? ""); return /[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const csv = "\ufeff" + [header].concat(rows).map(r => r.map(esc).join(",")).join("\r\n");
    const name = `${Fmt.normalize(g.group.label).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}_${new Date().toISOString().slice(0, 10)}.csv`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = h("a", { href: url });
    a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  psiModal() {
    const g = Admin.group;
    const manual = g.components.filter(c => c.tipo === "manual");
    const auto = manual.find(c => /tarea|teams|activ|sello|ejercicio/i.test(c.nombre));
    const opts = { tareas: auto ? auto.id : "none", extra: false, dejoN: 3, components: g.components };

    const tareasSel = h("select", { class: "form-select form-select-sm", id: "psi-tareas" },
      manual.map(c => h("option", { value: c.id, selected: opts.tareas === c.id, text: c.nombre })),
      h("option", { value: "none", selected: opts.tareas === "none", text: "No se dejan tareas" }));
    const extra = h("input", { class: "form-check-input", type: "checkbox", id: "psi-extra" });
    const pad = n => String(n).padStart(2, "0");
    const now = new Date();
    const fecha = h("input", { type: "date", class: "form-control form-control-sm", id: "psi-fecha", value: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` });
    const tipo = h("select", { class: "form-select form-select-sm", id: "psi-tipo" }, h("option", { value: "0", text: "Parcial" }), h("option", { value: "1", text: "Final" }));
    const obsTxt = h("textarea", { class: "form-control form-control-sm", rows: "3", id: "psi-obs" });
    const accTxt = h("textarea", { class: "form-control form-control-sm", rows: "3", id: "psi-acc" });
    let edited = false;
    [obsTxt, accTxt].forEach(t => t.addEventListener("input", () => { edited = true; refreshCode(); }));
    [fecha, tipo].forEach(t => t.addEventListener("change", () => refreshCode()));
    let lastRows = [];
    const refreshCode = () => {
      code.value = Psi.script(lastRows, {
        label: g.group.label, grupo: g.psi ? g.psi.grupo : "", periodo: g.psi ? g.psi.periodo : g.group.ciclo,
        header: { fecha: fecha.value, tipo: tipo.value, obs: obsTxt.value.trim(), acc: accTxt.value.trim() }
      });
    };
    const body = h("div");
    const code = h("textarea", { class: "form-control mono small", rows: "6", readonly: true, "aria-label": "Código JS" });

    const draw = () => {
      opts.tareas = tareasSel.value;
      opts.extra = extra.checked;
      const rows = g.students.map(st => Psi.suggest(st, opts));
      lastRows = rows;
      if (!edited) {
        const t = Psi.groupText(rows, g);
        obsTxt.value = t.obs;
        accTxt.value = t.acc;
      }
      refreshCode();

      const count = k => rows.filter(x => x.r === k).length;
      body.replaceChildren(
        h("div", { class: "d-flex flex-wrap gap-2 mb-2" }, ["3", "2", "1", "0"].map(k => h("span", { class: `badge ${Psi.RIESGO[k][1]}`, text: `Riesgo ${Psi.RIESGO[k][0]}: ${count(k)}` }))),
        h("div", { class: "table-wrap auto-h", style: { maxHeight: "48vh" } }, h("table", { class: "table table-sm table-cch mb-0" },
          h("thead", {}, h("tr", {}, ["Cuenta", "Nombre", "Avance", "% Asist.", "Tareas", "Dificultades", "Asistencias", "Riesgo", "Derivación"].map((t, i) => h("th", { class: i === 1 || i === 8 ? "text-start" : "", text: t })))),
          h("tbody", {}, rows.map(x => h("tr", {},
            h("td", { class: "mono", text: x.cuenta }),
            h("td", { class: "text-start name-cell", title: x.nombre, text: x.nombre }),
            h("td", { class: x.c === "NP" || Number(x.c) < 6 ? "text-danger fw-bold" : "fw-semibold", text: x.c || "—" }),
            h("td", { text: x.a === null ? "—" : `${x.a}%` }),
            h("td", { text: Psi.TAREAS[x.t] }),
            h("td", { text: x.d || "—" }),
            h("td", { class: x.s && x.s !== "Asiste siempre" ? "text-danger" : "", text: x.s || "—" }),
            h("td", {}, h("span", { class: `badge ${Psi.RIESGO[x.r][1]}`, text: Psi.RIESGO[x.r][0] })),
            h("td", { class: "text-start" }, Object.keys(x.m).length
              ? Object.keys(x.m).map(k => h("span", { class: "badge text-bg-light border me-1", title: x.m[k], text: Psi.AREAS[k] }))
              : h("span", { class: "text-body-secondary", text: "—" }))))))));
    };
    tareasSel.addEventListener("change", draw);
    extra.addEventListener("change", draw);
    draw();

    const copy = h("button", { class: "btn btn-success", type: "button" }, icon("clipboard", "me-1"), "Copiar JS");
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(code.value); }
      catch (e) { code.select(); document.execCommand("copy"); }
      UI.toast("success", "JS copiado. Pégalo en la consola de PSI.");
    });
    const download = h("button", { class: "btn btn-outline-secondary", type: "button" }, icon("download", "me-1"), ".js");
    download.addEventListener("click", () => {
      const url = URL.createObjectURL(new Blob([code.value], { type: "text/javascript" }));
      const a = h("a", { href: url }); a.download = `psi_${(g.psi && g.psi.grupo) || "grupo"}_${new Date().toISOString().slice(0, 10)}.js`;
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    });

    UI.modal({
      title: [icon("send-check", "me-2"), `Exportar a PSI · ${g.group.label}`],
      size: "modal-xl",
      body: h("div", {},
        h("div", { class: "row g-2 align-items-end mb-3" },
          h("div", { class: "col-12 col-md-4" }, h("div", { class: "small text-body-secondary", text: "Grupo PSI · periodo" }), h("div", { class: "fw-semibold mono", text: `${g.psi ? g.psi.grupo : "—"} · ${g.psi ? g.psi.periodo : g.group.ciclo}` })),
          h("div", { class: "col-12 col-md-4" }, h("label", { class: "form-label small mb-1", for: "psi-tareas", text: "«Entrega tareas» según" }), tareasSel),
          h("div", { class: "col-12 col-md-4" }, h("div", { class: "form-check" }, extra, h("label", { class: "form-check-label small", for: "psi-extra", text: "Sugerir actividad extracurricular a destacados (≥ 9)" })))),
        h("div", { class: "row g-2 mb-3" },
          h("div", { class: "col-6 col-md-3" }, h("label", { class: "form-label small mb-1", for: "psi-fecha", text: "Fecha de registro" }), fecha),
          h("div", { class: "col-6 col-md-3" }, h("label", { class: "form-label small mb-1", for: "psi-tipo", text: "Tipo de registro" }), tipo),
          h("div", { class: "col-12 col-md-6" }, h("label", { class: "form-label small mb-1", for: "psi-obs", text: "Observaciones generales (editable)" }), obsTxt),
          h("div", { class: "col-12" }, h("label", { class: "form-label small mb-1", for: "psi-acc", text: "Acciones a realizar (editable)" }), accTxt)),
        body,
        h("details", { class: "mt-3" }, h("summary", { class: "small text-body-secondary", text: "Ver código y reglas" }),
          h("ul", { class: "small mt-2" },
            h("li", { text: "Avance: promedio actual redondeado (5–10); NP si nunca se presentó." }),
            h("li", { text: "Asistencias: >3 faltas → «Más de tres faltas»; 3 faltas seguidas al final → «Dejó de asistir»; 0 asistencias → «Nunca se presentó»." }),
            h("li", { text: "Tareas: ≥ 8 SI · 5–7.9 OCASIONALMENTE · < 5 NO." }),
            h("li", { text: "Dificultades: Psicoemocional si tus comentarios lo mencionan; Académico si promedio < 6 o no entrega tareas." }),
            h("li", { text: "Riesgo: suma de promedio, faltas, tareas y comentarios → Ninguno / Bajo / Medio / Alto." }),
            h("li", { text: "Derivación: Tutoría (faltas), Asesoría (promedio < 6, con el rubro más bajo), Psicopedagogía (comentarios)." })),
          code),
        h("ol", { class: "small text-body-secondary mt-3 mb-0" },
          h("li", {}, "Abre en PSI la captura del grupo ", h("b", { text: g.psi ? g.psi.grupo : "" }), "."),
          h("li", { text: "Presiona F12 → pestaña Consola (si Chrome lo pide, escribe «allow pasting»)." }),
          h("li", { text: "Pega el JS, presiona Enter, revisa y ajusta lo que quieras, y presiona Guardar." }))),
      footer: [download, copy]
    });
  },

  /** Ponderación en un modal (desde el encabezado de Asistencia). focusId = componente a resaltar. */
  weightsModal(focusId) {
    const body = h("div");
    let m;
    Admin.tabWeights(body, { modal: true, focusId, onSaved: () => m && m.close() });
    m = UI.modal({ title: [icon("sliders", "me-2"), `Ponderación · ${Admin.group.group.label}`], body, size: "modal-xl" });
    if (focusId) setTimeout(() => {
      const row = body.querySelector(`[data-comp-row="${focusId}"]`);
      if (row) { row.scrollIntoView({ block: "center" }); row.classList.add("flash"); }
    }, 350);
  },

  async columnsModal() {
    const g = Admin.group;
    const body = h("div");
    UI.loading(body);
    const save = h("button", { class: "btn btn-primary", type: "button", disabled: true }, icon("save", "me-1"), "Guardar y actualizar reporte");
    const m = UI.modal({ title: [icon("layout-three-columns", "me-2"), `Columnas · ${g.group.label}`], body, size: "modal-lg", footer: [save] });
    let info;
    try { info = await Api.call("columnsInfo", { idCurso: g.group.id }, "admin"); }
    catch (error) { if (error.code !== "AUTH") body.replaceChildren(UI.empty("exclamation-octagon", error.message)); return; }

    const key = l => l ? `${l.tipo}|${l.ref || ""}` : "";
    const originalOrder = info.columns.map(c => c.name).join("|");
    let changedSheet = false;           // se borró o agregó una columna (ya está en la hoja)
    const notice = h("div");            // aviso en línea (los confirm abrirían otro modal)
    const tbody = h("tbody");

    const makeRow = c => {
      const state = { name: c.name, visible: c.visible, link: c.link || c.suggested || null };
      const sw = h("input", { class: "form-check-input", type: "checkbox", role: "switch", checked: c.visible, "aria-label": `Visible ${c.name}`, onchange: e => { state.visible = e.target.checked; } });
      const sel = h("select", { class: "form-select form-select-sm", "aria-label": `Enlace de ${c.name}`, onchange: e => {
        const o = info.options.find(x => key(x) === e.target.value);
        state.link = o ? { tipo: o.tipo, ref: o.ref } : null;
      } },
        h("option", { value: "", text: "— Sin enlace (se queda como está en la hoja) —" }),
        info.options.map(o => h("option", { value: key(o), selected: key(o) === key(state.link), text: o.label })));
      const actions = h("td", { class: "text-nowrap" });
      const tr = h("tr", {},
        h("td", { class: "text-start fw-semibold", text: c.name }),
        h("td", {}, h("div", { class: "form-check form-switch d-flex justify-content-center mb-0" }, sw)),
        h("td", { class: "text-start", style: { minWidth: "240px" } }, sel,
          !c.link && c.suggested ? h("div", { class: "small text-success mt-1" }, icon("magic", "me-1"), "Sugerido; se aplica al guardar") : null),
        actions);
      return { state, tr, actions };
    };
    const rows = info.columns.map(makeRow);

    const removeColumn = async (row, btn, force = false) => {
      notice.replaceChildren();
      try {
        const r = await UI.busy(btn, () => Api.call("deleteReportColumn", { idCurso: g.group.id, name: row.state.name, force }, "admin"));
        if (r.needsConfirm) {
          const yes = h("button", { class: "btn btn-sm btn-danger", type: "button" }, icon("trash", "me-1"), "Sí, borrar");
          yes.addEventListener("click", () => removeColumn(row, yes, true));
          notice.replaceChildren(h("div", { class: "alert alert-warning d-flex flex-wrap align-items-center gap-2 py-2", role: "alert" },
            icon("exclamation-triangle"), h("span", {}, h("b", { text: r.message }), " Se borrará también de la hoja Reporte_ y no se puede deshacer."),
            h("div", { class: "ms-auto d-flex gap-1" }, h("button", { class: "btn btn-sm btn-outline-secondary", type: "button", text: "Cancelar", onclick: () => notice.replaceChildren() }), yes)));
          notice.scrollIntoView({ block: "nearest" });
          return;
        }
        rows.splice(rows.indexOf(row), 1);
        changedSheet = true;
        drawRows();
        UI.toast("success", r.message);
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    };

    const drawRows = () => {
      rows.forEach((row, i) => {
        const move = d => { [rows[i], rows[i + d]] = [rows[i + d], rows[i]]; drawRows(); };
        const del = h("button", { class: "btn btn-sm btn-outline-danger ms-1", type: "button", title: `Borrar «${row.state.name}» de la hoja` }, icon("trash"));
        del.addEventListener("click", () => removeColumn(row, del));
        row.actions.replaceChildren(
          h("button", { class: "btn btn-sm btn-outline-secondary", type: "button", title: "Mover a la izquierda", "aria-label": "Subir", disabled: i === 0, onclick: () => move(-1) }, icon("arrow-up")),
          h("button", { class: "btn btn-sm btn-outline-secondary ms-1", type: "button", title: "Mover a la derecha", "aria-label": "Bajar", disabled: i === rows.length - 1, onclick: () => move(1) }, icon("arrow-down")),
          del);
      });
      tbody.replaceChildren(...rows.map(r => r.tr));
    };
    drawRows();

    // Agregar columna (se escribe de inmediato en la hoja, al final, como Visible)
    const newName = h("input", { class: "form-control form-control-sm", placeholder: "Nueva columna (ej. Parcial 4, SIAE)", maxlength: "40", "aria-label": "Nombre de la nueva columna" });
    const addBtn = h("button", { class: "btn btn-sm btn-outline-primary", type: "button" }, icon("plus-lg", "me-1"), "Agregar columna");
    addBtn.addEventListener("click", async () => {
      const name = newName.value.trim();
      if (!name) return newName.focus();
      try {
        const r = await UI.busy(addBtn, () => Api.call("addReportColumn", { idCurso: g.group.id, name }, "admin"));
        rows.push(makeRow({ name, visible: true, link: null, suggested: null }));
        changedSheet = true;
        newName.value = "";
        drawRows();
        UI.toast("success", r.message);
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });
    newName.addEventListener("keydown", e => { if (e.key === "Enter") addBtn.click(); });

    const dates = info.dates.map(d => ({ key: d.key, visible: d.visible }));
    const dateChips = h("div", { class: "d-flex flex-wrap gap-1" }, info.dates.map((d, i) => {
      const b = h("button", { type: "button", class: `btn btn-sm ${d.visible ? "btn-outline-primary" : "btn-outline-secondary opacity-50"}`, title: d.visible ? "Visible (clic para ocultar)" : "Oculta (clic para mostrar)", text: d.label });
      b.addEventListener("click", () => { dates[i].visible = !dates[i].visible; b.className = `btn btn-sm ${dates[i].visible ? "btn-outline-primary" : "btn-outline-secondary opacity-50"}`; });
      return b;
    }));

    body.replaceChildren(
      h("p", { class: "small text-body-secondary" }, "Hoja ", h("b", { text: info.sheetName }), ". «Visible» = lo ven los alumnos (fila 1 de la hoja). Al enlazar, la columna se llena sola con los datos de la web. ",
        "↑ ↓ cambian el orden en la hoja al guardar; 🗑 borra la columna de la hoja al momento (si tiene datos te pregunta antes)."),
      notice,
      h("div", { class: "table-wrap auto-h mb-2" }, h("table", { class: "table table-sm table-cch mb-0" },
        h("thead", {}, h("tr", {}, h("th", { class: "text-start", text: "Columna" }), h("th", { text: "Visible" }), h("th", { class: "text-start", text: "Se llena con" }), h("th", { text: "Orden / borrar" }))),
        tbody)),
      h("div", { class: "input-group input-group-sm mb-3", style: { maxWidth: "420px" } }, newName, addBtn),
      h("div", { class: "small fw-semibold mb-1", text: "Fechas (clic para mostrar/ocultar; las nuevas siempre salen visibles)" }), dateChips);

    $("modal-generic").addEventListener("hidden.bs.modal", () => { if (changedSheet && !saved) Admin.loadGroup(); }, { once: true });
    let saved = false;
    save.disabled = false;
    save.addEventListener("click", async () => {
      const order = rows.map(x => x.state.name);
      try {
        const r = await UI.busy(save, () => Api.call("saveColumns", {
          idCurso: g.group.id, columns: rows.map(x => x.state), dates,
          order: order.join("|") === originalOrder ? [] : order
        }, "admin"));
        saved = true;
        UI.toast("success", r.message, 7000);
        m.close();
        Admin.loadGroup();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });
  },

  addStudentModal() {
    const g = Admin.group;
    const cuenta = h("input", { class: "form-control mono", id: "ns-cuenta", inputmode: "numeric", maxlength: "10" });
    const nombre = h("input", { class: "form-control", id: "ns-nombre", maxlength: "80", placeholder: "Vacío = se toma de Students si ya existe" });
    const email = h("input", { class: "form-control", id: "ns-email", type: "email", placeholder: "opcional" });
    const status = h("select", { class: "form-select", id: "ns-status" }, (g.statuses || []).map(x => h("option", { value: x.value, text: x.label })));
    const ok = h("button", { class: "btn btn-primary", type: "button" }, icon("person-plus", "me-1"), "Inscribir");
    const m = UI.modal({
      title: `Inscribir en ${g.group.label}`,
      body: h("div", { class: "vstack gap-2" },
        h("div", {}, h("label", { class: "form-label small", for: "ns-cuenta", text: "Número de cuenta" }), cuenta),
        h("div", {}, h("label", { class: "form-label small", for: "ns-nombre", text: "Nombre" }), nombre),
        h("div", {}, h("label", { class: "form-label small", for: "ns-email", text: "Correo" }), email),
        h("div", {}, h("label", { class: "form-label small", for: "ns-status", text: "Estatus" }), status)),
      footer: [h("button", { class: "btn btn-secondary", type: "button", "data-bs-dismiss": "modal", text: "Cancelar" }), ok]
    });
    ok.addEventListener("click", async () => {
      try {
        const r = await UI.busy(ok, () => Api.call("addStudent", { idCurso: g.group.id, cuenta: cuenta.value, nombre: nombre.value, email: email.value, status: status.value }, "admin"));
        UI.toast("success", r.message); m.close(); Admin.loadGroup();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });
  },

  /* ---------------- Pestaña: Pase de lista ---------------- */
  rollDate: null,

  tabRollCall(content) {
    const g = Admin.group;
    if (!g.group.sheet) {
      content.replaceChildren(UI.empty("calendar-x", "Este grupo no tiene hoja Reporte_ ligada. Lígala en la pestaña «Grupos»."));
      return;
    }
    const pad = n => String(n).padStart(2, "0");
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const date = Admin.rollDate && Admin.rollDate <= today ? Admin.rollDate : today;

    // Estado actual de esa fecha (si ya existe la columna)
    const dates = g.attendance ? g.attendance.dates : [];
    const di = dates.findIndex(d => d.key === date);
    const useRetardoFlag = !!(Admin.boot && Admin.boot.useRetardo);
    const original = {};
    g.students.forEach(s => {
      const v = di === -1 ? "" : (s.statuses[di] || "");
      const key = Fmt.normalize(v);
      original[s.cuenta] = key === "asistencia" || (key === "retardo" && !useRetardoFlag) ? "Asistencia"
        : key === "retardo" ? "Retardo"
        : key === "falta" ? "Falta"
        : key.startsWith("justific") ? "Justificante" : "";
    });
    const marks = Object.assign({}, original);

    const useRetardo = useRetardoFlag;
    const OPTIONS = [
      { v: "Asistencia", k: "✓", cls: "success" },
      useRetardo ? { v: "Retardo", k: "R", cls: "warning" } : null,
      { v: "Falta", k: "✗", cls: "danger" },
      { v: "Justificante", k: "J", cls: "info" }
    ].filter(Boolean);

    const counter = h("span", { class: "small text-body-secondary" });
    const saveBtn = h("button", { class: "btn btn-sm btn-primary", type: "button" });
    const refresh = () => {
      const changed = g.students.filter(s => marks[s.cuenta] !== original[s.cuenta]).length;
      const c = { Asistencia: 0, Retardo: 0, Falta: 0, Justificante: 0, "": 0 };
      g.students.forEach(s => { c[marks[s.cuenta]]++; });
      counter.textContent = `✓ ${c.Asistencia}${useRetardo ? ` · R ${c.Retardo}` : ""} · ✗ ${c.Falta} · J ${c.Justificante} · sin marcar ${c[""]}`;
      saveBtn.replaceChildren(icon("save", "me-1"), `Guardar (${changed})`);
      saveBtn.disabled = !changed;
    };

    const tbody = h("tbody");
    const paintRow = (tr, cuenta) => {
      tr.classList.toggle("unmarked", !marks[cuenta]);
      tr.querySelectorAll(".roll-btns .btn").forEach(b => {
        const opt = OPTIONS.find(o => o.v === b.dataset.v);
        const on = marks[cuenta] === opt.v;
        b.className = `btn btn-sm ${on ? "btn-" + opt.cls : "btn-outline-" + opt.cls}`;
        b.setAttribute("aria-pressed", String(on));
      });
    };
    const draw = (q = "") => {
      tbody.replaceChildren(...g.students
        .filter(s => !q || s.cuenta.includes(q) || Fmt.normalize(s.nombre).includes(q))
        .map(s => {
          const cuenta = h("td", { class: "sticky-col cuenta-cell", text: s.cuenta });
          Parts.applyFaltas(cuenta, s.counts && s.counts.falta);
          const tr = h("tr", { class: "roll-row" }, cuenta, Admin.nameCell(s),
            h("td", {}, h("div", { class: "btn-group roll-btns", role: "group", "aria-label": `Asistencia de ${s.nombre || s.cuenta}` },
              OPTIONS.map(o => h("button", {
                type: "button", class: "btn btn-sm", dataset: { v: o.v }, title: o.v,
                onclick: () => { marks[s.cuenta] = marks[s.cuenta] === o.v ? "" : o.v; paintRow(tr, s.cuenta); refresh(); }
              }, o.k)))));
          paintRow(tr, s.cuenta);
          return tr;
        }));
    };
    draw();
    refresh();

    const dateInput = h("input", { type: "date", class: "form-control form-control-sm", value: date, max: today, "aria-label": "Fecha", style: { width: "auto" } });
    dateInput.addEventListener("change", async () => {
      const changed = g.students.some(s => marks[s.cuenta] !== original[s.cuenta]);
      if (changed && !(await UI.confirm("Tienes cambios sin guardar en esta fecha. ¿Descartarlos?", { okText: "Descartar", danger: true }))) {
        dateInput.value = date; return;
      }
      Admin.rollDate = dateInput.value || today;
      Admin.renderTab();
    });

    const allPresent = h("button", {
      class: "btn btn-sm btn-outline-success", type: "button",
      onclick: () => { g.students.forEach(s => { if (!marks[s.cuenta]) marks[s.cuenta] = "Asistencia"; }); draw(); refresh(); }
    }, icon("check2-all", "me-1"), "Sin marcar → Asistencia");

    saveBtn.addEventListener("click", async () => {
      const list = g.students.filter(s => marks[s.cuenta] !== original[s.cuenta]).map(s => ({ cuenta: s.cuenta, status: marks[s.cuenta] }));
      try {
        const r = await UI.busy(saveBtn, () => Api.call("saveRollCall", { idCurso: g.group.id, date: dateInput.value, marks: list }, "admin"));
        UI.toast("success", r.message);
        Admin.rollDate = dateInput.value;
        Admin.loadGroup();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });

    $("adm-toolbar").replaceChildren(h("div", { class: "d-flex flex-wrap align-items-center gap-2" },
      dateInput, Admin.searchBox("Buscar…", draw), allPresent, counter,
      h("div", { class: "ms-auto" }, saveBtn)));

    content.replaceChildren(...kids(
      di === -1 ? h("div", { class: "alert alert-info py-2 small" }, icon("info-circle", "me-1"), `Aún no hay columna del ${Fmt.date(date + "T12:00:00")} en ${g.group.sheet}; se creará al guardar.`) : null,
      h("div", { class: "table-wrap" }, h("table", { class: "table table-bordered table-hover table-cch roll-table" },
        h("thead", {}, h("tr", {}, h("th", { class: "sticky-col", text: "Cuenta" }), h("th", { class: "text-start", text: "Nombre" }), h("th", { text: OPTIONS.map(o => o.k).join(" · ") }))),
        tbody)),
      h("p", { class: "small text-body-secondary mt-2 mb-0", text: "Se guarda en la hoja Reporte_ y en Attendance Log. Toca otra vez para desmarcar." })
    ));
  },

  /* ---------------- Pestaña: Captura ---------------- */
  tabCapture(content) {
    const g = Admin.group;
    const comps = g.components;
    if (!comps.length) {
      content.replaceChildren(UI.empty("sliders2", "Primero define los componentes en «Ponderaciones»."));
      return;
    }

    const saveBtn = h("button", { class: "btn btn-sm btn-primary", type: "button", onclick: () => Admin.saveCapture(saveBtn) });
    const discardBtn = h("button", { class: "btn btn-sm btn-outline-secondary", type: "button", onclick: () => { Admin.dirty = new Map(); Admin.renderTab(); } }, "Descartar");
    const refreshSave = () => {
      saveBtn.replaceChildren(icon("save", "me-1"), `Guardar (${Admin.dirty.size})`);
      saveBtn.disabled = discardBtn.disabled = !Admin.dirty.size;
    };
    refreshSave();

    const manual = comps.filter(c => c.tipo === "manual");
    const tbody = h("tbody");

    const moveFocus = (input, delta) => {
      const all = Array.from(tbody.querySelectorAll(`input[data-comp="${input.dataset.comp}"]`));
      const next = all[all.indexOf(input) + delta];
      if (next) { next.focus(); next.select(); }
    };

    const draw = (q = "") => {
      tbody.replaceChildren(...g.students
        .filter(s => !q || s.cuenta.includes(q) || Fmt.normalize(s.nombre).includes(q))
        .map(s => {
          const cuenta = h("td", { class: "sticky-col cuenta-cell", text: s.cuenta });
          Parts.applyFaltas(cuenta, s.counts && s.counts.falta);

          const cells = comps.map(comp => {
            const item = s.items[comp.id] || {};
            if (comp.tipo !== "manual") {
              return h("td", { class: "computed" }, Parts.gradeWithBonus(item, comp));
            }
            const key = `${s.cuenta}|${comp.id}`;
            const original = item.base === null || item.base === undefined ? "" : String(item.base);
            const value = Admin.dirty.has(key) ? Admin.dirty.get(key) : original;
            const input = h("input", {
              class: `form-control grade-input ${Admin.dirty.has(key) ? "dirty" : ""}`, inputmode: "decimal", value,
              "aria-label": `${comp.nombre} de ${s.nombre || s.cuenta}`, dataset: { comp: comp.id }
            });
            input.addEventListener("input", () => {
              const raw = input.value.trim().replace(",", ".");
              const n = Number(raw);
              const invalid = raw !== "" && (!isFinite(n) || n < 0 || n > comp.maximo);
              input.classList.toggle("is-invalid", invalid);
              input.title = invalid ? `Debe estar entre 0 y ${comp.maximo}` : "";
              if (raw === original) Admin.dirty.delete(key); else Admin.dirty.set(key, raw);
              input.classList.toggle("dirty", Admin.dirty.has(key));
              refreshSave();
            });
            input.addEventListener("keydown", e => {
              if (e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); moveFocus(input, 1); }
              if (e.key === "ArrowUp") { e.preventDefault(); moveFocus(input, -1); }
            });
            input.addEventListener("focus", () => input.select());
            return h("td", {}, h("div", { class: "d-flex align-items-center justify-content-center gap-1" }, input, Parts.bonusTag(item, comp)));
          });

          return h("tr", {}, cuenta, Admin.nameCell(s), cells,
            h("td", { class: `final-cell ${s.final !== null && s.final < CONFIG.RISK_THRESHOLD ? "grade-low" : ""}`, text: Fmt.grade(s.final) }),
            h("td", { class: "text-body-secondary", text: Fmt.grade(s.finalStrict) }),
            h("td", { class: "fw-semibold", text: Fmt.int(s.finalStrict) }));
        }));
      // Los popovers de bonos se crean dentro de gradeWithBonus
    };
    draw();

    $("adm-toolbar").replaceChildren(h("div", { class: "d-flex flex-wrap align-items-center gap-2" },
      Admin.searchBox("Buscar…", draw),
      h("button", { class: "btn btn-sm btn-outline-success", type: "button", title: "Descargar Excel con las calificaciones actuales", onclick: () => Admin.gradesTemplate() }, icon("file-earmark-spreadsheet", "me-1"), "Plantilla Excel"),
      h("label", { class: "btn btn-sm btn-success mb-0", title: "Subir el Excel llenado" }, icon("upload", "me-1"), "Importar Excel",
        h("input", { type: "file", accept: ".xlsx", class: "d-none", onchange: e => { const f = e.target.files[0]; e.target.value = ""; if (f) Admin.importGrades(f); } })),
      h("span", { class: "small text-body-secondary d-none d-xl-inline" }, icon("keyboard"), " Enter/↓ baja"),
      h("div", { class: "ms-auto d-flex gap-2" }, discardBtn, saveBtn)));

    content.replaceChildren(...kids(
      h("div", { class: "table-wrap" }, h("table", { class: "table table-bordered table-hover table-cch" },
        h("thead", {}, h("tr", {},
          h("th", { class: "sticky-col", text: "Cuenta" }), h("th", { class: "text-start", text: "Nombre" }),
          comps.map(c => h("th", { dataset: { comp: c.id }, title: c.tipo === "manual" ? `Escala 0–${c.maximo}` : "Se calcula solo" },
            c.nombre, h("div", { class: "fw-normal small opacity-75", text: `${Fmt.num(c.ponderacion)}%${c.tipo === "manual" ? ` · /${c.maximo}` : " · auto"}` }))),
          h("th", { dataset: { comp: "final" }, text: "Final" }), h("th", { title: "Lo no evaluado cuenta 0", text: "Estricta" }), h("th", { title: "Suma de % sin redondear: solo se quitan los decimales (Calificación / SIAE)", text: "Entera" }))),
        tbody)),
      manual.length ? null : h("p", { class: "small text-body-secondary mt-2", text: "No hay componentes manuales: todo se calcula solo." })
    ));
  },

  /** Excel con Cuenta, Nombre y una columna por componente manual (vacíos en amarillo). */
  gradesTemplate() {
    const g = Admin.group;
    const comps = g.components.filter(c => c.tipo === "manual");
    if (!comps.length) return UI.toast("warning", "Este grupo no tiene componentes manuales.");
    const header = ["Cuenta", "Nombre"].concat(comps.map(c => c.nombre)).map(v => ({ v, s: "head" }));
    const rows = g.students.map(st => [Number(st.cuenta), st.nombre].concat(comps.map(c => {
      const it = st.items[c.id];
      return it && it.base !== null && it.base !== undefined ? it.base : { v: "", s: "miss" };
    })));
    const help = [
      [{ v: "Cómo usar esta plantilla", s: "head" }],
      ["1. Llena las celdas amarillas (faltantes). Puedes corregir las demás."],
      ["2. No cambies la columna Cuenta ni los títulos de los componentes."],
      ["3. Escala: " + comps.map(c => `${c.nombre} 0–${c.maximo}`).join(" · ")],
      ["4. En la web: Captura → Importar Excel. Las celdas vacías no borran nada."]
    ];
    Xlsx.download(Xlsx.write([
      { name: g.group.label, rows: [header].concat(rows), widths: [13, 42].concat(comps.map(() => 13)), header: true },
      { name: "Instrucciones", rows: help, widths: [90] }
    ]), `Calificaciones_${Fmt.normalize(g.group.label).replace(/[^a-z0-9]+/g, "_")}.xlsx`);
  },

  /** Lee el Excel, empata por Cuenta y por nombre de componente, muestra resumen y guarda. */
  async importGrades(file) {
    const g = Admin.group;
    let sheets;
    try { sheets = await Xlsx.read(file); }
    catch (error) { return UI.toast("danger", error.message); }
    const key = v => Fmt.normalize(v).replace(/[\s_\-.]+/g, "");
    const num = String(g.group.group || "");
    const sheet = sheets.find(x => num && x.name.includes(num)) || sheets.find(x => !/instruc/i.test(x.name)) || sheets[0];
    const header = (sheet.rows[0] || []).map(v => String(v ?? ""));
    const iCuenta = header.findIndex(v => key(v) === "cuenta" || key(v).includes("cuenta"));
    if (iCuenta === -1) return UI.toast("danger", `La hoja «${sheet.name}» no tiene la columna Cuenta.`);
    const comps = g.components.filter(c => c.tipo === "manual");
    const map = [], unknown = [];
    header.forEach((v, i) => {
      if (i === iCuenta || !v || key(v) === "nombre") return;
      const c = comps.find(x => key(x.nombre) === key(v));
      if (c) map.push({ i, c }); else unknown.push(v);
    });
    const byCuenta = {};
    g.students.forEach(st => { byCuenta[st.cuenta] = st; });
    const entries = [], notInGroup = [];
    sheet.rows.slice(1).forEach(row => {
      const cuenta = String(row[iCuenta] ?? "").replace(/\D/g, "");
      if (!cuenta) return;
      const st = byCuenta[cuenta];
      if (!st) { notInGroup.push(cuenta); return; }
      map.forEach(({ i, c }) => {
        const raw = row[i];
        if (raw === "" || raw === undefined || raw === null) return;
        const val = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
        const cur = st.items[c.id] ? st.items[c.id].base : null;
        if (cur !== null && cur !== undefined && Number(cur) === val) return;
        entries.push({ cuenta, componentId: c.id, valor: String(raw).replace(",", ".") });
      });
    });
    const ok = h("button", { class: "btn btn-success", type: "button", disabled: !entries.length }, icon("upload", "me-1"), `Guardar ${entries.length}`);
    const m = UI.modal({
      title: [icon("file-earmark-spreadsheet", "me-2"), "Importar calificaciones"],
      body: h("div", { class: "small" },
        h("p", {}, "Hoja ", h("b", { text: sheet.name }), ` · ${sheet.rows.length - 1} filas.`),
        h("p", {}, "Columnas reconocidas: ", h("b", { text: map.map(x => x.c.nombre).join(", ") || "ninguna" })),
        unknown.length ? h("p", { class: "text-warning-emphasis", text: `Se ignoran: ${unknown.join(", ")}` }) : null,
        notInGroup.length ? h("p", { class: "text-warning-emphasis", text: `${notInGroup.length} cuenta(s) no están en el grupo: ${notInGroup.slice(0, 8).join(", ")}${notInGroup.length > 8 ? "…" : ""}` }) : null,
        h("div", { class: "alert alert-light border mb-0" }, entries.length ? `Se guardarán ${entries.length} calificación(es) nuevas o cambiadas. Las celdas vacías no borran nada.` : "No hay cambios que guardar.")),
      footer: [h("button", { class: "btn btn-secondary", type: "button", "data-bs-dismiss": "modal", text: "Cancelar" }), ok]
    });
    ok.addEventListener("click", async () => {
      try {
        const r = await UI.busy(ok, () => Api.call("saveGrades", { idCurso: g.group.id, entries }, "admin"));
        UI.toast(r.errors.length ? "warning" : "success", r.message + (r.errors.length ? "\n" + r.errors.slice(0, 6).join("\n") : ""), 9000);
        m.close();
        Admin.loadGroup();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });
  },

  async saveCapture(button) {
    const invalid = document.querySelectorAll("#adm-content .grade-input.is-invalid");
    if (invalid.length) {
      invalid[0].focus();
      return UI.toast("warning", `Hay ${invalid.length} valor(es) fuera de escala (en rojo). Corrígelos antes de guardar.`);
    }
    const entries = Array.from(Admin.dirty.entries()).map(([key, valor]) => {
      const [cuenta, componentId] = key.split("|");
      return { cuenta, componentId, valor };
    });
    try {
      const r = await UI.busy(button, () => Api.call("saveGrades", { idCurso: Admin.group.group.id, entries }, "admin"));
      UI.toast(r.errors.length ? "warning" : "success", r.message + (r.errors.length ? "\n" + r.errors.slice(0, 6).join("\n") : ""));
      Admin.dirty = new Map();
      Admin.loadGroup();
    } catch (error) {
      if (error.code !== "AUTH") UI.toast("danger", error.message);
    }
  },

  /* ---------------- Pestaña: Ponderaciones ---------------- */
  tabWeights(content, opts = {}) {
    const g = Admin.group;
    const fresh = () => g.components.map(c => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, ponderacion: c.ponderacion, maximo: c.maximo }));
    // En la pestaña el borrador sobrevive al cambiar de pestaña; en el modal siempre parte de lo guardado
    if (!opts.modal && !Admin.compDraft) Admin.compDraft = fresh();
    const draft = opts.modal ? fresh() : Admin.compDraft;
    const types = { manual: "Manual (capturo yo)", asistencia: "Asistencia (automática)", proyectos: "Proyectos en equipo (automática)" };

    const list = h("div", { class: "vstack gap-2" });
    const sumBar = h("div", { class: "progress-bar" });
    const sumText = h("span", { class: "fw-semibold" });

    const updateSum = () => {
      const sum = draft.reduce((s, c) => s + (Number(c.ponderacion) || 0), 0);
      sumText.textContent = `${Fmt.num(sum)}%`;
      sumBar.style.width = `${Math.min(sum, 100)}%`;
      sumBar.className = `progress-bar ${sum === 100 ? "bg-success" : sum > 100 ? "bg-danger" : "bg-warning"}`;
    };

    const draw = () => {
      list.replaceChildren(...draft.map((c, i) => {
        const maxInput = h("input", { class: "form-control form-control-sm", type: "number", min: "1", step: "any", value: c.maximo, disabled: c.tipo !== "manual", "aria-label": "Escala máxima", oninput: e => { c.maximo = e.target.value; } });
        return h("div", { class: `card card-soft comp-row ${opts.focusId && c.id === opts.focusId ? "comp-focus" : ""}`, dataset: { compRow: c.id || "" } }, h("div", { class: "card-body p-2" }, h("div", { class: "row g-2 align-items-center" },
          h("div", { class: "col-12 col-md-4" }, h("input", { class: "form-control form-control-sm", value: c.nombre, placeholder: "Nombre (ej. Parcial 1, Teams, Sellos)", "aria-label": "Nombre", maxlength: "60", oninput: e => { c.nombre = e.target.value; } })),
          h("div", { class: "col-12 col-md-3" }, h("select", {
            class: "form-select form-select-sm", "aria-label": "Tipo",
            onchange: e => { c.tipo = e.target.value; if (c.tipo !== "manual") c.maximo = 10; draw(); }
          }, Object.entries(types).map(([v, t]) => h("option", { value: v, selected: c.tipo === v, text: t })))),
          h("div", { class: "col-4 col-md-2" }, h("div", { class: "input-group input-group-sm" },
            h("input", { class: "form-control", type: "number", min: "0", max: "100", step: "any", value: c.ponderacion, "aria-label": "Ponderación", oninput: e => { c.ponderacion = e.target.value; updateSum(); } }),
            h("span", { class: "input-group-text", text: "%" }))),
          h("div", { class: "col-4 col-md-1" }, h("div", { class: "input-group input-group-sm" }, h("span", { class: "input-group-text", text: "/" }), maxInput)),
          h("div", { class: "col-4 col-md-2 text-end" },
            h("button", { class: "btn btn-sm btn-outline-secondary", type: "button", title: "Subir", disabled: i === 0, onclick: () => { [draft[i - 1], draft[i]] = [draft[i], draft[i - 1]]; draw(); } }, icon("arrow-up")),
            h("button", { class: "btn btn-sm btn-outline-secondary ms-1", type: "button", title: "Bajar", disabled: i === draft.length - 1, onclick: () => { [draft[i + 1], draft[i]] = [draft[i], draft[i + 1]]; draw(); } }, icon("arrow-down")),
            h("button", { class: "btn btn-sm btn-outline-danger ms-1", type: "button", title: "Quitar", onclick: () => { draft.splice(i, 1); draw(); } }, icon("trash")))
        )));
      }));
      updateSum();
    };
    draw();

    const saveBtn = h("button", { class: "btn btn-primary", type: "button" }, icon("save", "me-1"), "Guardar ponderaciones");
    saveBtn.addEventListener("click", async () => {
      try {
        const r = await UI.busy(saveBtn, () => Api.call("saveComponents", { idCurso: g.group.id, components: draft }, "admin"));
        UI.toast("success", r.message);
        Admin.compDraft = null;
        if (opts.onSaved) opts.onSaved();
        Admin.loadGroup();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });

    /* Plantilla por defecto: conserva el ID de los componentes con el mismo nombre
       (así no se pierden las calificaciones ya capturadas ni los enlaces de columnas). */
    const applyTemplate = () => {
      const byName = {};
      draft.forEach(c => { if (c.id) byName[Fmt.normalize(c.nombre)] = c; });
      const list = Admin.boot.defaults.components.map(c => {
        const old = byName[Fmt.normalize(c.nombre)];
        return Object.assign({}, c, old ? { id: old.id, maximo: old.tipo === c.tipo ? old.maximo : c.maximo } : { id: undefined });
      });
      draft.splice(0, draft.length, ...list);
      draw();
    };
    const templateBtn = h("button", {
      class: "btn btn-outline-secondary btn-sm", type: "button", title: "Los componentes con el mismo nombre conservan sus calificaciones",
      onclick: async () => {
        if (!opts.modal && draft.length && !(await UI.confirm("¿Reemplazar la lista actual por la plantilla por defecto? Los componentes con el mismo nombre conservan sus calificaciones. No se guarda hasta que presiones Guardar."))) return;
        applyTemplate();
      }
    }, icon("magic", "me-1"), "Plantilla por defecto");

    content.replaceChildren(
      h("div", { class: "card card-soft mb-3" }, h("div", { class: "card-body" },
        h("div", { class: "d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2" },
          h("h2", { class: "h6 mb-0" }, `Forma de evaluación · ${g.group.label}`),
          h("span", { class: "small" }, "Suma: ", sumText)),
        h("div", { class: "progress weight-bar mb-2", role: "progressbar", "aria-label": "Suma de ponderaciones" }, sumBar),
        h("p", { class: "small text-body-secondary mb-0" },
          "«Manual» = lo capturas tú en Captura (parciales, sellos, Teams…) en su propia escala (/10, /15, /100) y se convierte a 10. ",
          "«Asistencia» = asistencias ÷ (asistencias + faltas) × 10; el justificante no cuenta en contra. ",
          "«Proyectos» = promedio de los proyectos ligados a ese componente. ",
          "La suma de porcentajes equivale a 10: «Calificación entera» suma lo obtenido y quita los decimales (no redondea).")
      )),
      list,
      h("div", { class: "d-flex flex-wrap gap-2 mt-3" },
        h("button", { class: "btn btn-outline-primary btn-sm", type: "button", onclick: () => { draft.push({ nombre: "", tipo: "manual", ponderacion: 0, maximo: 10 }); draw(); } }, icon("plus-lg", "me-1"), "Agregar componente"),
        templateBtn,
        h("div", { class: "ms-auto" }, saveBtn))
    );
  },

  /* ---------------- Pestaña: Proyectos ---------------- */
  tabProjects(content) {
    const g = Admin.group;
    const projectComps = g.components.filter(c => c.tipo === "proyectos");

    const view = Prefs.get("projView") === "tabla" ? "tabla" : "tarjetas";
    const viewBtn = (v, iconName, label) => h("button", {
      class: `btn btn-sm ${view === v ? "btn-dark" : "btn-outline-secondary"}`, type: "button", "aria-pressed": String(view === v),
      onclick: () => { Prefs.set("projView", v); Admin.renderTab(); }
    }, icon(iconName, "me-1"), label);
    $("adm-toolbar").replaceChildren(h("div", { class: "d-flex flex-wrap gap-2" },
      h("button", { class: "btn btn-sm btn-primary", type: "button", onclick: () => Admin.editProject(null) }, icon("plus-lg", "me-1"), "Nuevo proyecto"),
      h("div", { class: "btn-group ms-auto", role: "group", "aria-label": "Vista" }, viewBtn("tarjetas", "grid-3x2-gap", "Tarjetas"), viewBtn("tabla", "table", "Tabla"))));

    if (!g.projects.length) {
      content.replaceChildren(UI.empty("star", "Aún no hay proyectos en este grupo. Crea uno y abre el registro para que los alumnos den de alta su equipo."));
      return;
    }

    const names = {};
    g.students.forEach(s => { names[s.cuenta] = s.nombre; });

    content.replaceChildren(h("div", { class: "vstack gap-3" }, g.projects.map(p => {
      const comp = projectComps.find(c => c.id === p.componentId);
      const inTeam = new Set(p.teams.flatMap(t => t.members.map(m => m.cuenta)));
      const without = g.students.filter(s => !inTeam.has(s.cuenta));

      return h("div", { class: "card card-soft", dataset: { project: p.id } },
        h("div", { class: "card-header d-flex flex-wrap align-items-center gap-2 bg-transparent" },
          h("h2", { class: "h6 mb-0 me-2", text: p.nombre }),
          h("span", { class: `badge ${p.abierto ? "text-bg-success" : "text-bg-secondary"}` }, icon(p.abierto ? "unlock" : "lock"), p.abierto ? " Registro abierto" : " Registro cerrado"),
          comp ? h("span", { class: "badge text-bg-light border", text: `→ ${comp.nombre}` }) : h("span", { class: "badge text-bg-warning", text: "Sin componente ligado" }),
          h("div", { class: "ms-auto d-flex gap-1" },
            h("button", { class: "btn btn-sm btn-outline-primary", type: "button", onclick: () => Admin.editTeam(p, null) }, icon("person-plus"), h("span", { class: "d-none d-md-inline ms-1", text: "Equipo" })),
            h("button", { class: "btn btn-sm btn-outline-secondary", type: "button", title: "Editar proyecto", onclick: () => Admin.editProject(p) }, icon("pencil")),
            h("button", {
              class: "btn btn-sm btn-outline-danger", type: "button", title: "Eliminar proyecto",
              onclick: async () => {
                if (!(await UI.confirm(`¿Eliminar «${p.nombre}» con sus ${p.teams.length} equipo(s) y evaluaciones?`, { okText: "Eliminar", danger: true }))) return;
                try { UI.toast("success", (await Api.call("deleteProject", { projectId: p.id }, "admin")).message); Admin.loadGroup(); }
                catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
              }
            }, icon("trash")))),
        h("div", { class: "card-body" },
          h("div", { class: "mb-3" }, p.rubros.map(r => h("span", { class: "chip", text: r }))),
          p.teams.length
            ? (view === "tabla" ? Admin.teamsTable(p) : h("div", { class: "row g-3" }, p.teams.map(t => h("div", { class: "col-12 col-md-6 col-xl-4" }, Admin.teamCard(p, t)))))
            : h("p", { class: "text-body-secondary small", text: "Sin equipos registrados." }),
          without.length ? h("details", { class: "mt-3" },
            h("summary", { class: "small text-body-secondary", text: `${without.length} alumno(s) sin equipo` }),
            h("div", { class: "mt-2" }, without.map(s => h("span", { class: "chip", title: s.nombre, text: `${s.cuenta} ${s.nombre ? "· " + s.nombre.split(" ").slice(0, 2).join(" ") : ""}` })))) : null
        ));
    })));
  },

  /** Vista en tabla: una fila por equipo; «Editar» abre la tarjeta en un modal. */
  teamsTable(project) {
    const max = 5 * project.rubros.length;
    return h("div", { class: "table-wrap auto-h" }, h("table", { class: "table table-sm table-hover table-cch mb-0" },
      h("thead", {}, h("tr", {},
        h("th", { class: "text-start", text: "Equipo" }), h("th", { class: "text-start", text: "Integrantes" }),
        project.rubros.map(r => h("th", { title: r, text: r.length > 14 ? r.slice(0, 13) + "…" : r })),
        h("th", { text: "★" }), h("th", { text: "Calif." }), h("th", { class: "text-start", text: "Observaciones" }), h("th", { text: "" }))),
      h("tbody", {}, project.teams.map(t => {
        const total = project.rubros.reduce((sum, r) => sum + (Number(t.stars[r]) || 0), 0);
        return h("tr", {},
          h("td", { class: "text-start fw-semibold", text: t.nombre }),
          h("td", { class: "text-start small", style: { whiteSpace: "normal", minWidth: "180px", maxWidth: "260px" }, text: t.members.map(m => (m.nombre || m.cuenta).split(" ").slice(0, 2).join(" ")).join(", ") }),
          project.rubros.map(r => h("td", { text: t.stars[r] ? "★".repeat(t.stars[r]) : "—", class: "stars-text" })),
          h("td", { class: "small text-body-secondary", text: `${total}/${max}` }),
          h("td", {}, t.calificacion === null ? h("span", { class: "badge text-bg-light border", text: "—" }) : h("span", { class: `badge ${t.calificacion < CONFIG.RISK_THRESHOLD ? "text-bg-danger" : "text-bg-success"}`, text: Fmt.grade(t.calificacion) })),
          h("td", { class: "text-start small text-truncate", style: { maxWidth: "220px" }, title: t.observaciones, text: t.observaciones || "" }),
          h("td", {}, h("button", { class: "btn btn-sm btn-outline-primary", type: "button", title: "Editar", onclick: () => Admin.teamModal(project, t) }, icon("pencil-square"), h("span", { class: "visually-hidden", text: "Editar" }))));
      }))));
  },

  teamModal(project, team) {
    let modal;
    const card = Admin.teamCard(project, team, () => modal && modal.close());
    modal = UI.modal({ title: [icon("people", "me-2"), `${team.nombre} · ${project.nombre}`], body: card });
  },

  /** Tarjeta editable de un equipo. onSaved: se llama tras guardar (p. ej. cerrar el modal). */
  teamCard(project, team, onSaved) {
    const stars = Object.assign({}, team.stars);
    const obs = h("textarea", { class: "form-control form-control-sm", rows: "2", placeholder: "Observaciones (solo para ti; los alumnos no las ven)", maxlength: "1000" });
    obs.value = team.observaciones || "";
    const preview = h("span", { class: "badge fs-6" });
    const paintPreview = () => {
      const total = project.rubros.reduce((s, r) => s + (stars[r] || 0), 0);
      const grade = total / (5 * project.rubros.length) * 10;
      preview.textContent = Fmt.grade(grade);
      preview.className = `badge fs-6 ${grade < CONFIG.RISK_THRESHOLD ? "text-bg-danger" : "text-bg-success"}`;
    };
    paintPreview();

    const save = h("button", { class: "btn btn-sm btn-primary", type: "button" }, icon("check2", "me-1"), "Calificar");
    save.addEventListener("click", async () => {
      try {
        const r = await UI.busy(save, () => Api.call("saveTeamEval", { teamId: team.id, stars, observaciones: obs.value }, "admin"));
        UI.toast("success", r.message);
        if (onSaved) onSaved();
        Admin.loadGroup();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });

    return h("div", { class: "card card-soft h-100" }, h("div", { class: "card-body p-3" },
      h("div", { class: "d-flex justify-content-between align-items-start mb-2" },
        h("div", {}, h("div", { class: "fw-semibold", text: team.nombre }),
          h("div", { class: "small text-body-secondary", text: team.calificacion === null ? "Sin calificar" : `Guardada: ${Fmt.grade(team.calificacion)}` })),
        preview),
      h("ul", { class: "list-unstyled small mb-2" }, team.members.map(m => h("li", { class: "text-truncate" }, h("span", { class: "mono me-1", text: m.cuenta }), m.nombre))),
      h("div", { class: "mb-2" }, project.rubros.map(r => h("div", { class: "rubric-row small" }, h("span", { text: r }),
        Parts.starsInput(stars[r] || 0, n => { stars[r] = n; paintPreview(); }, r)))),
      obs,
      h("div", { class: "d-flex justify-content-between mt-2" },
        h("div", {},
          h("button", { class: "btn btn-sm btn-outline-secondary", type: "button", title: "Editar integrantes", onclick: () => Admin.editTeam(project, team) }, icon("pencil")),
          h("button", {
            class: "btn btn-sm btn-outline-danger ms-1", type: "button", title: "Eliminar equipo",
            onclick: async () => {
              if (!(await UI.confirm(`¿Eliminar el equipo «${team.nombre}»?`, { okText: "Eliminar", danger: true }))) return;
              try { UI.toast("success", (await Api.call("deleteTeam", { teamId: team.id }, "admin")).message); Admin.loadGroup(); }
              catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
            }
          }, icon("trash"))),
        save)
    ));
  },

  editProject(project) {
    const g = Admin.group;
    const projectComps = g.components.filter(c => c.tipo === "proyectos");
    const name = h("input", { class: "form-control", id: "pj-name", maxlength: "80", value: project ? project.nombre : "", placeholder: "Ej. Carrito con material reciclado" });
    const rubrics = h("textarea", { class: "form-control", id: "pj-rubrics", rows: "5" });
    rubrics.value = (project ? project.rubros : Admin.boot.defaults.rubrics).join("\n");
    const comp = h("select", { class: "form-select", id: "pj-comp" },
      h("option", { value: "", text: "— Ninguno (no cuenta en la calificación) —" }),
      projectComps.map(c => h("option", { value: c.id, selected: project ? project.componentId === c.id : projectComps.length === 1, text: `${c.nombre} (${Fmt.num(c.ponderacion)}%)` })));
    const open = h("input", { class: "form-check-input", type: "checkbox", id: "pj-open", checked: project ? project.abierto : true });

    const saveBtn = h("button", { class: "btn btn-primary", type: "button" }, icon("save", "me-1"), "Guardar");
    const m = UI.modal({
      title: project ? "Editar proyecto" : "Nuevo proyecto",
      body: h("div", { class: "vstack gap-3" },
        h("div", {}, h("label", { class: "form-label", for: "pj-name", text: "Nombre" }), name),
        h("div", {}, h("label", { class: "form-label", for: "pj-rubrics", text: "Rubros (uno por línea, cada uno de 1 a 5 estrellas)" }), rubrics,
          h("div", { class: "form-text", text: "Puedes cambiarlos después; la calificación se recalcula con los rubros vigentes." })),
        h("div", {}, h("label", { class: "form-label", for: "pj-comp", text: "Cuenta en el componente" }), comp,
          projectComps.length ? null : h("div", { class: "form-text text-warning-emphasis", text: "Este grupo no tiene un componente de tipo «Proyectos». Agrégalo en Ponderaciones para que cuente." })),
        h("div", { class: "form-check form-switch" }, open, h("label", { class: "form-check-label", for: "pj-open", text: "Registro de equipos abierto para alumnos" }))),
      footer: [h("button", { class: "btn btn-secondary", type: "button", "data-bs-dismiss": "modal", text: "Cancelar" }), saveBtn]
    });

    saveBtn.addEventListener("click", async () => {
      try {
        const payload = { id: project ? project.id : "", nombre: name.value, rubros: rubrics.value.split("\n"), componentId: comp.value, abierto: open.checked };
        const r = await UI.busy(saveBtn, () => Api.call("saveProject", { idCurso: g.group.id, project: payload }, "admin"));
        UI.toast("success", r.message);
        m.close();
        Admin.loadGroup();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });
  },

  editTeam(project, team) {
    const name = h("input", { class: "form-control", id: "tm-name", maxlength: "50", value: team ? team.nombre : "" });
    const cuentas = h("textarea", { class: "form-control mono", id: "tm-cuentas", rows: "5", placeholder: "Un número de cuenta por línea" });
    cuentas.value = team ? team.members.map(m => m.cuenta).join("\n") : "";
    const saveBtn = h("button", { class: "btn btn-primary", type: "button" }, icon("save", "me-1"), "Guardar");

    const m = UI.modal({
      title: `${team ? "Editar" : "Agregar"} equipo · ${project.nombre}`,
      body: h("div", { class: "vstack gap-3" },
        h("div", {}, h("label", { class: "form-label", for: "tm-name", text: "Nombre del equipo" }), name),
        h("div", {}, h("label", { class: "form-label", for: "tm-cuentas", text: "Integrantes" }), cuentas,
          h("div", { class: "form-text", text: "Se valida que estén inscritos en el grupo y que no tengan otro equipo en este proyecto." }))),
      footer: [h("button", { class: "btn btn-secondary", type: "button", "data-bs-dismiss": "modal", text: "Cancelar" }), saveBtn]
    });

    saveBtn.addEventListener("click", async () => {
      try {
        const r = await UI.busy(saveBtn, () => Api.call("adminSaveTeam", { projectId: project.id, teamId: team ? team.id : "", nombre: name.value, cuentas: cuentas.value }, "admin"));
        UI.toast("success", r.message);
        m.close();
        Admin.loadGroup();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });
  },

  /* ---------------- Pestaña: Evidencias ---------------- */
  async tabEvidence(content) {
    const estado = h("select", { class: "form-select form-select-sm w-auto", "aria-label": "Estado" },
      [["Pendiente", "Pendientes"], ["Aplicada", "Aplicadas"], ["Rechazada", "Rechazadas"], ["", "Todas"]].map(([v, t]) => h("option", { value: v, selected: Prefs.get("evFilter") === v, text: t })));
    const onlyGroup = h("input", { class: "form-check-input", type: "checkbox", id: "ev-only-group" });

    const load = async () => {
      Prefs.set("evFilter", estado.value);
      UI.loading(content);
      try {
        Admin.evidence = await Api.call("listEvidence", { estado: estado.value, idCurso: onlyGroup.checked && Admin.group ? Admin.group.group.id : "" }, "admin");
        if (estado.value === "Pendiente") Admin.updateEvidenceBadge(Admin.evidence.items.length);
        Admin.drawEvidence(content);
      } catch (error) { if (error.code !== "AUTH") content.replaceChildren(UI.empty("wifi-off", error.message)); }
    };
    estado.addEventListener("change", load);
    onlyGroup.addEventListener("change", load);

    const view = Prefs.get("evView") === "tabla" ? "tabla" : "tarjetas";
    const viewBtn = (v, iconName, label) => h("button", {
      class: `btn btn-sm ${view === v ? "btn-dark" : "btn-outline-secondary"}`, type: "button", "aria-pressed": String(view === v),
      onclick: () => { Prefs.set("evView", v); Admin.drawEvidence(content); viewBtns.querySelectorAll("button").forEach(b => { const on = b.dataset.v === Prefs.get("evView"); b.className = `btn btn-sm ${on ? "btn-dark" : "btn-outline-secondary"}`; }); },
      dataset: { v }
    }, icon(iconName, "me-1"), label);
    const viewBtns = h("div", { class: "btn-group ms-auto", role: "group", "aria-label": "Vista" }, viewBtn("tarjetas", "grid-3x2-gap", "Tarjetas"), viewBtn("tabla", "table", "Tabla"));
    $("adm-toolbar").replaceChildren(h("div", { class: "d-flex flex-wrap align-items-center gap-3" }, estado,
      h("div", { class: "form-check mb-0" }, onlyGroup, h("label", { class: "form-check-label small", for: "ev-only-group", text: "Solo el grupo seleccionado" })),
      viewBtns));
    await load();
  },

  /** Formulario de revisión de una evidencia (se usa en tarjeta y en modal). */
  evidenceReview(ev, onDone) {
    const comps = Admin.evidence.componentsByCourse[ev.idCurso] || [];
    const points = h("input", { class: "form-control form-control-sm", type: "number", min: "0", step: "0.1", value: ev.puntos ?? "", placeholder: "Puntos", "aria-label": "Puntos" });
    const comp = h("select", { class: "form-select form-select-sm", "aria-label": "Sumar a" },
      h("option", { value: "", text: comps.length ? "Sumar a…" : "Sin componentes manuales" }),
      comps.map(c => h("option", { value: c.id, selected: ev.componentId === c.id, text: `${c.nombre} (/${c.maximo})` })));
    const note = h("input", { class: "form-control form-control-sm", maxlength: "500", value: ev.nota || "", placeholder: "Nota interna (el alumno no la ve)", "aria-label": "Nota interna" });
    const act = (estado, btn) => async () => {
      try {
        const r = await UI.busy(btn, () => Api.call("reviewEvidence", { id: ev.id, estado, puntos: points.value, componentId: comp.value, nota: note.value }, "admin"));
        UI.toast("success", r.message);
        if (onDone) onDone();
        Admin.tabEvidence($("adm-content"));
        if (Admin.group && ev.idCurso === Admin.group.group.id) Admin.group = await Api.call("groupData", { idCurso: ev.idCurso }, "admin");
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    };
    const apply = h("button", { class: "btn btn-sm btn-success", type: "button" }, icon("check2", "me-1"), "Aplicar");
    const reject = h("button", { class: "btn btn-sm btn-outline-danger", type: "button" }, "Rechazar");
    const pending = h("button", { class: "btn btn-sm btn-outline-secondary", type: "button" }, "Pendiente");
    apply.addEventListener("click", act("Aplicada", apply));
    reject.addEventListener("click", act("Rechazada", reject));
    pending.addEventListener("click", act("Pendiente", pending));
    return h("div", {},
      h("div", { class: "row g-2" }, h("div", { class: "col-4" }, points), h("div", { class: "col-8" }, comp), h("div", { class: "col-12" }, note)),
      h("div", { class: "d-flex justify-content-end gap-2 mt-2" }, ev.estado !== "Pendiente" ? pending : null, reject, apply));
  },

  drawEvidence(content) {
    const { items } = Admin.evidence;
    if (!items.length) { content.replaceChildren(UI.empty("inbox", "No hay evidencias con ese filtro.")); return; }
    const badge = { Pendiente: "text-bg-warning", Aplicada: "text-bg-success", Rechazada: "text-bg-danger" };
    const who = ev => h("a", { href: "#", class: "link-body-emphasis", onclick: e => { e.preventDefault(); Admin.openProfile(ev.cuenta); } }, `${ev.cuenta} · ${ev.nombre}`);
    const fileBtn = ev => ev.url ? h("a", { class: "btn btn-sm btn-outline-primary", href: ev.url, target: "_blank", rel: "noopener noreferrer", title: ev.archivo || "Abrir" }, icon("box-arrow-up-right")) : null;

    if (Prefs.get("evView") === "tabla") {
      content.replaceChildren(h("div", { class: "table-wrap auto-h" }, h("table", { class: "table table-sm table-hover table-cch mb-0" },
        h("thead", {}, h("tr", {}, ["Alumno", "Grupo", "Tipo", "Actividad", "Enviada", "Estado", "Puntos", ""].map((t, i) => h("th", { class: i < 4 ? "text-start" : "", text: t })))),
        h("tbody", {}, items.map(ev => h("tr", {},
          h("td", { class: "text-start small" }, who(ev)),
          h("td", { class: "text-start small", text: ev.grupo }),
          h("td", { class: "text-start small", text: ev.tipo }),
          h("td", { class: "text-start small text-truncate", style: { maxWidth: "260px" }, title: ev.descripcion || ev.titulo, text: ev.titulo }),
          h("td", { class: "small", text: Fmt.date(ev.enviado) }),
          h("td", {}, h("span", { class: `badge ${badge[ev.estado]}`, text: ev.estado })),
          h("td", { class: "small", text: ev.estado === "Aplicada" ? `+${Fmt.num(ev.puntos)}` : "—" }),
          h("td", { class: "text-nowrap" }, fileBtn(ev), " ",
            h("button", {
              class: "btn btn-sm btn-primary", type: "button", title: "Revisar",
              onclick: () => {
                let m;
                m = UI.modal({
                  title: [icon("clipboard-check", "me-2"), ev.titulo],
                  body: h("div", {},
                    h("div", { class: "small text-body-secondary mb-2" }, who(ev), ` · ${ev.grupo} · ${ev.tipo} · ${Fmt.date(ev.enviado)}`),
                    ev.descripcion ? h("p", { class: "small", text: ev.descripcion }) : null,
                    ev.url ? h("a", { class: "btn btn-sm btn-outline-primary mb-3", href: ev.url, target: "_blank", rel: "noopener noreferrer" }, icon("box-arrow-up-right", "me-1"), ev.archivo || "Abrir archivo") : null,
                    Admin.evidenceReview(ev, () => m && m.close()))
                });
              }
            }, icon("pencil-square")))))))));
      return;
    }

    content.replaceChildren(h("div", { class: "row g-3" }, items.map(ev => h("div", { class: "col-12 col-lg-6 col-xxl-4" },
      h("div", { class: `card card-soft h-100 border-start border-4 border-${badge[ev.estado].replace("text-bg-", "")}` }, h("div", { class: "card-body" },
        h("div", { class: "d-flex justify-content-between gap-2" },
          h("div", {},
            h("div", { class: "fw-semibold", text: ev.titulo }),
            h("div", { class: "small text-body-secondary" }, who(ev), ` · ${ev.grupo}`),
            h("div", { class: "small text-body-secondary", text: `${ev.tipo} · ${Fmt.date(ev.enviado)}` })),
          h("div", { class: "d-flex flex-column align-items-end gap-1" }, h("span", { class: `badge ${badge[ev.estado]}`, text: ev.estado }), fileBtn(ev))),
        ev.descripcion ? h("p", { class: "small mt-2 mb-2", text: ev.descripcion }) : null,
        h("hr", { class: "my-2" }),
        Admin.evidenceReview(ev)))))));
  },

  /* ---------------- Pestaña: Alumnos ---------------- */
  tabStudents(content) {
    const input = h("input", { type: "search", class: "form-control", id: "stu-search", placeholder: "Número de cuenta o nombre (mín. 3 caracteres)", "aria-label": "Buscar alumno" });
    const results = h("div", { class: "list-group" });

    const search = async () => {
      const q = input.value.trim();
      if (q.length < 3) { results.replaceChildren(); return; }
      UI.loading(results);
      try {
        const r = await Api.call("searchStudents", { q }, "admin");
        results.replaceChildren(...(r.results.length ? r.results.map(s => h("button", {
          type: "button", class: "list-group-item list-group-item-action", onclick: () => Admin.openProfile(s.cuenta)
        },
          h("div", { class: "d-flex justify-content-between gap-2" },
            h("span", {}, h("span", { class: "mono me-2", text: s.cuenta }), s.nombre),
            h("span", {}, s.cursos.length > 1 ? h("span", { class: "badge text-bg-info me-1", text: `${s.cursos.length} grupos` }) : null,
              s.comments ? h("span", { class: "badge text-bg-warning" }, icon("chat-left-text"), ` ${s.comments}`) : null)),
          h("div", { class: "small text-body-secondary", text: s.cursos.join(" · ") || "Sin curso" })
        )) : [h("div", { class: "list-group-item text-body-secondary", text: "Sin resultados." })]));
      } catch (error) { if (error.code !== "AUTH") results.replaceChildren(h("div", { class: "list-group-item text-danger", text: error.message })); }
    };
    input.addEventListener("input", debounce(search, 400));

    content.replaceChildren(h("div", { class: "card card-soft" }, h("div", { class: "card-body" },
      h("h2", { class: "h6", text: "Ficha del alumno" }),
      h("p", { class: "small text-body-secondary", text: "Un mismo número de cuenta puede estar en varios grupos o ciclos (p. ej. Estadística y Cibernética). Aquí ves todas sus inscripciones y comentarios juntos." }),
      input, h("div", { class: "mt-3" }, results))));
    input.focus();
  },

  async openProfile(cuenta) {
    const body = h("div");
    UI.loading(body);
    UI.modal({ title: [icon("person-vcard", "me-2"), "Ficha ", h("span", { class: "mono", text: cuenta })], body, size: "modal-xl" });
    try {
      const p = await Api.call("studentProfile", { cuenta }, "admin");
      Admin.drawProfile(body, p);
    } catch (error) { if (error.code !== "AUTH") body.replaceChildren(UI.empty("exclamation-octagon", error.message)); }
  },

  /**
   * Ficha en UNA sola vista:
   *   arriba  → una card de resumen por grupo (clic = cambia el detalle);
   *             por defecto el grupo que tienes abierto en la tabla
   *   abajo   → detalle del grupo elegido (asistencia, calificaciones, proyectos)
   *             + comentarios, evidencias, inscripciones e historial
   */
  drawProfile(body, p) {
    UI.disposePopovers(body);
    const groups = p.groups || [];
    const current = Admin.group && groups.find(gr => gr.idCurso === Admin.group.group.id);
    let selected = (current || groups[0] || {}).idCurso;

    const section = (title, iconName, ...children) => h("section", { class: "profile-section" },
      h("h3", { class: "profile-title" }, icon(iconName, "me-1"), title), ...children);

    // ---------- Cards de grupos ----------
    const cardsRow = h("div", { class: "row g-3 mb-3" });
    const detail = h("div");
    const drawCards = () => cardsRow.replaceChildren(...groups.map(gr => {
      const c = gr.attendance ? gr.attendance.counts : null;
      const pct = c ? Parts.pct(c) : null;
      const faltas = h("span", { class: "px-2 rounded", text: c ? c.falta : "—" });
      if (c) Parts.applyFaltas(faltas, c.falta);
      const active = gr.idCurso === selected;
      return h("div", { class: `col-12 ${groups.length > 1 ? "col-md-6" : ""}` },
        h("button", {
          type: "button", class: `group-card w-100 text-start ${active ? "active" : ""}`, "aria-pressed": String(active),
          onclick: () => { selected = gr.idCurso; drawCards(); drawDetail(); }
        },
          h("div", { class: "d-flex justify-content-between align-items-start gap-2" },
            h("div", {}, h("div", { class: "fw-semibold", text: gr.label }), h("div", { class: "small text-body-secondary", text: gr.ciclo })),
            active ? h("span", { class: "badge text-bg-dark", text: "viendo" }) : null),
          h("div", { class: "group-stats" },
            h("div", {}, h("b", { class: gr.final !== null && gr.final < CONFIG.RISK_THRESHOLD ? "text-danger" : "", text: Fmt.grade(gr.final) }), h("small", { text: "promedio" })),
            h("div", {}, h("b", { text: pct === null ? "—" : `${pct}%` }), h("small", { text: "asistencia" })),
            h("div", {}, h("b", {}, faltas), h("small", { text: "faltas" })),
            h("div", {}, h("b", { text: c ? c.justificante : "—" }), h("small", { text: "justif." })))));
    }));

    // ---------- Detalle del grupo elegido ----------
    const drawDetail = () => {
      UI.disposePopovers(detail);
      const gr = groups.find(x => x.idCurso === selected);
      if (!gr) { detail.replaceChildren(); return; }

      const gradesTable = gr.components.length
        ? h("table", { class: "table table-sm table-cch mb-0" },
            h("thead", {}, h("tr", {}, h("th", { class: "text-start", text: "Componente" }), h("th", { text: "Peso" }), h("th", { text: "Calif." }))),
            h("tbody", {}, gr.components.map(cp => h("tr", {},
              h("td", { class: "text-start", text: cp.nombre }), h("td", { class: "text-body-secondary", text: `${Fmt.num(cp.ponderacion)}%` }),
              h("td", {}, Parts.gradeWithBonus(gr.items[cp.id], cp)))),
              h("tr", { class: "fw-bold" }, h("td", { class: "text-start", text: "Promedio actual" }), h("td", {}), h("td", { text: Fmt.grade(gr.final) }))))
        : h("p", { class: "small text-body-secondary mb-0", text: "Sin ponderaciones." });

      const projects = gr.projects.length ? gr.projects.map(pj => h("div", { class: "mini-card" },
        h("div", { class: "d-flex justify-content-between" }, h("b", { text: pj.nombre }),
          pj.team && pj.team.calificacion !== null ? h("span", { class: "badge text-bg-success", text: Fmt.grade(pj.team.calificacion) }) : h("span", { class: "badge text-bg-light border", text: pj.team ? "por calificar" : "sin equipo" })),
        pj.team ? h("div", { class: "small text-body-secondary", text: `${pj.team.nombre}: ${pj.team.members.map(m => (m.nombre || m.cuenta).split(" ").slice(0, 2).join(" ")).join(", ")}` }) : null,
        pj.team && pj.team.stars ? h("div", { class: "mt-1" }, pj.rubros.map(r => h("div", { class: "rubric-row small" }, h("span", { text: r }), Parts.starsReadonly(pj.team.stars[r] || 0)))) : null))
        : [h("p", { class: "small text-body-secondary mb-0", text: "Sin proyectos." })];

      const remove = h("button", {
        class: "btn btn-sm btn-outline-danger", type: "button",
        onclick: async () => {
          if (!(await UI.confirm(`¿Dar de baja a ${p.cuenta} de ${gr.label}? Se quita de Students y de la hoja Reporte_ (Attendance Log se conserva).`, { okText: "Dar de baja", danger: true }))) return Admin.openProfile(p.cuenta);
          try {
            UI.toast("success", (await Api.call("removeStudent", { idCurso: gr.idCurso, cuenta: p.cuenta }, "admin")).message);
            bootstrap.Modal.getOrCreateInstance($("modal-generic")).hide();
            Admin.loadGroup();
          } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
        }
      }, icon("person-dash", "me-1"), "Dar de baja");

      const statusSel = h("select", { class: "form-select form-select-sm w-auto", "aria-label": "Estatus en este grupo" },
        (p.statuses || []).map(x => h("option", { value: x.value, selected: (gr.status || "") === x.value, text: x.label })));
      statusSel.addEventListener("change", async () => {
        try {
          UI.toast("success", (await Api.call("setStudentStatus", { idCurso: gr.idCurso, cuenta: p.cuenta, status: statusSel.value }, "admin")).message);
          gr.status = statusSel.value;
          if (Admin.group && Admin.group.group.id === gr.idCurso) Admin.loadGroup();
        } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
      });
      detail.replaceChildren(
        h("div", { class: "d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2" },
          h("div", { class: "fw-semibold me-auto" }, icon("journal-text", "me-1"), gr.label), statusSel, remove),
        section("Asistencia", "calendar-check",
          gr.attendance && gr.attendance.dates.length ? Parts.attendanceStrip(p.cuenta, gr.attendance.dates, gr.attendance.counts.falta) : h("p", { class: "small text-body-secondary mb-0", text: "Sin registros." })),
        h("div", { class: "row g-3" },
          h("div", { class: "col-12 col-lg-6" }, section("Calificaciones", "bar-chart", gradesTable)),
          h("div", { class: "col-12 col-lg-6" }, section("Proyectos", "people", ...projects))));
    };

    // ---------- Comentarios ----------
    const commentsBox = h("div");
    const drawComments = list => commentsBox.replaceChildren(...(list.length ? list.map(c => h("div", { class: `comment-item ${c.origen === "Web" ? "web" : ""}` },
      h("div", { class: "d-flex justify-content-between gap-2 small text-body-secondary" },
        h("span", {}, c.curso, c.fecha ? ` · ${Fmt.date(c.fecha)}` : ""),
        c.id ? h("button", {
          class: "btn btn-link btn-sm text-danger p-0", type: "button", title: "Borrar comentario",
          onclick: async () => {
            if (!(await UI.confirm("¿Borrar este comentario?", { okText: "Borrar", danger: true }))) return Admin.openProfile(p.cuenta);
            try { await Api.call("deleteComment", { id: c.id }, "admin"); Admin.openProfile(p.cuenta); }
            catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
          }
        }, icon("trash")) : null),
      h("div", { style: { whiteSpace: "pre-line" }, text: c.texto }))) : [h("p", { class: "small text-body-secondary mb-2", text: "Sin comentarios." })]));
    drawComments(p.comments);
    const text = h("textarea", { class: "form-control form-control-sm", rows: "2", placeholder: "Nuevo comentario privado", maxlength: "2000", "aria-label": "Nuevo comentario" });
    const course = h("select", { class: "form-select form-select-sm", "aria-label": "Grupo del comentario" },
      h("option", { value: "", text: "General" }),
      p.enrollments.filter(e => e.idCurso).map(e => h("option", { value: e.idCurso, selected: e.idCurso === selected, text: `${e.curso} ${e.grupo} (${e.ciclo})` })));
    const add = h("button", { class: "btn btn-sm btn-primary", type: "button" }, icon("plus-lg", "me-1"), "Agregar");
    add.addEventListener("click", async () => {
      try {
        const r = await UI.busy(add, () => Api.call("addComment", { cuenta: p.cuenta, idCurso: course.value, texto: text.value }, "admin"));
        text.value = "";
        drawComments(r.comments);
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });

    const badge = { Pendiente: "text-bg-secondary", Aplicada: "text-bg-success", Rechazada: "text-bg-danger" };
    const evidences = p.evidences.length ? p.evidences.map(e => h("div", { class: "mini-card d-flex justify-content-between gap-2" },
      h("div", { class: "small" }, h("b", { text: e.titulo }), h("div", { class: "text-body-secondary", text: `${e.tipo} · ${Fmt.date(e.enviado)}` }),
        e.estado === "Aplicada" ? h("div", { class: "text-success-emphasis", text: `+${Fmt.num(e.puntos)} en ${e.componente}` }) : null),
      h("span", { class: `badge align-self-start ${badge[e.estado]}`, text: e.estado }))) : [h("p", { class: "small text-body-secondary mb-0", text: "Sin evidencias." })];

    const history = p.history && p.history.length
      ? section("Ciclos anteriores", "clock-history", ...p.history.map(x => h("div", { class: "mini-card small" },
          h("div", { class: "d-flex justify-content-between" }, h("b", { text: `${x.curso} ${x.grupo}` }), h("span", { class: "text-body-secondary", text: x.ciclo })),
          h("div", { class: "text-body-secondary", text: `Final ${Fmt.grade(x.final)} · ${x.faltas ?? "—"} faltas` }),
          x.comentarios ? h("div", { class: "mt-1", text: x.comentarios }) : null)))
      : null;

    drawCards();
    drawDetail();

    body.replaceChildren(...kids(
      h("div", { class: "d-flex flex-wrap align-items-center gap-2 mb-3" },
        h("div", { class: "profile-avatar", "aria-hidden": "true", text: (p.nombres[0] || "?").trim().charAt(0) }),
        h("div", { class: "me-auto" },
          h("div", { class: "fs-5 fw-semibold lh-sm", text: p.nombres.join(" / ") || "(sin nombre)" }),
          h("div", { class: "small text-body-secondary" }, h("span", { class: "mono", text: p.cuenta }), ` · ${p.correos.join(", ") || "sin correo"}`)),
        groups.length > 1 ? h("span", { class: "badge rel-same" }, icon("people-fill"), ` ${groups.length} grupos este ciclo`) : null,
        p.history && p.history.length ? h("span", { class: "badge rel-prev" }, icon("clock-history"), ` ${p.history.length} ciclo(s) antes`) : null,
        p.nombres.length > 1 ? h("span", { class: "badge text-bg-warning", text: "nombres distintos" }) : null),
      groups.length ? cardsRow : h("div", { class: "alert alert-light border small", text: "No está en ningún grupo activo." }),
      detail,
      h("div", { class: "row g-3 mt-1" },
        h("div", { class: "col-12 col-lg-6" }, section(`Comentarios (${p.comments.length})`, "chat-left-text", commentsBox,
          h("div", { class: "row g-2" }, h("div", { class: "col-12" }, text), h("div", { class: "col-8" }, course), h("div", { class: "col-4 text-end" }, add)))),
        h("div", { class: "col-12 col-lg-6" },
          section("Evidencias", "cloud-arrow-up", ...evidences),
          section("Inscripciones", "diagram-3", h("div", { class: "d-flex flex-wrap gap-1" }, p.enrollments.map(e => h("span", { class: `badge ${e.activo ? "rel-same" : "text-bg-light border"}`, text: `${e.curso} ${e.grupo} · ${e.ciclo || "s/c"}` })))),
          history))
    ));
  },

  /* ---------------- Pestaña: Grupos ---------------- */
  tabGroups(content) {
    const boot = Admin.boot;
    const reportOptions = selected => [h("option", { value: "", text: "(sin hoja)" })]
      .concat(boot.reports.map(r => h("option", { value: r.name, selected: r.name === selected, text: r.name })));

    const showAll = !!Admin.showAllCourses;
    const list = boot.groups.filter(g => showAll || g.active || g.sheet);
    const rows = list.map(g => {
      const sheet = h("select", { class: "form-select form-select-sm", "aria-label": "Hoja de reporte" }, reportOptions(g.sheet));
      const ciclo = h("input", { class: "form-control form-control-sm", value: g.ciclo, style: { width: "6rem" }, "aria-label": "Ciclo" });
      const active = h("input", { class: "form-check-input", type: "checkbox", checked: g.active, "aria-label": "Activo" });
      const save = h("button", { class: "btn btn-sm btn-outline-primary", type: "button", title: "Guardar" }, icon("save"));
      save.addEventListener("click", async () => {
        try {
          const r = await UI.busy(save, () => Api.call("saveGroup", { idCurso: g.id, hojaReporte: sheet.value, ciclo: ciclo.value, activo: active.checked }, "admin"));
          UI.toast("success", r.message);
          Admin.boot = await Api.call("adminBootstrap", {}, "admin");
          Admin.renderGroupSelect();
          Admin.renderTab();
        } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
      });
      return h("tr", {},
        h("td", { class: "text-start fw-semibold", style: { minWidth: "160px" }, text: g.label }),
        h("td", { class: "mono small", text: g.id }),
        h("td", { style: { minWidth: "200px" } }, sheet),
        h("td", {}, ciclo),
        h("td", {}, h("div", { class: "form-check form-switch d-flex justify-content-center mb-0" }, active)),
        h("td", { text: g.students }),
        h("td", {}, save));
    });

    const hiddenCount = boot.groups.length - list.length;
    const toggleAll = h("button", { class: "btn btn-sm btn-outline-secondary", type: "button", onclick: () => { Admin.showAllCourses = !showAll; Admin.renderTab(); } },
      icon(showAll ? "eye-slash" : "eye", "me-1"), showAll ? "Solo grupos activos" : `Mostrar todos los cursos de Course (${hiddenCount} más)`);

    const createReport = h("button", { class: "btn btn-sm btn-outline-secondary", type: "button" }, icon("file-earmark-plus", "me-1"), "Crear hoja Reporte_");
    createReport.addEventListener("click", () => {
      const name = h("input", { class: "form-control", id: "rep-name", maxlength: "80", placeholder: "Ej. ESTADISTICA_512" });
      const ok = h("button", { class: "btn btn-primary", type: "button" }, "Crear");
      const m = UI.modal({
        title: "Nueva hoja de reporte",
        body: h("div", {}, h("label", { class: "form-label", for: "rep-name", text: "Nombre (se antepone Reporte_)" }), name,
          h("div", { class: "form-text", text: "Usa MATERIA_GRUPO para que se ligue sola con su curso." })),
        footer: [h("button", { class: "btn btn-secondary", type: "button", "data-bs-dismiss": "modal", text: "Cancelar" }), ok]
      });
      ok.addEventListener("click", async () => {
        try {
          const r = await UI.busy(ok, () => Api.call("createReportSheet", { reportName: name.value }, "admin"));
          UI.toast("success", `${r.message}\n${r.sheetName}`);
          m.close();
          Admin.boot = await Api.call("adminBootstrap", {}, "admin");
          Admin.renderTab();
        } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
      });
    });

    const diagnose = h("button", { class: "btn btn-sm btn-outline-secondary", type: "button" }, icon("activity", "me-1"), "Diagnosticar grupo actual");
    diagnose.addEventListener("click", async () => {
      const g = Admin.group;
      if (!g || !g.group.sheet) return UI.toast("warning", "El grupo seleccionado no tiene hoja ligada.");
      try {
        const r = await UI.busy(diagnose, () => Api.call("diagnose", { sheetName: g.group.sheet }, "admin"));
        const lines = [
          `Curso detectado: ${r.matchedCourseId || "(ninguno)"} ${r.matchedCourseName || ""} — método: ${r.matchMethod}`,
          `Horario: ${r.scheduleText || "—"}`,
          `Columnas de fecha: ${r.dateColumnsFound}`,
          `Fechas pendientes por agregar: ${r.pendingDatesToInsert.join(", ") || "ninguna"}`,
          `Fechas sin registros en Attendance Log: ${r.columnsWithoutLogData.join(", ") || "ninguna"}`,
          `Alumnos en reporte: ${r.studentsInReport} · registros del curso: ${r.logRecordsForCourse}`,
          `Alumnos sin ningún registro: ${r.accountsWithNoLogRecord.length}${r.accountsWithNoLogRecord.length ? " (" + r.accountsWithNoLogRecord.slice(0, 15).join(", ") + ")" : ""}`,
          `Cuentas inválidas en Students: ${r.invalidAccountsInStudents.length}`
        ];
        UI.modal({ title: `Diagnóstico · ${g.group.sheet}`, body: h("pre", { class: "small mb-0", style: { whiteSpace: "pre-wrap" }, text: lines.join("\n") }), size: "modal-lg" });
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });

    content.replaceChildren(
      h("div", { class: "card card-soft mb-3" }, h("div", { class: "card-body" },
        h("h2", { class: "h6", text: "Grupos (hoja Course)" }),
        h("p", { class: "small text-body-secondary mb-0", text: "Cada fila es un curso de Course. Las columnas Hoja_Reporte y Activo de Course definen su hoja de asistencia y si los alumnos lo ven." }))),
      h("div", { class: "table-wrap auto-h mb-3" }, h("table", { class: "table table-cch mb-0" },
        h("thead", {}, h("tr", {}, ["Curso", "ID_Curso", "Hoja Reporte_", "Ciclo", "Activo", "Alumnos", ""].map(t => h("th", { text: t })))),
        h("tbody", {}, rows))),
      h("div", { class: "d-flex flex-wrap gap-2 align-items-center" },
        toggleAll,
        createReport, diagnose,
        h("span", { class: "small text-body-secondary ms-auto", text: `API v${boot.version}` }))
    );
    content.append(h("div", { class: "row g-3 mt-1" },
      h("div", { class: "col-12 col-lg-5" }, Admin.newGroupCard()),
      h("div", { class: "col-12 col-lg-7" }, Admin.linksCard())));
  },

  newGroupCard() {
    const f = id => h("input", { class: "form-control form-control-sm", id });
    const materia = f("ng-materia"), grupo = f("ng-grupo"), horario = f("ng-horario");
    materia.placeholder = "Estadística"; grupo.placeholder = "512"; grupo.inputMode = "numeric"; horario.placeholder = "7:00";
    const ciclo = h("input", { class: "form-control form-control-sm mono", id: "ng-ciclo", value: Admin.boot.currentCycle || "" });
    const ok = h("button", { class: "btn btn-sm btn-primary", type: "button" }, icon("plus-lg", "me-1"), "Crear grupo");
    ok.addEventListener("click", async () => {
      try {
        const r = await UI.busy(ok, () => Api.call("createGroup", { materia: materia.value, grupo: grupo.value, ciclo: ciclo.value, horario: horario.value }, "admin"));
        UI.toast("success", r.message, 8000);
        Prefs.set("admGroup", r.idCurso);
        Admin.boot = null; await Admin.loadBoot();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });
    const field = (label, input, col) => h("div", { class: col }, h("label", { class: "form-label small mb-1", for: input.id, text: label }), input);
    return h("div", { class: "card card-soft h-100" }, h("div", { class: "card-body" },
      h("h2", { class: "h6" }, icon("plus-square", "me-1"), "Nuevo grupo"),
      h("div", { class: "row g-2" },
        field("Materia", materia, "col-12"), field("Grupo", grupo, "col-4"), field("Ciclo", ciclo, "col-4"), field("Horario", horario, "col-4")),
      h("p", { class: "small text-body-secondary mt-2 mb-2", text: "Crea el curso en Course, su hoja Reporte_ y lo activa en la web." }),
      h("div", { class: "text-end" }, ok)));
  },

  linksCard() {
    const draft = (Admin.boot.links || []).map(l => Object.assign({}, l));
    const list = h("div", { class: "vstack gap-2" });
    const groupOptions = sel => [h("option", { value: "", text: "Todos" })].concat(Admin.boot.groups.filter(g => g.active).map(g => h("option", { value: g.id, selected: g.id === sel, text: g.label })));
    const draw = () => list.replaceChildren(...(draft.length ? draft.map((l, i) => h("div", { class: "row g-1 align-items-center" },
      h("div", { class: "col-12 col-md-3" }, h("input", { class: "form-control form-control-sm", value: l.titulo || "", placeholder: "Título", "aria-label": "Título", oninput: e => { l.titulo = e.target.value; } })),
      h("div", { class: "col-12 col-md-5" }, h("input", { class: "form-control form-control-sm", value: l.url || "", placeholder: "https://…", "aria-label": "URL", oninput: e => { l.url = e.target.value; } })),
      h("div", { class: "col-9 col-md-3" }, h("select", { class: "form-select form-select-sm", "aria-label": "Grupo", onchange: e => { l.idCurso = e.target.value; } }, groupOptions(l.idCurso))),
      h("div", { class: "col-3 col-md-1 text-end" }, h("button", { class: "btn btn-sm btn-outline-danger", type: "button", title: "Quitar", onclick: () => { draft.splice(i, 1); draw(); } }, icon("x-lg"))))) : [h("p", { class: "small text-body-secondary mb-0", text: "Sin enlaces." })]));
    draw();
    const save = h("button", { class: "btn btn-sm btn-primary", type: "button" }, icon("save", "me-1"), "Guardar");
    save.addEventListener("click", async () => {
      try {
        const r = await UI.busy(save, () => Api.call("saveLinks", { links: draft }, "admin"));
        Admin.boot.links = r.links; UI.toast("success", r.message);
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });
    return h("div", { class: "card card-soft h-100" }, h("div", { class: "card-body" },
      h("h2", { class: "h6" }, icon("link-45deg", "me-1"), "Enlaces para alumnos"),
      list,
      h("div", { class: "d-flex justify-content-between mt-2" },
        h("button", { class: "btn btn-sm btn-outline-primary", type: "button", onclick: () => { draft.push({ titulo: "", url: "", idCurso: "" }); draw(); } }, icon("plus-lg", "me-1"), "Enlace"),
        save)));
  },

  /* ---------------- Pestaña: Mantenimiento ---------------- */
  async tabMaintenance(content) {
    UI.loading(content, "Leyendo hojas y respaldos…");
    let info;
    try { info = await Api.call("maintenanceInfo", {}, "admin"); }
    catch (error) { if (error.code !== "AUTH") content.replaceChildren(UI.empty("wifi-off", error.message)); return; }

    const reloadAll = async () => { Admin.boot = null; await Admin.loadBoot(); Prefs.set("admTab", "mantenimiento"); Admin.renderTab(); };
    const sizeText = b => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
    const fileLinks = f => h("span", { class: "d-inline-flex gap-1" },
      h("a", { class: "btn btn-sm btn-outline-secondary", href: f.url, target: "_blank", rel: "noopener noreferrer" }, icon("google", "me-1"), "Drive"),
      h("a", { class: "btn btn-sm btn-outline-primary", href: f.download, target: "_blank", rel: "noopener noreferrer" }, icon("download", "me-1"), "Descargar"));

    // ---- Ciclo actual ----
    const cycleInput = h("input", { class: "form-control form-control-sm mono", value: info.currentAuto ? "" : info.current, placeholder: `${info.current} (auto)`, style: { width: "9rem" }, "aria-label": "Ciclo actual" });
    const cycleBtn = h("button", { class: "btn btn-sm btn-primary", type: "button" }, icon("save", "me-1"), "Guardar");
    cycleBtn.addEventListener("click", async () => {
      try { UI.toast("success", (await UI.busy(cycleBtn, () => Api.call("setCurrentCycle", { ciclo: cycleInput.value }, "admin"))).message); Admin.tabMaintenance(content); }
      catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });
    const noSemester = info.cycles.filter(c => !c.hasSemester);

    const cycleCard = h("div", { class: "card card-soft" }, h("div", { class: "card-body" },
      h("h2", { class: "h6" }, icon("calendar3", "me-1"), "Ciclo actual"),
      h("div", { class: "d-flex gap-2 align-items-center mb-2" }, cycleInput, cycleBtn),
      h("p", { class: "small text-body-secondary mb-0" }, "Vacío = automático por fecha: ago–ene → ", h("b", { text: "AAAA+1-1" }), ", feb–jul → ", h("b", { text: "AAAA-2" }), `. Hoy: ${info.current}.`),
      noSemester.length ? h("div", { class: "alert alert-warning small py-2 mt-2 mb-0" },
        icon("exclamation-triangle", "me-1"),
        `Hay cursos con ciclo sin semestre (${noSemester.map(c => c.ciclo).join(", ")}). Corrígelo en Ciclo_Escolar de la hoja Course o en la pestaña Grupos (ej. 2027-1).`) : null));

    // ---- Respaldo por ciclo ----
    const checks = {};
    const cycleRows = info.cycles.map(c => {
      const isCurrent = c.ciclo === info.current;
      const cb = h("input", { class: "form-check-input", type: "checkbox", disabled: isCurrent, "aria-label": `Ciclo ${c.ciclo}` });
      checks[c.ciclo] = cb;
      return h("tr", {},
        h("td", {}, cb),
        h("td", { class: "text-start" }, h("b", { class: "mono", text: c.ciclo }), isCurrent ? h("span", { class: "badge text-bg-success ms-2", text: "actual" }) : null),
        h("td", { class: "text-start small", title: c.courses.map(x => x.label).join("\n") }, c.courses.slice(0, 4).map(x => x.label).join(", ") + (c.courses.length > 4 ? ` +${c.courses.length - 4}` : "")),
        h("td", { text: c.students }), h("td", { text: c.logs }), h("td", { text: c.reports.length }));
    });

    const purge = h("input", { class: "form-check-input", type: "checkbox", id: "bk-purge", checked: true });
    // Por defecto se conserva el histórico del alumno (inscripciones, comentarios, cursos)
    const DEFAULT_WHAT = { attendance: true, reports: true, grades: true, students: false, comments: false, courses: false };
    const what = {};
    const parts = (info.purgeParts || []).map(pt => {
      what[pt.key] = !!DEFAULT_WHAT[pt.key];
      return h("div", { class: "form-check form-switch" },
        h("input", { class: "form-check-input", type: "checkbox", id: `bk-${pt.key}`, checked: what[pt.key], onchange: e => { what[pt.key] = e.target.checked; } }),
        h("label", { class: "form-check-label small", for: `bk-${pt.key}`, text: pt.label }));
    });
    const partsBox = h("div", { class: "purge-parts" }, parts);
    purge.addEventListener("change", () => partsBox.classList.toggle("d-none", !purge.checked));
    const preview = h("div", { class: "small" });
    const selected = () => Object.keys(checks).filter(k => checks[k].checked);

    const previewBtn = h("button", { class: "btn btn-sm btn-outline-secondary", type: "button" }, icon("eye", "me-1"), "Vista previa");
    previewBtn.addEventListener("click", async () => {
      try {
        const r = await UI.busy(previewBtn, () => Api.call("backupPreview", { cycles: selected() }, "admin"));
        preview.replaceChildren(h("div", { class: "alert alert-light border py-2 mb-0" },
          h("b", { text: `${r.courses} curso(s) · ` }), r.tables.filter(t => t.rows).map(t => `${t.name}: ${t.rows}`).join(" · ") || "sin registros",
          r.reports.length ? h("div", { text: `Hojas: ${r.reports.join(", ")}` }) : null));
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });

    const backupBtn = h("button", { class: "btn btn-sm btn-primary", type: "button" }, icon("file-earmark-zip", "me-1"), "Respaldar");
    backupBtn.addEventListener("click", async () => {
      const cycles = selected();
      if (!cycles.length) return UI.toast("warning", "Selecciona al menos un ciclo.");
      let confirm = "";
      if (purge.checked) {
        const ok = await UI.confirmTyped({
          title: "Respaldar y BORRAR",
          word: info.confirmWord,
          okText: "Respaldar y borrar",
          body: h("div", {},
            h("p", {}, "Se generará un Excel por ciclo (", h("b", { text: cycles.join(", ") }), ") dentro de un ZIP en la carpeta ", h("b", { text: info.folder.name }), " de Drive."),
            h("div", { class: "alert alert-danger py-2 small mb-0" },
              h("div", { text: "Solo si el ZIP queda guardado, se borrará de esos ciclos:" }),
              h("ul", { class: "mb-1" }, info.purgeParts.filter(pt => what[pt.key]).map(pt => h("li", { text: pt.label }))),
              h("div", { text: "Se conserva: " + (info.purgeParts.filter(pt => !what[pt.key]).map(pt => pt.label).join(", ") || "nada") + "." }),
              h("div", { text: "Siempre se guarda un resumen por alumno en W_Historial." })))
        });
        if (!ok) return;
        confirm = info.confirmWord;
      }
      try {
        const r = await UI.busy(backupBtn, () => Api.call("backupCycles", { cycles, purge: purge.checked, what, confirm }, "admin"));
        UI.modal({
          title: [icon("check-circle-fill", "text-success me-2"), "Respaldo listo"],
          body: h("div", {}, h("p", { text: r.message }),
            r.deleted ? h("ul", { class: "small" }, Object.keys(r.deleted).map(k => h("li", { text: `${k}: ${r.deleted[k]}` }))) : null,
            h("div", { class: "d-flex align-items-center gap-2" }, h("span", { class: "mono small text-truncate", text: r.file.name }), fileLinks(r.file)))
        });
        if (purge.checked) await reloadAll(); else Admin.tabMaintenance(content);
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });

    const backupCard = h("div", { class: "card card-soft" }, h("div", { class: "card-body" },
      h("h2", { class: "h6" }, icon("file-earmark-zip", "me-1"), "Respaldo por ciclo"),
      h("p", { class: "small text-body-secondary" }, "Un Excel por ciclo dentro de un ZIP, guardado junto a tu hoja de cálculo en ", h("a", { href: info.folder.url, target: "_blank", rel: "noopener noreferrer", text: info.folder.name }), "."),
      h("div", { class: "table-wrap auto-h mb-2" }, h("table", { class: "table table-sm table-cch mb-0" },
        h("thead", {}, h("tr", {}, ["", "Ciclo", "Cursos", "Inscrip.", "Asistencias", "Reportes"].map(t => h("th", { text: t })))),
        h("tbody", {}, cycleRows))),
      h("div", { class: "form-check form-switch" }, purge, h("label", { class: "form-check-label fw-semibold", for: "bk-purge", text: "Borrar después de respaldar:" })),
      partsBox,
      preview,
      h("div", { class: "d-flex gap-2 justify-content-end mt-2" }, previewBtn, backupBtn)));

    // ---- Respaldos guardados ----
    const backupsCard = h("div", { class: "card card-soft" }, h("div", { class: "card-body" },
      h("h2", { class: "h6" }, icon("archive", "me-1"), "Respaldos guardados"),
      info.backups.length
        ? h("ul", { class: "list-group list-group-flush" }, info.backups.map(b => h("li", { class: "list-group-item d-flex flex-wrap align-items-center gap-2 px-0" },
            h("div", { class: "me-auto", style: { minWidth: 0 } }, h("div", { class: "mono small text-truncate", text: b.name }), h("div", { class: "small text-body-secondary", text: `${Fmt.date(b.date)} · ${sizeText(b.size)}` })),
            fileLinks(b))))
        : h("p", { class: "small text-body-secondary mb-0", text: "Aún no hay respaldos." })));

    // ---- Vaciar tablas ----
    const clear = async (table, rows) => {
      const all = table === "*";
      const word = all ? info.clearAllWord : table;
      const ok = await UI.confirmTyped({
        title: all ? "Vaciar TODAS las tablas" : `Vaciar ${table}`,
        word,
        okText: "Respaldar y vaciar",
        body: h("div", {},
          h("div", { class: "alert alert-danger py-2" },
            h("b", { text: "¡Cuidado! " }),
            all ? "Se borrarán TODOS los registros de todas las tablas (alumnos, cursos, asistencias, calificaciones y todo lo de la web). La hoja quedará completamente limpia, solo con encabezados."
              : `Se borrarán los ${rows} registro(s) de «${table}». Los encabezados se conservan.`),
          h("p", { class: "small mb-0", text: "Antes se guarda un ZIP con el Excel de lo que se borra, en la carpeta de la hoja. Las hojas Reporte_ no se tocan; para borrarlas usa el respaldo por ciclo. AppSheet verá las tablas vacías." }))
      });
      if (!ok) return;
      try {
        const r = await Api.call("clearTable", { table, confirm: word }, "admin");
        UI.toast("success", r.message, 9000);
        await reloadAll();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    };

    const tableRows = info.tables.map(t => h("tr", {},
      h("td", { class: "text-start mono small", text: t.name }),
      h("td", {}, t.exists ? t.rows : h("span", { class: "badge text-bg-warning", text: "no existe" })),
      h("td", {}, t.web ? h("span", { class: "badge text-bg-light border", text: "web" }) : h("span", { class: "badge text-bg-light border", text: "AppSheet" })),
      h("td", {}, h("button", { class: "btn btn-sm btn-outline-danger", type: "button", disabled: !t.exists || !t.rows, onclick: () => clear(t.name, t.rows) }, icon("trash", "me-1"), "Vaciar"))));

    const dangerCard = h("div", { class: "card card-soft danger-zone border" }, h("div", { class: "card-body" },
      h("h2", { class: "h6 text-danger" }, icon("exclamation-octagon", "me-1"), "Zona de peligro · Vaciar tablas"),
      h("p", { class: "small text-body-secondary", text: "Útil para empezar con una hoja limpia. Siempre se respalda primero en ZIP y se pide escribir el nombre de la tabla." }),
      h("div", { class: "table-wrap auto-h mb-2" }, h("table", { class: "table table-sm table-cch mb-0" },
        h("thead", {}, h("tr", {}, ["Tabla", "Registros", "Origen", ""].map(t => h("th", { text: t })))),
        h("tbody", {}, tableRows))),
      h("div", { class: "text-end" }, h("button", { class: "btn btn-sm btn-danger", type: "button", onclick: () => clear("*") }, icon("radioactive", "me-1"), "Vaciar TODAS las tablas"))));

    // ---- Estructura ----
    const setupOut = h("div", { class: "small mt-2" });
    const setupBtn = h("button", { class: "btn btn-sm btn-outline-primary", type: "button" }, icon("tools", "me-1"), "Verificar / crear hojas y carpetas");
    setupBtn.addEventListener("click", async () => {
      try {
        const r = await UI.busy(setupBtn, () => Api.call("setupStructure", {}, "admin"));
        setupOut.replaceChildren(...kids(
          h("div", { text: r.created.length ? `Hojas creadas: ${r.created.join(", ")}` : "Hojas base: todas existen ✅" }),
          h("div", { text: r.folders.length ? `Carpetas creadas: ${r.folders.join(", ")}` : "Carpetas: todas existen ✅" }),
          r.missingColumns.length ? h("div", { class: "text-warning-emphasis", text: "Columnas faltantes (no se modificó la hoja): " + r.missingColumns.map(m => `${m.sheet}: ${m.columns.join(", ")}`).join(" · ") }) : null,
          r.linked.length ? h("div", { text: `Grupos ligados: ${r.linked.map(x => x.Hoja_Reporte).join(", ")}` }) : null));
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });
    const structureCard = h("div", { class: "card card-soft" }, h("div", { class: "card-body" },
      h("h2", { class: "h6" }, icon("diagram-3", "me-1"), "Estructura (hoja nueva en blanco)"),
      h("p", { class: "small text-body-secondary", text: "Crea las hojas de la plantilla Attendance Log (Course, Students, Attendance Log, Calificaciones, Roles), las hojas W_ de la web y las carpetas (Students_Images, Course_Images, Material_Archivos…) junto a la hoja, solo si faltan. Las que ya existen no se modifican." }),
      setupBtn, setupOut));

    const en = info.enrollment || { sinCurso: 0, inexistente: [], totalInexistente: 0, gruposVacios: [], ids: [] };
    const enrollCard = h("div", { class: "card card-soft" }, h("div", { class: "card-body" },
      h("h2", { class: "h6" }, icon("person-check", "me-1"), "Alumnos agregados a mano"),
      h("p", { class: "small text-body-secondary", text: "En Students, la columna Course debe tener exactamente uno de estos ID_Curso:" }),
      h("div", { class: "d-flex flex-wrap gap-1 mb-2" }, en.ids.map(x => h("button", {
        class: "badge rel-same border-0", type: "button", title: `Copiar ${x.id}`,
        onclick: async () => { try { await navigator.clipboard.writeText(x.id); UI.toast("success", `Copiado: ${x.id}`); } catch (e) { UI.toast("info", x.id); } }
      }, icon("clipboard", "me-1"), `${x.label}: `, h("span", { class: "mono", text: x.id })))),
      h("ul", { class: "small mb-0" },
        h("li", {}, h("b", { text: en.sinCurso }), " con Course vacío (aún sin ligar)"),
        h("li", { class: en.totalInexistente ? "text-danger" : "" }, h("b", { text: en.totalInexistente }), " con un Course que no existe",
          en.inexistente.length ? h("div", { class: "mt-1" }, en.inexistente.slice(0, 10).map(x => h("div", { class: "mono", text: `${x.cuenta} → «${x.course}»` }))) : null),
        en.gruposVacios.length ? h("li", { class: "text-warning-emphasis" }, "Grupos activos sin alumnos: ", en.gruposVacios.map(x => x.label).join(", ")) : null)));

    content.replaceChildren(h("div", { class: "row g-3" },
      h("div", { class: "col-12 col-xl-5 vstack gap-3" }, enrollCard, cycleCard, backupsCard, structureCard),
      h("div", { class: "col-12 col-xl-7 vstack gap-3" }, backupCard, dangerCard)));
  }
};

document.addEventListener("DOMContentLoaded", App.init);
