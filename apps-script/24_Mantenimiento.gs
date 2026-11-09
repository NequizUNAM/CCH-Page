// ============================================================
// MANTENIMIENTO (solo admin)
//
// 1. Estructura: crea las hojas base (plantilla "Attendance Log"),
//    las hojas W_* y las carpetas de la plantilla si no existen.
// 2. Ciclo actual (2 por año: 2027-1, 2027-2).
// 3. Respaldo por ciclo: un .xlsx por ciclo dentro de un .zip que se
//    guarda en la MISMA carpeta de Drive que la hoja de cálculo.
//    Solo si el ZIP quedó guardado se borra lo de esos ciclos.
//    Antes de borrar se escribe un resumen por alumno en W_Historial
//    (para seguir sabiendo "lo tuve en un ciclo anterior").
// 4. Vaciar tablas: siempre respalda primero (ZIP) y luego borra.
// ============================================================

// ---------- Estructura ----------

/** Crea hojas base que falten. Las existentes NO se tocan (AppSheet). */
function ensureBaseSheets_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const created = [];
  const missingColumns = [];

  BASE_SHEETS.forEach(def => {
    let sheet = spreadsheet.getSheetByName(def.name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(def.name);
      sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight("bold");
      sheet.setFrozenRows(1);
      created.push(def.name);
      return;
    }
    const current = sheet.getLastColumn()
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(normalizeKey_)
      : [];
    const missing = def.headers.filter(h => !current.includes(normalizeKey_(h)));
    if (missing.length) missingColumns.push({ sheet: def.name, columns: missing });
  });

  return { created, missingColumns };
}

/** Carpeta de Drive donde está la hoja de cálculo. */
function spreadsheetFolder_() {
  const parents = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getParents();
  return parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
}

/** Subcarpeta por nombre (la crea si no existe). */
function childFolder_(parent, name) {
  const found = parent.getFoldersByName(name);
  return found.hasNext() ? found.next() : parent.createFolder(name);
}

function ensureFolders_() {
  const parent = spreadsheetFolder_();
  const created = [];
  DRIVE_FOLDERS.concat([SETTINGS.EVIDENCE_FOLDER_NAME]).forEach(name => {
    if (!parent.getFoldersByName(name).hasNext()) {
      parent.createFolder(name);
      created.push(name);
    }
  });
  return created;
}

// ---------- Ciclos ----------

/** ID_Curso → ciclo efectivo (W_Grupos tiene prioridad sobre Course). */
function courseCycles_() {
  const map = {};
  Object.values(courseMap_()).forEach(c => { map[c.id] = c.ciclo; });
  Object.values(groupsMap_()).forEach(g => { if (g.ciclo) map[g.id] = g.ciclo; });
  return map;
}

function currentCycle_() {
  const saved = PropertiesService.getScriptProperties().getProperty(SETTINGS.CURRENT_CYCLE_KEY);
  if (saved) return normalizeCiclo_(saved);
  const all = Object.values(courseCycles_()).filter(Boolean);
  return all.sort((a, b) => cicloRank_(b) - cicloRank_(a))[0] || "";
}

function setCurrentCycle_(params) {
  const ciclo = normalizeCiclo_(params.ciclo);
  if (!/^\d{4}-[12]$/.test(ciclo)) throw new Error("Escribe el ciclo como 2027-1 o 2027-2.");
  PropertiesService.getScriptProperties().setProperty(SETTINGS.CURRENT_CYCLE_KEY, ciclo);
  return { ciclo, message: `Ciclo actual: ${ciclo}` };
}

/** Resumen por ciclo: cursos, inscripciones y registros de asistencia. */
function cyclesSummary_() {
  const cycles = courseCycles_();
  const courses = courseMap_();
  const groups = groupsMap_();
  const summary = {};

  const bucket = ciclo => summary[ciclo] || (summary[ciclo] = {
    ciclo, courses: [], students: 0, logs: 0, reports: [], hasSemester: /^\d{4}-[12]$/.test(ciclo)
  });

  Object.keys(cycles).forEach(id => {
    const b = bucket(cycles[id] || "(sin ciclo)");
    const c = courses[id] || {};
    b.courses.push({ id, label: `${c.name || id} ${c.group || ""}`.trim() });
    if (groups[id] && groups[id].sheet) b.reports.push(groups[id].sheet);
  });

  studentRecords_().forEach(r => { if (r.course && cycles[r.course] !== undefined) bucket(cycles[r.course] || "(sin ciclo)").students++; });

  const log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.ATTENDANCE);
  if (log && log.getLastRow() > 1) {
    const headers = log.getRange(1, 1, 1, log.getLastColumn()).getValues()[0].map(cleanText_);
    const col = findColumn_(headers, "Course");
    if (col !== -1) {
      log.getRange(2, col + 1, log.getLastRow() - 1, 1).getDisplayValues().forEach(([id]) => {
        const key = cleanText_(id);
        if (cycles[key] !== undefined) bucket(cycles[key] || "(sin ciclo)").logs++;
      });
    }
  }

  return Object.values(summary).sort((a, b) => cicloRank_(b.ciclo) - cicloRank_(a.ciclo));
}

// ---------- Información para la pestaña Mantenimiento ----------

function maintenanceInfo_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const tables = BASE_SHEETS.map(d => d.name).concat(Object.keys(WEB).map(k => WEB[k].name)).map(name => {
    const sheet = spreadsheet.getSheetByName(name);
    return { name, exists: !!sheet, rows: sheet ? Math.max(sheet.getLastRow() - 1, 0) : 0, web: name.startsWith("W_") };
  });

  const folder = spreadsheetFolder_();
  return {
    current: currentCycle_(),
    cycles: cyclesSummary_(),
    tables,
    folder: { name: folder.getName(), url: folder.getUrl() },
    backups: listBackups_(folder),
    confirmWord: SETTINGS.PURGE_CONFIRM_WORD,
    clearAllWord: SETTINGS.CLEAR_ALL_WORD
  };
}

function listBackups_(folder) {
  const list = [];
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (!name.startsWith(SETTINGS.BACKUP_PREFIX) && !name.startsWith(SETTINGS.CLEAN_PREFIX)) continue;
    list.push({ name, url: file.getUrl(), download: downloadUrl_(file.getId()), date: toIso_(file.getDateCreated()), size: file.getSize() });
  }
  return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
}

function downloadUrl_(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// ---------- Lectura de tablas filtradas por cursos ----------

/** Matriz completa de una hoja (encabezados en la fila 1). */
function sheetMatrix_(sheet) {
  if (!sheet || sheet.getLastRow() === 0) return [];
  return sheet.getDataRange().getValues();
}

/**
 * Para un conjunto de ID_Curso devuelve, por tabla, las filas que les
 * pertenecen (con encabezados) y las hojas Reporte_* ligadas.
 */
function collectCourseData_(idSet) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const tables = [];

  const filterSheet = (name, keyColumn, keySet) => {
    const matrix = sheetMatrix_(spreadsheet.getSheetByName(name));
    if (!matrix.length) return;
    const headers = matrix[0].map(cleanText_);
    const col = findColumn_(headers, keyColumn);
    if (col === -1) return;
    const rows = matrix.slice(1).filter(r => keySet.has(cleanText_(r[col])));
    tables.push({ name, matrix: [matrix[0]].concat(rows), count: rows.length, keyColumn, keySet });
  };

  BASE_SHEETS.forEach(def => filterSheet(def.name, def.cycleKey, idSet));
  Object.keys(WEB).forEach(key => {
    const def = WEB[key];
    if (def === WEB.TEAM_EVALS || def === WEB.HISTORY) return;
    filterSheet(def.name, "ID_Curso", idSet);
  });

  const projectIds = new Set(Db.read(WEB.PROJECTS).rows.filter(r => idSet.has(cleanText_(r.ID_Curso))).map(r => cleanText_(r.ID)));
  filterSheet(WEB.TEAM_EVALS.name, "ID_Proyecto", projectIds);

  const groups = groupsMap_();
  const reports = Array.from(idSet)
    .map(id => groups[id] && groups[id].sheet)
    .filter(name => name && spreadsheet.getSheetByName(name));

  return { tables, reports: Array.from(new Set(reports)) };
}

function idsForCycles_(cycles) {
  const wanted = new Set(cycles.map(normalizeCiclo_));
  const map = courseCycles_();
  return new Set(Object.keys(map).filter(id => wanted.has(map[id] || "(sin ciclo)")));
}

function validateCycles_(list) {
  const cycles = (Array.isArray(list) ? list : []).map(c => cleanText_(c) === "(sin ciclo)" ? "(sin ciclo)" : normalizeCiclo_(c)).filter(Boolean);
  if (!cycles.length) throw new Error("Selecciona al menos un ciclo.");
  const current = currentCycle_();
  if (current && cycles.includes(current)) throw new Error(`No se puede respaldar y borrar el ciclo actual (${current}).`);
  return cycles;
}

function backupPreview_(params) {
  const cycles = validateCycles_(params.cycles);
  const ids = idsForCycles_(cycles);
  const data = collectCourseData_(ids);
  return {
    cycles,
    courses: ids.size,
    tables: data.tables.map(t => ({ name: t.name, rows: t.count })),
    reports: data.reports
  };
}

// ---------- Excel y ZIP ----------

/** Crea un .xlsx (blob) con varias hojas. Usa una hoja temporal que luego va a la papelera. */
function exportXlsx_(fileName, sheets) {
  const temp = SpreadsheetApp.create(fileName);
  try {
    const used = new Set();
    sheets.forEach((s, i) => {
      let name = String(s.name).replace(/[\[\]\*\?\/\\:]/g, "_").slice(0, 90) || `Hoja${i + 1}`;
      while (used.has(name)) name += "_";
      used.add(name);

      const sheet = i === 0 ? temp.getSheets()[0].setName(name) : temp.insertSheet(name);
      const matrix = s.matrix || [];
      if (!matrix.length) return;
      const width = Math.max.apply(null, matrix.map(r => r.length));
      const rows = matrix.map(r => r.concat(Array(width - r.length).fill("")));
      sheet.getRange(1, 1, rows.length, width).setValues(rows);
      sheet.setFrozenRows(1);
    });
    SpreadsheetApp.flush();

    const response = UrlFetchApp.fetch(
      `https://docs.google.com/spreadsheets/d/${temp.getId()}/export?format=xlsx`,
      { headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }
    );
    if (response.getResponseCode() !== 200) {
      throw new Error(`No se pudo generar el Excel (${response.getResponseCode()}).`);
    }
    return response.getBlob().setName(`${fileName}.xlsx`);
  } finally {
    DriveApp.getFileById(temp.getId()).setTrashed(true);
  }
}

/** Guarda los blobs en un ZIP en la carpeta de la hoja y verifica que quedó guardado. */
function saveZip_(zipName, blobs) {
  const zip = Utilities.zip(blobs, zipName);
  const file = spreadsheetFolder_().createFile(zip);
  if (!file || !file.getSize()) throw new Error("El ZIP quedó vacío; no se borró nada.");
  return { id: file.getId(), name: file.getName(), url: file.getUrl(), download: downloadUrl_(file.getId()), size: file.getSize() };
}

function stamp_() {
  return Utilities.formatDate(new Date(), getSpreadsheetTz_(), "yyyyMMdd-HHmm");
}

// ---------- Respaldo por ciclo (y borrado) ----------

function backupCycles_(params) {
  const cycles = validateCycles_(params.cycles);
  const purge = !!params.purge;
  if (purge && cleanText_(params.confirm) !== SETTINGS.PURGE_CONFIRM_WORD) {
    throw new Error(`Para borrar escribe exactamente ${SETTINGS.PURGE_CONFIRM_WORD}.`);
  }

  // 1. Un Excel por ciclo
  const blobs = [];
  const perCycle = [];
  cycles.forEach(ciclo => {
    const ids = idsForCycles_([ciclo]);
    if (!ids.size) return;
    const data = collectCourseData_(ids);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = data.tables.map(t => ({ name: t.name, matrix: t.matrix }))
      .concat(data.reports.map(name => ({ name, matrix: sheetMatrix_(spreadsheet.getSheetByName(name)) })));
    blobs.push(exportXlsx_(`CCH_${ciclo}`, sheets));
    perCycle.push({ ciclo, ids, data });
  });
  if (!blobs.length) throw new Error("Esos ciclos no tienen cursos.");

  // 2. ZIP en la carpeta de la hoja (si falla, se detiene aquí y no se borra nada)
  const zipName = `${SETTINGS.BACKUP_PREFIX}${cycles.join("_")}_${stamp_()}.zip`;
  const file = saveZip_(zipName, blobs);

  if (!purge) return { file, message: `Respaldo guardado: ${file.name}` };

  // 3. Historial y borrado
  const deleted = {};
  perCycle.forEach(({ ids }) => writeHistory_(ids, file.name));
  perCycle.forEach(({ ids, data }) => {
    const result = purgeCourses_(ids, data, !!params.keepCourses);
    Object.keys(result).forEach(k => { deleted[k] = (deleted[k] || 0) + result[k]; });
  });
  Db.clearCache();

  const total = Object.keys(deleted).reduce((s, k) => s + deleted[k], 0);
  return {
    file,
    deleted,
    message: `Respaldo guardado (${file.name}) y se borraron ${total} registro(s) de ${cycles.join(", ")}.`
  };
}

/** Borra filas por clave sin reescribir la hoja (respeta formatos y fórmulas de otras filas). */
function deleteMatchingRows_(sheet, keyColumn, keySet) {
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const values = sheet.getDataRange().getValues();
  const col = findColumn_(values[0].map(cleanText_), keyColumn);
  if (col === -1) return 0;

  const rows = [];
  values.forEach((row, i) => { if (i > 0 && keySet.has(cleanText_(row[col]))) rows.push(i + 1); });
  if (!rows.length) return 0;

  // Sheets no permite borrar TODAS las filas no congeladas: deja una de reserva
  if (sheet.getMaxRows() <= sheet.getLastRow()) sheet.insertRowsAfter(sheet.getLastRow(), 1);
  groupContiguous_(rows).reverse().forEach(group => sheet.deleteRows(group[0], group.length));
  return rows.length;
}

function purgeCourses_(ids, data, keepCourses) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const deleted = {};

  data.tables.forEach(t => {
    if (keepCourses && t.name === SHEETS.COURSE) return;
    const n = deleteMatchingRows_(spreadsheet.getSheetByName(t.name), t.keyColumn, t.keySet);
    if (n) deleted[t.name] = n;
  });

  data.reports.forEach(name => {
    const sheet = spreadsheet.getSheetByName(name);
    if (!sheet) return;
    PropertiesService.getScriptProperties().deleteProperty(SETTINGS.LAST_DATE_PROP_PREFIX + sheet.getSheetId());
    spreadsheet.deleteSheet(sheet);
    deleted["Hojas Reporte_"] = (deleted["Hojas Reporte_"] || 0) + 1;
  });

  return deleted;
}

/** Resumen por alumno de los cursos que se van a borrar → W_Historial. */
function writeHistory_(ids, backupName) {
  const courses = courseMap_();
  const groups = groupsMap_();
  const cycles = courseCycles_();
  const names = studentNames_();
  const comments = allComments_();
  const now = new Date();
  const rows = [];

  ids.forEach(id => {
    const course = courses[id] || { name: id, group: "" };
    let computed = null;
    if (groups[id]) {
      try { computed = computeCourse_(id); } catch (e) { computed = null; }
    }
    const attendance = groups[id] ? reportAttendance_(groups[id].sheet) : null;
    const roster = computed ? computed.students : rosterFor_(id, attendance).map(s => ({ cuenta: s.cuenta, nombre: s.nombre }));

    roster.forEach(s => {
      const att = attendance && attendance.rows[s.cuenta];
      const notes = comments.filter(c => c.cuenta === s.cuenta && c.idCurso === id).map(c => c.texto);
      rows.push({
        Cuenta: s.cuenta, Nombre: s.nombre || names[s.cuenta] || "", ID_Curso: id,
        Curso: course.name, Grupo: course.group, Ciclo: cycles[id] || "",
        Asistencias: att ? att.counts.asistencia + att.counts.retardo : "",
        Faltas: att ? att.counts.falta : "",
        Final: s.final !== undefined && s.final !== null ? s.final : "",
        Comentarios: notes.join(" | ").slice(0, 2000),
        Respaldo: backupName, Fecha: now
      });
    });
  });

  if (rows.length) Db.append(WEB.HISTORY, rows);
}

/** cuenta → [{ curso, grupo, ciclo, final, faltas }] de ciclos ya borrados. */
function historyMap_() {
  const map = {};
  Db.read(WEB.HISTORY).rows.forEach(r => {
    const cuenta = limpiarCuenta_(r.Cuenta);
    if (!cuenta) return;
    (map[cuenta] || (map[cuenta] = [])).push({
      idCurso: cleanText_(r.ID_Curso), curso: cleanText_(r.Curso), grupo: cleanText_(r.Grupo),
      ciclo: normalizeCiclo_(r.Ciclo), final: toNumberOrNull_(r.Final), faltas: toNumberOrNull_(r.Faltas),
      comentarios: cleanText_(r.Comentarios)
    });
  });
  return map;
}

// ---------- Vaciar tablas ----------

function clearableTables_() {
  return BASE_SHEETS.map(d => d.name).concat(Object.keys(WEB).map(k => WEB[k].name));
}

/**
 * params.table: nombre de una tabla, o "*" para todas.
 * params.confirm: el nombre de la tabla, o "BORRAR TODO".
 * Siempre respalda primero en un ZIP; si el respaldo falla no borra nada.
 */
function clearTable_(params) {
  const all = params.table === "*";
  const names = all ? clearableTables_() : [cleanText_(params.table)];
  if (!all && !clearableTables_().includes(names[0])) throw new Error("Esa tabla no se puede vaciar desde la web.");

  const expected = all ? SETTINGS.CLEAR_ALL_WORD : names[0];
  if (cleanText_(params.confirm) !== expected) throw new Error(`Para confirmar escribe exactamente: ${expected}`);

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = names
    .map(name => ({ name, sheet: spreadsheet.getSheetByName(name) }))
    .filter(x => x.sheet && x.sheet.getLastRow() > 1);
  if (!sheets.length) return { message: "No había registros que borrar." };

  const label = all ? "TODO" : names[0].replace(/\s+/g, "_");
  const blob = exportXlsx_(`${SETTINGS.CLEAN_PREFIX}${label}`, sheets.map(x => ({ name: x.name, matrix: sheetMatrix_(x.sheet) })));
  const file = saveZip_(`${SETTINGS.CLEAN_PREFIX}${label}_${stamp_()}.zip`, [blob]);

  let total = 0;
  sheets.forEach(({ sheet }) => {
    const count = sheet.getLastRow() - 1;
    if (sheet.getMaxRows() <= sheet.getLastRow()) sheet.insertRowsAfter(sheet.getLastRow(), 1);
    sheet.deleteRows(2, count);
    total += count;
  });
  Db.clearCache();

  return { file, message: `Se respaldaron y borraron ${total} registro(s). Respaldo: ${file.name}` };
}
