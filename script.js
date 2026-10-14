const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzRIZgmBVjWmPli3DObrzo-JZqyVhP3ePja0aRz_q4gdusi4S37Ad1aT4m4UZ2AsbAx/exec",
  REQUEST_TIMEOUT_MS: 30000,
  SEARCH_DEBOUNCE_MS: 200,
  RISK_THRESHOLD: 6,
  ALERT_AUTOHIDE_MS: 5000
};

const STATE = {
  currentSheet: "",
  reports: [],
  raw: { headers: [], rows: [] },
  visibleCols: [],
  filteredRows: [],
  requestId: 0 // evita que una respuesta vieja sobrescriba a una nueva
};

const $ = (id) => document.getElementById(id);

/* ---------- Utilidades ---------- */
const Utils = {
  // Minúsculas y sin acentos: "Calificación" -> "calificacion", "Sí" -> "si"
  normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  },

  debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  },

  // Devuelve NaN para celdas vacías (antes contaban como 0 y como "en riesgo")
  parseNumber(value) {
    const text = String(value ?? "").trim().replace(",", ".");
    return text === "" ? NaN : Number(text);
  }
};

/* ---------- Comunicación con Apps Script ---------- */
const Api = {
  async request(params) {
    const url = new URL(CONFIG.API_URL);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("El servidor tardó demasiado en responder.");
      }
      throw new Error("No fue posible conectar con el servidor.");
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`El servidor respondió con error ${response.status}.`);
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("La respuesta del servidor no es válida.");
    }

    if (result.status !== "success") {
      throw new Error(result.message || "Ocurrió un error inesperado.");
    }

    return result;
  }
};

/* ---------- Aplicación ---------- */
const App = {
  init() {
    $("home-link").addEventListener("click", (event) => {
      event.preventDefault();
      App.loadSection("inicio");
    });

    $("report-menu").addEventListener("click", (event) => {
      const link = event.target.closest("[data-section]");
      if (!link) return;
      event.preventDefault();
      App.loadSection(link.dataset.section);
    });

    $("tableSearch").addEventListener("input", Utils.debounce(App.filterTable, CONFIG.SEARCH_DEBOUNCE_MS));
    $("btn-sync").addEventListener("click", App.syncAttendance);
    $("btn-unlock").addEventListener("click", App.openAdminModal);
    $("adminForm").addEventListener("submit", App.submitAdminForm);

    App.loadReports();
  },

  /* --- Menú de reportes --- */
  async loadReports() {
    const loading = $("menu-loading");
    loading.classList.remove("d-none");

    try {
      const result = await Api.request({ action: "getReports" });
      STATE.reports = result.reports || [];
      App.renderReportMenu();

      if (!STATE.reports.length) {
        App.showAlert("warning", "No hay hojas cuyo nombre inicie con “Reporte_”.");
      }
    } catch (error) {
      App.showAlert("danger", `No se pudieron cargar los reportes: ${error.message}`);
    } finally {
      loading.classList.add("d-none");
    }
  },

  renderReportMenu() {
    const menu = $("report-menu");
    menu.querySelectorAll(".dynamic-report").forEach((item) => item.remove());

    const fragment = document.createDocumentFragment();

    STATE.reports.forEach((report) => {
      const li = document.createElement("li");
      li.className = "nav-item dynamic-report";

      const link = document.createElement("a");
      link.className = "nav-link";
      link.href = "#";
      link.dataset.section = report.name;
      link.textContent = report.label;

      if (report.name === STATE.currentSheet) link.classList.add("active");

      li.appendChild(link);
      fragment.appendChild(li);
    });

    menu.appendChild(fragment);
  },

  setActiveLink(section) {
    document.querySelectorAll(".sidebar-nav .nav-link").forEach((link) => {
      link.classList.toggle("active", link.dataset.section === section);
    });
  },

  /* --- Navegación --- */
  async loadSection(section) {
    App.setActiveLink(section);

    const isHome = section === "inicio";

    $("inicio").classList.toggle("d-none", !isHome);
    $("reporte-view").classList.toggle("d-none", isHome);
    $("tableSearch").disabled = isHome;
    $("btn-sync").disabled = isHome;
    $("tableSearch").value = "";

    if (isHome) {
      STATE.currentSheet = "";
      STATE.requestId++; // descarta cualquier carga pendiente
      $("view-title").textContent = "Inicio";
      $("view-subtitle").textContent = "Panel de control";
      return;
    }

    const report = STATE.reports.find((item) => item.name === section);

    if (!report) {
      App.showAlert("danger", "El reporte seleccionado ya no está disponible.");
      await App.loadReports();
      return;
    }

    STATE.currentSheet = report.name;
    $("view-title").textContent = report.label;
    $("view-subtitle").textContent = `Hoja: ${report.name}`;

    await App.fetchData();
  },

  /* --- Datos del reporte --- */
  async fetchData() {
    if (!STATE.currentSheet) return;

    const requestId = ++STATE.requestId;
    const sheetName = STATE.currentSheet;

    App.showLoading();

    try {
      const result = await Api.request({ action: "getData", sheetName });

      // Si el usuario cambió de reporte mientras cargaba, ignorar esta respuesta
      if (requestId !== STATE.requestId) return;

      STATE.raw.headers = result.headers || [];
      STATE.raw.rows = result.data || [];

      STATE.visibleCols = (result.visibility || []).reduce((cols, value, index) => {
        if (App.isVisible(value)) cols.push(index);
        return cols;
      }, []);

      if (!STATE.visibleCols.length) {
        App.showAlert("warning", "Este reporte no tiene columnas marcadas como “Visible”.");
      }

      App.applyFilter();
      App.renderStats();
    } catch (error) {
      if (requestId !== STATE.requestId) return;

      STATE.raw = { headers: [], rows: [] };
      STATE.visibleCols = [];
      STATE.filteredRows = [];

      App.renderTable();
      App.renderStats();
      App.showAlert("danger", `Error al consultar el reporte: ${error.message}`);
    }
  },

  isVisible(value) {
    return ["visible", "show", "si", "true", "1"].includes(Utils.normalize(value));
  },

  /* --- Sincronización --- */
  async syncAttendance() {
    if (!STATE.currentSheet) {
      App.showAlert("warning", "Selecciona un reporte antes de sincronizar.");
      return;
    }

    const button = $("btn-sync");
    const originalContent = button.innerHTML;
    const sheetName = STATE.currentSheet;

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span class="d-none d-sm-inline">Sincronizando</span>';

    try {
      const result = await Api.request({ action: "syncAttendance", sheetName });
      App.showAlert("success", result.message || "Sincronización completada.");

      // Solo recargar si el usuario sigue en el mismo reporte
      if (STATE.currentSheet === sheetName) await App.fetchData();
    } catch (error) {
      App.showAlert("danger", `No se pudo sincronizar: ${error.message}`);
    } finally {
      button.innerHTML = originalContent;
      button.disabled = !STATE.currentSheet;
    }
  },

  /* --- Filtro (solo busca en columnas visibles) --- */
  filterTable() {
    App.applyFilter();
  },

  applyFilter() {
    const query = Utils.normalize($("tableSearch").value);

    STATE.filteredRows = query
      ? STATE.raw.rows.filter((row) =>
          STATE.visibleCols.some((index) => Utils.normalize(row[index]).includes(query))
        )
      : [...STATE.raw.rows];

    App.renderTable();
  },

  /* --- Tabla --- */
  renderTable() {
    const head = $("mainAttendanceHead");
    const body = $("mainAttendanceBody");

    head.replaceChildren();
    body.replaceChildren();

    if (!STATE.visibleCols.length) return;

    const headerRow = document.createElement("tr");
    STATE.visibleCols.forEach((index) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = STATE.raw.headers[index] || `Columna ${index + 1}`;
      headerRow.appendChild(th);
    });
    head.appendChild(headerRow);

    if (!STATE.filteredRows.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = STATE.visibleCols.length;
      cell.className = "text-muted py-4";
      cell.textContent = $("tableSearch").value.trim()
        ? "Ningún registro coincide con la búsqueda."
        : "No hay información para mostrar.";
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    const STATUS_CLASSES = { asistencia: "table-success", falta: "table-danger" };
    const fragment = document.createDocumentFragment();

    STATE.filteredRows.forEach((dataRow) => {
      const row = document.createElement("tr");

      STATE.visibleCols.forEach((index) => {
        const cell = document.createElement("td");
        const value = String(dataRow[index] ?? "").trim();
        cell.textContent = value;

        const statusClass = STATUS_CLASSES[Utils.normalize(value)];
        if (statusClass) cell.classList.add(statusClass);

        row.appendChild(cell);
      });

      fragment.appendChild(row);
    });

    body.appendChild(fragment);
  },

  /* --- Estadísticas --- */
  renderStats() {
    const total = STATE.raw.rows.length;
    const gradeIndex = STATE.raw.headers.findIndex((header) => Utils.normalize(header) === "calificacion");

    let averageText = "N/A";
    let risk = 0;

    if (gradeIndex !== -1) {
      const grades = STATE.raw.rows
        .map((row) => Utils.parseNumber(row[gradeIndex]))
        .filter(Number.isFinite);

      if (grades.length) {
        const average = grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
        averageText = average.toFixed(1);
        risk = grades.filter((grade) => grade < CONFIG.RISK_THRESHOLD).length;
      }
    }

    $("stat-total").textContent = total;
    $("stat-avg").textContent = averageText;
    $("stat-risk").textContent = risk;
  },

  /* --- Crear reporte (modal) --- */
  openAdminModal() {
    $("adminForm").reset();
    $("adminError").classList.add("d-none");
    bootstrap.Modal.getOrCreateInstance($("adminModal")).show();
    setTimeout(() => $("adminPass").focus(), 300);
  },

  async submitAdminForm(event) {
    event.preventDefault();

    const password = $("adminPass").value;
    const reportName = $("reportName").value.trim();
    const errorBox = $("adminError");
    const submit = $("adminSubmit");

    if (!password || !reportName) {
      errorBox.textContent = "Completa ambos campos.";
      errorBox.classList.remove("d-none");
      return;
    }

    submit.disabled = true;
    errorBox.classList.add("d-none");

    try {
      const result = await Api.request({
        action: "createReportSheet",
        reportName,
        adminPass: password
      });

      bootstrap.Modal.getOrCreateInstance($("adminModal")).hide();
      App.showAlert("success", result.message || "Reporte creado.");
      await App.loadReports();
      if (result.sheetName) await App.loadSection(result.sheetName);
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove("d-none");
    } finally {
      $("adminPass").value = "";
      submit.disabled = false;
    }
  },

  /* --- UI auxiliar --- */
  showLoading() {
    $("mainAttendanceHead").replaceChildren();
    $("mainAttendanceBody").innerHTML = `
      <tr>
        <td class="text-center text-muted py-4">
          <i class="fas fa-spinner fa-spin"></i> Cargando información...
        </td>
      </tr>
    `;
  },

  showAlert(type, message) {
    const container = $("alert-container");
    const alert = document.createElement("div");

    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = "alert";
    alert.textContent = message;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "btn-close";
    closeButton.setAttribute("aria-label", "Cerrar");
    closeButton.addEventListener("click", () => alert.remove());

    alert.appendChild(closeButton);
    container.replaceChildren(alert);

    // Los mensajes de éxito se ocultan solos; los errores se quedan
    if (type === "success") {
      setTimeout(() => alert.remove(), CONFIG.ALERT_AUTOHIDE_MS);
    }
  }
};

document.addEventListener("DOMContentLoaded", App.init);
