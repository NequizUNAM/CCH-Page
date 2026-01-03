/**
 * SISTEMA CCH - DASHBOARD DE ASISTENCIAS (Versión GitHub)
 * Este script se conecta a la Web App de Google Apps Script.
 */

// ================= 1. CONFIGURACIÓN Y ESTADO =================
const CONFIG = {
    // URL de tu Web App publicada (Debe ser la de "Nueva Implementación")
    API_URL: 'https://script.google.com/macros/s/AKfycbzafrk_uQaDvhWzqgjUm7oh6RvjowPZQnyPEMOKauib-B0r4CnF-hCa1Rb3zfrQzQMiZA/exec',
    COLORS: {
        primary: '#007bff',
        success: '#198754',
        warning: '#ffc107',
        danger: '#dc3545'
    }
};

const STATE = {
    currentData: [],
    currentView: 'inicio'
};

// ================= 2. CAPA DE CONEXIÓN (API) =================
const API = {
    /**
     * Obtiene los datos desde la Web App de Google
     */
    async fetchAttendance(sheetName) {
        const url = `${CONFIG.API_URL}?action=getData&sheetName=${sheetName}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Error en la respuesta del servidor");
            const result = await response.json();
            return result;
        } catch (error) {
            console.error("API Error:", error);
            return { status: "error", message: "No se pudo conectar con Google Sheets. Revisa la URL de la API." };
        }
    }
};

// ================= 3. GESTIÓN DE INTERFAZ (UI) =================
const UI = {
    /**
     * Muestra el spinner de carga
     */
    showLoading(show) {
        const body = document.getElementById('tableBody');
        if (show) {
            body.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status"></div>
                        <p class="mt-2 text-muted">Obteniendo datos de la hoja...</p>
                    </td>
                </tr>`;
        }
    },

    /**
     * Actualiza las tarjetas del Dashboard
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
     * Renderiza la tabla según el tipo de reporte
     */
    renderTable(data, type) {
        const header = document.getElementById('tableHeader');
        const body = document.getElementById('tableBody');
        
        // Definición de columnas por materia
        let cols = [];
        if (type === 'maga') {
            header.innerHTML = `<tr><th>Cuenta</th><th>Faltas</th><th>Sellos</th><th>Exámenes</th><th>Total</th></tr>`;
            cols = ['cuenta', 'faltas', 'sellos', 'examenes', 'total'];
        } else {
            header.innerHTML = `<tr><th>Cuenta</th><th>Faltas</th><th>Tareas</th><th>Ejercicios</th><th>Part.</th><th>Examen</th><th>Total</th></tr>`;
            cols = ['cuenta', 'faltas', 'tareas', 'ejercicios', 'participaciones', 'examenes', 'total'];
        }

        body.innerHTML = '';
        if (data.length === 0) {
            body.innerHTML = '<tr><td colspan="10" class="text-center">No se encontraron resultados.</td></tr>';
            return;
        }

        data.forEach(student => {
            const tr = document.createElement('tr');
            const nFaltas = parseFloat(student.faltas || 0);
            
            // Lógica de Semáforo
            let statusClass = nFaltas > 8 ? "text-danger fw-bold" : (nFaltas > 4 ? "text-warning fw-bold" : "text-success");
            let badge = nFaltas > 8 ? " ⚠️ NP" : (nFaltas > 4 ? " ❗" : "");

            tr.innerHTML = cols.map(c => {
                if (c === 'faltas') return `<td class="${statusClass}">${student[c]}${badge}</td>`;
                return `<td>${student[c] || 0}</td>`;
            }).join('');
            
            body.appendChild(tr);
        });
    }
};

// ================= 4. CONTROLADOR DE LA APP =================
const App = {
    init() {
        // Listeners para la navegación
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                const section = link.getAttribute('data-section');
                this.handleNavigation(link, section);
            });
        });
    },

    handleNavigation(link, section) {
        // Actualizar estilos de la barra lateral
        document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        this.loadSection(section);

        // Cerrar sidebar en móviles
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('active');
        }
    },

    async loadSection(section) {
        const inicioSec = document.getElementById('inicio');
        const reportSec = document.getElementById('reporte-view');

        if (section === 'inicio') {
            inicioSec.classList.add('active');
            reportSec.classList.remove('active');
            STATE.currentView = 'inicio';
            return;
        }

        // Preparar vista de reporte
        inicioSec.classList.remove('active');
        reportSec.classList.add('active');
        document.getElementById('view-title').textContent = section === 'maga' ? 'Reporte MAGA 2' : 'Reporte CYC';
        document.getElementById('tableSearch').value = '';
        
        STATE.currentView = section;
        UI.showLoading(true);

        // Pedir datos a la API (Google Sheets)
        const sheetName = section === 'maga' ? 'Reporte_MAGA2' : 'Reporte_CYC';
        const result = await API.fetchAttendance(sheetName);

        if (result.status === 'success') {
            STATE.currentData = result.data;
            UI.updateStats(result.data);
            UI.renderTable(result.data, section);
        } else {
            document.getElementById('tableBody').innerHTML = `<tr><td colspan="10" class="alert alert-danger">${result.message}</td></tr>`;
        }
    },

    filterTable() {
        const query = document.getElementById('tableSearch').value.toLowerCase().trim();
        const filtered = STATE.currentData.filter(item => 
            String(item.cuenta).toLowerCase().includes(query)
        );
        UI.renderTable(filtered, STATE.currentView);
    },

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('active');
    }
};

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', () => App.init());