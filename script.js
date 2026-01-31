/**
 * SISTEMA CCH - DASHBOARD
 * ✅ Tabla dinámica por Show
 * ✅ Colores para "Calificación"
 * ✅ Warning para "Total Asistencias" = 0
 */

const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbzafrk_uQaDvhWzqgjUm7oh6RvjowPZQnyPEMOKauib-B0r4CnF-hCa1Rb3zfrQzQMiZA/exec',
    ADMIN_PASS: '307153443'
};

const STATE = {
    currentView: 'inicio',
    currentSheet: '',
    isEditable: false,

    raw: {
        showRow: [],
        headers: [],
        rows: []
    },

    visibleCols: [],
    filteredRows: []
};

const UI = {
    showLoading: (show) => {
        const head = document.getElementById('mainAttendanceHead');
        const body = document.getElementById('mainAttendanceBody');

        if (show) {
            head.innerHTML = "";
            body.innerHTML = `
        <tr>
          <td colspan="99" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
          </td>
        </tr>`;
        }
    },

    updateStats: () => {
        const dataRows = STATE.filteredRows.length;

        const pcts = STATE.filteredRows.map(row => App.calcAttendancePct(row));
        const avg = pcts.length ? (pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1) : 0;

        document.getElementById('stat-total').textContent = dataRows;
        document.getElementById('stat-avg').textContent = avg + "%";
        document.getElementById('stat-risk').textContent = pcts.filter(p => p < 80).length;
    },

    renderTable: () => {
        const head = document.getElementById('mainAttendanceHead');
        const body = document.getElementById('mainAttendanceBody');

        head.innerHTML = "";
        body.innerHTML = "";

        // ✅ índices especiales
        const califIdx = App.getColumnIndexByHeader("Calificación");
        const totalFaltasIdx = App.getColumnIndexByHeader("Faltas");

        // HEADERS
        const trHead = document.createElement("tr");

        STATE.visibleCols.forEach(colIdx => {
            const th = document.createElement("th");
            th.textContent = STATE.raw.headers[colIdx] || "";
            th.classList.add("text-center");
            trHead.appendChild(th);
        });

        head.appendChild(trHead);

        // BODY
        STATE.filteredRows.forEach(row => {
            const tr = document.createElement("tr");

            STATE.visibleCols.forEach(colIdx => {
                const td = document.createElement("td");
                td.classList.add("text-center");

                const value = row[colIdx] ?? "";
                const text = String(value ?? "");
                const v = text.toLowerCase().trim();

                // ✅ Colorear asistencia / falta (visual extra)
                if (v.includes("asisten")) td.classList.add("table-success");
                if (v.includes("falta")) td.classList.add("table-danger");

                // ✅ VALIDACIÓN: Calificación (colores)
                if (colIdx === califIdx) {
                    const n = Number(String(value).replace(",", "."));
                    if (!isNaN(n)) {
                        td.classList.add("fw-bold");

                        if (n >= 0 && n <= 59) {
                            td.classList.add("text-danger");
                        } else if (n >= 60 && n <= 70) {
                            td.classList.add("text-warning");
                        } else if (n >= 71 && n <= 100) {
                            td.classList.add("text-success");
                        }
                    }
                }

                // ✅ VALIDACIÓN: Total Asistencias = 0
                if (colIdx === totalFaltasIdx) {
                    const n = Number(String(value).replace(",", "."));
                    if (!isNaN(n) && n === 0) {
                        td.classList.add("fw-bold", "text-danger");
                        td.innerHTML = `<i class="fas fa-triangle-exclamation me-1"></i>${text}`;
                        tr.appendChild(td);
                        return; // evita sobrescribir con textContent abajo
                    }
                }

                td.textContent = text;
                tr.appendChild(td);
            });

            body.appendChild(tr);
        });

        if (STATE.visibleCols.length === 0) {
            head.innerHTML = `<tr><th>No hay columnas con "Show" en la fila 1</th></tr>`;
        }
    }
};

const DataUtils = {
    normalize: (v) => String(v ?? "").trim(),

    getVisibleColumns: (showRow) => {
        return showRow
            .map((v, i) => ({ v: DataUtils.normalize(v).toLowerCase(), i }))
            .filter(x => x.v === "show")
            .map(x => x.i);
    }
};

const App = {
    init: () => {
        document.querySelectorAll('.sidebar-nav a').forEach(l =>
            l.addEventListener('click', e => {
                e.preventDefault();
                App.loadSection(l.getAttribute('data-section'));
            })
        );
    },

    // 🔎 buscar índice por nombre exacto del header
    getColumnIndexByHeader: (headerName) => {
        const h = String(headerName || "").trim().toLowerCase();
        return STATE.raw.headers.findIndex(x => String(x || "").trim().toLowerCase() === h);
    },

    // ✅ calcula % usando SOLO columnas Show (donde haya Asistencia/Falta)
    calcAttendancePct: (row) => {
        let asist = 0;
        let total = 0;

        STATE.visibleCols.forEach(idx => {
            const cell = String(row[idx] ?? "").toLowerCase().trim();
            if (cell.includes("asisten")) {
                asist++;
                total++;
            } else if (cell.includes("falta")) {
                total++;
            }
        });

        if (!total) return 0;
        return (asist / total) * 100;
    },

    setActiveNav: (section) => {
        document.querySelectorAll(".navbar-nav .nav-link").forEach(a => a.classList.remove("active"));
        const el = document.querySelector(`.navbar-nav .nav-link[data-section="${section}"]`);
        if (el) el.classList.add("active");
    },

    // ✅ sincroniza asistencia desde Apps Script
    syncAttendance: async () => {
        const btn = document.getElementById("btn-sync");
        if (!btn) return alert("No existe el botón btn-sync en el HTML");

        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Sincronizando...`;

        try {
            const url = `${CONFIG.API_URL}?action=syncAttendance`;
            const res = await fetch(url).then(r => r.json());

            if (res.status === "success") {
                alert(res.message);

                // ✅ recargar la hoja actual si ya hay una cargada
                if (STATE.currentSheet) {
                    await App.loadBySheetName(STATE.currentSheet);
                }
            } else {
                alert("❌ Error: " + res.message);
            }

        } catch (e) {
            alert("❌ Error de conexión al sincronizar.");
        }

        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-rotate me-1"></i> Sincronizar`;
    },

    // ✅ flujo admin para crear hoja
    openAdminFlow: async () => {
        const pass = prompt("Ingrese contraseña de administrador:");
        if (pass !== CONFIG.ADMIN_PASS) {
            alert("❌ Contraseña incorrecta");
            return;
        }

        const name = prompt("Nombre del nuevo reporte (ej: CYC3, MAGA4, GrupoA):");
        if (!name || !name.trim()) {
            alert("❌ Nombre inválido");
            return;
        }

        try {
            const url = `${CONFIG.API_URL}?action=createReportSheet&reportName=${encodeURIComponent(name.trim())}`;
            const res = await fetch(url).then(r => r.json());

            if (res.status !== "success") {
                alert("❌ Error: " + res.message);
                return;
            }

            alert(`✅ ${res.message}\nHoja: ${res.sheetName}`);

            // ✅ cargar la hoja creada
            STATE.currentSheet = res.sheetName;
            await App.loadBySheetName(res.sheetName);

        } catch (e) {
            alert("❌ Error de conexión al crear reporte.");
        }
    },

    // ✅ carga directa por nombre de hoja
    loadBySheetName: async (sheetName) => {
        document.getElementById('inicio').classList.remove('active');
        document.getElementById('reporte-view').classList.remove('d-none');

        document.getElementById('view-title').textContent = `Reporte ${sheetName}`;
        document.getElementById('view-subtitle').textContent = `Hoja: ${sheetName}`;

        UI.showLoading(true);

        try {
            const res = await fetch(`${CONFIG.API_URL}?action=getData&sheetName=${sheetName}`).then(r => r.json());
            if (res.status !== "success") throw new Error(res.message || "Error al cargar");

            const showRow = res.showRow || res.data?.[0] || [];
            const headers = res.headers || res.data?.[1] || [];
            const rows = (res.data || []).slice(2);

            STATE.raw = { showRow, headers, rows };
            STATE.visibleCols = DataUtils.getVisibleColumns(showRow);
            STATE.filteredRows = rows;

            UI.renderTable();
            UI.updateStats();

        } catch (e) {
            alert("❌ Error: " + e.message);
        }
    },

    async loadSection(section) {
        if (section === 'inicio') {
            STATE.currentView = 'inicio';

            document.getElementById('inicio').classList.add('active');
            document.getElementById('reporte-view').classList.add('d-none');

            document.getElementById('view-title').textContent = "Inicio";
            document.getElementById('view-subtitle').textContent = "Selecciona una sección del menú";

            App.setActiveNav("inicio");
            return;
        }

        document.getElementById('inicio').classList.remove('active');
        document.getElementById('reporte-view').classList.remove('d-none');

        const sheets = {
            maga1: 'Reporte_MAGA1',
            maga2: 'Reporte_MAGA2',
            maga3: 'Reporte_MAGA3',
            cyc: 'Reporte_CYC',
            cyc2: 'Reporte_CYC2',
            estadistica: 'Reporte_Estadistica'
        };

        const titulos = {
            maga1: 'MAGA 1',
            maga2: 'MAGA 2',
            maga3: 'MAGA 3',
            cyc: 'CYC 1',
            cyc2: 'CYC 2',
            estadistica: 'Estadística'
        };

        STATE.currentView = section;
        STATE.currentSheet = sheets[section] || '';

        document.getElementById('view-title').textContent = `Reporte ${titulos[section] || ''}`;
        document.getElementById('view-subtitle').textContent = `Hoja: ${STATE.currentSheet}`;

        App.setActiveNav(section);

        UI.showLoading(true);

        try {
            const res = await fetch(`${CONFIG.API_URL}?action=getData&sheetName=${STATE.currentSheet}`).then(r => r.json());
            if (res.status !== "success") throw new Error(res.message || "Error al cargar datos");

            const showRow = res.showRow || res.data?.[0] || [];
            const headers = res.headers || res.data?.[1] || [];
            const rows = (res.data || []).slice(2);

            STATE.raw = { showRow, headers, rows };
            STATE.visibleCols = DataUtils.getVisibleColumns(showRow);
            STATE.filteredRows = rows;

            UI.renderTable();
            UI.updateStats();

        } catch (e) {
            alert("❌ Error: " + e.message);
        }
    },

    filterTable: () => {
        const q = document.getElementById('tableSearch').value.toLowerCase().trim();

        const cuentaIdx = App.getColumnIndexByHeader("Cuenta");

        if (!q) {
            STATE.filteredRows = STATE.raw.rows;
        } else {
            STATE.filteredRows = STATE.raw.rows.filter(row => {
                const cuenta = String(row[cuentaIdx] ?? "").toLowerCase();
                return cuenta.includes(q);
            });
        }

        UI.renderTable();
        UI.updateStats();
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
