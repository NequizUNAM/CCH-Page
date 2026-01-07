/**
 * SISTEMA CCH - DASHBOARD MOTOR FRONTEND CON VALIDACIÓN DE ERRORES
 */

const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbzafrk_uQaDvhWzqgjUm7oh6RvjowPZQnyPEMOKauib-B0r4CnF-hCa1Rb3zfrQzQMiZA/exec',
    ADMIN_PASS: '307153443'
};

const STATE = { currentData: [], currentView: 'inicio', currentSheet: '', isEditable: false };

$.views.helpers({
    isEditable: () => STATE.isEditable,
    getStatusClass: (f) => parseFloat(f) > 8 ? "text-danger" : (parseFloat(f) > 4 ? "text-warning" : "text-success"),
    getStatusBadge: (f) => parseFloat(f) > 8 ? "NP" : (parseFloat(f) > 4 ? "!" : "")
});

const UI = {
    showLoading(show) {
        const t = document.getElementById('mainAttendanceTable');
        if (show) t.innerHTML = `<tbody><tr><td class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr></tbody>`;
    },
    updateStats(data) {
        document.getElementById('stat-total').textContent = data.length;
        const avg = data.length > 0 ? (data.reduce((a, b) => a + parseFloat(b.porcentaje || 0), 0) / data.length).toFixed(1) : 0;
        document.getElementById('stat-avg').textContent = avg + '%';
        document.getElementById('stat-risk').textContent = data.filter(s => parseFloat(s.porcentaje) < 80).length;
    },
    render(data, type) {
        const t = document.getElementById('mainAttendanceTable');
        const map = { 'maga1': '#magaRowTmpl', 'maga2': '#magaRowTmpl', 'maga3': '#magaRowTmpl', 'estadistica': '#estadRowTmpl', 'cyc': '#cycRowTmpl' };
        t.innerHTML = $(map[type] || "#cycRowTmpl").render({ students: data }, { isEditable: STATE.isEditable });
    }
};

const App = {
    init() {
        document.querySelectorAll('.sidebar-nav a').forEach(l => l.addEventListener('click', e => {
            e.preventDefault();
            this.loadSection(l.getAttribute('data-section'));
        }));
    },

    processRawData(raw) {
        const headers = raw[0].map(h => String(h || "").trim());
        const rows = raw.slice(1);
        const findCol = (name) => headers.indexOf(name);

        const idx = {
            cuenta: findCol("Cuenta"),
            nombre: findCol("First Name"),
            calif: findCol("Calificación"),
            ex: findCol("Total Exámenes"),
            sel: findCol("Total Sellos"),
            selH: findCol("Sellos"),
            tar: findCol("Total Tareas"),
            eje: findCol("Total Ejercicios"),
            part: findCol("Total Participaciones"),
            act: findCol("Actividades 30%"),
            prac: findCol("Prácticas 30%")
        };

        const start = idx.nombre + 1;
        const end = (idx.selH !== -1 ? idx.selH : findCol("Puntos")) - 1;

        return rows.map(row => {
            let asistencias = 0, faltas = 0, totalClases = 0;
            for (let i = start; i <= end; i++) {
                let cell = row[i] ? row[i].toString().toLowerCase() : "";
                if (cell.includes("asis")) { asistencias++; totalClases++; }
                else if (cell.includes("falt")) { faltas++; totalClases++; }
            }
            const pct = totalClases > 0 ? ((asistencias / totalClases) * 100).toFixed(1) : 0;
            return {
                cuenta: row[idx.cuenta],
                nombre: row[idx.nombre] || "Sin Nombre",
                faltas,
                porcentaje: pct,
                examenes: row[idx.ex] || 0,
                total: row[idx.calif] || 0,
                sellos: row[idx.sel] || 0,
                tareas: row[idx.tar] || 0,
                ejercicios: row[idx.eje] || 0,
                participaciones: row[idx.part] || 0,
                actividades: row[idx.act] || 0,
                practicas: row[idx.prac] || 0
            };
        });
    },

    async loadSection(section) {
        if (section === 'inicio') {
            document.getElementById('inicio').classList.add('active');
            document.getElementById('reporte-view').classList.remove('active');
            this.closeSidebar(); return;
        }
        document.getElementById('inicio').classList.remove('active');
        document.getElementById('reporte-view').classList.add('active');

        const sheets = { 'maga1': 'Reporte_MAGA1', 'maga2': 'Reporte_MAGA2', 'maga3': 'Reporte_MAGA3', 'cyc': 'Reporte_CYC', 'estadistica': 'Reporte_Estadistica' };
        const titulos = { 'maga1': 'MAGA 1', 'maga2': 'MAGA 2', 'maga3': 'MAGA 3', 'cyc': 'CYC 1', 'estadistica': 'Estadística' };

        STATE.currentView = section;
        STATE.currentSheet = sheets[section];
        document.getElementById('view-title').textContent = `Reporte ${titulos[section] || ''}`;

        UI.showLoading(true);

        try {
            const res = await fetch(`${CONFIG.API_URL}?action=getData&sheetName=${STATE.currentSheet}`).then(r => r.json());

            if (res.status === 'success') {
                STATE.currentData = this.processRawData(res.data);
                UI.updateStats(STATE.currentData);
                UI.render(STATE.currentData, section);
            } else {
                // VALIDACIÓN DE HOJA NO ENCONTRADA O ERROR DE GAS
                document.getElementById('mainAttendanceTable').innerHTML = `
                    <tbody><tr><td class="p-5">
                        <div class="alert alert-danger mb-0 text-center">
                            <i class="fas fa-exclamation-circle me-2"></i> 
                            <strong>Atención:</strong> ${res.message}
                        </div>
                    </td></tr></tbody>`;
                document.getElementById('stat-total').textContent = '0';
                document.getElementById('stat-avg').textContent = '0%';
                document.getElementById('stat-risk').textContent = '0';
            }
        } catch (e) {
            alert("Error crítico de conexión: Comprueba tu URL o conexión a internet.");
        }
        this.closeSidebar();
    },

    openAuthModal() { new bootstrap.Modal(document.getElementById('authModal')).show(); },

    verifyPassword() {
        if (document.getElementById('adminPass').value === CONFIG.ADMIN_PASS) {
            STATE.isEditable = true;
            bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
            document.getElementById('btn-unlock').classList.add('d-none');
            document.getElementById('btn-lock').classList.remove('d-none');
            UI.render(STATE.currentData, STATE.currentView);
        } else alert("Contraseña incorrecta");
        document.getElementById('adminPass').value = '';
    },

    lockEdition() {
        STATE.isEditable = false;
        document.getElementById('btn-unlock').classList.remove('d-none');
        document.getElementById('btn-lock').classList.add('d-none');
        UI.render(STATE.currentData, STATE.currentView);
    },

    async saveRow(cuenta) {
        const newValue = document.getElementById(`input-${cuenta}`).value;
        const btn = event.currentTarget; btn.disabled = true;

        try {
            const url = `${CONFIG.API_URL}?action=updateData&sheetName=${STATE.currentSheet}&cuenta=${cuenta}&newValue=${newValue}`;
            const res = await fetch(url).then(r => r.json());
            if (res.status === 'success') {
                STATE.currentData.find(s => s.cuenta == cuenta).total = newValue;
                alert("✅ Guardado correctamente");
            } else {
                alert("❌ Error al guardar: " + res.message);
            }
        } catch (e) { alert("Error de conexión al guardar."); }

        btn.disabled = false;
    },

    filterTable() {
        const q = document.getElementById('tableSearch').value.toLowerCase();
        UI.render(STATE.currentData.filter(i => String(i.cuenta).includes(q)), STATE.currentView);
    },
    toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); },
    closeSidebar() { document.getElementById('sidebar').classList.remove('active'); },
    handleNavClick(el, sec) { this.loadSection(sec); }
};
document.addEventListener('DOMContentLoaded', () => App.init());