// ============================================================
// MENÚ DE GOOGLE SHEETS
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("⚙️ Sistema CCH")
    .addItem("🔄 Sincronizar asistencias (hoja actual)", "menuSyncAttendance")
    .addItem("🩺 Diagnosticar sincronización", "menuDiagnoseAttendance")
    .addItem("📝 Crear nueva hoja de reporte", "menuCreateReportSheet")
    .addItem("🩹 Reparar hojas de reporte", "menuRepairReportSheets")
    .addItem("🔍 Buscar alumnos duplicados", "checkStudentDuplicates")
    .addSeparator()
    .addItem("🌐 Preparar hojas de la web (W_*)", "menuSetupWeb")
    .addToUi();
}

// ============================================================
// MENÚ - SINCRONIZAR (hoja activa, sin preguntar)
// ============================================================

function menuSyncAttendance() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = spreadsheet.getActiveSheet().getName();

  if (!isReportSheetName_(sheetName)) {
    ui.alert(
      "🔄 Sincronizar asistencias",
      `La hoja activa "${sheetName}" no es un reporte.\n\n` +
      `Abre una hoja cuyo nombre empiece con "${REPORT_PREFIX}" y vuelve a intentarlo.`,
      ui.ButtonSet.OK
    );
    return;
  }

  spreadsheet.toast(`Sincronizando "${sheetName}"…`, "Sistema CCH", 10);

  try {
    const result = syncAllData(sheetName);
    ui.alert("✅ Sincronización", result.message, ui.ButtonSet.OK);
  } catch (error) {
    const title = error.message === NO_DATE_COLUMNS_MESSAGE
      ? "📅 Agrega una columna con fecha"
      : "❌ Error";
    ui.alert(title, error.message, ui.ButtonSet.OK);
  }
}

// ============================================================
// MENÚ - REPARAR HOJAS DE REPORTE
// Corrige solo la fila 1 (visibilidad) de las hojas "Reporte_".
// ============================================================

function menuRepairReportSheets() {
  const ui = SpreadsheetApp.getUi();
  const result = repairReportSheetHeaders_();

  if (result.repairedSheets.length === 0) {
    ui.alert("🩹 Reparar hojas de reporte", "Todas las hojas de reporte ya tienen encabezados válidos ✅", ui.ButtonSet.OK);
    return;
  }

  ui.alert(
    "🩹 Reparar hojas de reporte",
    `Se corrigió la fila 1 en:\n\n${result.repairedSheets.join("\n")}`,
    ui.ButtonSet.OK
  );
}

function repairReportSheetHeaders_() {
  const repairedSheets = [];

  SpreadsheetApp.getActiveSpreadsheet().getSheets()
    .filter(sheet => isReportSheetName_(sheet.getName()))
    .forEach(sheet => {
      const lastColumn = sheet.getLastColumn();
      if (lastColumn === 0) return;

      const range = sheet.getRange(1, 1, 1, lastColumn);
      const currentRow = range.getValues()[0];
      const currentBackgrounds = range.getBackgrounds()[0];

      const normalizedRow = currentRow.map(normalizeVisibilityValue_);
      const normalizedBackgrounds = normalizedRow.map(value => VISIBILITY_FILL_COLORS[value]);

      const textChanged = currentRow.some((value, i) => cleanText_(value) !== normalizedRow[i]);
      const colorChanged = currentBackgrounds.some(
        (color, i) => String(color).toLowerCase() !== normalizedBackgrounds[i].toLowerCase()
      );

      if (textChanged || colorChanged) {
        range.setValues([normalizedRow]);
        range.setBackgrounds([normalizedBackgrounds]);
        repairedSheets.push(sheet.getName());
      }
    });

  return { repairedSheets };
}

// ============================================================
// MENÚ - DIAGNÓSTICO (no modifica nada)
// ============================================================

function menuDiagnoseAttendance() {
  const ui = SpreadsheetApp.getUi();
  const activeSheetName = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getName();

  const response = ui.prompt(
    "🩺 Diagnosticar sincronización",
    `Escribe el nombre del reporte o deja vacío para usar "${activeSheetName}".`,
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const sheetName = response.getResponseText().trim() || activeSheetName;

  try {
    const info = diagnoseAttendance_(sheetName);
    const lines = [
      `Curso detectado: ${info.matchedCourseId || "(ninguno)"}${info.matchedCourseName ? " — " + info.matchedCourseName : ""}`,
      `Método de coincidencia: ${info.matchMethod}`,
      info.candidates.length
        ? `Candidatos por grupo: ${info.candidates.map(c => c.id).join(", ")}`
        : "Sin candidatos por número de grupo.",
      info.votes.length
        ? `Votos por matrícula real (Students): ${info.votes.map(v => `${v.courseId}=${v.count}`).join(", ")}`
        : "Sin votos de matrícula.",
      info.matchedCourseId
        ? (info.scheduleMinutes !== null
          ? `Horario del curso: ${info.scheduleText} (Retardo después de ${minutesToText_(info.scheduleMinutes + SETTINGS.ATTENDANCE_TOLERANCE_MINUTES)}) ✅`
          : `⚠️ El horario del curso ("${info.scheduleText}") no se pudo interpretar. Los alumnos de este curso no se sincronizarán.`)
        : "⚠️ Sin curso detectado: solo se sincronizarán alumnos inscritos en un único curso.",
      info.headerRowUsesNonStandardVisibility
        ? `⚠️ La fila 1 (visibilidad) tiene valores distintos de "Visible"/"Oculto" (ej.: "${info.headerRowSampleValue}"). Corrígelo con "🩹 Reparar hojas de reporte".`
        : "Fila 1 (visibilidad) usa el formato estándar ✅.",
      `Columnas de fecha detectadas en el reporte: ${info.dateColumnsFound}`,
      info.pendingDatesToInsert.length
        ? `📅 Fechas que se agregarían al sincronizar: ${formatDateList_(info.pendingDatesToInsert)}`
        : "📅 No hay fechas pendientes por agregar (ya llega hasta hoy).",
      info.columnsWithoutLogData.length
        ? `⚠️ Columnas SIN ningún registro en Attendance Log (quedarán como "N/D"): ${formatDateList_(info.columnsWithoutLogData)}`
        : "Todas las columnas de fecha tienen al menos un registro en Attendance Log.",
      `Alumnos en el reporte: ${info.studentsInReport}`,
      `Registros en Attendance Log para el curso detectado: ${info.logRecordsForCourse}`,
      `Alumnos del reporte SIN ningún registro en Attendance Log para ese curso: ${info.accountsWithNoLogRecord.length}`,
      info.invalidAccountsInStudents.length
        ? `⚠️ Filas en 'Students' con número de cuenta inválido (se ignoraron): ${info.invalidAccountsInStudents.map(x => x.row).slice(0, 15).join(", ")}${info.invalidAccountsInStudents.length > 15 ? "…" : ""}`
        : "Todas las cuentas en 'Students' tienen formato válido ✅."
    ];

    if (info.accountsWithNoLogRecord.length > 0) {
      lines.push(
        `Cuentas sin registro: ${info.accountsWithNoLogRecord.slice(0, 15).join(", ")}` +
        `${info.accountsWithNoLogRecord.length > 15 ? "…" : ""}`
      );
    }

    ui.alert("Diagnóstico", lines.join("\n\n"), ui.ButtonSet.OK);
  } catch (error) {
    const title = error.message === NO_DATE_COLUMNS_MESSAGE
      ? "📅 Agrega una columna con fecha"
      : "❌ Error";
    ui.alert(title, error.message, ui.ButtonSet.OK);
  }
}

// ============================================================
// MENÚ - CREAR REPORTE
// ============================================================

function menuCreateReportSheet() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "📝 Crear hoja de reporte",
    "Introduce el nombre del reporte. Ejemplo: MAGA_1",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  try {
    const result = createReportSheet(response.getResponseText());
    ui.alert("✅ Éxito", `${result.message}\nHoja: ${result.sheetName}`, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert("❌ Error", error.message, ui.ButtonSet.OK);
  }
}

function createReportSheet(reportName) {
  const safeName = String(reportName || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");

  if (!safeName) {
    throw new Error("El nombre del reporte no es válido.");
  }

  const sheetName = isReportSheetName_(safeName) ? safeName : `${REPORT_PREFIX}${safeName}`;

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (sheet) {
    return { sheetName, message: `La hoja ya existe: ${sheetName}` };
  }

  sheet = spreadsheet.insertSheet(sheetName);

  // Parcial_1..SIAE son columnas manuales; la sincronización no las toca.
  const headers = [
    "Cuenta", "First Name", "24/03/2026", "26/03/2026",
    "Parcial_1", "Parcial_2", "Parcial_3", "Sellos",
    "Proyecto_Final", "Puntos Adicionales", "Calificación", "SIAE"
  ];

  const visibility = headers.map(() => "Visible");

  sheet.getRange(1, 1, 1, headers.length).setValues([visibility]);
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(2);

  applyHeaderFormat_(sheet, headers);
  applyConditionalFormats_(sheet, headers.length);
  sheet.autoResizeColumns(1, headers.length);

  return { sheetName, message: "Plantilla creada correctamente ✅" };
}

// ============================================================
// FORMATO
// ============================================================

function applyHeaderFormat_(sheet, headers) {
  const totalColumns = headers.length;

  sheet.getRange(1, 1, 2, totalColumns)
    .setFontFamily("Arial")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#E5E7EB", SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange(1, 1, 1, totalColumns)
    .setBackground("#DBEAFE")
    .setFontColor("#1D4ED8")
    .setFontWeight("bold");

  sheet.getRange(2, 1, 1, totalColumns)
    .setBackground("#F1F3F4")
    .setFontWeight("bold");

  const totalHeaders = new Set(["Calificación", "SIAE"]);

  headers.forEach((header, index) => {
    if (totalHeaders.has(header)) {
      sheet.getRange(2, index + 1)
        .setBackground("#111827")
        .setFontColor("#FFFFFF")
        .setFontWeight("bold");
    }
  });
}

function applyConditionalFormats_(sheet, numberOfColumns) {
  const visibilityRange = sheet.getRange(1, 1, 1, numberOfColumns);
  const dataRange = sheet.getRange(3, 1, Math.max(sheet.getMaxRows() - 2, 1), numberOfColumns);

  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Visible")
      .setBackground("#DBEAFE").setFontColor("#1D4ED8").setBold(true)
      .setRanges([visibilityRange]).build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(STATUS.ASISTENCIA)
      .setBackground(STATUS_FILL[STATUS.ASISTENCIA]).setFontColor("#0F5132")
      .setRanges([dataRange]).build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(STATUS.RETARDO)
      .setBackground(STATUS_FILL[STATUS.RETARDO]).setFontColor("#842029").setBold(true)
      .setRanges([dataRange]).build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(STATUS.FALTA)
      .setBackground(STATUS_FILL[STATUS.FALTA]).setFontColor("#842029")
      .setRanges([dataRange]).build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(STATUS.ND)
      .setBackground(STATUS_FILL[STATUS.ND]).setFontColor("#374151").setItalic(true)
      .setRanges([dataRange]).build()
  ];

  sheet.setConditionalFormatRules(rules);
}

// ============================================================
// SINCRONIZACIÓN — POR HOJA
//   1. Validar que exista al menos una columna de fecha
//   2. Agregar fechas faltantes hasta hoy (después de la última fecha)
//   3. Registrar Asistencia / Retardo / Falta / N/D
//   4. Eliminar columnas de fecha con SOLO "Falta" (al final)
// ============================================================

function syncAllData(sheetName) {
  validateReportSheetName_(sheetName);

  return withScriptLock_(() => {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const tz = spreadsheet.getSpreadsheetTimeZone();
    const reportSheet = spreadsheet.getSheetByName(sheetName);

    if (!reportSheet) {
      throw new Error(`No se encontró la hoja de reporte "${sheetName}".`);
    }

    // ---- 1. Validar columnas de fecha ----
    let report = readReport_(reportSheet);
    const initialDateColumns = detectDateColumns_(report.rawHeaders, report.accountIndex, tz);

    if (initialDateColumns.length === 0) {
      throw new Error(NO_DATE_COLUMNS_MESSAGE);
    }

    // ---- 2. Agregar fechas hasta hoy ----
    const inserted = ensureDatesUntilToday_(reportSheet, report, initialDateColumns, tz);
    if (inserted.dates.length > 0) {
      report = readReport_(reportSheet); // la hoja cambió: releer
    }

    // ---- 3. Registrar asistencias ----
    const syncResult = report.students.length > 0
      ? syncAttendance_(spreadsheet, reportSheet, report)
      : null;

    // ---- 4. Eliminar columnas pasadas con solo Falta / N/D (siempre al final) ----
    const deletedDates = SETTINGS.DELETE_EMPTY_DATE_COLUMNS
      ? deleteEmptyDateColumns_(reportSheet, tz)
      : [];

    return {
      status: "success",
      message: buildSyncMessage_(sheetName, syncResult, inserted, deletedDates),
      updates: syncResult ? syncResult.updates : 0,
      counts: syncResult ? syncResult.counts : null,
      addedDates: inserted.dates,
      deletedDates
    };
  });
}

/**
 * Lee la hoja de reporte UNA vez y ubica la columna Cuenta y los alumnos.
 */
function readReport_(reportSheet) {
  const data = reportSheet.getDataRange().getValues();

  if (data.length < 2) {
    throw new Error("El reporte no tiene encabezados en la fila 2.");
  }

  const rawHeaders = data[1];
  const headers = rawHeaders.map(cleanText_);
  const accountIndex = findColumn_(headers, "Cuenta");

  if (accountIndex === -1) {
    throw new Error("El reporte no tiene la columna 'Cuenta' en la fila 2.");
  }

  const students = [];
  for (let rowIndex = 2; rowIndex < data.length; rowIndex++) {
    const account = limpiarCuenta_(data[rowIndex][accountIndex]);
    if (account) students.push({ rowIndex, account });
  }

  return { data, rawHeaders, headers, accountIndex, students };
}

/**
 * Columnas cuyo encabezado (fila 2, valor crudo) es una fecha.
 * Devuelve [{ index (0-based), dateKey "yyyy-MM-dd" }].
 */
function detectDateColumns_(rawHeaders, accountIndex, tz) {
  const columns = [];
  rawHeaders.forEach((header, index) => {
    if (index === accountIndex) return;
    const dateKey = normalizeDateKey_(header, tz);
    if (dateKey) columns.push({ index, dateKey });
  });
  return columns;
}

// ============================================================
// INSERCIÓN DE FECHAS HASTA HOY
//
// - Punto de partida: la fecha MÁS RECIENTE de la hoja (o la última
//   fecha que ya se agregó antes en esta hoja, si es posterior; así
//   una fecha eliminada por tener solo "Falta" no vuelve a aparecer).
// - Se agregan los días siguientes hasta HOY (zona horaria de la hoja),
//   filtrados por SETTINGS.INSERT_WEEKDAYS.
// - Las columnas nuevas se insertan justo DESPUÉS de la última
//   columna de fecha (por posición), por lo que Parcial_1,
//   Calificación, SIAE, etc. se recorren a la derecha sin tocarse.
// - Fechas futuras ya existentes no se alteran.
// ============================================================

function ensureDatesUntilToday_(sheet, report, dateColumns, tz) {
  const result = { dates: [], truncated: false };
  if (!SETTINGS.AUTO_INSERT_DATES) return result;

  const properties = PropertiesService.getScriptProperties();
  const propertyKey = SETTINGS.LAST_DATE_PROP_PREFIX + sheet.getSheetId();
  const storedKey = properties.getProperty(propertyKey) || "";
  const todayKey = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");

  let lastColumn = dateColumns[0];
  let maxDateKey = "";
  dateColumns.forEach(column => {
    if (column.index > lastColumn.index) lastColumn = column;
    if (column.dateKey > maxDateKey) maxDateKey = column.dateKey;
  });

  const startAfter = storedKey > maxDateKey ? storedKey : maxDateKey;
  const existing = new Set(dateColumns.map(c => c.dateKey));

  const pending = listDateKeysAfter_(
    startAfter, todayKey, SETTINGS.INSERT_WEEKDAYS, SETTINGS.MAX_NEW_DATE_COLUMNS
  );
  const newKeys = pending.keys.filter(key => !existing.has(key));

  if (newKeys.length > 0) {
    insertDateColumns_(sheet, report, lastColumn.index, newKeys, tz);
  }

  // Recordar hasta dónde se llegó (hoy, o la última fecha agregada si
  // se alcanzó el límite y faltan más)
  const reachedKey = pending.truncated ? pending.keys[pending.keys.length - 1] : todayKey;
  if (reachedKey && reachedKey > storedKey) {
    properties.setProperty(propertyKey, reachedKey);
  }

  result.dates = newKeys;
  result.truncated = pending.truncated;
  return result;
}

/**
 * Inserta `dateKeys.length` columnas después de la columna `lastDateIndex`
 * (0-based) y escribe:
 *   - Fila 1: el mismo valor de visibilidad que la última columna de
 *     fecha (o "Visible" si estaba vacío).
 *   - Fila 2: la fecha, con el mismo formato que la última fecha.
 * Las filas de alumnos quedan vacías; la sincronización las llena.
 */
function insertDateColumns_(sheet, report, lastDateIndex, dateKeys, tz) {
  const anchorColumn = lastDateIndex + 1; // 1-based
  const firstNewColumn = anchorColumn + 1;
  const count = dateKeys.length;

  sheet.insertColumnsAfter(anchorColumn, count);

  // Formato del encabezado igual al de la última fecha (solo fila 2,
  // para no arrastrar combinaciones de celdas ni colores de alumnos)
  const sourceHeader = sheet.getRange(2, anchorColumn);
  for (let i = 0; i < count; i++) {
    sourceHeader.copyTo(
      sheet.getRange(2, firstNewColumn + i),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
      false
    );
  }

  const sourceFormat = String(sourceHeader.getNumberFormat() || "");
  const dateFormat = /[dy]/i.test(sourceFormat) ? sourceFormat : SETTINGS.DEFAULT_DATE_FORMAT;

  // Fila 1: visibilidad
  const anchorVisibility = cleanText_((report.data[0] || [])[lastDateIndex]);
  const visibility = anchorVisibility ? normalizeVisibilityValue_(anchorVisibility) : "Visible";

  sheet.getRange(1, firstNewColumn, 1, count)
    .setValues([dateKeys.map(() => visibility)])
    .setBackground(VISIBILITY_FILL_COLORS[visibility]);

  // Fila 2: fechas reales (no texto), a medianoche en la zona de la hoja
  sheet.getRange(2, firstNewColumn, 1, count)
    .setNumberFormat(dateFormat)
    .setValues([dateKeys.map(key => Utilities.parseDate(key, tz, "yyyy-MM-dd"))]);

  sheet.setColumnWidths(firstNewColumn, count, sheet.getColumnWidth(anchorColumn));
}

/**
 * Días posteriores a `afterKey` y hasta `untilKey` (inclusive),
 * solo de los días de la semana permitidos, con un máximo de `limit`.
 */
function listDateKeysAfter_(afterKey, untilKey, weekdays, limit) {
  const keys = [];
  let truncated = false;
  if (!afterKey || !untilKey || afterKey >= untilKey) return { keys, truncated };

  const DAY_MS = 24 * 60 * 60 * 1000;
  const allowed = new Set(weekdays);
  const toUtc = key => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };

  const end = toUtc(untilKey);
  for (let time = toUtc(afterKey) + DAY_MS; time <= end; time += DAY_MS) {
    const day = new Date(time);
    if (!allowed.has(day.getUTCDay())) continue;
    if (keys.length >= limit) {
      truncated = true;
      break;
    }
    keys.push(Utilities.formatDate(day, "UTC", "yyyy-MM-dd"));
  }

  return { keys, truncated };
}

// ============================================================
// ELIMINACIÓN DE COLUMNAS SIN ASISTENCIAS (se ejecuta al final)
//
// - Vuelve a leer la hoja justo antes de borrar (verificación).
// - Solo considera columnas cuyo encabezado es fecha.
// - Solo fechas YA PASADAS (anteriores a hoy, zona horaria de la
//   hoja). Las de hoy y las futuras nunca se eliminan, porque aún
//   pueden recibir registros.
// - Una columna se elimina solo si TODOS los alumnos (filas con
//   cuenta válida) tienen "Falta" o "N/D". Una celda con otro texto
//   (Asistencia, Retardo, Justificada…) o vacía la conserva.
// - Si TODAS las columnas de fecha cumplieran la condición, se
//   conserva la última, para que la hoja nunca se quede sin fechas.
// - Borra de derecha a izquierda y en grupos contiguos.
// ============================================================

function deleteEmptyDateColumns_(sheet, tz) {
  const report = readReport_(sheet);
  if (report.students.length === 0) return [];

  const dateColumns = detectDateColumns_(report.rawHeaders, report.accountIndex, tz);
  if (dateColumns.length === 0) return [];

  const todayKey = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");

  let candidates = dateColumns.filter(column =>
    column.dateKey < todayKey &&
    report.students.every(student =>
      DELETABLE_STATUS.has(cleanText_(report.data[student.rowIndex][column.index]).toLowerCase())
    )
  );

  if (candidates.length === dateColumns.length) {
    const lastIndex = Math.max.apply(null, dateColumns.map(c => c.index));
    candidates = candidates.filter(column => column.index !== lastIndex);
  }

  if (candidates.length === 0) return [];

  groupContiguous_(candidates.map(c => c.index))
    .reverse()
    .forEach(group => sheet.deleteColumns(group[0] + 1, group.length));

  return candidates.map(c => c.dateKey).sort();
}

// ============================================================
// CONTEXTO COMPARTIDO DE SINCRONIZACIÓN
//
// Lee Students / Course / Attendance Log (solo las columnas
// necesarias) y arma los mapas que usan syncAttendance_ y
// diagnoseAttendance_. Si falta algo se lanza un error explícito.
// ============================================================

function loadSyncContext_(spreadsheet, reportSheet, report) {
  const tz = spreadsheet.getSpreadsheetTimeZone();

  // ---------- Students: Cuenta → [cursos] ----------
  const studentsSheet = requireSheet_(spreadsheet, SHEETS.STUDENTS);
  const sCols = requireColumns_(readHeaderRow_(studentsSheet), ["Cuenta", "Course"], SHEETS.STUDENTS);
  const sSpan = readSpan_(studentsSheet, [sCols.Cuenta, sCols.Course], { display: true });

  if (sSpan.display.length === 0) {
    throw new Error("La hoja 'Students' no tiene registros.");
  }

  const studentCourseMap = {};
  const invalidAccountsInStudents = [];

  sSpan.display.forEach((row, offset) => {
    const rawAccount = row[sCols.Cuenta - sSpan.start];
    const courseId = cleanText_(row[sCols.Course - sSpan.start]);
    if (!courseId) return;

    const account = limpiarCuenta_(rawAccount);
    if (!account) {
      if (cleanText_(rawAccount)) {
        invalidAccountsInStudents.push({ row: offset + 2, value: cleanText_(rawAccount) });
      }
      return;
    }

    const list = studentCourseMap[account] || (studentCourseMap[account] = []);
    if (!list.includes(courseId)) list.push(courseId);
  });

  // ---------- Course ----------
  const courseSheet = requireSheet_(spreadsheet, SHEETS.COURSE);
  const courseData = courseSheet.getDataRange().getDisplayValues();

  if (courseData.length < 2) {
    throw new Error("La hoja 'Course' no tiene registros.");
  }

  const courseHeaders = courseData[0].map(cleanText_);
  const cCols = requireColumns_(courseHeaders, ["ID_Curso", "Horario"], SHEETS.COURSE);
  const courseNameIndex = findColumn_(courseHeaders, "Nombre Curso");
  const groupIndex = findColumn_(courseHeaders, "Grupo");

  const courseMap = {};
  courseData.slice(1).forEach(row => {
    const courseId = cleanText_(row[cCols.ID_Curso]);
    if (!courseId) return;

    courseMap[courseId] = {
      id: courseId,
      name: courseNameIndex !== -1 ? cleanText_(row[courseNameIndex]) : "",
      group: groupIndex !== -1 ? cleanText_(row[groupIndex]) : "",
      schedule: cleanText_(row[cCols.Horario])
    };
  });

  // ---------- Curso del reporte ----------
  const reportAccounts = report.students.map(s => s.account);
  const matchInfo = findReportCourseId_(reportSheet.getName(), courseMap, reportAccounts, studentCourseMap);

  // Solo se cargan los registros de los cursos que importan para ESTE reporte
  const relevantCourses = new Set();
  if (matchInfo.courseId) {
    relevantCourses.add(matchInfo.courseId);
  } else {
    reportAccounts.forEach(account =>
      (studentCourseMap[account] || []).forEach(courseId => relevantCourses.add(courseId))
    );
  }

  // ---------- Attendance Log: curso → cuenta → fecha → hora ----------
  const logSheet = requireSheet_(spreadsheet, SHEETS.ATTENDANCE);
  const lCols = requireColumns_(readHeaderRow_(logSheet), ["Cuenta", "Course", "Date", "Time"], SHEETS.ATTENDANCE);
  const lSpan = readSpan_(logSheet, [lCols.Cuenta, lCols.Course, lCols.Date, lCols.Time], { values: true, display: true });

  if (lSpan.values.length === 0) {
    throw new Error("La hoja 'Attendance Log' no tiene registros.");
  }

  const attendanceMap = {};  // courseId -> account -> dateKey -> "HH:mm:ss"
  const courseDateSet = {};  // courseId -> Set(dateKey) con al menos un registro
  const o = lSpan.start;

  for (let i = 0; i < lSpan.values.length; i++) {
    const display = lSpan.display[i];
    const courseId = cleanText_(display[lCols.Course - o]);
    if (!relevantCourses.has(courseId)) continue;

    const account = limpiarCuenta_(display[lCols.Cuenta - o]);
    const dateKey = normalizeDateKey_(lSpan.values[i][lCols.Date - o], tz);
    const time = cleanText_(display[lCols.Time - o]);
    if (!account || !dateKey || !time) continue;

    const byAccount = attendanceMap[courseId] || (attendanceMap[courseId] = {});
    const byDate = byAccount[account] || (byAccount[account] = {});

    // Varios registros el mismo día → se conserva la hora más temprana
    const previous = byDate[dateKey];
    if (previous === undefined || isEarlier_(time, previous)) {
      byDate[dateKey] = time;
    }

    (courseDateSet[courseId] || (courseDateSet[courseId] = new Set())).add(dateKey);
  }

  // ---------- Columnas de fecha del reporte (fila 2 cruda, con Date intactos) ----------
  const dateColumns = detectDateColumns_(report.rawHeaders, report.accountIndex, tz);

  if (dateColumns.length === 0) {
    throw new Error(NO_DATE_COLUMNS_MESSAGE);
  }

  return {
    studentCourseMap,
    courseMap,
    attendanceMap,
    courseDateSet,
    dateColumns,
    reportAccounts,
    matchInfo,
    logRecordCount: lSpan.values.length,
    invalidAccountsInStudents
  };
}

// ============================================================
// SINCRONIZAR ASISTENCIAS
//
// REGLAS (por cada columna de fecha y cada alumno):
// 1. La fecha NO tiene ningún registro en Attendance Log para el
//    curso (nadie pasó lista: fecha futura, día sin clase…) → "N/D"
// 2. Hay registros ese día pero no del alumno               → "Falta"
// 3. Registro dentro de la tolerancia del horario           → "Asistencia"
// 4. Registro después de la tolerancia                      → "Retardo"
//
// Se vuelven a evaluar las celdas vacías, "Falta" o "N/D".
// "Asistencia", "Retardo" o cualquier texto manual NO se tocan.
// Solo se escribe en columnas de fecha; nunca en celdas con fórmula.
// ============================================================

function syncAttendance_(spreadsheet, reportSheet, report) {
  const ctx = loadSyncContext_(spreadsheet, reportSheet, report);
  const tolerance = SETTINGS.ATTENDANCE_TOLERANCE_MINUTES;

  // Curso y horario de cada alumno, resueltos una sola vez
  const rows = [];
  report.students.forEach(({ rowIndex, account }) => {
    let courseId = ctx.matchInfo.courseId;

    // Sin curso para el reporte: usar el del alumno si solo tiene uno
    if (!courseId) {
      const studentCourses = ctx.studentCourseMap[account] || [];
      if (studentCourses.length === 1) courseId = studentCourses[0];
    }

    const course = courseId ? ctx.courseMap[courseId] : null;
    const scheduleMinutes = course ? timeToMinutes_(course.schedule) : null;

    if (courseId && course && scheduleMinutes !== null) {
      rows.push({ rowIndex, account, courseId, scheduleMinutes });
    }
  });

  // Calcular cambios en memoria
  const changes = [];
  ctx.dateColumns.forEach(({ index, dateKey }) => {
    rows.forEach(row => {
      const currentValue = cleanText_(report.data[row.rowIndex][index]);
      if (!OVERWRITABLE_STATUS.has(currentValue.toLowerCase())) return;

      const newValue = resolveStatus_(ctx, row, dateKey, tolerance);
      if (currentValue !== newValue) {
        changes.push({ rowIndex: row.rowIndex, colIndex: index, value: newValue });
      }
    });
  });

  const written = writeStatusChanges_(reportSheet, report, changes);
  const course = ctx.matchInfo.courseId ? ctx.courseMap[ctx.matchInfo.courseId] : null;

  return {
    updates: written.applied,
    counts: written.counts,
    dateColumns: ctx.dateColumns.length,
    students: report.students.length,
    skippedStudents: report.students.length - rows.length,
    courseName: course ? (course.name || course.id) : ""
  };
}

function resolveStatus_(ctx, row, dateKey, tolerance) {
  const datesWithLog = ctx.courseDateSet[row.courseId];
  if (!datesWithLog || !datesWithLog.has(dateKey)) return STATUS.ND;

  const byAccount = ctx.attendanceMap[row.courseId] || {};
  const time = byAccount[row.account] ? byAccount[row.account][dateKey] : undefined;
  if (time === undefined) return STATUS.FALTA;

  const entryMinutes = timeToMinutes_(time);
  // Si la hora no se puede interpretar, se da Asistencia para no penalizar
  if (entryMinutes === null) return STATUS.ASISTENCIA;

  return entryMinutes <= row.scheduleMinutes + tolerance ? STATUS.ASISTENCIA : STATUS.RETARDO;
}

/**
 * Escribe SOLO en los bloques de columnas de fecha que tienen cambios
 * (normalmente uno). Por bloque: 2 lecturas (fórmulas y fondos) y
 * 2 escrituras (valores y fondos). Las celdas con fórmula se respetan.
 */
function writeStatusChanges_(sheet, report, changes) {
  const counts = { [STATUS.ASISTENCIA]: 0, [STATUS.RETARDO]: 0, [STATUS.FALTA]: 0, [STATUS.ND]: 0 };
  let applied = 0;

  if (changes.length === 0) return { applied, counts };

  const changedColumns = Array.from(new Set(changes.map(c => c.colIndex)));

  groupContiguous_(changedColumns).forEach(group => {
    const firstCol = group[0];
    const lastCol = group[group.length - 1];
    const groupChanges = changes.filter(c => c.colIndex >= firstCol && c.colIndex <= lastCol);

    let firstRow = Infinity;
    let lastRow = -Infinity;
    groupChanges.forEach(c => {
      if (c.rowIndex < firstRow) firstRow = c.rowIndex;
      if (c.rowIndex > lastRow) lastRow = c.rowIndex;
    });

    const range = sheet.getRange(firstRow + 1, firstCol + 1, lastRow - firstRow + 1, lastCol - firstCol + 1);
    const formulas = range.getFormulas();
    const backgrounds = range.getBackgrounds();

    // Partir del contenido actual (fórmulas incluidas) para no perder nada
    const values = formulas.map((formulaRow, r) =>
      formulaRow.map((formula, c) => formula || report.data[firstRow + r][firstCol + c])
    );

    let groupApplied = 0;
    groupChanges.forEach(change => {
      const r = change.rowIndex - firstRow;
      const c = change.colIndex - firstCol;
      if (formulas[r][c]) return; // nunca pisar una fórmula

      values[r][c] = change.value;
      backgrounds[r][c] = STATUS_FILL[change.value];
      counts[change.value]++;
      groupApplied++;
    });

    if (groupApplied > 0) {
      range.setValues(values);
      range.setBackgrounds(backgrounds);
      applied += groupApplied;
    }
  });

  return { applied, counts };
}

function buildSyncMessage_(sheetName, result, inserted, deletedDates) {
  const lines = [
    `Sincronización terminada en "${sheetName}"${result && result.courseName ? ` (curso: ${result.courseName})` : ""}.`
  ];

  if (inserted.dates.length) {
    lines.push(`📅 Fechas agregadas (${inserted.dates.length}): ${formatDateList_(inserted.dates)}`);
  }
  if (inserted.truncated) {
    lines.push(
      `⚠️ Había más de ${SETTINGS.MAX_NEW_DATE_COLUMNS} fechas pendientes; ` +
      `vuelve a sincronizar para agregar el resto.`
    );
  }

  if (!result) {
    lines.push("El reporte no tiene alumnos con número de cuenta válido; no se registraron asistencias.");
  } else {
    lines.push(
      result.updates
        ? `Celdas actualizadas: ${result.updates} — Asistencia ${result.counts[STATUS.ASISTENCIA]}, ` +
          `Retardo ${result.counts[STATUS.RETARDO]}, Falta ${result.counts[STATUS.FALTA]}, N/D ${result.counts[STATUS.ND]}.`
        : "Asistencias sin cambios: todo ya estaba al día."
    );
    lines.push(`Columnas de fecha: ${result.dateColumns} · Alumnos: ${result.students}.`);
  }

  if (deletedDates.length) {
    lines.push(`🗑️ Columnas de fechas pasadas eliminadas por tener solo "Falta"/"N/D" (${deletedDates.length}): ${formatDateList_(deletedDates)}`);
  }

  if (result && result.skippedStudents > 0) {
    lines.push(
      `⚠️ ${result.skippedStudents} alumno(s) no se sincronizaron porque no se pudo determinar su curso u horario. ` +
      `Usa "🩺 Diagnosticar sincronización" para ver el detalle.`
    );
  }

  return lines.join("\n");
}

// ============================================================
// DIAGNÓSTICO (solo lectura)
// ============================================================

function diagnoseAttendance_(sheetName) {
  validateReportSheetName_(sheetName);

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const tz = spreadsheet.getSpreadsheetTimeZone();
  const reportSheet = spreadsheet.getSheetByName(sheetName);
  if (!reportSheet) {
    throw new Error(`No se encontró la hoja de reporte "${sheetName}".`);
  }

  const report = readReport_(reportSheet);
  if (report.students.length === 0) {
    throw new Error("El reporte no tiene alumnos.");
  }

  const ctx = loadSyncContext_(spreadsheet, reportSheet, report);

  const courseId = ctx.matchInfo.courseId;
  const course = courseId ? ctx.courseMap[courseId] : null;
  const datesWithLog = courseId ? (ctx.courseDateSet[courseId] || new Set()) : new Set();
  const byAccount = courseId ? (ctx.attendanceMap[courseId] || {}) : {};

  const logRecordsForCourse = Object.keys(byAccount)
    .reduce((total, account) => total + Object.keys(byAccount[account]).length, 0);

  const accountsWithNoLogRecord = ctx.reportAccounts.filter(account => !byAccount[account]);

  const columnsWithoutLogData = ctx.dateColumns
    .filter(({ dateKey }) => !datesWithLog.has(dateKey))
    .map(({ dateKey }) => dateKey);

  // Fechas que la próxima sincronización agregaría (sin modificar nada)
  const storedKey = PropertiesService.getScriptProperties()
    .getProperty(SETTINGS.LAST_DATE_PROP_PREFIX + reportSheet.getSheetId()) || "";
  const maxDateKey = ctx.dateColumns.reduce((max, c) => (c.dateKey > max ? c.dateKey : max), "");
  const pendingDatesToInsert = SETTINGS.AUTO_INSERT_DATES
    ? listDateKeysAfter_(
      storedKey > maxDateKey ? storedKey : maxDateKey,
      Utilities.formatDate(new Date(), tz, "yyyy-MM-dd"),
      SETTINGS.INSERT_WEEKDAYS,
      SETTINGS.MAX_NEW_DATE_COLUMNS
    ).keys
    : [];

  // Fila 1: ¿hay valores distintos de "Visible"/"Oculto"?
  const visibilityRow = (report.data[0] || []).map(cleanText_);
  const nonStandard = visibilityRow.find(v => v && v !== "Visible" && v !== "Oculto") || "";

  return {
    matchedCourseId: courseId,
    matchedCourseName: course ? course.name : "",
    matchMethod: ctx.matchInfo.method,
    candidates: ctx.matchInfo.candidates.map(c => ({ id: c.id, name: c.name, group: c.group })),
    votes: ctx.matchInfo.votes.map(([id, count]) => ({ courseId: id, count })),
    scheduleText: course ? course.schedule : "",
    scheduleMinutes: course ? timeToMinutes_(course.schedule) : null,
    dateColumnsFound: ctx.dateColumns.length,
    pendingDatesToInsert,
    columnsWithoutLogData,
    studentsInReport: ctx.reportAccounts.length,
    logRecordsTotal: ctx.logRecordCount,
    logRecordsForCourse,
    accountsWithNoLogRecord,
    invalidAccountsInStudents: ctx.invalidAccountsInStudents,
    headerRowUsesNonStandardVisibility: nonStandard !== "",
    headerRowSampleValue: nonStandard
  };
}

// ============================================================
// DETERMINAR CURSO DEL REPORTE
//
//   Reporte_ESTADISTICA_512, Reporte_CYC_517 …
//   1. Un solo curso con ese "Grupo"        → se usa directo.
//   2. Varios cursos con el mismo "Grupo"   → desempate por cuántos
//      alumnos del reporte están inscritos (Students) en cada uno.
//   3. Sin votos                            → coincidencia de nombre.
//   4. Sin grupo en el nombre               → búsqueda global por nombre.
// ============================================================

function findReportCourseId_(reportSheetName, courseMap, reportAccounts, studentCourseMap) {
  const reportName = String(reportSheetName || "")
    .replace(new RegExp(`^${REPORT_PREFIX}`, "i"), "")
    .trim();

  const emptyResult = { courseId: null, method: "sin_coincidencia", candidates: [], votes: [] };
  if (!reportName) return emptyResult;

  const groupMatch = reportName.match(/_(\d+)$/);
  const reportGroup = groupMatch ? groupMatch[1] : "";

  const reportCourseName = reportGroup
    ? reportName.replace(new RegExp(`_${reportGroup}$`), "")
    : reportName;

  const reportTokens = normalizeSearchText_(reportCourseName)
    .split(/\s+/)
    .filter(token => token.length >= 3);

  const candidates = Object.values(courseMap).filter(
    course => reportGroup && String(course.group) === String(reportGroup)
  );

  if (candidates.length === 1) {
    return { courseId: candidates[0].id, method: "grupo_unico", candidates, votes: [] };
  }

  if (candidates.length > 1) {
    const candidateIds = new Set(candidates.map(c => c.id));
    const voteCounts = {};

    (reportAccounts || []).forEach(account => {
      (studentCourseMap[account] || []).forEach(courseId => {
        if (candidateIds.has(courseId)) {
          voteCounts[courseId] = (voteCounts[courseId] || 0) + 1;
        }
      });
    });

    const votedEntries = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);

    if (votedEntries.length > 0) {
      return { courseId: votedEntries[0][0], method: "voto_matricula", candidates, votes: votedEntries };
    }

    const best = bestCourseByName_(candidates, reportTokens, "");
    if (best) {
      return { courseId: best.id, method: "nombre_entre_candidatos", candidates, votes: [] };
    }
  }

  const best = bestCourseByName_(Object.values(courseMap), reportTokens, reportGroup);
  return {
    courseId: best ? best.id : null,
    method: best ? "busqueda_global_nombre" : "sin_coincidencia",
    candidates,
    votes: []
  };
}

function bestCourseByName_(courses, reportTokens, reportGroup) {
  let bestCourse = null;
  let bestScore = 0;

  courses.forEach(course => {
    const courseText = normalizeSearchText_(course.name);
    let score = reportTokens.reduce((acc, token) => acc + (courseText.includes(token) ? 1 : 0), 0);
    if (reportGroup && String(course.group) === String(reportGroup)) score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestCourse = course;
    }
  });

  return bestCourse;
}

function normalizeSearchText_(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// DETECTAR ALUMNOS DUPLICADOS (escritura en bloque)
// ============================================================

function checkStudentDuplicates() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const studentsSheet = requireSheet_(spreadsheet, SHEETS.STUDENTS);
  const courseSheet = requireSheet_(spreadsheet, SHEETS.COURSE);

  // ID_Curso → Nombre Curso
  const courseData = courseSheet.getDataRange().getDisplayValues();
  const courseHeaders = (courseData[0] || []).map(cleanText_);
  const idIndex = Math.max(findColumn_(courseHeaders, "ID_Curso"), 0);
  const nameHeaderIndex = findColumn_(courseHeaders, "Nombre Curso");
  const nameIndex = nameHeaderIndex !== -1 ? nameHeaderIndex : 1;

  const courseNames = {};
  courseData.slice(1).forEach(row => {
    const courseId = cleanText_(row[idIndex]);
    if (courseId) courseNames[courseId] = cleanText_(row[nameIndex]);
  });

  const data = studentsSheet.getDataRange().getDisplayValues();
  if (data.length <= 1) {
    ui.alert("Detección de duplicados", "La hoja Students está vacía.", ui.ButtonSet.OK);
    return { status: "success", message: "La hoja Students está vacía." };
  }

  const headers = data[0].map(cleanText_);
  const accountIndex = findColumn_(headers, "Cuenta");
  const courseIndex = findColumn_(headers, "Course");

  if (accountIndex === -1) {
    throw new Error("No se encontró la columna 'Cuenta' en Students.");
  }

  const rowCount = data.length - 1;
  const statusValues = Array.from({ length: rowCount }, () => [""]);
  const statusFills = Array.from({ length: rowCount }, () => [null]);
  const courseValues = Array.from({ length: rowCount }, () => [""]);

  const accounts = {};
  const invalidRows = [];
  let duplicates = 0;

  data.slice(1).forEach((row, i) => {
    const rawAccount = row[accountIndex];
    const account = limpiarCuenta_(rawAccount);

    if (!account) {
      if (cleanText_(rawAccount)) {
        invalidRows.push(i + 2);
        statusValues[i][0] = "Cuenta inválida";
        statusFills[i][0] = "#F8D7DA";
      }
      return;
    }

    const rawCourse = courseIndex === -1 ? "" : cleanText_(row[courseIndex]);
    const courseName = courseNames[rawCourse] || rawCourse;

    if (!accounts[account]) {
      accounts[account] = { rows: [i], courses: courseName ? [courseName] : [] };
      return;
    }

    duplicates++;
    accounts[account].rows.push(i);
    if (courseName && !accounts[account].courses.includes(courseName)) {
      accounts[account].courses.push(courseName);
    }
  });

  Object.values(accounts)
    .filter(student => student.rows.length > 1)
    .forEach(student => {
      const courses = student.courses.join(", ");
      student.rows.forEach(i => {
        statusValues[i][0] = "Duplicado";
        statusFills[i][0] = "#FEF3C7";
        courseValues[i][0] = courses;
      });
    });

  // 3 escrituras en total, sin importar cuántos alumnos haya
  studentsSheet.getRange(2, DUPLICATES.STATUS_COLUMN, rowCount, 1)
    .setValues(statusValues)
    .setBackgrounds(statusFills);
  studentsSheet.getRange(2, DUPLICATES.COURSES_COLUMN, rowCount, 1).setValues(courseValues);

  const messageParts = [
    duplicates
      ? `⚠️ Se detectaron ${duplicates} registro(s) duplicado(s).`
      : "✅ No se detectaron números de cuenta duplicados."
  ];
  if (invalidRows.length) {
    messageParts.push(`⚠️ ${invalidRows.length} fila(s) con número de cuenta inválido (fila(s) ${invalidRows.join(", ")}).`);
  }
  const message = messageParts.join("\n");

  ui.alert("Detección de duplicados", message, ui.ButtonSet.OK);

  return { status: duplicates ? "duplicate_found" : "success", message, count: duplicates, invalidRows };
}
