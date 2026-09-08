const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzRIZgmBVjWmPli3DObrzo-JZqyVhP3ePja0aRz_q4gdusi4S37Ad1aT4m4UZ2AsbAx/exec"
};

const STATE = {
  currentSheet: "",
  reports: [],
  raw: {
    headers: [],
    rows: []
  },
  visibleCols: [],
  filteredRows: []
};

const App = {
  init() {
    document.getElementById("home-link").addEventListener("click", (event) => {
      event.preventDefault();
      App.loadSection("inicio");
    });

    document.getElementById("report-menu").addEventListener("click", (event) => {
      const link = event.target.closest("[data-section]");
      if (!link) return;

      event.preventDefault();
      App.loadSection(link.dataset.section);
    });

    document.getElementById("tableSearch").addEventListener("input", App.filterTable);

    document.getElementById("btn-sync").addEventListener("click", App.syncAttendance);
    document.getElementById("btn-unlock").addEventListener("click", App.openAdminFlow);

    App.loadReports();
  },

  async request(params) {
    const url = new URL(CONFIG.API_URL);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error("No fue posible conectar con el servidor.");
    }

    const result = await response.json();

    if (result.status !== "success") {
      throw new Error(result.message || "Ocurrió un error inesperado.");
    }

    return result;
  },

  async loadReports() {
    const loading = document.getElementById("menu-loading");
    loading.classList.remove("d-none");

    try {
      const result = await App.request({ action: "getReports" });
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
    const menu = document.getElementById("report-menu");

    menu.querySelectorAll(".dynamic-report").forEach((item) => item.remove());

    STATE.reports.forEach((report) => {
      const li = document.createElement("li");
      li.className = "nav-item dynamic-report";

      const link = document.createElement("a");
      link.className = "nav-link";
      link.href = "#";
      link.dataset.section = report.name;
      link.textContent = report.label;

      li.appendChild(link);
      menu.appendChild(li);
    });
  },

  async loadSection(section) {
    document.querySelectorAll(".sidebar-nav .nav-link").forEach((link) => {
      link.classList.remove("active");
    });

    const activeLink = document.querySelector(`.sidebar-nav .nav-link[data-section="${CSS.escape(section)}"]`);
    activeLink?.classList.add("active");

    const isHome = section === "inicio";

    document.getElementById("inicio").classList.toggle("d-none", !isHome);
    document.getElementById("reporte-view").classList.toggle("d-none", isHome);
    document.getElementById("tableSearch").disabled = isHome;
    document.getElementById("btn-sync").disabled = isHome;

    if (isHome) {
      STATE.currentSheet = "";
      document.getElementById("view-title").textContent = "Inicio";
      document.getElementById("view-subtitle").textContent = "Panel de control";
      return;
    }

    const report = STATE.reports.find((item) => item.name === section);

    if (!report) {
      App.showAlert("danger", "El reporte seleccionado ya no está disponible.");
      await App.loadReports();
      return;
    }

    STATE.currentSheet = report.name;
    document.getElementById("view-title").textContent = report.label;
    document.getElementById("view-subtitle").textContent = `Hoja: ${report.name}`;
    document.getElementById("tableSearch").value = "";

    await App.fetchData();
  },

  async fetchData() {
    if (!STATE.currentSheet) return;

    App.setLoading(true);

    try {
      const result = await App.request({
        action: "getData",
        sheetName: STATE.currentSheet
      });

      STATE.raw.headers = result.headers || [];
      STATE.raw.rows = result.data || [];

      STATE.visibleCols = (result.visibility || [])
        .map((value, index) => App.isVisible(value) ? index : null)
        .filter((index) => index !== null);

      if (!STATE.visibleCols.length) {
        App.showAlert("warning", "Este reporte no tiene columnas marcadas como “Visible”.");
      }

      STATE.filteredRows = [...STATE.raw.rows];

      App.renderTable();
      App.renderStats();
    } catch (error) {
      STATE.raw = { headers: [], rows: [] };
      STATE.visibleCols = [];
      STATE.filteredRows = [];

      App.renderTable();
      App.renderStats();
      App.showAlert("danger", `Error al consultar el reporte: ${error.message}`);
    } finally {
      App.setLoading(false);
    }
  },

  isVisible(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return ["visible", "show", "si", "sí", "true", "1"].includes(normalized);
  },

  async syncAttendance() {
    if (!STATE.currentSheet) {
      App.showAlert("warning", "Selecciona un reporte antes de sincronizar.");
      return;
    }

    const button = document.getElementById("btn-sync");
    const originalContent = button.innerHTML;

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span class="d-none d-sm-inline">Sincronizando</span>';

    try {
      const result = await App.request({
        action: "syncAttendance",
        sheetName: STATE.currentSheet
      });

      App.showAlert("success", result.message);
      await App.fetchData();
    } catch (error) {
      App.showAlert("danger", `No se pudo sincronizar: ${error.message}`);
    } finally {
      button.disabled = false;
      button.innerHTML = originalContent;
    }
  },

  filterTable() {
    const query = document.getElementById("tableSearch").value.trim().toLowerCase();

    STATE.filteredRows = STATE.raw.rows.filter((row) => {
      return row.some((cell) => String(cell ?? "").toLowerCase().includes(query));
    });

    App.renderTable();
  },

  renderTable() {
    const head = document.getElementById("mainAttendanceHead");
    const body = document.getElementById("mainAttendanceBody");

    head.innerHTML = "";
    body.innerHTML = "";

    if (!STATE.visibleCols.length) return;

    const headerRow = document.createElement("tr");

    STATE.visibleCols.forEach((index) => {
      const th = document.createElement("th");
      th.textContent = STATE.raw.headers[index] || `Columna ${index + 1}`;
      headerRow.appendChild(th);
    });

    head.appendChild(headerRow);

    if (!STATE.filteredRows.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = STATE.visibleCols.length;
      cell.className = "text-muted py-4";
      cell.textContent = "No hay información para mostrar.";

      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    STATE.filteredRows.forEach((dataRow) => {
      const row = document.createElement("tr");

      STATE.visibleCols.forEach((index) => {
        const cell = document.createElement("td");
        const value = String(dataRow[index] ?? "").trim();

        cell.textContent = value;

        if (value.toLowerCase() === "asistencia") {
          cell.classList.add("table-success");
        }

        if (value.toLowerCase() === "falta") {
          cell.classList.add("table-danger");
        }

        row.appendChild(cell);
      });

      body.appendChild(row);
    });
  },

  renderStats() {
    const total = STATE.raw.rows.length;
    const gradeIndex = STATE.raw.headers.findIndex((header) =>
      String(header).trim().toLowerCase() === "calificación" ||
      String(header).trim().toLowerCase() === "calificacion"
    );

    let averageText = "N/A";
    let risk = 0;

    if (gradeIndex !== -1) {
      const grades = STATE.raw.rows
        .map((row) => Number(String(row[gradeIndex] ?? "").replace(",", ".")))
        .filter((grade) => Number.isFinite(grade));

      if (grades.length) {
        const average = grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
        averageText = average.toFixed(1);
        risk = grades.filter((grade) => grade < 6).length;
      }
    }

    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-avg").textContent = averageText;
    document.getElementById("stat-risk").textContent = risk;
  },

  async openAdminFlow() {
    const password = prompt("Contraseña de administrador:");

    if (password === null) return;

    const reportName = prompt("Nombre del nuevo reporte:");

    if (!reportName?.trim()) return;

    try {
      const result = await App.request({
        action: "createReportSheet",
        reportName: reportName.trim(),
        adminPass: password
      });

      App.showAlert("success", result.message);
      await App.loadReports();
      await App.loadSection(result.sheetName);
    } catch (error) {
      App.showAlert("danger", `No se pudo crear el reporte: ${error.message}`);
    }
  },

  setLoading(isLoading) {
    const tableBody = document.getElementById("mainAttendanceBody");

    if (!isLoading) return;

    document.getElementById("mainAttendanceHead").innerHTML = "";
    tableBody.innerHTML = `
      <tr>
        <td class="text-center text-muted py-4">
          <i class="fas fa-spinner fa-spin"></i> Cargando información...
        </td>
      </tr>
    `;
  },

  showAlert(type, message) {
    const container = document.getElementById("alert-container");
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
  }
};

document.addEventListener("DOMContentLoaded", App.init);
