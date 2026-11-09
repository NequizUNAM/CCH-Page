// ============================================================
// PASE DE LISTA DESDE LA WEB (solo admin)
//
// Escribe el estado directamente en la hoja Reporte_* del grupo:
//   - Si no existe la columna de esa fecha, la inserta en orden.
//   - Si el alumno no está en el reporte (pero sí inscrito), agrega su fila.
// Y deja un registro en Attendance Log (id "web_…") para Asistencia y
// Retardo, así la sincronización y AppSheet coinciden con lo que marcaste:
//   Asistencia → hora de inicio del curso
//   Retardo    → inicio + tolerancia + 1 min
//   Falta / Justificada → sin registro ("Justificada" la sync nunca la toca)
// Si el alumno escaneó su QR ese día, su registro real se conserva.
// ============================================================

const ROLL_STATUSES = ["Asistencia", "Retardo", "Falta", "Justificada"];
const WEB_LOG_PREFIX = "web_";

function saveRollCall_(params) {
  const idCurso = cleanText_(params.idCurso);
  const group = requireGroup_(idCurso);
  if (!group.sheet) throw new Error("Este grupo no tiene hoja Reporte_ ligada (pestaña Grupos).");

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(group.sheet);
  if (!sheet) throw new Error(`No existe la hoja ${group.sheet}.`);
  const tz = getSpreadsheetTz_();

  const dateKey = cleanText_(params.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error("Fecha inválida.");
  if (dateKey > Utilities.formatDate(new Date(), tz, "yyyy-MM-dd")) throw new Error("No se puede pasar lista de una fecha futura.");

  const marks = [];
  (params.marks || []).forEach(m => {
    const cuenta = limpiarCuenta_(m.cuenta);
    const status = ROLL_STATUSES.find(s => normalizeKey_(s) === normalizeKey_(m.status)) || "";
    if (!cuenta) return;
    if (cleanText_(m.status) && !status) throw new Error(`Estado inválido: ${m.status}`);
    marks.push({ cuenta, status });
  });
  if (!marks.length) throw new Error("No hay marcas que guardar.");

  // 1. Columna de la fecha y filas faltantes
  let report = readReport_(sheet);
  const colIndex = ensureDateColumn_(sheet, report, dateKey, tz);
  report = readReport_(sheet);
  addMissingStudents_(sheet, report, marks);
  report = readReport_(sheet);

  // 2. Escribir la columna completa en una sola llamada
  const rowOf = {};
  report.students.forEach(s => { rowOf[s.account] = s.rowIndex; });
  const firstRow = 3;
  const count = sheet.getLastRow() - firstRow + 1;
  const range = sheet.getRange(firstRow, colIndex + 1, count, 1);
  const values = range.getValues();
  const backgrounds = range.getBackgrounds();
  const formulas = range.getFormulas();

  let written = 0;
  marks.forEach(m => {
    const r = rowOf[m.cuenta] - (firstRow - 1);
    if (r < 0 || r >= count || formulas[r][0]) return;
    values[r][0] = m.status;
    backgrounds[r][0] = m.status === "Justificada" ? "#E7F1FB" : (STATUS_FILL[m.status] || "#FFFFFF");
    written++;
  });
  range.setValues(values);
  range.setBackgrounds(backgrounds);

  // 3. Attendance Log
  const logs = syncRollCallLog_(idCurso, dateKey, marks, tz);

  return {
    written,
    message: `Lista del ${formatDateKey_(dateKey)} guardada: ${written} alumno(s).` +
      (logs.added || logs.removed ? ` Attendance Log: +${logs.added} / −${logs.removed}.` : "")
  };
}

/** Devuelve el índice (0-based) de la columna de la fecha; la inserta en orden si no existe. */
function ensureDateColumn_(sheet, report, dateKey, tz) {
  const dateColumns = detectDateColumns_(report.rawHeaders, report.accountIndex, tz);
  const found = dateColumns.find(c => c.dateKey === dateKey);
  if (found) return found.index;

  let anchor; // 0-based: la nueva columna va justo después de esta
  if (!dateColumns.length) {
    anchor = Math.max(report.accountIndex, findColumn_(report.headers, "First Name"));
  } else {
    const before = dateColumns.filter(c => c.dateKey < dateKey).sort((a, b) => b.index - a.index)[0];
    anchor = before ? before.index : Math.min.apply(null, dateColumns.map(c => c.index)) - 1;
  }

  sheet.insertColumnsAfter(anchor + 1, 1);
  const newCol = anchor + 2; // 1-based
  sheet.getRange(1, newCol).setValue("Visible").setBackground(VISIBILITY_FILL_COLORS.Visible);
  sheet.getRange(2, newCol)
    .setNumberFormat(SETTINGS.DEFAULT_DATE_FORMAT)
    .setValue(Utilities.parseDate(dateKey, tz, "yyyy-MM-dd"));
  return newCol - 1;
}

/** Agrega al final del reporte a los inscritos que aún no tienen fila. */
function addMissingStudents_(sheet, report, marks) {
  const present = new Set(report.students.map(s => s.account));
  const missing = marks.filter(m => m.status && !present.has(m.cuenta));
  if (!missing.length) return;

  const names = studentNames_();
  const width = sheet.getLastColumn();
  const nameIndex = findColumn_(report.headers, "First Name");
  const rows = missing.map(m => {
    const row = Array(width).fill("");
    row[report.accountIndex] = m.cuenta;
    if (nameIndex !== -1) row[nameIndex] = names[m.cuenta] || "";
    return row;
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, width).setValues(rows);
}

function syncRollCallLog_(idCurso, dateKey, marks, tz) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const log = spreadsheet.getSheetByName(SHEETS.ATTENDANCE);
  if (!log) return { added: 0, removed: 0 };

  const values = log.getDataRange().getValues();
  const headers = values[0].map(cleanText_);
  const c = requireColumns_(headers, ["Cuenta", "Course", "Date", "Time"], SHEETS.ATTENDANCE);
  const iId = findColumn_(headers, "id");
  const iFk = findColumn_(headers, "fk_id_student");
  const touched = new Set(marks.map(m => m.cuenta));

  // Registros del día para ese curso
  const realScan = new Set();   // cuentas con registro real (QR/AppSheet)
  const webRows = [];           // filas web a borrar (1-based)
  values.forEach((row, i) => {
    if (i === 0 || cleanText_(row[c.Course]) !== idCurso) return;
    if (normalizeDateKey_(row[c.Date], tz) !== dateKey) return;
    const cuenta = limpiarCuenta_(row[c.Cuenta]);
    const isWeb = iId !== -1 && String(row[iId]).startsWith(WEB_LOG_PREFIX);
    if (isWeb && touched.has(cuenta)) webRows.push(i + 1);
    else if (!isWeb) realScan.add(cuenta);
  });

  if (webRows.length) {
    if (log.getMaxRows() <= log.getLastRow()) log.insertRowsAfter(log.getLastRow(), 1);
    groupContiguous_(webRows).reverse().forEach(g => log.deleteRows(g[0], g.length));
  }

  const course = courseMap_()[idCurso] || {};
  const start = timeToMinutes_(course.schedule) || 0;
  const studentIds = {};
  const studentsSheet = spreadsheet.getSheetByName(SHEETS.STUDENTS);
  if (studentsSheet && iFk !== -1) {
    const data = studentsSheet.getDataRange().getValues();
    const h = data[0].map(cleanText_);
    const iSid = findColumn_(h, "ID"), iCta = findColumn_(h, "Cuenta"), iCourse = findColumn_(h, "Course");
    data.slice(1).forEach(r => {
      if (cleanText_(r[iCourse]) === idCurso) studentIds[limpiarCuenta_(r[iCta])] = r[iSid];
    });
  }

  const width = headers.length;
  const date = Utilities.parseDate(dateKey, tz, "yyyy-MM-dd");
  const newRows = [];
  marks.forEach(m => {
    if ((m.status !== "Asistencia" && m.status !== "Retardo") || realScan.has(m.cuenta)) return;
    const minutes = m.status === "Asistencia" ? start : start + SETTINGS.ATTENDANCE_TOLERANCE_MINUTES + 1;
    const row = Array(width).fill("");
    if (iId !== -1) row[iId] = WEB_LOG_PREFIX + shortId_();
    if (iFk !== -1) row[iFk] = studentIds[m.cuenta] || "";
    row[c.Cuenta] = m.cuenta;
    row[c.Course] = idCurso;
    row[c.Date] = date;
    row[c.Time] = minutesToText_(minutes) + ":00";
    newRows.push(row);
  });

  if (newRows.length) log.getRange(log.getLastRow() + 1, 1, newRows.length, width).setValues(newRows);
  return { added: newRows.length, removed: webRows.length };
}
