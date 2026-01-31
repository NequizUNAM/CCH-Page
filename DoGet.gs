/**
 * SERVIDOR - SISTEMA CCH (CRUD HOJAS + FORMATO)
 */

function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheetName = e.parameter.sheetName;

    // ✅ Si alguien abre el link directo
    if (!action) {
      return ContentService
        .createTextOutput(JSON.stringify({
          status: "success",
          message: "WebApp activo ✅ Usa action=getData&sheetName=Reporte_MAGA1"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ✅ GET DATA
    if (action === "getData") {
      if (!sheetName) throw new Error("Falta parámetro sheetName");

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error("No se encontró la hoja: " + sheetName);

      const allData = sheet.getDataRange().getDisplayValues();

      const showRow = (allData[0] || []).map(x => String(x || "").trim());
      const headers = (allData[1] || []).map(x => String(x || "").trim());

      return ContentService
        .createTextOutput(JSON.stringify({
          status: "success",
          showRow,
          headers,
          data: allData
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ✅ CREATE NEW REPORT SHEET
    if (action === "createReportSheet") {
      const reportName = e.parameter.reportName;
      if (!reportName) throw new Error("Falta parámetro reportName");

      const result = createReportSheet(reportName);

      return ContentService
        .createTextOutput(JSON.stringify({
          status: "success",
          message: result.message,
          sheetName: result.sheetName
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Acción no soportada: " + action);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: err.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ✅ Crea plantilla Reporte_<nombre> con:
 * Fila 1: ShowRow
 * Fila 2: Headers
 * + Formato minimalista
 * + Formato condicional fila 1 ("Show" azul claro)
 * + Totales: fondo negro y texto blanco
 */
function createReportSheet(reportName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const safe = String(reportName || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]/g, "");

  if (!safe) throw new Error("Nombre inválido");

  const sheetName = `Reporte_${safe}`;

  let sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    return { sheetName, message: `La hoja ya existe: ${sheetName}` };
  }

  sheet = ss.insertSheet(sheetName);

  // ✅ HEADERS recomendados (Fila 2)
  const headers = [
    "Cuenta",
    "First Name",
    "Fecha 1",
    "Fecha 2",
    "Fecha 3",
    "Fecha 4",
    "Tareas",
    "Examen 1",
    "Examen 2",
    "Puntos Adicionales",
    "Participaciones",
    "Ejercicios Clase",
    "Total Participaciones",
    "Total Exámenes",
    "Total Tareas",
    "Total Ejercicios",
    "Calificación",
    "SIAE"
  ];

  // ✅ Fila 1: ShowRow (por defecto todo show para visualizar en dashboard)
  const showRow = headers.map(() => "Show");

  // Escribir filas
  sheet.getRange(1, 1, 1, headers.length).setValues([showRow]);
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]);

  // Congelar filas
  sheet.setFrozenRows(2);

  // ✅ Formato general (limpiar y aplicar base minimalista)
  applySheetBaseFormat_(sheet, headers.length);

  // ✅ Formato fila 2 (headers minimal)
  formatHeaderRow_(sheet, headers.length);

  // ✅ Formato columna de totales (negro/blanco)
  formatTotalsColumns_(sheet, headers);

  // ✅ Formato condicional fila 1: si "Show" → azul claro
  applyShowConditionalFormat_(sheet, headers.length);

  // Ajustar tamaño columnas
  sheet.autoResizeColumns(1, headers.length);

  return { sheetName, message: `Plantilla creada correctamente ✅ (${sheetName})` };
}

/* =========================================================
   ✅ FORMATOS
   ========================================================= */

function applySheetBaseFormat_(sheet, numCols) {
  // Minimalista recomendado: fondo blanco, texto oscuro
  const lastRow = Math.max(sheet.getMaxRows(), 50); // por si quieres que “se vea” bonito
  const range = sheet.getRange(1, 1, lastRow, numCols);

  range
    .setFontFamily("Arial")
    .setFontSize(10)
    .setFontColor("#111827")   // gris oscuro elegante
    .setBackground("#FFFFFF")  // blanco limpio
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  // Bordes suaves tipo Google Sheets
  range.setBorder(
    true, true, true, true, true, true,
    "#E5E7EB", // gris claro
    SpreadsheetApp.BorderStyle.SOLID
  );
}

function formatHeaderRow_(sheet, numCols) {
  const headerRange = sheet.getRange(2, 1, 1, numCols);
  headerRange
    .setBackground("#F1F3F4") // ✅ minimal gris claro (Google UI)
    .setFontColor("#111827")
    .setFontWeight("bold")
    .setWrap(true);
}

function formatTotalsColumns_(sheet, headers) {
  // Columnas que se ven como “totales” -> negro con texto blanco
  const totals = new Set([
    "Total Participaciones",
    "Total Exámenes",
    "Total Tareas",
    "Total Ejercicios",
    "Calificación",
    "SIAE",
    "Total Asistencias" // por si luego lo agregas
  ]);

  headers.forEach((h, idx) => {
    if (totals.has(h)) {
      const col = idx + 1;

      // Aplicar solo a fila 2 (header) y hacia abajo (ej: 200 filas)
      const range = sheet.getRange(2, col, 200, 1);
      range
        .setBackground("#111827") // negro elegante (no negro puro)
        .setFontColor("#FFFFFF")
        .setFontWeight("bold");
    }
  });
}

function applyShowConditionalFormat_(sheet, numCols) {
  const showRange = sheet.getRange(1, 1, 1, numCols);

  // Limpiar reglas previas
  sheet.setConditionalFormatRules([]);

  const rules = sheet.getConditionalFormatRules();

  // ✅ Regla: si celda = "Show" -> azul claro
  const ruleShow = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Show")
    .setBackground("#DBEAFE") // azul claro
    .setFontColor("#1D4ED8")  // azul fuerte
    .setBold(true)
    .setRanges([showRange])
    .build();

  rules.push(ruleShow);
  sheet.setConditionalFormatRules(rules);
}
