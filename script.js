/**
 * SISTEMA CCH - DASHBOARD CENTRALIZADO (Versión JsRender)
 * Gestión de MAGA 1, 2, 3, CYC y Estadística
 */

// ================= 1. CONFIGURACIÓN Y ESTADO =================
const CONFIG = {
    // URL de tu Web App de Google Apps Script
    API_URL: 'https://script.google.com/macros/s/AKfycbzafrk_uQaDvhWzqgjUm7oh6RvjowPZQnyPEMOKauib-B0r4CnF-hCa1Rb3zfrQzQMiZA/exec'
};

const STATE = {
    currentData: [],
    currentView: 'inicio'
};

// ================= 2. HELPERS DE JSRENDER =================
// Estos helpers permiten procesar lógica visual directamente en el HTML
$.views.helpers({
    getStatusClass: function (faltas) {
        const n = parseFloat(faltas || 0);
        // Semáforo: Rojo (>8), Amarillo (>4), Verde (<=4)
        return n > 8 ? "text-danger" : (n > 4 ? "text-warning" : "text-success");
    },
    getStatusBadge: function (faltas) {
        const n = parseFloat(faltas || 0);
        // Badges: NP (No Presentó), ! (Revisión)
        return n > 8 ? "⚠️" : (n > 4 ? "‼️" : "");
    }
});

// ================= 3. CAPA DE CONEXIÓN (API) =================
const API = {
    /**
     * Obtiene los datos de una hoja específica desde Google Sheets
     */
    async getData(sheetName) {
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=getData&sheetName=${sheetName}`);
            if (!response.ok) throw new Error("Error en la respuesta del servidor");
            return await response.json();
        } catch (e) {
            console.error("API Error:", e);
            return { status: "error", message: "No se pudo conectar con el servidor." };
        }
    }
};

// ================= 4. GESTIÓN DE INTERFAZ (UI) =================
const UI = {
    /**
     * Muestra el spinner de carga en la tabla principal
     */
    showLoading(show) {
        const table = document.getElementById('mainAttendanceTable');
        if (show) {
            table.innerHTML = `
                <tbody>
                    <tr>
                        <td class="text-center py-5">
                            <div class="spinner-border text-primary" role="status"></div>
                            <p class="mt-2 text-muted">Consultando Google Sheets...</p>
                        </td>
                    </tr>
                </tbody>`;
        }
    },

    /**
     * Actualiza las tarjetas de métricas superiores
     */
    updateStats(data) {
        document.getElementById('stat-total').textContent = data.length;

        const sumPct = data.reduce((acc, curr) => acc + parseFloat(curr.porcentaje || 0), 0);
        const avg = data.length > 0 ? (sumPct / data.length).toFixed(1) : 0;
        document.getElementById('stat-avg').textContent = `${avg}%`;

        const riskCount = data.filter(s => parseFloat(s.porcentaje) < 80).length;
        document.getElementById('stat-risk').textContent = riskCount;
    },

    /**
     * Renderiza la tabla utilizando el template correcto según la materia
     */
    render(data, type) {
        const table = document.getElementById('mainAttendanceTable');

        if (data.length === 0) {
            table.innerHTML = '<tbody><tr><td class="text-center py-4">No se encontraron registros en esta hoja.</td></tr></tbody>';
            return;
        }

        // MAPEO DE TEMPLATES: Cada materia se vincula a su propio diseño HTML
        const templateMap = {
            'maga1': '#magaRowTmpl',
            'maga2': '#magaRowTmpl',
            'maga3': '#magaRowTmpl',
            'cyc': '#cycRowTmpl',
            'estadistica': '#estadRowTmpl' // Template único para Estadística
        };

        const templateId = templateMap[type] || "#cycRowTmpl";

        // Ejecución de JsRender
        const html = $(templateId).render({ students: data });
        table.innerHTML = html;
    }
};

// ================= 5. CONTROLADOR DE LA APLICACIÓN =================
const App = {
    init() {
        // Listeners para los enlaces de navegación del sidebar
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.loadSection(section);

                // Actualizar estado activo en el menú
                document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    },

    /**
     * Gestiona el cambio de vista y la carga de datos
     */
    async loadSection(section) {
        const inicioSec = document.getElementById('inicio');
        const reporteSec = document.getElementById('reporte-view');

        // Mostrar/Ocultar secciones
        if (section === 'inicio') {
            inicioSec.classList.add('active');
            reporteSec.classList.remove('active');
            STATE.currentView = 'inicio';
            this.closeSidebar(); // Siempre cerrar al navegar
            return;
        }

        inicioSec.classList.remove('active');
        reporteSec.classList.add('active');

        // CONFIGURACIÓN POR MATERIA: Títulos y Hojas de Google
        const materias = {
            'maga1': { title: 'MAGA 1', sheet: 'Reporte_MAGA1' },
            'maga2': { title: 'MAGA 2', sheet: 'Reporte_MAGA2' },
            'maga3': { title: 'MAGA 3', sheet: 'Reporte_MAGA3' },
            'cyc': { title: 'CYC 1', sheet: 'Reporte_CYC' },
            'estadistica': { title: 'Estadística', sheet: 'Reporte_Estadistica' }
        };

        const config = materias[section] || {};
        document.getElementById('view-title').textContent = `Reporte ${config.title || ''}`;
        document.getElementById('tableSearch').value = '';

        STATE.currentView = section;
        UI.showLoading(true);

        // Petición a la API
        const result = await API.getData(config.sheet);

        if (result.status === 'success') {
            STATE.currentData = result.data;
            UI.updateStats(result.data);
            UI.render(result.data, section);
        } else {
            document.getElementById('mainAttendanceTable').innerHTML = `
                <tbody>
                    <tr><td class="alert alert-danger">${result.message}</td></tr>
                </tbody>`;
        }

        // Cerrar sidebar en móviles tras seleccionar
        // if (window.innerWidth <= 768) {
        //     this.toggleSidebar();
        // }

        // Ejecutar cierre de sidebar independientemente del tamaño de pantalla
        this.closeSidebar();
    },

    /**
     * Filtra la tabla actual basándose en el número de cuenta
     */
    filterTable() {
        const query = document.getElementById('tableSearch').value.toLowerCase().trim();
        const filtered = STATE.currentData.filter(item =>
            String(item.cuenta).toLowerCase().includes(query)
        );
        UI.render(filtered, STATE.currentView);
    },

    /**
     * Fuerza el cierre del sidebar eliminando la clase active
     */
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    },

    handleNavClick(el, sec) {
        this.loadSection(sec);
    }
};

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', () => App.init());