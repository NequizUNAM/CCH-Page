
// ============================================================
// FECHAS Y HORAS
// ============================================================

/**
 * Fecha → "yyyy-MM-dd" usando la zona horaria de la HOJA.
 * Acepta celdas Date, "d/M/yyyy" y "yyyy-M-d". Devuelve "" si no es fecha.
 */
function normalizeDateKey_(value, tz) {
  if (value === null || value === undefined || value === "") return "";

  if (isDate_(value)) {
    if (isNaN(value.getTime())) return "";
    return Utilities.formatDate(value, tz || getSpreadsheetTz_(), "yyyy-MM-dd");
  }

  const text = String(value).trim();
  let day, month, year;

  let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    day = Number(match[1]); month = Number(match[2]); year = Number(match[3]);
  } else {
    match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return "";
    year = Number(match[1]); month = Number(match[2]); day = Number(match[3]);
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "2026-10-14" → "14/10/2026" (para mensajes). */
function formatDateKey_(dateKey) {
  const [y, m, d] = String(dateKey).split("-");
  return d && m && y ? `${Number(d)}/${m}/${y}` : String(dateKey);
}

/** Lista de fechas legible, recortada a 10 elementos. */
function formatDateList_(dateKeys) {
  const shown = dateKeys.slice(0, 10).map(formatDateKey_).join(", ");
  return dateKeys.length > 10 ? `${shown}…` : shown;
}

/**
 * Hora → minutos desde medianoche (los segundos ≥ 30 redondean hacia arriba).
 * Admite "7:23:29", "07:00", "7:00 - 9:00" (toma la primera hora),
 * "7:00 p.m.", celdas con formato de hora y fracciones de día.
 */
function timeToMinutes_(value) {
  if (value === null || value === undefined || value === "") return null;

  if (isDate_(value)) {
    if (isNaN(value.getTime())) return null;
    const parts = Utilities.formatDate(value, getSpreadsheetTz_(), "H:m:s").split(":").map(Number);
    return parts[0] * 60 + parts[1] + (parts[2] >= 30 ? 1 : 0);
  }

  if (typeof value === "number") {
    if (value >= 0 && value < 1) return Math.round(value * 24 * 60); // fracción de día
    if (value >= 0 && value <= 1439) return Math.round(value);         // ya en minutos
    return null;
  }

  const match = String(value).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap])\.?\s*m\.?)?/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;
  const meridiem = match[4] ? match[4].toLowerCase() : "";

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem === "p" ? 12 : 0);
  }

  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
}

function isEarlier_(timeA, timeB) {
  const a = timeToMinutes_(timeA);
  const b = timeToMinutes_(timeB);
  return a !== null && (b === null || a < b);
}

function minutesToText_(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

let TZ_CACHE_ = null;
function getSpreadsheetTz_() {
  if (!TZ_CACHE_) TZ_CACHE_ = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  return TZ_CACHE_;
}

function isDate_(value) {
  return Object.prototype.toString.call(value) === "[object Date]";
}

// ============================================================
// UTILIDADES DE HOJAS
// ============================================================

function requireSheet_(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error(`No se encontró la hoja '${name}'.`);
  return sheet;
}

function readHeaderRow_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(cleanText_);
}

/** Índice (0-based) de un encabezado, sin distinguir mayúsculas ni acentos. -1 si no existe. */
function findColumn_(headers, name) {
  const target = normalizeKey_(name);
  return headers.findIndex(header => normalizeKey_(header) === target);
}

/** Devuelve { nombre: índice } o lanza un error con las columnas que faltan. */
function requireColumns_(headers, names, sheetLabel) {
  const result = {};
  const missing = [];

  names.forEach(name => {
    const index = findColumn_(headers, name);
    if (index === -1) missing.push(name);
    else result[name] = index;
  });

  if (missing.length) {
    throw new Error(
      `'${sheetLabel}' debe contener las columnas: ${names.join(", ")}. Faltan: ${missing.join(", ")}.`
    );
  }
  return result;
}

/**
 * Lee, desde la fila 2, solo el tramo de columnas entre la menor y la
 * mayor de `colIndexes` (0-based). Evita leer columnas que no se usan.
 */
function readSpan_(sheet, colIndexes, options) {
  const opts = options || {};
  const start = Math.min.apply(null, colIndexes);
  const end = Math.max.apply(null, colIndexes);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return { start, values: [], display: [] };

  const range = sheet.getRange(2, start + 1, lastRow - 1, end - start + 1);
  return {
    start,
    values: opts.values ? range.getValues() : [],
    display: opts.display ? range.getDisplayValues() : []
  };
}

/** [2,3,4,7,8] → [[2,3,4],[7,8]] */
function groupContiguous_(indexes) {
  const sorted = indexes.slice().sort((a, b) => a - b);
  const groups = [];
  sorted.forEach(index => {
    const last = groups[groups.length - 1];
    if (last && index === last[last.length - 1] + 1) last.push(index);
    else groups.push([index]);
  });
  return groups;
}

/** Evita que dos sincronizaciones (menú y WebApp) escriban al mismo tiempo. */
function withScriptLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(SETTINGS.LOCK_TIMEOUT_MS)) {
    throw new Error("Hay otra sincronización en curso. Intenta de nuevo en unos segundos.");
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// UTILIDADES DE TEXTO
// ============================================================

function cleanText_(value) {
  return String(value ?? "").trim();
}

/** Minúsculas y sin acentos: "Sí" → "si", "Calificación" → "calificacion". */
function normalizeKey_(value) {
  return cleanText_(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Limpia y valida un número de cuenta. Devuelve solo dígitos, o ""
 * si el valor es basura (texto, marcadores de conflicto, vacío…).
 * Acepta espacios o comas de separación de miles.
 */
function limpiarCuenta_(value) {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "number") {
    if (!isFinite(value)) return "";
    return String(Math.trunc(value));
  }

  const text = String(value).trim().replace(/[\s,]/g, "").replace(/\.0+$/, "");
  return /^\d+$/.test(text) ? text : "";
}
// ============================================================
// CICLOS ESCOLARES (2 por año: 2027-1, 2027-2)
// ============================================================

/** "2025_2" → "2025-2", "2027-1" → "2027-1", 2026 → "2026" (sin semestre). */
function normalizeCiclo_(value) {
  const text = cleanText_(value);
  const match = text.match(/^(\d{4})\s*[-_/. ]\s*([12])$/);
  if (match) return `${match[1]}-${match[2]}`;
  if (/^\d{4}$/.test(text)) return text;
  return text;
}

/** Número para ordenar ciclos: 2027-1 → 20271, 2026 → 20260. */
function cicloRank_(ciclo) {
  const match = String(ciclo || "").match(/^(\d{4})(?:-([12]))?/);
  return match ? Number(match[1]) * 10 + Number(match[2] || 0) : 0;
}
