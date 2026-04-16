/**
 * SERVIDOR - SISTEMA CCH (FORMATO REGIONAL MÉXICO DD/MM/AAAA)
 * Autor: @Pedro Nequiz
 */

function doGet(e) {
  try {
    const action = e.parameter ? e.parameter.action : null;
    const sheetName = e.parameter ? e.parameter.sheetName : null;

    if (!action) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "WebApp activo ✅" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getData") {
      if (!sheetName) throw new Error("Falta parámetro sheetName");
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error("No se encontró la hoja: " + sheetName);

      const allData = sheet.getDataRange().getDisplayValues();
      const showRow = (allData[0] || []).map(x => String(x || "").trim());
      const headers = (allData[1] || []).map(x => String(x || "").trim());

      return ContentService.createTextOutput(JSON.stringify({ status: "success", showRow: showRow, headers: headers, data: allData })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "createReportSheet") {
      const reportName = e.parameter.reportName;
      if (!reportName) throw new Error("Falta parámetro reportName");

      const result = createReportSheet(reportName);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: result.message, sheetName: result.sheetName })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "syncAttendance") {
      if (!sheetName) throw new Error("Falta parámetro sheetName");
      const result = syncAllData(sheetName);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Acción no soportada: " + action);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function syncAllData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reportSheet = ss.getSheetByName(sheetName);
  if (!reportSheet) throw new Error("No se encontró la hoja de reporte.");

  const reportData = reportSheet.getDataRange().getDisplayValues();
  const headers = reportData[1];
  const cuentaIdxRep = headers.indexOf("Cuenta");
  if (cuentaIdxRep === -1) throw new Error("El reporte no tiene columna 'Cuenta'.");

  let updAtt = 0;
  let updCal = 0;

  // 1. ASISTENCIAS (Formato DD/MM/AAAA)
  const logSheet = ss.getSheetByName("Attendance Log");
  if (logSheet) {
    const logData = logSheet.getDataRange().getDisplayValues();
    const logHeaders = logData[0].map(h => h.trim());
    const logCuentaIdx = logHeaders.indexOf("Cuenta");
    const logDateIdx = logHeaders.indexOf("Date");

    const attendanceMap = {};
    for (let i = 1; i < logData.length; i++) {
      const cuenta = String(logData[i][logCuentaIdx]).trim();
      const dateStr = String(logData[i][logDateIdx]).trim(); // DD/MM/AAAA
      if (cuenta && dateStr) {
        if (!attendanceMap[cuenta]) attendanceMap[cuenta] = {};
        attendanceMap[cuenta][dateStr] = true;
      }
    }

    // Regex ajustado para DD/MM/AAAA
    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    const dateCols = [];
    headers.forEach((h, j) => {
      if (dateRegex.test(String(h).trim())) dateCols.push({ index: j, dateStr: String(h).trim() });
    });

    for (let i = 2; i < reportData.length; i++) {
      const cuenta = String(reportData[i][cuentaIdxRep]).trim();
      if (!cuenta) continue;
      dateCols.forEach(col => {
        const currentVal = String(reportData[i][col.index]).trim();
        const newVal = (attendanceMap[cuenta] && attendanceMap[cuenta][col.dateStr]) ? "Asistencia" : "Falta";
        if (currentVal === "" || currentVal === "Falta") {
          if (currentVal !== newVal) {
            reportData[i][col.index] = newVal;
            updAtt++;
          }
        }
      });
    }
  }

  // 2. CALIFICACIONES (Búsqueda Estricta)
  let califSheet = ss.getSheetByName("Calificaciones");
  if (califSheet) {
    const califData = califSheet.getDataRange().getDisplayValues();
    const califHeaders = califData[0].map(h => h.trim());
    const cCuentaIdx = califHeaders.indexOf("Cuenta");
    const colsToSync = ["Parcial_1", "Parcial_2", "Parcial_3", "Sellos", "Proyecto_Final", "Puntos Adicionales"];
    
    const califMap = {};
    if (cCuentaIdx !== -1) {
      for (let i = 1; i < califData.length; i++) {
        const cuenta = String(califData[i][cCuentaIdx]).trim();
        if (cuenta) {
          califMap[cuenta] = {};
          colsToSync.forEach(col => {
            const idx = califHeaders.indexOf(col);
            if (idx !== -1) califMap[cuenta][col] = califData[i][idx];
          });
        }
      }
    }

    colsToSync.forEach(col => {
      const rIdx = headers.indexOf(col);
      if (rIdx !== -1) {
        for (let i = 2; i < reportData.length; i++) {
          const cuenta = String(reportData[i][cuentaIdxRep]).trim();
          if (cuenta && califMap[cuenta] && califMap[cuenta][col] !== undefined && califMap[cuenta][col] !== "") {
            if (String(reportData[i][rIdx]).trim() === "") {
              reportData[i][rIdx] = califMap[cuenta][col];
              updCal++;
            }
          }
        }
      }
    });
  }

  reportSheet.getRange(1, 1, reportData.length, reportData[0].length).setValues(reportData);
  return { status: "success", message: `Sincronización terminada. Actualizados: ${updAtt} asistencias y ${updCal} calificaciones.` };
}

function createReportSheet(reportName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const safe = String(reportName || "").trim().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
  const sheetName = `Reporte_${safe}`;
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) return { sheetName, message: `La hoja ya existe: ${sheetName}` };
  sheet = ss.insertSheet(sheetName);

  // Ejemplo con formato DD/MM/AAAA
  const headers = ["Cuenta", "First Name", "24/03/2026", "26/03/2026", "Parcial_1", "Parcial_2", "Parcial_3", "Sellos", "Proyecto_Final", "Puntos Adicionales", "Calificación", "SIAE"];
  const showRow = headers.map(() => "Show");
  sheet.getRange(1, 1, 1, headers.length).setValues([showRow]);
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(2);
  applyHeaderBaseFormat_(sheet, headers.length);
  formatTotalsHeaderOnly_(sheet, headers);
  applySheetConditionalFormats_(sheet, headers.length);
  sheet.autoResizeColumns(1, headers.length);
  return { sheetName, message: `Plantilla creada correctamente ✅` };
}

function applyHeaderBaseFormat_(sheet, numCols) {
  const range = sheet.getRange(1, 1, 2, numCols);
  range.setFontFamily("Arial").setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle").setBorder(true, true, true, true, true, true, "#E5E7EB", SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(2, 1, 1, numCols).setBackground("#F1F3F4").setFontWeight("bold");
}

function formatTotalsHeaderOnly_(sheet, headers) {
  const totals = new Set(["Calificación", "SIAE"]);
  headers.forEach((h, idx) => {
    if (totals.has(h)) {
      sheet.getRange(2, idx + 1).setBackground("#111827").setFontColor("#FFFFFF").setFontWeight("bold");
    }
  });
}

function applySheetConditionalFormats_(sheet, numCols) {
  const showRange = sheet.getRange(1, 1, 1, numCols);
  const dataRange = sheet.getRange(3, 1, 500, numCols);
  sheet.setConditionalFormatRules([]);
  const rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Show").setBackground("#DBEAFE").setFontColor("#1D4ED8").setBold(true).setRanges([showRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Asistencia").setBackground("#D1E7DD").setFontColor("#0F5132").setRanges([dataRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Falta").setBackground("#F8D7DA").setFontColor("#842029").setRanges([dataRange]).build());
  sheet.setConditionalFormatRules(rules);
}