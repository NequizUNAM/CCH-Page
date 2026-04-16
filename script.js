const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbzRIZgmBVjWmPli3DObrzo-JZqyVhP3ePja0aRz_q4gdusi4S37Ad1aT4m4UZ2AsbAx/exec',
    ADMIN_PASS: '307153443'
};

const STATE = {
    currentSheet: '',
    raw: { headers: [], rows: [] },
    visibleCols: [],
    filteredRows: []
};

const App = {
    init: () => {
        document.querySelectorAll('.sidebar-nav a').forEach(l => {
            l.addEventListener('click', e => {
                e.preventDefault();
                App.loadSection(l.getAttribute('data-section'));
            });
        });
    },

    loadSection: async (section) => {
        const sheets = {
            maga1: 'Reporte_MAGA1', maga2: 'Reporte_MAGA2', maga3: 'Reporte_MAGA3',
            cyc: 'Reporte_CYC', cyc2: 'Reporte_CYC2', 
            est1: 'Reporte_Estadistica1', est2: 'Reporte_Estadistica2'
        };
        if (section === 'inicio') {
            document.getElementById('inicio').classList.remove('d-none');
            document.getElementById('reporte-view').classList.add('d-none');
            STATE.currentSheet = '';
            return;
        }
        STATE.currentSheet = sheets[section];
        document.getElementById('view-title').textContent = section.toUpperCase();
        document.getElementById('inicio').classList.add('d-none');
        document.getElementById('reporte-view').classList.remove('d-none');
        await App.fetchData();
    },

    fetchData: async () => {
        if (!STATE.currentSheet) return;
        try {
            const res = await fetch(`${CONFIG.API_URL}?action=getData&sheetName=${STATE.currentSheet}`).then(r => r.json());
            if (res.status !== "success") throw new Error(res.message);
            const showRow = res.showRow || [];
            STATE.raw.headers = res.headers || [];
            STATE.raw.rows = (res.data || []).slice(2);
            STATE.visibleCols = showRow.map((v, i) => v.toLowerCase() === "show" ? i : null).filter(v => v !== null);
            STATE.filteredRows = STATE.raw.rows;
            App.renderTable();
        } catch (e) { alert("Error: " + e.message); }
    },

    syncAttendance: async () => {
        if (!STATE.currentSheet) return alert("Selecciona un grupo.");
        const btn = document.getElementById('btn-sync');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
            const res = await fetch(`${CONFIG.API_URL}?action=syncAttendance&sheetName=${STATE.currentSheet}`).then(r => r.json());
            alert(res.message);
            await App.fetchData();
        } catch (e) { alert("Error de red"); }
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-rotate"></i> Sincronizar';
    },

    renderTable: () => {
        const head = document.getElementById('mainAttendanceHead');
        const body = document.getElementById('mainAttendanceBody');
        head.innerHTML = ""; body.innerHTML = "";
        const trH = document.createElement("tr");
        STATE.visibleCols.forEach(i => {
            const th = document.createElement("th");
            th.textContent = STATE.raw.headers[i];
            trH.appendChild(th);
        });
        head.appendChild(trH);
        STATE.filteredRows.forEach(row => {
            const tr = document.createElement("tr");
            STATE.visibleCols.forEach(i => {
                const td = document.createElement("td");
                const val = row[i] || "";
                td.textContent = val;
                if (val === "Asistencia") td.classList.add("table-success");
                if (val === "Falta") td.classList.add("table-danger");
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
    },

    filterTable: () => {
        const q = document.getElementById('tableSearch').value.toLowerCase();
        STATE.filteredRows = STATE.raw.rows.filter(r => r.some(c => String(c).toLowerCase().includes(q)));
        App.renderTable();
    },

    openAdminFlow: async () => {
        const p = prompt("Password:");
        if (p !== CONFIG.ADMIN_PASS) return alert("Cerrado");
        const n = prompt("Nombre Reporte:");
        if (n) {
            const res = await fetch(`${CONFIG.API_URL}?action=createReportSheet&reportName=${n}`).then(r => r.json());
            alert(res.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());