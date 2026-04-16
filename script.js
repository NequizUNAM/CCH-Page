/**
 * SISTEMA CCH - DASHBOARD MEJORADO
 */

const CONFIG = {
    // REEMPLAZA ESTO CON LA URL DE TU NUEVA IMPLEMENTACIÓN DE APPS SCRIPT
    API_URL: 'https://script.google.com/macros/s/AKfycbzRIZgmBVjWmPli3DObrzo-JZqyVhP3ePja0aRz_q4gdusi4S37Ad1aT4m4UZ2AsbAx/exec',
    ADMIN_PASS: '307153443'
};

const STATE = {
    currentView: 'inicio',
    currentSheet: '',
    raw: { showRow: [], headers: [], rows: [] },
    visibleCols: [],
    filteredRows: []
};

const UI = {
    showLoading: (show) => {
        const head = document.getElementById('mainAttendanceHead');
        const body = document.getElementById('mainAttendanceBody');
        if (show) {
            head.innerHTML = "";
            body.innerHTML = `<tr><td colspan="99" class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Cargando datos desde Google Sheets...</p></td></tr>`;
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

        const califIdx = App.getColumnIndexByHeader("Calificación");
        const totalFaltasIdx = App.getColumnIndexByHeader("Faltas");

        const trHead = document.createElement("tr");
        STATE.visibleCols.forEach(colIdx => {
            const th = document.createElement("th");
            th.textContent = STATE.raw.headers[colIdx] || "";
            trHead.appendChild(th);
        });
        head.appendChild(trHead);

        STATE.filteredRows.forEach(row => {
            const tr = document.createElement("tr");
            STATE.visibleCols.forEach(colIdx => {
                const td = document.createElement("td");
                const value = row[colIdx] ?? "";
                const text = String(value ?? "");
                const v = text.toLowerCase().trim();

                if (v.includes("asisten")) td.classList.add("table-success", "fw-bold");
                if (v.includes("falta")) td.classList.add("table-danger", "text-danger", "fw-bold");

                if (colIdx === califIdx) {
                    const n = Number(String(value).replace(",", "."));
                    if (!isNaN(n)) {
                        td.classList.add("fw-bold");
                        if (n >= 0 && n <= 59) td.classList.add("text-danger");
                        else if (n >= 60 && n <= 70) td.classList.add("text-warning");
                        else if (n >= 71 && n <= 100) td.classList.add("text-success");
                    }
                }

                if (colIdx === totalFaltasIdx) {
                    const n = Number(String(value).replace(",", "."));
                    if (!isNaN(n) && n === 0) {
                        td.classList.add("fw-bold", "text-danger");
                        td.innerHTML = `<i class="fas fa-triangle-exclamation me-1"></i>${text}`;
                        tr.appendChild(td);
                        return; 
                    }
                }
                td.textContent = text;
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });

        if (STATE.visibleCols.length === 0) {
            head.innerHTML = `<tr><th>Error: Configura la Fila 1 de Google Sheets con la palabra "Show" en las columnas que quieras ver.</th></tr>`;
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
    getColumnIndexByHeader: (headerName) => {
        const h = String(headerName || "").trim().toLowerCase();
        return STATE.raw.headers.findIndex(x => String(x || "").trim().toLowerCase() === h);
    },
    calcAttendancePct: (row) => {
        let asist = 0; let total = 0;
        STATE.visibleCols.forEach(idx => {
            const cell = String(row[idx] ?? "").toLowerCase().trim();
            if (cell.includes("asisten")) { asist++; total++; } 
            else if (cell.includes("falta")) { total++; }
        });
        return !total ? 0 : (asist / total) * 100;
    },
    setActiveNav: (section) => {
        document.querySelectorAll(".navbar-nav .nav-link").forEach(a => a.classList.remove("active"));
        const el = document.querySelector(`.navbar-nav .nav-link[data-section="${section}"]`);
        if (el) el.classList.add("active");
    },
    
    // ✅ Flujo Sincronización Real
    syncAttendance: async () => {
        if(!STATE.currentSheet) return alert("Selecciona un grupo primero");
        
        const btn = document.getElementById("btn-sync");
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Calculando...`;

        try {
            // Mandamos el sheetName al backend
            const url = `${CONFIG.API_URL}?action=syncAttendance&sheetName=${encodeURIComponent(STATE.currentSheet)}`;
            const res = await fetch(url).then(r => r.json());

            if (res.status === "success") {
                alert(res.message);
                await App.loadBySheetName(STATE.currentSheet); // Recargar
            } else {
                alert("❌ Error: " + res.message);
            }
        } catch (e) {
            alert("❌ Error de red al sincronizar.");
        }

        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-rotate me-1"></i> Sincronizar Asistencias`;
    },

    openAdminFlow: async () => {
        const pass = prompt("Ingrese contraseña de administrador:");
        if (pass !== CONFIG.ADMIN_PASS) return alert("❌ Contraseña incorrecta");

        const name = prompt("Nombre del nuevo reporte (ej: CYC3, MAGA4):");
        if (!name || !name.trim()) return alert("❌ Nombre inválido");

        try {
            const url = `${CONFIG.API_URL}?action=createReportSheet&reportName=${encodeURIComponent(name.trim())}`;
            const res = await fetch(url).then(r => r.json());

            if (res.status !== "success") return alert("❌ Error: " + res.message);
            
            alert(`✅ ${res.message}\nHoja: ${res.sheetName}`);
            await App.loadBySheetName(res.sheetName);
        } catch (e) {
            alert("❌ Error de red al crear reporte.");
        }
    },

    loadBySheetName: async (sheetName) => {
        STATE.currentSheet = sheetName;
        document.getElementById('inicio').classList.add('d-none');
        document.getElementById('reporte-view').classList.remove('d-none');
        document.getElementById('btn-sync').classList.remove('d-none');
        document.getElementById('tableSearch').classList.remove('d-none');

        document.getElementById('view-title').textContent = `Reporte Cargado`;
        document.getElementById('view-subtitle').textContent = `Hoja: ${sheetName}`;

        UI.showLoading(true);

        try {
            const res = await fetch(`${CONFIG.API_URL}?action=getData&sheetName=${encodeURIComponent(sheetName)}`).then(r => r.json());
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
            document.getElementById('mainAttendanceBody').innerHTML = `<tr><td colspan="99" class="text-danger">Error cargando datos.</td></tr>`;
        }
    },

    loadSection: async (section) => {
        if (section === 'inicio') {
            STATE.currentView = 'inicio';
            STATE.currentSheet = '';
            document.getElementById('inicio').classList.remove('d-none');
            document.getElementById('reporte-view').classList.add('d-none');
            document.getElementById('btn-sync').classList.add('d-none');
            document.getElementById('tableSearch').classList.add('d-none');
            document.getElementById('view-title').textContent = "Inicio";
            document.getElementById('view-subtitle').textContent = "Selecciona una sección";
            App.setActiveNav("inicio");
            return;
        }

        const sheets = {
            maga1: 'Reporte_MAGA1', maga2: 'Reporte_MAGA2', maga3: 'Reporte_MAGA3',
            cyc: 'Reporte_CYC', cyc2: 'Reporte_CYC2', estadistica: 'Reporte_Estadistica'
        };
        const titulos = {
            maga1: 'MAGA 1', maga2: 'MAGA 2', maga3: 'MAGA 3',
            cyc: 'CYC 1', cyc2: 'CYC 2', estadistica: 'Estadística'
        };

        STATE.currentView = section;
        App.setActiveNav(section);
        document.getElementById('view-title').textContent = `Reporte ${titulos[section] || ''}`;
        
        await App.loadBySheetName(sheets[section] || '');
    },

    filterTable: () => {
        const q = document.getElementById('tableSearch').value.toLowerCase().trim();
        const cuentaIdx = App.getColumnIndexByHeader("Cuenta");
        const nameIdx = App.getColumnIndexByHeader("First Name"); // Permite buscar también por nombre

        if (!q) {
            STATE.filteredRows = STATE.raw.rows;
        } else {
            STATE.filteredRows = STATE.raw.rows.filter(row => {
                const cuenta = String(row[cuentaIdx] ?? "").toLowerCase();
                const nombre = String(row[nameIdx] ?? "").toLowerCase();
                return cuenta.includes(q) || nombre.includes(q);
            });
        }
        UI.renderTable();
        UI.updateStats();
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());