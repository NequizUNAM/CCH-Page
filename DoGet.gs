/**
 * SERVIDOR - SISTEMA CCH (CON FORMATO RESTRINGIDO A HEADERS)
 * Autor: @Pedro Nequiz
 */

function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheetName = e.parameter.sheetName; [cite: 1, 2]

    if (!action) {
      return ContentService
        .createTextOutput(JSON.stringify({
          status: "success",
          message: "WebApp activo ✅"
        }))
        .setMimeType(ContentService.MimeType.JSON); [cite: 3]
    }

    if (action === "getData") {
      if (!sheetName) throw new Error("Falta parámetro sheetName"); [cite: 4]
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error("No se encontró la hoja: " + sheetName); [cite: 5]

      const allData = sheet.getDataRange().getDisplayValues(); [cite: 5]
      const showRow = (allData[0] || []).map(x => String(x || "").trim());
      const headers = (allData[1] || []).map(x => String(x || "").trim()); [cite: 6]

      return ContentService
        .createTextOutput(JSON.stringify({
          status: "success",
          showRow,
          headers,
          data: allData
        }))
        .setMimeType(ContentService.MimeType.JSON); [cite: 7, 8]
    }

    if (action === "createReportSheet") {
      const reportName = e.parameter.reportName;
      if (!reportName) throw new Error("Falta parámetro reportName"); [cite: 9]

      const result = createReportSheet(reportName);
      return ContentService
        .createTextOutput(JSON.stringify({
          status: "success",
          message: result.message,
          sheetName: result.sheetName
        }))
        .setMimeType(ContentService.MimeType.JSON); [cite: 10, 11]
    }

    if (action === "syncAttendance") {
      if (!sheetName) throw new Error("Falta parámetro sheetName");
      const result = syncAttendanceData(sheetName);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Acción no soportada: " + action); [cite: 12]

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: err.message
      }))
      .setMimeType(ContentService.MimeType.JSON); [cite: 12, 13]
  }
}

/**
 * LÓGICA DE SINCRONIZACIÓN
 */
function syncAttendanceData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reportSheet = ss.getSheetByName(sheetName);
  const logSheet = ss.getSheetByName("Attendance Log"); [cite: 35]

  if (!reportSheet || !logSheet) throw new Error("No se encontró la hoja de reporte o el log.");

  const logData = logSheet.getDataRange().getDisplayValues(); [cite: 35]
  const logHeaders = logData[0].map(h => h.trim());
  const logCuentaIdx = logHeaders.indexOf("Cuenta");
  const logDateIdx = logHeaders.indexOf("Date");

  const attendanceMap = {};
  for (let i = 1; i < logData.length; i++) {
    const cuenta = String(logData[i][logCuentaIdx]).trim();
    const dateStr = String(logData[i][logDateIdx]).trim();
    if (cuenta && dateStr) {
      if (!attendanceMap[cuenta]) attendanceMap[cuenta] = {};
      attendanceMap[cuenta][dateStr] = true;
    }
  }

  const reportData = reportSheet.getDataRange().getDisplayValues(); [cite: 36]
  const headers = reportData[1];
  const cuentaIdxRep = headers.indexOf("Cuenta");

  const dateCols = [];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  headers.forEach((h, j) => {
    if (dateRegex.test(String(h).trim())) dateCols.push({ index: j, dateStr: String(h).trim() });
  });

  for (let i = 2; i < reportData.length; i++) {
    const cuenta = String(reportData[i][cuentaIdxRep]).trim();
    if (!cuenta) continue;
    dateCols.forEach(col => {
      reportData[i][col.index] = (attendanceMap[cuenta] && attendanceMap[cuenta][col.dateStr]) ? "Asistencia" : "Falta";
    });
  }

  reportSheet.getRange(1, 1, reportData.length, reportData[0].length).setValues(reportData);
  return { status: "success", message: "Asistencias sincronizadas correctamente." };
}

/**
 * CREACIÓN DE PLANTILLA (SOLO FILAS 1 Y 2)
 */
function createReportSheet(reportName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const safe = String(reportName || "").trim().replace(/\s+/g, "_").replace(/[^\w\-]/g, ""); [cite: 14]
  const sheetName = `Reporte_${safe}`;

  let sheet = ss.getSheetByName(sheetName);
  if (sheet) return { sheetName, message: `La hoja ya existe: ${sheetName}` }; [cite: 16]

  sheet = ss.insertSheet(sheetName);

  const headers = ["Cuenta", "First Name", "2026-03-24", "2026-03-26", "Tareas", "Examen 1", "Examen 2", "Puntos Adicionales", "Participaciones", "Ejercicios Clase", "Total Participaciones", "Total Exámenes", "Total Tareas", "Total Ejercicios", "Calificación", "SIAE"]; [cite: 18]
  const showRow = headers.map(() => "Show"); [cite: 19]

  sheet.getRange(1, 1, 1, headers.length).setValues([showRow]); [cite: 20]
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]); [cite: 20]
  sheet.setFrozenRows(2); [cite: 20]

  // Aplicar formato base solo a las filas 1 y 2
  applyHeaderBaseFormat_(sheet, headers.length);
  formatTotalsHeaderOnly_(sheet, headers);
  applyShowConditionalFormat_(sheet, headers.length);
  sheet.autoResizeColumns(1, headers.length); [cite: 23]

  return { sheetName, message: `Plantilla creada correctamente ✅` }; [cite: 24]
}

function applyHeaderBaseFormat_(sheet, numCols) {
  // Solo filas 1 y 2
  const range = sheet.getRange(1, 1, 2, numCols); [cite: 25]
  range
    .setFontFamily("Arial")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#E5E7EB", SpreadsheetApp.BorderStyle.SOLID); [cite: 26, 27]

  // Fondo gris claro solo para la fila de headers (fila 2)
  sheet.getRange(2, 1, 1, numCols).setBackground("#F1F3F4").setFontWeight("bold"); [cite: 29]
}

function formatTotalsHeaderOnly_(sheet, headers) {
  const totals = new Set(["Total Participaciones", "Total Exámenes", "Total Tareas", "Total Ejercicios", "Calificación", "SIAE"]); [cite: 31]
  
  headers.forEach((h, idx) => {
    if (totals.has(h)) {
      // SOLO SE APLICA A LA CELDA DEL HEADER (FILA 2), NO A LAS FILAS DE ABAJO
      sheet.getRange(2, idx + 1)
        .setBackground("#111827")
        .setFontColor("#FFFFFF")
        .setFontWeight("bold"); [cite: 32]
    }
  });
}

function applyShowConditionalFormat_(sheet, numCols) {
  const showRange = sheet.getRange(1, 1, 1, numCols); [cite: 33]
  sheet.setConditionalFormatRules([]);
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Show")
    .setBackground("#DBEAFE")
    .setFontColor("#1D4ED8")
    .setBold(true)
    .setRanges([showRange])
    .build(); [cite: 34]
  sheet.setConditionalFormatRules([rule]); [cite: 34]
}