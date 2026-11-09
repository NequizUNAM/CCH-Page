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
    showHidden: true,       // admin: mostrar columnas "Oculto" del reporte
    remember: false,        // recordar el número de cuenta del alumno
    cuenta: "",
    stuTab: "asistencia",
    admTab: "asistencia",
    admGroup: "",
    evFilter: "Pendiente"
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
    const wrap = h("span", { class: "stars readonly", "aria-label": `${value || 0} de 5 estrellas` });
    for (let i = 1; i <= 5; i++) wrap.append(icon(i <= value ? "star-fill" : "star", i <= value ? "on" : ""));
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
   APLICACIÓN: vistas, sesión, preferencias
   ============================================================ */
const App = {
  init() {
    Prefs.load();
    Session.load();
    App.applyTheme();

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
          document.body.classList.toggle("compact", !!Prefs.get("compact"));
          if (key === "showHidden" && Session.get("admin")) Admin.renderTab();
        }
      }),
      h("label", { class: "form-check-label", for: `pref-${key}`, text: label }),
      help ? h("div", { class: "form-text", text: help }) : null
    );

    const theme = h("select", { class: "form-select", id: "pref-theme", onchange: e => { Prefs.set("theme", e.target.value); App.applyTheme(); } },
      [["auto", "Automático (sistema)"], ["light", "Claro"], ["dark", "Oscuro"]].map(([v, t]) => h("option", { value: v, selected: Prefs.get("theme") === v, text: t })));

    $("prefs-body").replaceChildren(
      h("div", { class: "mb-3" }, h("label", { class: "form-label", for: "pref-theme", text: "Tema" }), theme),
      sw("compact", "Tablas compactas"),
      sw("remember", "Recordar mi número de cuenta", "Útil en tu celular; no lo actives en computadoras compartidas."),
      sw("showHidden", "Admin: mostrar columnas «Oculto» del reporte", "Se ven en gris; los alumnos nunca las ven."),
      h("button", {
        class: "btn btn-sm btn-outline-danger", type: "button",
        onclick: () => { Prefs.reset(); App.applyTheme(); App.openPrefs(); UI.toast("info", "Preferencias restablecidas."); }
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
    $("stu-tabs").querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));

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
    const view = {
      asistencia: () => Student.renderAttendance(course),
      calificaciones: () => Student.renderGrades(course),
      equipos: () => Student.renderTeams(course),
      evidencias: () => Student.renderEvidence()
    }[tab] || (() => Student.renderAttendance(course));

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

  renderAttendance(course) {
    const att = course.attendance;
    if (!att || !att.dates.length) return UI.empty("calendar-x", "Aún no hay registro de asistencia.");

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
        return h("div", { class: "card card-soft" }, h("div", { class: "card-body" },
          h("p", { class: "small text-body-secondary", text: "Calificaciones publicadas por tu profesor:" }),
          h("table", { class: "table table-sm mb-0" }, h("tbody", {}, course.legacy.map(x => h("tr", {}, h("th", { text: x.label }), h("td", { class: "text-end", text: x.value || "—" })))))
        ));
      }
      return UI.empty("hourglass-split", "Tu profesor aún no publica la forma de evaluación de este grupo.");
    }

    const totalW = comps.reduce((s, c) => s + c.ponderacion, 0);
    const evaluatedW = comps.reduce((s, c) => s + (course.items[c.id] && course.items[c.id].score10 !== null ? c.ponderacion : 0), 0);

    const summary = h("div", { class: "row g-2 mb-3" },
      h("div", { class: "col-6 col-md-4" }, h("div", { class: "card card-soft h-100" }, h("div", { class: "card-body py-2" },
        h("div", { class: "small text-body-secondary", text: "Promedio actual" }),
        h("div", { class: `fs-3 fw-bold ${course.final !== null && course.final < CONFIG.RISK_THRESHOLD ? "text-danger" : ""}`, text: Fmt.grade(course.final) }),
        h("div", { class: "small text-body-secondary", text: `sobre ${Fmt.num(evaluatedW)}% evaluado` })))),
      h("div", { class: "col-6 col-md-4" }, h("div", { class: "card card-soft h-100" }, h("div", { class: "card-body py-2" },
        h("div", { class: "small text-body-secondary", text: "Si hoy cerrara el curso" }),
        h("div", { class: "fs-3 fw-bold text-body-secondary", text: Fmt.grade(course.finalStrict) }),
        h("div", { class: "small text-body-secondary", text: "lo pendiente cuenta 0" }))))
    );

    const typeHint = { asistencia: "según tu asistencia", proyectos: "según tu equipo" };
    const rows = comps.map(comp => {
      const item = course.items[comp.id] || { score10: null, bonus: 0 };
      const rawText = comp.tipo === "manual" && comp.maximo !== 10 && item.raw !== null ? `${Fmt.num(item.raw)} / ${comp.maximo}` : "";
      return h("tr", {},
        h("td", { class: "text-start" }, h("div", { class: "fw-semibold", text: comp.nombre }),
          typeHint[comp.tipo] ? h("div", { class: "small text-body-secondary", text: typeHint[comp.tipo] }) : null,
          rawText ? h("div", { class: "small text-body-secondary", text: rawText }) : null),
        h("td", { text: `${Fmt.num(comp.ponderacion)}%` }),
        h("td", {}, Parts.gradeWithBonus(item, comp)),
        h("td", { class: "text-body-secondary", text: item.score10 === null || !totalW ? "—" : Fmt.num(item.score10 * comp.ponderacion / totalW) })
      );
    });

    const table = h("div", { class: "table-wrap auto-h" }, h("table", { class: "table table-cch table-hover" },
      h("thead", {}, h("tr", {}, h("th", { class: "text-start", text: "Componente" }), h("th", { text: "Peso" }), h("th", { text: "Calificación" }), h("th", { text: "Aporte" }))),
      h("tbody", {}, rows)));

    const hasBonus = comps.some(c => course.items[c.id] && course.items[c.id].bonus > 0);
    const hint = hasBonus ? h("p", { class: "small text-body-secondary mt-2 mb-0" }, icon("info-circle", "me-1"), "Pasa el cursor o toca la etiqueta ", h("span", { class: "bonus-tag" }, icon("stars"), "+"), " para ver los puntos adicionales aplicados.") : null;

    return h("div", {}, summary, table, hint);
  },

  renderTeams(course) {
    if (!course.projects.length) return UI.empty("people", "No hay proyectos en equipo por ahora.");

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
          t.observaciones ? h("div", { class: "alert alert-light border small mt-2 mb-0" }, icon("chat-left-quote", "me-1"), t.observaciones) : null
        );
      } else if (project.abierto) {
        body = Student.teamForm(project);
      } else {
        body = h("p", { class: "text-body-secondary small mb-0" }, icon("lock", "me-1"), "El registro está cerrado. Si no tienes equipo, habla con tu profesor.");
      }

      return h("div", { class: "col-12 col-lg-6" }, h("div", { class: "card card-soft h-100" }, h("div", { class: "card-body" },
        h("h2", { class: "h6 mb-1", text: project.nombre }),
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
    const courseSelect = h("select", { class: "form-select", id: "ev-course", required: true },
      data.courses.map((c, i) => h("option", { value: c.idCurso, selected: i === Student.courseIndex, text: c.label })));
    const type = h("select", { class: "form-select", id: "ev-type" }, data.evidenceTypes.map(t => h("option", { value: t, text: t })));
    const title = h("input", { class: "form-control", id: "ev-title", required: true, maxlength: "120", placeholder: "Ej. Asistí a la Feria de Matemáticas" });
    const desc = h("textarea", { class: "form-control", id: "ev-desc", rows: "2", maxlength: "1000", placeholder: "¿Qué hiciste? (opcional)" });
    const file = h("input", { class: "form-control", type: "file", id: "ev-file", accept: "image/*,application/pdf" });
    const link = h("input", { class: "form-control", type: "url", id: "ev-link", placeholder: "https://… (opcional si subes archivo)" });
    const submit = h("button", { class: "btn btn-primary", type: "submit" }, icon("cloud-arrow-up", "me-1"), "Enviar evidencia");

    const form = h("form", {
      class: "card card-soft mb-3",
      onsubmit: async e => {
        e.preventDefault();
        if (!data.courses.length) return UI.toast("warning", "No tienes grupos activos.");
        try {
          await UI.busy(submit, async () => {
            const payload = { idCurso: courseSelect.value, tipo: type.value, titulo: title.value, descripcion: desc.value, link: link.value.trim() };
            if (file.files[0]) payload.file = await Student.readFile(file.files[0], data.maxFileMb);
            if (!payload.file && !payload.link) throw new Error("Adjunta un archivo o escribe un enlace.");
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
      h("div", { class: "card-body" },
        h("h2", { class: "h6", text: "Nueva evidencia" }),
        h("p", { class: "small text-body-secondary", text: "Sube una foto o PDF de tu participación en eventos o proyectos. Tu profesor decide si te suma puntos y a qué examen." }),
        h("div", { class: "row g-2" },
          h("div", { class: "col-md-6" }, h("label", { class: "form-label small", for: "ev-course", text: "Grupo" }), courseSelect),
          h("div", { class: "col-md-6" }, h("label", { class: "form-label small", for: "ev-type", text: "Tipo" }), type),
          h("div", { class: "col-12" }, h("label", { class: "form-label small", for: "ev-title", text: "Título" }), title),
          h("div", { class: "col-12" }, h("label", { class: "form-label small", for: "ev-desc", text: "Descripción" }), desc),
          h("div", { class: "col-md-6" }, h("label", { class: "form-label small", for: "ev-file", text: `Archivo (imagen o PDF, máx. ${data.maxFileMb} MB)` }), file),
          h("div", { class: "col-md-6" }, h("label", { class: "form-label small", for: "ev-link", text: "o enlace" }), link)
        ),
        h("div", { class: "text-end mt-3" }, submit))
    );

    const badge = { Pendiente: "text-bg-secondary", Aplicada: "text-bg-success", Rechazada: "text-bg-danger" };
    const list = data.evidences.length
      ? h("div", { class: "vstack gap-2" }, data.evidences.map(ev => h("div", { class: "card card-soft" }, h("div", { class: "card-body py-2" },
          h("div", { class: "d-flex justify-content-between align-items-start gap-2" },
            h("div", {}, h("div", { class: "fw-semibold", text: ev.titulo }),
              h("div", { class: "small text-body-secondary", text: `${ev.tipo} · ${ev.grupo} · ${Fmt.date(ev.enviado)}` })),
            h("span", { class: `badge ${badge[ev.estado] || "text-bg-secondary"}`, text: ev.estado })),
          ev.estado === "Aplicada" ? h("div", { class: "small mt-1 text-success-emphasis" }, icon("stars", "me-1"), `+${Fmt.num(ev.puntos)} punto(s) en ${ev.componente || "un examen"} · ${Fmt.date(ev.aplicado)}`) : null,
          ev.nota ? h("div", { class: "small mt-1" }, icon("chat-left-text", "me-1"), ev.nota) : null
        ))))
      : UI.empty("cloud", "Aún no has enviado evidencias.");

    return h("div", {}, form, h("h2", { class: "h6 mb-2", text: "Mis evidencias" }), list);
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

  async loadBoot() {
    UI.loading($("adm-content"), "Cargando panel…");
    try {
      Admin.boot = await Api.call("adminBootstrap", {}, "admin");
      Admin.renderGroupSelect();
      Admin.updateEvidenceBadge(Admin.boot.pendingEvidence);
      await Admin.loadGroup();
    } catch (error) {
      if (error.code !== "AUTH") $("adm-content").replaceChildren(UI.empty("wifi-off", error.message));
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
    UI.loading($("adm-content"));
    $("adm-toolbar").replaceChildren();
    try {
      Admin.group = await Api.call("groupData", { idCurso: id }, "admin");
      Admin.renderStats();
      Admin.renderTab();
    } catch (error) {
      if (error.code !== "AUTH") $("adm-content").replaceChildren(UI.empty("exclamation-octagon", error.message));
    }
  },

  async leaveCapture() {
    if (!Admin.dirty.size) return true;
    const ok = await UI.confirm(`Tienes ${Admin.dirty.size} calificación(es) sin guardar. ¿Descartarlas?`, { okText: "Descartar", danger: true });
    if (ok) Admin.dirty = new Map();
    return ok;
  },

  renderStats() {
    const g = Admin.group;
    if (!g) return $("adm-stats").replaceChildren();
    const finals = g.students.map(s => s.final).filter(v => v !== null);
    const avg = finals.length ? finals.reduce((a, b) => a + b, 0) / finals.length : null;
    const risk = finals.filter(v => v < CONFIG.RISK_THRESHOLD).length;
    const faltas = g.students.filter(s => s.counts && s.counts.falta > CONFIG.FALTAS_UMBRAL).length;
    $("adm-stats").replaceChildren(
      h("span", { class: "stat" }, icon("people"), h("b", { text: g.students.length })),
      h("span", { class: "stat", title: "Promedio del grupo (sobre lo evaluado)" }, icon("graph-up"), h("b", { text: Fmt.grade(avg) })),
      h("span", { class: "stat", title: `Promedio menor a ${CONFIG.RISK_THRESHOLD}` }, icon("exclamation-triangle", "text-danger"), h("b", { text: risk })),
      h("span", { class: "stat", title: `Más de ${CONFIG.FALTAS_UMBRAL} faltas` }, icon("calendar-x", "text-danger"), h("b", { text: faltas }))
    );
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

    $("adm-toolbar").replaceChildren(h("div", { class: "d-flex flex-wrap align-items-center gap-2" },
      Admin.searchBox("Buscar cuenta o nombre…", draw),
      h("button", { class: "btn btn-sm btn-outline-secondary", type: "button", title: "Descargar reporte (Excel/CSV)", onclick: () => Admin.exportGroup() }, icon("download", "me-1"), "Exportar"),
      h("button", { class: "btn btn-sm btn-outline-primary", type: "button", onclick: () => Admin.addStudentModal() }, icon("person-plus", "me-1"), "Alumno"),
      h("div", { class: "ms-auto d-flex flex-column gap-1 align-items-end" }, Parts.legend(), Admin.linksLegend())));

    content.replaceChildren(h("div", { class: "table-wrap" }, h("table", { class: "table table-bordered table-hover table-cch att-table" },
      h("thead", {}, h("tr", {}, th("Cuenta", true, "sticky-col"), th("Nombre", true, "text-start"), th("F", true), th("J", true),
        dateCols.map(x => th(x.d.label, x.d.visible)), otherCols.map(x => th(x.o.label, x.o.visible)))),
      tbody)));
  },

  /** Reporte del grupo (asistencia + calificaciones) como CSV que abre Excel. */
  exportGroup() {
    const g = Admin.group;
    const dates = g.attendance ? g.attendance.dates : [];
    const comps = g.components;
    const header = ["Cuenta", "Nombre"].concat(dates.map(d => d.key), ["Asistencias", "Faltas", "Justificantes", "% asistencia"],
      comps.map(c => `${c.nombre} (${c.ponderacion}%)`), ["Final (evaluado)", "Final (estricta)"]);
    const rows = g.students.map(s => {
      const c = s.counts || { asistencia: 0, falta: 0, justificante: 0 };
      const pct = Parts.pct(c);
      return [s.cuenta, s.nombre].concat(dates.map((d, i) => s.statuses[i] || ""), [c.asistencia, c.falta, c.justificante, pct === null ? "" : pct],
        comps.map(cp => { const it = s.items[cp.id]; return it && it.score10 !== null ? it.score10 : ""; }), [s.final ?? "", s.finalStrict ?? ""]);
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

  addStudentModal() {
    const g = Admin.group;
    const cuenta = h("input", { class: "form-control mono", id: "ns-cuenta", inputmode: "numeric", maxlength: "10" });
    const nombre = h("input", { class: "form-control", id: "ns-nombre", maxlength: "80", placeholder: "APELLIDOS NOMBRE" });
    const email = h("input", { class: "form-control", id: "ns-email", type: "email", placeholder: "opcional" });
    const ok = h("button", { class: "btn btn-primary", type: "button" }, icon("person-plus", "me-1"), "Inscribir");
    const m = UI.modal({
      title: `Inscribir en ${g.group.label}`,
      body: h("div", { class: "vstack gap-2" },
        h("div", {}, h("label", { class: "form-label small", for: "ns-cuenta", text: "Número de cuenta" }), cuenta),
        h("div", {}, h("label", { class: "form-label small", for: "ns-nombre", text: "Nombre" }), nombre),
        h("div", {}, h("label", { class: "form-label small", for: "ns-email", text: "Correo" }), email)),
      footer: [h("button", { class: "btn btn-secondary", type: "button", "data-bs-dismiss": "modal", text: "Cancelar" }), ok]
    });
    ok.addEventListener("click", async () => {
      try {
        const r = await UI.busy(ok, () => Api.call("addStudent", { idCurso: g.group.id, cuenta: cuenta.value, nombre: nombre.value, email: email.value }, "admin"));
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
            h("td", { class: "text-body-secondary", text: Fmt.grade(s.finalStrict) }));
        }));
      // Los popovers de bonos se crean dentro de gradeWithBonus
    };
    draw();

    $("adm-toolbar").replaceChildren(h("div", { class: "d-flex flex-wrap align-items-center gap-2" },
      Admin.searchBox("Buscar…", draw),
      h("span", { class: "small text-body-secondary d-none d-md-inline" }, icon("keyboard"), " Enter/↓ baja a la siguiente fila"),
      h("div", { class: "ms-auto d-flex gap-2" }, discardBtn, saveBtn)));

    content.replaceChildren(...kids(
      h("div", { class: "table-wrap" }, h("table", { class: "table table-bordered table-hover table-cch" },
        h("thead", {}, h("tr", {},
          h("th", { class: "sticky-col", text: "Cuenta" }), h("th", { class: "text-start", text: "Nombre" }),
          comps.map(c => h("th", { title: c.tipo === "manual" ? `Escala 0–${c.maximo}` : "Se calcula solo" },
            c.nombre, h("div", { class: "fw-normal small opacity-75", text: `${Fmt.num(c.ponderacion)}%${c.tipo === "manual" ? ` · /${c.maximo}` : " · auto"}` }))),
          h("th", { text: "Final" }), h("th", { title: "Lo no evaluado cuenta 0", text: "Estricta" }))),
        tbody)),
      manual.length ? null : h("p", { class: "small text-body-secondary mt-2", text: "No hay componentes manuales: todo se calcula solo." })
    ));
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
  tabWeights(content) {
    const g = Admin.group;
    if (!Admin.compDraft) {
      Admin.compDraft = g.components.map(c => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, ponderacion: c.ponderacion, maximo: c.maximo }));
    }
    const draft = Admin.compDraft;
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
        return h("div", { class: "card card-soft comp-row" }, h("div", { class: "card-body p-2" }, h("div", { class: "row g-2 align-items-center" },
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
        Admin.loadGroup();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });

    const importBtn = h("button", { class: "btn btn-outline-secondary btn-sm", type: "button" }, icon("box-arrow-in-down", "me-1"), "Importar de «Calificaciones» (AppSheet)");
    importBtn.addEventListener("click", async () => {
      if (!(await UI.confirm("Copiará Parcial_1, Parcial_2, Parcial_3, Sellos y Proyecto_Final de la hoja Calificaciones a este grupo (sin sobrescribir lo capturado en la web). Si el grupo no tiene componentes, primero se crea la plantilla por defecto."))) return;
      try {
        const r = await UI.busy(importBtn, () => Api.call("importLegacyGrades", { idCurso: g.group.id }, "admin"));
        UI.toast("success", r.message, 9000);
        Admin.compDraft = null;
        Admin.loadGroup();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });

    content.replaceChildren(
      h("div", { class: "card card-soft mb-3" }, h("div", { class: "card-body" },
        h("div", { class: "d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2" },
          h("h2", { class: "h6 mb-0" }, `Forma de evaluación · ${g.group.label}`),
          h("span", { class: "small" }, "Suma: ", sumText)),
        h("div", { class: "progress weight-bar mb-2", role: "progressbar", "aria-label": "Suma de ponderaciones" }, sumBar),
        h("p", { class: "small text-body-secondary mb-0" },
          "«Manual» = lo capturas tú en Captura (parciales, sellos, Teams…) en su propia escala (/10, /15, /100) y se convierte a 10. ",
          "«Asistencia» = asistencias ÷ (asistencias + faltas) × 10; el justificante no cuenta en contra. ",
          "«Proyectos» = promedio de los proyectos ligados a ese componente.")
      )),
      list,
      h("div", { class: "d-flex flex-wrap gap-2 mt-3" },
        h("button", { class: "btn btn-outline-primary btn-sm", type: "button", onclick: () => { draft.push({ nombre: "", tipo: "manual", ponderacion: 0, maximo: 10 }); draw(); } }, icon("plus-lg", "me-1"), "Agregar componente"),
        h("button", {
          class: "btn btn-outline-secondary btn-sm", type: "button",
          onclick: async () => {
            if (draft.length && !(await UI.confirm("¿Reemplazar la lista actual por la plantilla por defecto? (No se guarda hasta que presiones Guardar)"))) return;
            Admin.compDraft = Admin.boot.defaults.components.map(c => Object.assign({}, c));
            Admin.renderTab();
          }
        }, icon("magic", "me-1"), "Plantilla por defecto"),
        importBtn,
        h("div", { class: "ms-auto" }, saveBtn))
    );
  },

  /* ---------------- Pestaña: Proyectos ---------------- */
  tabProjects(content) {
    const g = Admin.group;
    const projectComps = g.components.filter(c => c.tipo === "proyectos");

    $("adm-toolbar").replaceChildren(h("div", { class: "d-flex gap-2" },
      h("button", { class: "btn btn-sm btn-primary", type: "button", onclick: () => Admin.editProject(null) }, icon("plus-lg", "me-1"), "Nuevo proyecto")));

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

      return h("div", { class: "card card-soft" },
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
            ? h("div", { class: "row g-3" }, p.teams.map(t => h("div", { class: "col-12 col-md-6 col-xl-4" }, Admin.teamCard(p, t))))
            : h("p", { class: "text-body-secondary small", text: "Sin equipos registrados." }),
          without.length ? h("details", { class: "mt-3" },
            h("summary", { class: "small text-body-secondary", text: `${without.length} alumno(s) sin equipo` }),
            h("div", { class: "mt-2" }, without.map(s => h("span", { class: "chip", title: s.nombre, text: `${s.cuenta} ${s.nombre ? "· " + s.nombre.split(" ").slice(0, 2).join(" ") : ""}` })))) : null
        ));
    })));
  },

  teamCard(project, team) {
    const stars = Object.assign({}, team.stars);
    const obs = h("textarea", { class: "form-control form-control-sm", rows: "2", placeholder: "Observaciones (las ve el equipo)", maxlength: "1000" });
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
        Admin.loadGroup();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });

    return h("div", { class: "card h-100" }, h("div", { class: "card-body p-3" },
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

    $("adm-toolbar").replaceChildren(h("div", { class: "d-flex flex-wrap align-items-center gap-3" }, estado,
      h("div", { class: "form-check mb-0" }, onlyGroup, h("label", { class: "form-check-label small", for: "ev-only-group", text: "Solo el grupo seleccionado" }))));
    await load();
  },

  drawEvidence(content) {
    const { items, componentsByCourse } = Admin.evidence;
    if (!items.length) { content.replaceChildren(UI.empty("inbox", "No hay evidencias con ese filtro.")); return; }
    const badge = { Pendiente: "text-bg-secondary", Aplicada: "text-bg-success", Rechazada: "text-bg-danger" };

    content.replaceChildren(h("div", { class: "row g-3" }, items.map(ev => {
      const comps = componentsByCourse[ev.idCurso] || [];
      const points = h("input", { class: "form-control form-control-sm", type: "number", min: "0", step: "0.1", value: ev.puntos ?? "", placeholder: "Puntos", "aria-label": "Puntos" });
      const comp = h("select", { class: "form-select form-select-sm", "aria-label": "Sumar a" },
        h("option", { value: "", text: comps.length ? "Sumar a…" : "Sin componentes manuales" }),
        comps.map(c => h("option", { value: c.id, selected: ev.componentId === c.id, text: `${c.nombre} (/${c.maximo})` })));
      const note = h("input", { class: "form-control form-control-sm", maxlength: "500", value: ev.nota || "", placeholder: "Nota para el alumno (opcional)", "aria-label": "Nota" });

      const act = (estado, btn) => async () => {
        try {
          const r = await UI.busy(btn, () => Api.call("reviewEvidence", { id: ev.id, estado, puntos: points.value, componentId: comp.value, nota: note.value }, "admin"));
          UI.toast("success", r.message);
          ev.estado = estado;
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

      return h("div", { class: "col-12 col-lg-6" }, h("div", { class: "card card-soft h-100" }, h("div", { class: "card-body" },
        h("div", { class: "d-flex justify-content-between gap-2" },
          h("div", {},
            h("div", { class: "fw-semibold", text: ev.titulo }),
            h("div", { class: "small text-body-secondary" },
              h("a", { href: "#", class: "link-body-emphasis", onclick: e => { e.preventDefault(); Admin.openProfile(ev.cuenta); } }, `${ev.cuenta} · ${ev.nombre}`),
              ` · ${ev.grupo} · ${ev.tipo} · ${Fmt.date(ev.enviado)}`)),
          h("span", { class: `badge align-self-start ${badge[ev.estado]}`, text: ev.estado })),
        ev.descripcion ? h("p", { class: "small mt-2 mb-2", text: ev.descripcion }) : null,
        ev.url ? h("a", { class: "btn btn-sm btn-outline-primary my-2", href: ev.url, target: "_blank", rel: "noopener noreferrer" }, icon("box-arrow-up-right", "me-1"), ev.archivo || "Abrir") : null,
        h("div", { class: "row g-2 mt-1" },
          h("div", { class: "col-4" }, points),
          h("div", { class: "col-8" }, comp),
          h("div", { class: "col-12" }, note)),
        h("div", { class: "d-flex justify-content-end gap-2 mt-2" }, ev.estado !== "Pendiente" ? pending : null, reject, apply)
      )));
    })));
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

  /** Ficha completa: resumen, asistencia, calificaciones, comentarios, equipos/evidencias e historial. */
  drawProfile(body, p) {
    UI.disposePopovers(body);
    const groups = p.groups || [];

    // ---- Comentarios ----
    const commentsBox = h("div");
    const commentBadge = h("span", { class: "badge rounded-pill text-bg-warning ms-1", text: p.comments.length });
    const drawComments = list => {
      commentBadge.textContent = list.length;
      commentsBox.replaceChildren(...(list.length ? list.map(c => h("div", { class: `comment-item ${c.origen === "Web" ? "web" : ""}` },
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
        h("div", { style: { whiteSpace: "pre-line" }, text: c.texto }))) : [UI.empty("chat-left", "Sin comentarios.")]));
    };
    drawComments(p.comments);
    const text = h("textarea", { class: "form-control form-control-sm", rows: "2", placeholder: "Nuevo comentario privado", maxlength: "2000", "aria-label": "Nuevo comentario" });
    const course = h("select", { class: "form-select form-select-sm", "aria-label": "Grupo del comentario" },
      h("option", { value: "", text: "General" }),
      p.enrollments.filter(e => e.idCurso).map(e => h("option", { value: e.idCurso, text: `${e.curso} ${e.grupo} (${e.ciclo})` })));
    const add = h("button", { class: "btn btn-sm btn-primary", type: "button" }, icon("plus-lg", "me-1"), "Agregar");
    add.addEventListener("click", async () => {
      try {
        const r = await UI.busy(add, () => Api.call("addComment", { cuenta: p.cuenta, idCurso: course.value, texto: text.value }, "admin"));
        text.value = "";
        drawComments(r.comments);
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });

    // ---- Resumen ----
    const removeBtn = gr => h("button", {
      class: "btn btn-sm btn-outline-danger", type: "button", title: "Dar de baja de este grupo",
      onclick: async () => {
        if (!(await UI.confirm(`¿Dar de baja a ${p.cuenta} de ${gr.label}? Se quita de Students y de la hoja Reporte_ (Attendance Log se conserva).`, { okText: "Dar de baja", danger: true }))) return Admin.openProfile(p.cuenta);
        try {
          UI.toast("success", (await Api.call("removeStudent", { idCurso: gr.idCurso, cuenta: p.cuenta }, "admin")).message);
          bootstrap.Modal.getOrCreateInstance($("modal-generic")).hide();
          Admin.loadGroup();
        } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
      }
    }, icon("person-dash"));

    const summary = h("div", { class: "row g-3" },
      groups.length ? groups.map(gr => {
        const c = gr.attendance ? gr.attendance.counts : null;
        const pct = c ? Parts.pct(c) : null;
        const faltas = h("div", { class: "rounded px-2", text: c ? c.falta : "—" });
        if (c) Parts.applyFaltas(faltas, c.falta);
        return h("div", { class: "col-12 col-md-6 col-lg-4" }, h("div", { class: "card h-100" }, h("div", { class: "card-body" },
          h("div", { class: "d-flex justify-content-between align-items-start" },
            h("div", {}, h("div", { class: "fw-semibold", text: gr.label }), h("div", { class: "small text-body-secondary", text: gr.ciclo })),
            removeBtn(gr)),
          h("div", { class: "d-flex gap-3 mt-3 text-center" },
            h("div", {}, h("div", { class: `fs-4 fw-bold ${gr.final !== null && gr.final < CONFIG.RISK_THRESHOLD ? "text-danger" : ""}`, text: Fmt.grade(gr.final) }), h("div", { class: "small text-body-secondary", text: "promedio" })),
            h("div", {}, h("div", { class: "fs-4 fw-bold", text: pct === null ? "—" : `${pct}%` }), h("div", { class: "small text-body-secondary", text: "asistencia" })),
            h("div", {}, h("div", { class: "fs-4 fw-bold" }, faltas), h("div", { class: "small text-body-secondary", text: "faltas" })),
            h("div", {}, h("div", { class: "fs-4 fw-bold", text: c ? c.justificante : "—" }), h("div", { class: "small text-body-secondary", text: "justif." }))))));
      }) : h("div", { class: "col-12" }, UI.empty("collection", "Sin grupos activos.")),
      h("div", { class: "col-12" },
        h("h3", { class: "h6 mt-2", text: `Inscripciones (${p.enrollments.length})` }),
        h("div", { class: "d-flex flex-wrap gap-1" }, p.enrollments.map(e => h("span", { class: `badge ${e.activo ? "rel-same" : "text-bg-light border"}`, text: `${e.curso} ${e.grupo} · ${e.ciclo || "s/c"}` })))));

    // ---- Asistencia ----
    const attendance = h("div", { class: "vstack gap-3" }, groups.length ? groups.map(gr => h("div", {},
      h("div", { class: "fw-semibold mb-1", text: gr.label }),
      gr.attendance && gr.attendance.dates.length ? Parts.attendanceStrip(p.cuenta, gr.attendance.dates, gr.attendance.counts.falta) : h("p", { class: "small text-body-secondary", text: "Sin registros." }))) : UI.empty("calendar-x", "Sin asistencia."),
      Parts.legend());

    // ---- Calificaciones ----
    const grades = h("div", { class: "row g-3" }, groups.map(gr => h("div", { class: "col-12 col-lg-6" }, h("div", { class: "card h-100" }, h("div", { class: "card-body" },
      h("div", { class: "d-flex justify-content-between mb-2" }, h("span", { class: "fw-semibold", text: gr.label }), h("span", { class: "badge text-bg-dark fs-6", text: Fmt.grade(gr.final) })),
      gr.components.length ? h("table", { class: "table table-sm mb-0" },
        h("tbody", {}, gr.components.map(cp => h("tr", {},
          h("td", { text: cp.nombre }), h("td", { class: "text-body-secondary small", text: `${Fmt.num(cp.ponderacion)}%` }),
          h("td", { class: "text-end" }, Parts.gradeWithBonus(gr.items[cp.id], cp)))))) : h("p", { class: "small text-body-secondary mb-0", text: "Sin ponderaciones." }),
      gr.legacy && gr.legacy.length ? h("div", { class: "small text-body-secondary mt-2", text: gr.legacy.filter(x => x.value).map(x => `${x.label}: ${x.value}`).join(" · ") }) : null)))));

    // ---- Equipos y evidencias ----
    const badge = { Pendiente: "text-bg-secondary", Aplicada: "text-bg-success", Rechazada: "text-bg-danger" };
    const extra = h("div", { class: "row g-3" },
      h("div", { class: "col-12 col-lg-6" }, h("h3", { class: "h6", text: "Equipos" }),
        groups.flatMap(gr => gr.projects.map(pj => h("div", { class: "border rounded p-2 mb-2 small" },
          h("div", { class: "d-flex justify-content-between" }, h("b", { text: pj.nombre }), pj.team && pj.team.calificacion !== null ? h("span", { class: "badge text-bg-success", text: Fmt.grade(pj.team.calificacion) }) : null),
          pj.team ? h("div", {}, h("div", { text: `${pj.team.nombre}: ${pj.team.members.map(m => m.nombre || m.cuenta).join(", ")}` }),
            pj.team.stars ? h("div", { class: "mt-1" }, pj.rubros.map(r => h("div", { class: "rubric-row" }, h("span", { text: r }), Parts.starsReadonly(pj.team.stars[r] || 0)))) : null)
            : h("div", { class: "text-body-secondary", text: "Sin equipo" })))).concat(groups.some(gr => gr.projects.length) ? [] : [h("p", { class: "small text-body-secondary", text: "Sin proyectos." })])),
      h("div", { class: "col-12 col-lg-6" }, h("h3", { class: "h6", text: "Evidencias" }),
        p.evidences.length ? p.evidences.map(e => h("div", { class: "border rounded p-2 mb-2 small d-flex justify-content-between gap-2" },
          h("div", {}, h("b", { text: e.titulo }), h("div", { class: "text-body-secondary", text: `${e.tipo} · ${e.grupo} · ${Fmt.date(e.enviado)}` }),
            e.estado === "Aplicada" ? h("div", { class: "text-success-emphasis", text: `+${Fmt.num(e.puntos)} en ${e.componente}` }) : null),
          h("span", { class: `badge align-self-start ${badge[e.estado]}`, text: e.estado }))) : h("p", { class: "small text-body-secondary", text: "Sin evidencias." })));

    // ---- Historial ----
    const history = p.history && p.history.length ? h("div", { class: "table-wrap auto-h" }, h("table", { class: "table table-sm table-cch mb-0" },
      h("thead", {}, h("tr", {}, ["Curso", "Grupo", "Ciclo", "Final", "Faltas", "Comentarios"].map(t => h("th", { text: t })))),
      h("tbody", {}, p.history.map(x => h("tr", {},
        h("td", { class: "text-start", text: x.curso }), h("td", { text: x.grupo }), h("td", { text: x.ciclo }),
        h("td", { text: Fmt.grade(x.final) }), h("td", { text: x.faltas ?? "—" }),
        h("td", { class: "text-start small", style: { whiteSpace: "normal", minWidth: "220px" }, text: x.comentarios || "" })))))) : null;

    // ---- Pestañas ----
    const panes = [
      { id: "res", label: "Resumen", iconName: "speedometer2", node: summary },
      { id: "asi", label: "Asistencia", iconName: "calendar-check", node: attendance },
      { id: "cal", label: "Calificaciones", iconName: "bar-chart", node: grades },
      { id: "com", label: "Comentarios", iconName: "chat-left-text", node: h("div", {}, commentsBox, h("div", { class: "row g-2 mt-1" }, h("div", { class: "col-12" }, text), h("div", { class: "col-8" }, course), h("div", { class: "col-4 text-end" }, add))), extra: commentBadge },
      { id: "eq", label: "Equipos y evidencias", iconName: "people", node: extra },
      history ? { id: "his", label: "Historial", iconName: "clock-history", node: history } : null
    ].filter(Boolean);

    const nav = h("ul", { class: "nav nav-pills profile-tabs mb-3 tab-scroll" });
    const content = h("div");
    const show = id => {
      nav.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.pane === id));
      content.replaceChildren(panes.find(x => x.id === id).node);
    };
    panes.forEach(x => nav.append(h("li", { class: "nav-item" }, h("button", { class: "nav-link", type: "button", dataset: { pane: x.id }, onclick: () => show(x.id) }, icon(x.iconName, "me-1"), x.label, x.extra || null))));
    show(Admin.profilePane && panes.some(x => x.id === Admin.profilePane) ? Admin.profilePane : "res");
    nav.addEventListener("click", e => { const b = e.target.closest("[data-pane]"); if (b) Admin.profilePane = b.dataset.pane; });

    body.replaceChildren(
      h("div", { class: "d-flex flex-wrap align-items-center gap-2 mb-3 pb-2 border-bottom" },
        h("div", { class: "me-auto" },
          h("div", { class: "fs-5 fw-semibold", text: p.nombres.join(" / ") || "(sin nombre)" }),
          h("div", { class: "small text-body-secondary", text: p.correos.join(", ") || "sin correo" })),
        groups.length > 1 ? h("span", { class: "badge rel-same" }, icon("people-fill"), ` ${groups.length} grupos este ciclo`) : null,
        p.history && p.history.length ? h("span", { class: "badge rel-prev" }, icon("clock-history"), ` ${p.history.length} ciclo(s) anterior(es)`) : null,
        p.nombres.length > 1 ? h("span", { class: "badge text-bg-warning", text: "nombres distintos" }) : null),
      nav, content);
  },

  /* ---------------- Pestaña: Grupos ---------------- */
  tabGroups(content) {
    const boot = Admin.boot;
    const reportOptions = selected => [h("option", { value: "", text: "(sin hoja)" })]
      .concat(boot.reports.map(r => h("option", { value: r.name, selected: r.name === selected, text: r.name })));

    const rows = boot.groups.map(g => {
      const label = h("input", { class: "form-control form-control-sm", value: g.label, maxlength: "60", "aria-label": "Etiqueta" });
      const sheet = h("select", { class: "form-select form-select-sm", "aria-label": "Hoja de reporte" }, reportOptions(g.sheet));
      const ciclo = h("input", { class: "form-control form-control-sm", value: g.ciclo, style: { width: "6rem" }, "aria-label": "Ciclo" });
      const active = h("input", { class: "form-check-input", type: "checkbox", checked: g.active, "aria-label": "Activo" });
      const save = h("button", { class: "btn btn-sm btn-outline-primary", type: "button", title: "Guardar" }, icon("save"));
      save.addEventListener("click", async () => {
        try {
          const r = await UI.busy(save, () => Api.call("saveGroup", { idCurso: g.id, etiqueta: label.value, hojaReporte: sheet.value, ciclo: ciclo.value, activo: active.checked }, "admin"));
          UI.toast("success", r.message);
          Admin.boot = await Api.call("adminBootstrap", {}, "admin");
          Admin.renderGroupSelect();
          Admin.renderTab();
        } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
      });
      return h("tr", {},
        h("td", { class: "text-start", style: { minWidth: "180px" } }, label),
        h("td", { class: "mono small", text: g.id }),
        h("td", { style: { minWidth: "200px" } }, sheet),
        h("td", {}, ciclo),
        h("td", {}, h("div", { class: "form-check form-switch d-flex justify-content-center mb-0" }, active)),
        h("td", { text: g.students }),
        h("td", {}, save));
    });

    const configured = new Set(boot.groups.map(g => g.id));
    const newCourse = h("select", { class: "form-select form-select-sm", "aria-label": "Curso para agregar" },
      h("option", { value: "", text: "Agregar curso de la hoja Course…" }),
      boot.courses.filter(c => !configured.has(c.id)).map(c => h("option", { value: c.id, text: `${c.name} · ${c.group} (${c.ciclo}) — ${c.id}` })));
    const addBtn = h("button", { class: "btn btn-sm btn-primary", type: "button" }, icon("plus-lg"), " Agregar");
    addBtn.addEventListener("click", async () => {
      if (!newCourse.value) return;
      try {
        await UI.busy(addBtn, () => Api.call("saveGroup", { idCurso: newCourse.value, activo: true }, "admin"));
        Admin.boot = await Api.call("adminBootstrap", {}, "admin");
        Admin.renderGroupSelect();
        Admin.renderTab();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });

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
        h("h2", { class: "h6", text: "Grupos de la web (hoja W_Grupos)" }),
        h("p", { class: "small text-body-secondary mb-0", text: "Cada grupo es un ID_Curso de la hoja Course (que ya incluye el ciclo) ligado a su hoja Reporte_ de asistencia. Solo los grupos activos aparecen a los alumnos." }))),
      h("div", { class: "table-wrap auto-h mb-3" }, h("table", { class: "table table-cch mb-0" },
        h("thead", {}, h("tr", {}, ["Etiqueta", "ID_Curso", "Hoja Reporte_", "Ciclo", "Activo", "Alumnos", ""].map(t => h("th", { text: t })))),
        h("tbody", {}, rows))),
      h("div", { class: "d-flex flex-wrap gap-2 align-items-center" },
        h("div", { class: "d-flex gap-2", style: { minWidth: "280px", flex: "1 1 320px" } }, newCourse, addBtn),
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
    const keepCourses = h("input", { class: "form-check-input", type: "checkbox", id: "bk-keep" });
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
              "Solo si el ZIP queda guardado, se borrarán de la hoja de cálculo: inscripciones (Students), asistencias (Attendance Log), Calificaciones, Roles, " +
              (keepCourses.checked ? "" : "los cursos (Course), ") + "las hojas Reporte_ ligadas y todo lo de la web de esos grupos. " +
              "Antes se guarda un resumen por alumno en W_Historial. Desde la web no se puede deshacer; para recuperar, usa el Excel del ZIP."))
        });
        if (!ok) return;
        confirm = info.confirmWord;
      }
      try {
        const r = await UI.busy(backupBtn, () => Api.call("backupCycles", { cycles, purge: purge.checked, keepCourses: keepCourses.checked, confirm }, "admin"));
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
      h("div", { class: "form-check form-switch" }, purge, h("label", { class: "form-check-label", for: "bk-purge", text: "Borrar esos ciclos después de respaldar" })),
      h("div", { class: "form-check form-switch mb-2" }, keepCourses, h("label", { class: "form-check-label", for: "bk-keep", text: "Conservar los cursos en la hoja Course" })),
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

    const migrateBtn = h("button", { class: "btn btn-sm btn-warning", type: "button" }, icon("magic", "me-1"), "Migrar y homologar");
    const migrateOut = h("pre", { class: "small mb-0 mt-2 d-none", style: { whiteSpace: "pre-wrap" } });
    migrateBtn.addEventListener("click", async () => {
      if (!(await UI.confirm("Se hará un respaldo ZIP completo y luego: estados A/F/J, ciclos 2027-1, importar calificaciones, comentarios y proyectos de AppSheet, diseño homogéneo y borrar las hojas de MIGRATION.DELETE_SHEETS. Se puede repetir sin duplicar.", { okText: "Migrar" }))) return Admin.tabMaintenance(content);
      try {
        UI.toast("info", "Migrando… puede tardar 1–3 minutos.", 8000);
        const r = await Api.call("migrate", {}, "admin");
        UI.modal({ title: [icon("check-circle-fill", "text-success me-2"), "Migración terminada"], body: h("pre", { class: "small mb-0", style: { whiteSpace: "pre-wrap" }, text: r.log.join("\n") }), size: "modal-lg" });
        Admin.boot = null; await Admin.loadBoot(); Prefs.set("admTab", "mantenimiento"); Admin.renderTab();
      } catch (error) { if (error.code !== "AUTH") UI.toast("danger", error.message); }
    });
    const migrateCard = h("div", { class: "card card-soft border-warning" }, h("div", { class: "card-body" },
      h("h2", { class: "h6" }, icon("magic", "me-1"), "Migrar y homologar"),
      h("p", { class: "small text-body-secondary", text: "Una sola vez después de instalar (se puede repetir). Respalda todo en ZIP antes de cambiar." }),
      migrateBtn, migrateOut));

    content.replaceChildren(h("div", { class: "row g-3" },
      h("div", { class: "col-12 col-xl-5 vstack gap-3" }, migrateCard, cycleCard, backupsCard, structureCard),
      h("div", { class: "col-12 col-xl-7 vstack gap-3" }, backupCard, dangerCard)));
  }
};

document.addEventListener("DOMContentLoaded", App.init);
