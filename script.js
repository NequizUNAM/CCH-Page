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

// ================= 1. HELPERS JSRENDER =================
$.views.helpers({
    getStatusClass: function(faltas) {
        const n = parseFloat(faltas || 0);
        return n > 8 ? "text-danger" : (n > 4 ? "text-warning" : "text-success");
    },
    getStatusBadge: function(faltas) {
        const n = parseFloat(faltas || 0);
        return n > 8 ? "⚠️ NP" : (n > 4 ? "❗" : "");
    }
});

// ================= 2. CAPA DE DATOS =================
const API = {
    async getData(sheetName) {
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=getData&sheetName=${sheetName}`);
            return await response.json();
        } catch (e) {
            return { status: "error", message: "Error de conexión con Google." };
        }
    }
};

// ================= 3. GESTIÓN DE UI =================
const UI = {
    showLoading(show) {
        const body = document.getElementById('tableBody');
        if (show) {
            body.innerHTML = `<tr><td colspan="10" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>`;
        }
    },

    updateStats(data) {
        document.getElementById('stat-total').textContent = data.length;
        const sum = data.reduce((acc, curr) => acc + parseFloat(curr.porcentaje || 0), 0);
        document.getElementById('stat-avg').textContent = (data.length > 0 ? (sum / data.length).toFixed(1) : 0) + '%';
        document.getElementById('stat-risk').textContent = data.filter(s => parseFloat(s.porcentaje) < 80).length;
    },

    render(data, type) {
        // Renderizar Encabezado
        const headerHtml = $("#headerTmpl").render({ type: type });
        document.getElementById('tableHeader').innerHTML = headerHtml;

        // Renderizar Cuerpo
        const body = document.getElementById('tableBody');
        if (data.length === 0) {
            body.innerHTML = '<tr><td colspan="10" class="text-center py-4">Sin datos.</td></tr>';
            return;
        }

        const templateId = type === 'maga' ? "#magaRowTmpl" : "#cycRowTmpl";
        body.innerHTML = $(templateId).render(data);
    }
};

// ================= 4. CONTROLADOR APP =================
const App = {
    init() {
        // Cargar secciones según data-section
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.loadSection(section);
                
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
        document.getElementById('view-title').textContent = section === 'maga' ? 'Reporte MAGA 2' : 'Reporte CYC';
        document.getElementById('tableSearch').value = '';

        STATE.currentView = section;
        UI.showLoading(true);

        const sheetName = section === 'maga' ? 'Reporte_MAGA2' : 'Reporte_CYC';
        const result = await API.getData(sheetName);

        if (result.status === 'success') {
            STATE.currentData = result.data;
            UI.updateStats(result.data);
            UI.render(result.data, section);
        } else {
            document.getElementById('tableBody').innerHTML = `<tr><td colspan="10" class="alert alert-danger">${result.message}</td></tr>`;
        }
    },

    filterTable() {
        const query = document.getElementById('tableSearch').value.toLowerCase().trim();
        const filtered = STATE.currentData.filter(item => 
            String(item.cuenta).toLowerCase().includes(query)
        );
        UI.render(filtered, STATE.currentView);
    },

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('active');
    },

    handleNavClick(el, sec) {
        this.loadSection(sec);
        if (window.innerWidth <= 768) this.toggleSidebar();
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());