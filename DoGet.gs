/**
 * SERVIDOR - SISTEMA CCH
 * Este código debe ir en el editor de Google Apps Script.
 */

function doGet(e) {
  const action = e.parameter.action;
  const sheetName = e.parameter.sheetName;

  if (action === "getData") {
    try {
      const data = getAttendanceData(sheetName);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
}

function getAttendanceData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) throw new Error("No se encontró la hoja: " + sheetName);

  const data = sheet.getDataRange().getDisplayValues();
  const headers = data.shift(); // Removemos encabezados

  // Configuración de índices según tu captura de pantalla
  // MAGA2: Cuenta(0), Nombre(1), Asistencias(2 a 20), Sellos(21), Exámenes(25), Calificación(26)
  const config = {
    'Reporte_MAGA2': {
      sellosIdx: 21,    // Columna V
      examenesIdx: 25,  // Columna Z
      totalIdx: 26,     // Columna AA
      datesStart: 2,    // Columna C
      datesEnd: 20      // Columna U (aprox, ajusta si hay más fechas)
    },
    'Reporte_CYC': {
      participacionesIdx: 25, // Columna Z
      examenesIdx: 26,        // Columna AA
      tareasIdx: 27,          // Columna AB
      ejerciciosIdx: 28,      // Columna AC
      totalIdx: 29,           // Columna AD
      datesStart: 2,
      datesEnd: 24
    }
  };

  const c = config[sheetName];
  if (!c) throw new Error("Configuración no definida para la hoja: " + sheetName);

  return data.map(row => {
    let asistencias = 0;
    let faltas = 0;
    let totalClases = 0;

    // Conteo dinámico de asistencias y faltas
    for (let i = c.datesStart; i <= c.datesEnd; i++) {
      let cell = row[i] ? row[i].toString().toLowerCase() : "";
      if (cell.includes("asistencia")) {
        asistencias++;
        totalClases++;
      } else if (cell.includes("faltas")) {
        faltas++;
        totalClases++;
      }
    }

    const porcentaje = totalClases > 0 ? ((asistencias / totalClases) * 100).toFixed(1) : 0;

    // Objeto base que el JS de GitHub espera
    const student = {
      cuenta: row[0],
      nombre: row[1],
      faltas: faltas,
      porcentaje: porcentaje,
      examenes: row[c.examenesIdx] || 0,
      total: row[c.totalIdx] || 0
    };

    // Agregar campos específicos según la materia
    if (sheetName === 'Reporte_MAGA2') {
      student.sellos = row[c.sellosIdx] || 0;
    } else if (sheetName === 'Reporte_CYC') {
      student.tareas = row[c.tareasIdx] || 0;
      student.ejercicios = row[c.ejerciciosIdx] || 0;
      student.participaciones = row[c.participacionesIdx] || 0;
    }

    return student;
  });
}