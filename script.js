/**
 * SISTEMA CCH - DASHBOARD CORE (JsRender Version)
 */

const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbzafrk_uQaDvhWzqgjUm7oh6RvjowPZQnyPEMOKauib-B0r4CnF-hCa1Rb3zfrQzQMiZA/exec'
};


const STATE = {
    currentData: [],
    currentView: 'inicio'
};

// HELPERS JSRENDER
$.views.helpers({
    getStatusClass: function(faltas) {
        const n = parseFloat(faltas || 0);
        return n > 8 ? "text-danger" : (n > 4 ? "text-warning" : "text-success");
    },
    getStatusBadge: function(faltas) {
        const n = parseFloat(faltas || 0);
        return n > 8 ? "⚠️ NP" : (n > 4 ? "❗Revisar" : "");
    }
});

const API = {
    async getData(sheetName) {
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=getData&sheetName=${sheetName}`);
            return await response.json();
        } catch (e) {
            return { status: "error", message: "Error de conexión." };
        }
    }
};

const UI = {
    showLoading(show) {
        const table = document.getElementById('mainAttendanceTable');
        if (show) {
            table.innerHTML = `<tbody><tr><td class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr></tbody>`;
        }
    },

    updateStats(data) {
        document.getElementById('stat-total').textContent = data.length;
        const sum = data.reduce((acc, curr) => acc + parseFloat(curr.porcentaje || 0), 0);
        document.getElementById('stat-avg').textContent = (data.length > 0 ? (sum / data.length).toFixed(1) : 0) + '%';
        document.getElementById('stat-risk').textContent = data.filter(s => parseFloat(s.porcentaje) < 80).length;
    },

    render(data, type) {
        const table = document.getElementById('mainAttendanceTable');
        
        if (data.length === 0) {
            table.innerHTML = '<tbody><tr><td class="text-center py-4">Sin datos registrados.</td></tr></tbody>';
            return;
        }

        // Seleccionamos el template consolidado
        const templateId = (type === 'maga' || type === 'maga3') ? "#magaRowTmpl" : "#cycRowTmpl";
        
        // Renderizamos pasando el objeto envuelto en una propiedad 'students' para el {{for}}
        const html = $(templateId).render({ students: data });
        table.innerHTML = html;
    }
};

const App = {
    init() {
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadSection(link.getAttribute('data-section'));
                document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    },

    async loadSection(section) {
        const inicio = document.getElementById('inicio');
        const reporte = document.getElementById('reporte-view');

        if (section === 'inicio') {
            inicio.classList.add('active');
            reporte.classList.remove('active');
            return;
        }

        inicio.classList.remove('active');
        reporte.classList.add('active');
        
        const titulos = { 'maga': 'MAGA 2', 'maga3': 'MAGA 3', 'cyc': 'CYC' };
        document.getElementById('view-title').textContent = `Reporte ${titulos[section] || ''}`;
        document.getElementById('tableSearch').value = '';

        STATE.currentView = section;
        UI.showLoading(true);

        const sheetNames = { 'maga': 'Reporte_MAGA2', 'maga3': 'Reporte_MAGA3', 'cyc': 'Reporte_CYC' };
        const result = await API.getData(sheetNames[section]);

        if (result.status === 'success') {
            STATE.currentData = result.data;
            UI.updateStats(result.data);
            UI.render(result.data, section);
        } else {
            document.getElementById('mainAttendanceTable').innerHTML = `<tr><td class="alert alert-danger">${result.message}</td></tr>`;
        }
    },

    filterTable() {
        const query = document.getElementById('tableSearch').value.toLowerCase().trim();
        const filtered = STATE.currentData.filter(item => 
            String(item.cuenta).toLowerCase().includes(query)
        );
        UI.render(filtered, STATE.currentView);
    },

    toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); },
    handleNavClick(el, sec) { this.loadSection(sec); if (window.innerWidth <= 768) this.toggleSidebar(); }
};

document.addEventListener('DOMContentLoaded', () => App.init());