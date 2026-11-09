// ============================================================
// HOJAS COMO TABLAS
//
// Cada hoja W_* tiene encabezados en la fila 1 y un registro por fila.
// Db.read() devuelve objetos { Encabezado: valor, _row: n° de fila }.
// Las escrituras masivas reescriben la tabla completa en UNA llamada
// (las tablas son pequeñas: cientos o pocos miles de filas).
// Todas las escrituras corren dentro de withScriptLock_ (ver routes_).
// ============================================================

const Db = {
  _cache: {},

  /** Devuelve la hoja; si no existe la crea con sus encabezados. */
  sheet(def) {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(def.name);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(def.name);
      sheet.getRange(1, 1, 1, def.headers.length)
        .setValues([def.headers])
        .setFontWeight("bold")
        .setBackground("#0F172A")
        .setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
      return sheet;
    }

    // Agrega encabezados que falten (versiones futuras) sin mover datos
    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    const current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(cleanText_);
    const missing = def.headers.filter(h => !current.includes(h));
    if (missing.length) {
      sheet.getRange(1, current.filter(Boolean).length + 1, 1, missing.length)
        .setValues([missing]).setFontWeight("bold");
    }
    return sheet;
  },

  read(def) {
    if (this._cache[def.name]) return this._cache[def.name];

    const sheet = this.sheet(def);
    const values = sheet.getDataRange().getValues();
    const headers = (values[0] || []).map(cleanText_);

    const rows = values.slice(1)
      .map((row, i) => {
        const obj = { _row: i + 2 };
        headers.forEach((h, c) => { if (h) obj[h] = row[c]; });
        return obj;
      })
      .filter(obj => headers.some(h => h && cleanText_(obj[h]) !== ""));

    const table = { sheet, headers, rows };
    this._cache[def.name] = table;
    return table;
  },

  append(def, objects) {
    if (!objects.length) return;
    const table = this.read(def);
    const matrix = objects.map(obj => table.headers.map(h => toCell_(obj[h])));
    const start = table.sheet.getLastRow() + 1;
    table.sheet.getRange(start, 1, matrix.length, table.headers.length).setValues(matrix);
    delete this._cache[def.name];
  },

  /** Reemplaza TODO el contenido (debajo de encabezados) por `rows`. */
  writeAll(def, rows) {
    const table = this.read(def);
    const sheet = table.sheet;
    const width = table.headers.length;
    const oldCount = Math.max(sheet.getLastRow() - 1, 0);

    const matrix = rows.map(obj => table.headers.map(h => toCell_(obj[h])));
    if (matrix.length) sheet.getRange(2, 1, matrix.length, width).setValues(matrix);
    if (oldCount > matrix.length) {
      sheet.getRange(matrix.length + 2, 1, oldCount - matrix.length, width).clearContent();
    }
    delete this._cache[def.name];
  },

  /** Actualiza un registro ya leído (usa su _row). */
  update(def, obj) {
    const table = this.read(def);
    const row = table.headers.map(h => toCell_(obj[h]));
    table.sheet.getRange(obj._row, 1, 1, row.length).setValues([row]);
    delete this._cache[def.name];
  },

  clearCache() {
    this._cache = {};
  }
};

/** Objetos y arreglos se guardan como JSON; lo demás tal cual. */
function toCell_(value) {
  if (value === undefined || value === null) return "";
  if (isDate_(value)) return value;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function parseJson_(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback;
  if (typeof value === "object" && !isDate_(value)) return value;
  try { return JSON.parse(value); } catch (e) { return fallback; }
}

function toBool_(value) {
  if (value === true) return true;
  return ["true", "si", "1", "verdadero", "yes"].includes(normalizeKey_(value));
}

function toIso_(value) {
  return isDate_(value) && !isNaN(value.getTime()) ? value.toISOString() : (value ? String(value) : "");
}

function shortId_() {
  return Utilities.getUuid().replace(/-/g, "").slice(0, 10);
}

function toNumberOrNull_(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  return isFinite(n) ? n : null;
}

function round_(value, decimals) {
  if (value === null || value === undefined || !isFinite(value)) return null;
  const f = Math.pow(10, decimals === undefined ? 2 : decimals);
  return Math.round(value * f) / f;
}

// ============================================================
// HOJAS DE APPSHEET (solo lectura)
// ============================================================

/** Course → { id: {id, name, group, schedule, ciclo} } */
function courseMap_() {
  if (Db._cache.__courses) return Db._cache.__courses;

  const data = requireSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEETS.COURSE).getDataRange().getDisplayValues();
  const headers = (data[0] || []).map(cleanText_);
  const col = name => findColumn_(headers, name);
  const iId = col("ID_Curso"), iName = col("Nombre Curso"), iGroup = col("Grupo"),
        iSchedule = col("Horario"), iCiclo = col("Ciclo_Escolar");

  const map = {};
  data.slice(1).forEach(row => {
    const id = cleanText_(row[iId]);
    if (!id) return;
    map[id] = {
      id,
      name: iName !== -1 ? cleanText_(row[iName]) : id,
      group: iGroup !== -1 ? cleanText_(row[iGroup]) : "",
      schedule: iSchedule !== -1 ? cleanText_(row[iSchedule]) : "",
      ciclo: iCiclo !== -1 ? normalizeCiclo_(row[iCiclo]) : ""
    };
  });

  Db._cache.__courses = map;
  return map;
}

/** Students → [{ cuenta, nombre, email, course }] (una fila por inscripción). */
function studentRecords_() {
  if (Db._cache.__students) return Db._cache.__students;

  const data = requireSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEETS.STUDENTS).getDataRange().getDisplayValues();
  const headers = (data[0] || []).map(cleanText_);
  const col = name => findColumn_(headers, name);
  const iCuenta = col("Cuenta"), iFirst = col("First Name"), iLast = col("Last Name"),
        iEmail = col("Email"), iCourse = col("Course");

  const records = [];
  data.slice(1).forEach(row => {
    const cuenta = limpiarCuenta_(row[iCuenta]);
    if (!cuenta) return;
    records.push({
      cuenta,
      nombre: [iFirst !== -1 ? row[iFirst] : "", iLast !== -1 ? row[iLast] : ""].map(cleanText_).filter(Boolean).join(" "),
      email: iEmail !== -1 ? cleanText_(row[iEmail]) : "",
      course: iCourse !== -1 ? cleanText_(row[iCourse]) : ""
    });
  });

  Db._cache.__students = records;
  return records;
}

/** Cuenta → [ID_Curso] (para findReportCourseId_). */
function studentCourseMap_() {
  const map = {};
  studentRecords_().forEach(r => {
    if (!r.course) return;
    const list = map[r.cuenta] || (map[r.cuenta] = []);
    if (!list.includes(r.course)) list.push(r.course);
  });
  return map;
}

/** Cuenta → nombre (el primero no vacío). */
function studentNames_() {
  const names = {};
  studentRecords_().forEach(r => { if (r.nombre && !names[r.cuenta]) names[r.cuenta] = r.nombre; });
  return names;
}

/** W_Grupos → { ID_Curso: grupo } enriquecido con Course. */
function groupsMap_() {
  const courses = courseMap_();
  const map = {};
  Db.read(WEB.GROUPS).rows.forEach(row => {
    const id = cleanText_(row.ID_Curso);
    if (!id) return;
    const course = courses[id] || {};
    map[id] = {
      id,
      label: cleanText_(row.Etiqueta) || `${course.name || id} · ${course.group || ""}`,
      sheet: cleanText_(row.Hoja_Reporte),
      ciclo: normalizeCiclo_(row.Ciclo) || course.ciclo || "",
      active: toBool_(row.Activo),
      courseName: course.name || "",
      group: course.group || ""
    };
  });
  return map;
}

function requireGroup_(idCurso) {
  const group = groupsMap_()[cleanText_(idCurso)];
  if (!group) throw new Error("Ese grupo no está configurado en W_Grupos.");
  return group;
}
