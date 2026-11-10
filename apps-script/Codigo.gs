/**
 * ============================================================
 * SISTEMA CCH — Apps Script (un solo archivo: Codigo.gs)
 * ============================================================
 * Pégalo completo en tu proyecto de Apps Script (reemplaza los demás
 * archivos .gs) y vuelve a implementar como "Nueva versión".
 *
 * ✏️ Lo que puedes ajustar está marcado con "AJUSTA AQUÍ":
 *    - Estados de asistencia (USE_RETARDO)
 *    - Columnas de las hojas (BASE_SHEETS, REPORT_COLUMNS)
 *    - Estatus de alumno (STUDENT_STATUSES) y tipos de evidencia
 *
 * CONTRASEÑA DE ADMIN: Configuración del proyecto ⚙️ →
 *   Propiedades de la secuencia de comandos → CCH_ADMIN_PASSWORD
 *   Mientras no exista, la de fábrica es 123456789 (el panel lo avisa).
 *
 * HOJAS
 *   AppSheet (pase de lista QR): Course, Students, Attendance Log, Roles
 *   Asistencia por grupo:        Reporte_*
 *   Web:                         W_* (las crea el sistema)
 *   Course también guarda, para la web: Hoja_Reporte (su hoja Reporte_) y Activo
 *
 * SECCIONES DE ESTE ARCHIVO
 *   Configuración · API · Sesiones · Tablas · Asistencia (sync) ·
 *   Pase de lista · Evaluación · Proyectos · Evidencias · Alumnos ·
 *   Mantenimiento · Enlaces · Diseño y migración · Utilidades
 * ============================================================
 */

const API_VERSION = "6.5.0";
const REPORT_PREFIX = "Reporte_";

const SHEETS = {
  ATTENDANCE: "Attendance Log",
  STUDENTS: "Students",
  COURSE: "Course"
};

/** Hojas nuevas de la web: nombre + encabezados (fila 1). */
const WEB = {
  COMPONENTS:  { name: "W_Componentes",    headers: ["ID", "ID_Curso", "Nombre", "Tipo", "Ponderacion", "Maximo", "Orden", "Fuente"] },
  GRADES:      { name: "W_Calificaciones", headers: ["ID_Curso", "Cuenta", "ID_Componente", "Valor", "Actualizado"] },
  PROJECTS:    { name: "W_Proyectos",      headers: ["ID", "ID_Curso", "Nombre", "Rubros", "ID_Componente", "Registro_Abierto", "Creado"] },
  TEAMS:       { name: "W_Equipos",        headers: ["ID_Equipo", "ID_Proyecto", "ID_Curso", "Nombre_Equipo", "Cuenta", "Registrado", "Registrado_Por"] },
  TEAM_EVALS:  { name: "W_EvalEquipos",    headers: ["ID_Equipo", "ID_Proyecto", "Estrellas", "Calificacion", "Observaciones", "Actualizado"] },
  EVIDENCE:    { name: "W_Evidencias",     headers: ["ID", "Cuenta", "ID_Curso", "Tipo", "Titulo", "Descripcion", "Archivo_URL", "Archivo_Nombre", "Enviado", "Estado", "Puntos", "ID_Componente", "Aplicado", "Nota"] },
  COMMENTS:    { name: "W_Comentarios",    headers: ["ID", "Cuenta", "ID_Curso", "Texto", "Fecha"] },
  // Enlace de columnas del Reporte_ con un componente, proyecto o promedio
  COLUMNS:     { name: "W_Columnas",       headers: ["ID_Curso", "Columna", "Tipo", "Ref"] },
  LINKS:       { name: "W_Enlaces",        headers: ["ID", "Titulo", "URL", "ID_Curso", "Orden", "Activo"] },
  // Resumen de cada alumno de los ciclos que se respaldaron y borraron
  HISTORY:     { name: "W_Historial",      headers: ["Cuenta", "Nombre", "ID_Curso", "Curso", "Grupo", "Ciclo", "Asistencias", "Faltas", "Final", "Comentarios", "Respaldo", "Fecha"], text: ["Ciclo"] }
};

// ============================================================
// ✏️ AJUSTA AQUÍ · COLUMNAS DE LAS HOJAS
//
// required: las usa el sistema; NO las quites.
// optional: se crean en una hoja nueva; quita las que no uses.
//           (en hojas existentes nunca se agregan ni se borran columnas)
// cycleKey: columna con el ID_Curso (para respaldar/borrar por ciclo).
// ============================================================
const BASE_SHEETS = [
  { name: "Course", cycleKey: "ID_Curso",
    required: ["ID_Curso", "Nombre Curso", "Grupo", "Horario", "Ciclo_Escolar", "Hoja_Reporte", "Activo"],
    optional: ["Description", "PDF Programas Estudio", "Image"] },
  { name: "Students", cycleKey: "Course",
    required: ["ID", "Cuenta", "First Name", "Email", "Course"],
    optional: ["Last Name", "Headshot", "Status", "Materias Cursadas"] },
  { name: "Attendance Log", cycleKey: "Course",
    required: ["id", "fk_id_student", "Cuenta", "Course", "Date", "Time"],
    optional: [] },
  { name: "Roles", cycleKey: "ID_Curso",
    required: ["ID", "ID_Curso", "Nombre", "Correo", "Rol"],
    optional: ["Date"] }
];
BASE_SHEETS.forEach(def => { def.headers = def.required.concat(def.optional); });

// Hojas Reporte_*: columnas antes de las fechas. Las fechas se agregan solas.
// Para que la hoja nueva traiga más columnas (ej. "Observaciones"), agrégalas aquí.
const REPORT_COLUMNS = ["Cuenta", "Nombre"];
// Nombres aceptados para la columna de nombre en reportes viejos
const REPORT_NAME_HEADERS = ["Nombre", "First Name"];

// ============================================================
// ✏️ AJUSTA AQUÍ · ESTATUS DEL ALUMNO (columna Status de Students)
// value = lo que se escribe en la hoja; label = lo que ves en la web
// ============================================================
const STUDENT_STATUSES = [
  { value: "", label: "Regular" },
  { value: "Acta", label: "Acta complementaria" },
  { value: "Reprobado", label: "Reprobado" },
  { value: "Alerta", label: "Alerta" },
  { value: "Baja", label: "Baja" }
];

/** Carpetas de la plantilla (junto a la hoja de cálculo). Se crean si faltan. */
const DRIVE_FOLDERS = [
  "Course_Files_", "Course_Images", "eventos_CCH", "Eventos_Images", "Horarios Profesor",
  "Logos", "Material_Archivos", "Material_Images", "notas_alumnos", "programas_estudio", "Students_Images"
];

/**
 * Tipos de componente de evaluación
 *   manual      lo capturas tú (parciales, sellos, Teams, tareas…)
 *   asistencia  se calcula: Asistencias / (Asistencias + Faltas) × 10
 *   proyectos   se calcula: promedio de los proyectos ligados a este componente
 */
const COMPONENT_TYPES = ["manual", "asistencia", "proyectos", "examen"];   // examen = Examenes.gs (Fuente = "Resultados …|parcial")

/** Plantilla por defecto al configurar un grupo nuevo (editable en la web). */
const DEFAULT_COMPONENTS = [
  { Nombre: "Parcial 1", Tipo: "manual",    Ponderacion: 25, Maximo: 10 },
  { Nombre: "Parcial 2", Tipo: "manual",    Ponderacion: 25, Maximo: 10 },
  { Nombre: "Parcial 3", Tipo: "manual",    Ponderacion: 25, Maximo: 10 },
  { Nombre: "Sellos",    Tipo: "manual",    Ponderacion: 10, Maximo: 15 },
  { Nombre: "Proyectos", Tipo: "proyectos", Ponderacion: 15, Maximo: 10 }
];

/** Rubros sugeridos para un proyecto nuevo (tomados de tu hoja Proyectos). */
const DEFAULT_RUBRICS = [
  "Trabajo en equipo",
  "Uso de materiales",
  "Funcionamiento - Creatividad",
  "Presentación y explicación"
];

const SETTINGS = {
  ADMIN_PASSWORD_KEY: "CCH_ADMIN_PASSWORD",
  FACTORY_PASSWORD: "123456789",                 // solo mientras NO exista CCH_ADMIN_PASSWORD (instalación nueva / demo)
  FACTORY_WORD: "RESTAURAR",
  EVIDENCE_FOLDER_KEY: "CCH_EVIDENCE_FOLDER_ID",
  EVIDENCE_FOLDER_NAME: "Evidencias_Alumnos",   // dentro de la carpeta de la hoja

  // ---- Ciclos y respaldos ----
  CURRENT_CYCLE_KEY: "CCH_CICLO_ACTUAL",        // opcional; si no existe se calcula por fecha
  BACKUP_PREFIX: "Respaldo_CCH_",
  CLEAN_PREFIX: "Limpieza_CCH_",
  PURGE_CONFIRM_WORD: "BORRAR",
  CLEAR_ALL_WORD: "BORRAR TODO",

  // ---- Sesiones ----
  ADMIN_TOKEN_TTL_S: 6 * 60 * 60,    // 6 h (máximo de CacheService)
  STUDENT_TOKEN_TTL_S: 2 * 60 * 60,  // 2 h
  LOGIN_MAX_ATTEMPTS: 5,             // intentos fallidos antes de bloquear
  LOGIN_LOCK_S: 10 * 60,             // bloqueo de 10 min
  // El alumno entra SOLO con su número de cuenta (no se pide correo ni contraseña)

  // ---- Equipos y evidencias ----
  MAX_TEAM_SIZE: 8,
  MAX_FILE_MB: 8,
  ALLOWED_MIME: /^(image\/(png|jpe?g|webp|heic|heif)|application\/pdf)$/i,
  EVIDENCE_TYPES: ["Extracurricular", "Evento", "Proyecto", "Actividad", "Otro"],

  // ---- Asistencia (v4) ----
  ATTENDANCE_TOLERANCE_MINUTES: 15,
  LOCK_TIMEOUT_MS: 20000,
  AUTO_INSERT_DATES: true,
  INSERT_WEEKDAYS: [0, 1, 2, 3, 4, 5, 6],
  MAX_NEW_DATE_COLUMNS: 62,
  DEFAULT_DATE_FORMAT: "d/MM/yyyy",
  LAST_DATE_PROP_PREFIX: "CCH_LAST_DATE_",
  DELETE_EMPTY_DATE_COLUMNS: true
};

// ============================================================
// ✏️ AJUSTA AQUÍ · ESTADOS DE ASISTENCIA
// Solo 3 estados: Asistencia, Falta y Justificante.
// (N/D lo pone la sincronización en días sin lista y luego se limpia.)
// Para volver a usar "Retardo", cambia USE_RETARDO a true.
// ============================================================
const STATUS = {
  ASISTENCIA: "Asistencia",
  RETARDO: "Retardo",
  FALTA: "Falta",
  JUSTIFICANTE: "Justificante",
  ND: "N/D"
};
const USE_RETARDO = false;

// Colores de celdas (paleta "subtle" de Bootstrap 5.3)
const STATUS_FILL = {
  [STATUS.ASISTENCIA]: "#D1E7DD",
  [STATUS.RETARDO]: "#FFF3CD",
  [STATUS.FALTA]: "#F8D7DA",
  [STATUS.JUSTIFICANTE]: "#CFF4FC",
  [STATUS.ND]: "#E9ECEF"
};
const STATUS_FONT = {
  [STATUS.ASISTENCIA]: "#0F5132",
  [STATUS.RETARDO]: "#664D03",
  [STATUS.FALTA]: "#842029",
  [STATUS.JUSTIFICANTE]: "#055160",
  [STATUS.ND]: "#6C757D"
};

const OVERWRITABLE_STATUS = new Set(["", "falta", "n/d"]);
const DELETABLE_STATUS = new Set(["falta", "n/d"]);
const VISIBLE_SYNONYMS = new Set(["visible", "show", "mostrar", "si", "true", "1"]);

const VISIBILITY_FILL_COLORS = {
  Visible: "#DBEAFE",
  Oculto: "#E5E7EB"
};

// "Buscar alumnos duplicados" escribe en estas columnas de Students (por nombre)
const DUPLICATES = {
  STATUS_HEADER: "Duplicado",   // columna propia; "Status" queda para tus estatus
  COURSES_HEADER: "Materias Cursadas"
};

const NO_DATE_COLUMNS_MESSAGE =
  "La hoja no tiene ninguna columna con fecha en la fila 2.\n\n" +
  "Agrega al menos una columna con una fecha (por ejemplo 14/10/2026) " +
  "y vuelve a sincronizar. A partir de esa columna se agregarán " +
  "automáticamente las fechas hasta el día de hoy.";


// ============================================================
// API WEB
//
// La web (GitHub Pages) envía POST con cuerpo JSON en text/plain
// (así no hay "preflight" CORS):  { action, token, ...params }
// Responde siempre JSON: { status: "success" | "error", ... }
//
// auth: "public" | "student" | "admin"
// lock: true → se ejecuta con LockService (escrituras en hojas W_*)
// ============================================================

// Se arma al momento de cada petición (no al cargar el archivo): así no
// importa en qué orden cargue Apps Script los archivos .gs.
function routes_() {
  // Tras guardar, reescribe las columnas enlazadas del Reporte_ del grupo
  const synced = (fn, idOf) => (p, ctx) => {
    const result = fn(p, ctx) || {};
    const id = idOf(p, result);
    if (id) result.message = (result.message || "") + afterGradesChange_(id);
    return result;
  };
  const byParam = p => cleanText_(p.idCurso);
  const byResult = (p, r) => r.idCurso;
  const bySheet = p => (Object.values(groupsMap_()).find(g => g.sheet === p.sheetName) || {}).id;

  return {
  // ---- Público ----
  ping:               { auth: "public",  fn: () => ({ message: "WebApp activo ✅", version: API_VERSION }) },
  studentLogin:       { auth: "public",  fn: studentLogin_ },
  adminLogin:         { auth: "public",  fn: adminLogin_ },
  logout:             { auth: "public",  fn: logout_ },

  // ---- Alumno ----
  studentData:        { auth: "student", fn: studentData_ },
  registerTeam:       { auth: "student", fn: studentRegisterTeam_, lock: true },
  uploadEvidence:     { auth: "student", fn: uploadEvidence_, lock: true },

  // ---- Administrador ----
  adminBootstrap:     { auth: "admin", fn: adminBootstrap_ },
  saveGroup:          { auth: "admin", fn: saveGroup_, lock: true },
  groupData:          { auth: "admin", fn: groupData_ },
  saveComponents:     { auth: "admin", fn: synced(saveComponents_, byParam), lock: true },
  saveGrades:         { auth: "admin", fn: synced(saveGrades_, byParam), lock: true },
  saveProject:        { auth: "admin", fn: synced(saveProject_, byParam), lock: true },
  deleteProject:      { auth: "admin", fn: synced(deleteProject_, byResult), lock: true },
  adminSaveTeam:      { auth: "admin", fn: synced(adminSaveTeam_, byResult), lock: true },
  deleteTeam:         { auth: "admin", fn: synced(deleteTeam_, byResult), lock: true },
  saveTeamEval:       { auth: "admin", fn: synced(saveTeamEval_, byResult), lock: true },
  listEvidence:       { auth: "admin", fn: listEvidence_ },
  reviewEvidence:     { auth: "admin", fn: synced(reviewEvidence_, byResult), lock: true },
  searchStudents:     { auth: "admin", fn: searchStudents_ },
  studentProfile:     { auth: "admin", fn: studentProfile_ },
  addComment:         { auth: "admin", fn: addComment_, lock: true },
  deleteComment:      { auth: "admin", fn: deleteComment_, lock: true },
  getReports:         { auth: "admin", fn: () => ({ reports: getReportSheets_() }) },
  createReportSheet:  { auth: "admin", fn: p => createReportSheet(p.reportName) },
  // syncAllData ya usa su propio candado
  syncAttendance:     { auth: "admin", fn: synced(p => syncAllData(p.sheetName), bySheet) },
  diagnose:           { auth: "admin", fn: p => diagnoseAttendance_(p.sheetName) },

  // ---- Pase de lista ----
  saveRollCall:       { auth: "admin", fn: synced(saveRollCall_, byParam), lock: true },

  // ---- Mantenimiento ----
  maintenanceInfo:    { auth: "admin", fn: maintenanceInfo_ },
  setupStructure:     { auth: "admin", fn: () => setupWeb_({ folders: true }), lock: true },
  setCurrentCycle:    { auth: "admin", fn: setCurrentCycle_, lock: true },
  backupPreview:      { auth: "admin", fn: backupPreview_ },
  backupCycles:       { auth: "admin", fn: backupCycles_, lock: true },
  clearTable:         { auth: "admin", fn: clearTable_, lock: true },
  factoryReset:       { auth: "admin", fn: factoryReset_, lock: true },

  // ---- Enlaces y altas ----
  saveLinks:          { auth: "admin", fn: saveLinks_, lock: true },
  createGroup:        { auth: "admin", fn: createGroup_, lock: true },
  addStudent:         { auth: "admin", fn: synced(addStudent_, byParam), lock: true },
  removeStudent:      { auth: "admin", fn: removeStudent_, lock: true },
  setStudentStatus:   { auth: "admin", fn: setStudentStatus_, lock: true },

  // ---- Columnas del reporte ----
  columnsInfo:        { auth: "admin", fn: p => columnsInfo_(p.idCurso) },
  saveColumns:        { auth: "admin", fn: saveColumns_, lock: true },
  addReportColumn:    { auth: "admin", fn: addReportColumn_, lock: true },
  deleteReportColumn: { auth: "admin", fn: deleteReportColumn_, lock: true }
  };
}

function doGet(e) {
  return handleRequest_((e && e.parameter) || {}, "GET");
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (error) {
    return jsonResponse_({ status: "error", message: "Solicitud inválida (JSON)." });
  }
  // Exámenes en línea (Examenes.gs) comparten esta misma URL /exec
  if (typeof Examenes !== "undefined" && Examenes.ACTIONS.indexOf(body.action) !== -1) return Examenes.handle(e);
  return handleRequest_(body, "POST");
}

function handleRequest_(params, method) {
  try {
    const action = params.action || "ping";
    const route = routes_()[action];
    if (!route) throw new Error(`Acción no soportada: ${action}`);

    // Por GET solo se permite "ping": contraseñas y tokens nunca viajan en la URL
    if (method === "GET" && action !== "ping") {
      throw new Error("Usa POST para esta acción.");
    }

    const ctx = {};
    if (route.auth === "admin") requireAdmin_(params.token);
    if (route.auth === "student") ctx.cuenta = requireStudent_(params.token);

    const run = () => route.fn(params, ctx) || {};
    const result = route.lock ? withScriptLock_(run) : run();

    return jsonResponse_(Object.assign({ status: "success" }, result));
  } catch (error) {
    return jsonResponse_({
      status: "error",
      message: error.message || String(error),
      code: error.code || ""
    });
  }
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Error con código para que la web reaccione (p. ej. AUTH → cerrar sesión). */
function appError_(message, code) {
  const error = new Error(message);
  error.code = code || "";
  return error;
}

// ============================================================
// REPORTES (lista de hojas Reporte_*)
// ============================================================

function getReportSheets_() {
  return SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()
    .map(sheet => sheet.getName())
    .filter(isReportSheetName_)
    .map(name => ({ name, label: formatReportLabel_(name) }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

function formatReportLabel_(sheetName) {
  return sheetName
    .replace(new RegExp(`^${REPORT_PREFIX}`, "i"), "")
    .replace(/_/g, " ")
    .trim() || sheetName;
}

function normalizeVisibilityValue_(value) {
  return VISIBLE_SYNONYMS.has(normalizeKey_(value)) ? "Visible" : "Oculto";
}

function isReportSheetName_(sheetName) {
  return String(sheetName || "").toLowerCase().startsWith(REPORT_PREFIX.toLowerCase());
}

function validateReportSheetName_(sheetName) {
  if (!sheetName) throw new Error("Falta el nombre de la hoja.");
  if (!isReportSheetName_(sheetName)) throw new Error("Solo se permite consultar hojas de reporte.");
}

// ============================================================
// MENÚ: preparar hojas W_* y ligar grupos con sus reportes
// ============================================================

function menuSetupWeb() {
  const ui = SpreadsheetApp.getUi();
  try {
    const result = withScriptLock_(() => setupWeb_({ folders: true }));
    ui.alert(
      "🌐 Hojas de la web",
      (result.created.length ? `Hojas base creadas: ${result.created.join(", ")}\n\n` : "") +
      (result.folders.length ? `Carpetas creadas: ${result.folders.join(", ")}\n\n` : "") +
      (result.missingColumns.length ? `⚠️ Columnas faltantes (no se modificó la hoja):\n${result.missingColumns.map(m => `• ${m.sheet}: ${m.columns.join(", ")}`).join("\n")}\n\n` : "") +
      `Hojas de la web listas: ${result.sheets.join(", ")}\n\n` +
      (result.linked.length
        ? `Grupos ligados automáticamente:\n${result.linked.map(g => `• ${g.ID_Curso} → ${g.Hoja_Reporte}`).join("\n")}`
        : "No se ligaron grupos nuevos (revisa W_Grupos)."),
      ui.ButtonSet.OK
    );
  } catch (error) {
    ui.alert("❌ Error", error.message, ui.ButtonSet.OK);
  }
}

/**
 * Crea lo que falte: hojas base (plantilla Attendance Log), hojas W_*
 * y, con options.folders, las carpetas de la plantilla junto a la hoja.
 * Si W_Grupos está vacía, liga cada hoja Reporte_* con su curso usando
 * la misma lógica que la sincronización.
 */
function setupWeb_(options) {
  const opts = options || {};
  const base = ensureBaseSheets_();
  const sheets = Object.keys(WEB).map(key => Db.sheet(WEB[key]).getName());
  const folders = opts.folders ? ensureFolders_() : [];
  const linked = [];

  ensureCourseWebColumns_();
  upgradeIntegerLinks_();
  pairAllComponentColumns_();
  try { ensureDemoOnFirstInstall_(); } catch (e) { console.error(e); }

  // Hojas Reporte_ que ningún curso tiene ligadas → se ligan al curso detectado (si no tiene hoja)
  const courses = courseMap_();
  const usedSheets = new Set(Object.values(courses).map(c => c.sheet).filter(Boolean));
  const studentCourses = studentCourseMap_();
  getReportSheets_().forEach(report => {
    if (usedSheets.has(report.name)) return;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(report.name);
    let accounts = [];
    try { accounts = readReport_(sheet).students.map(s => s.account); } catch (e) { /* hoja vacía */ }
    const match = findReportCourseId_(report.name, courses, accounts, studentCourses);
    if (!match.courseId || courses[match.courseId].sheet || linked.some(g => g.ID_Curso === match.courseId)) return;
    updateCourse_(match.courseId, { Hoja_Reporte: report.name, Activo: true });
    linked.push({ ID_Curso: match.courseId, Hoja_Reporte: report.name });
  });

  return { sheets, linked, created: base.created, missingColumns: base.missingColumns, folders };
}


// ============================================================
// SESIONES
//
// - Admin: contraseña en la propiedad CCH_ADMIN_PASSWORD → token (6 h)
// - Alumno: SOLO número de cuenta registrado en Students → token (2 h)
// Los tokens viven en CacheService; nunca se guarda la contraseña.
// Tras LOGIN_MAX_ATTEMPTS intentos fallidos se bloquea LOGIN_LOCK_S segundos.
// ============================================================

function adminLogin_(params) {
  const cache = CacheService.getScriptCache();
  const rateKey = "fail_admin";
  checkRateLimit_(cache, rateKey);

  const expected = adminPassword_();
  if (String(params.password || "") !== expected.value) {
    registerFailure_(cache, rateKey);
    throw new Error("Contraseña incorrecta.");
  }

  cache.remove(rateKey);
  const token = Utilities.getUuid();
  cache.put("adm_" + token, "1", SETTINGS.ADMIN_TOKEN_TTL_S);

  // Primer ingreso: asegura que existan las hojas W_*
  withScriptLock_(() => setupWeb_());

  return { token, expiresIn: SETTINGS.ADMIN_TOKEN_TTL_S, factoryPassword: expected.factory };
}

function requireAdmin_(token) {
  if (!token || !CacheService.getScriptCache().get("adm_" + token)) {
    throw appError_("Tu sesión de administrador expiró. Vuelve a entrar.", "AUTH");
  }
}

function studentLogin_(params) {
  const cuenta = limpiarCuenta_(params.cuenta);
  if (!cuenta) throw new Error("Escribe tu número de cuenta (solo dígitos).");

  const cache = CacheService.getScriptCache();
  const rateKey = "fail_stu_" + cuenta;
  checkRateLimit_(cache, rateKey);

  const records = studentRecords_().filter(r => r.cuenta === cuenta);
  if (!records.length) {
    registerFailure_(cache, rateKey);
    throw new Error("No encontramos ese número de cuenta. Revisa que esté bien escrito.");
  }

  cache.remove(rateKey);
  const token = Utilities.getUuid();
  cache.put("stu_" + token, cuenta, SETTINGS.STUDENT_TOKEN_TTL_S);

  return { token, cuenta, nombre: records[0].nombre, expiresIn: SETTINGS.STUDENT_TOKEN_TTL_S };
}

function requireStudent_(token) {
  const cuenta = token ? CacheService.getScriptCache().get("stu_" + token) : null;
  if (!cuenta) throw appError_("Tu sesión expiró. Vuelve a entrar con tu número de cuenta.", "AUTH");
  return cuenta;
}

function logout_(params) {
  if (params.token) {
    const cache = CacheService.getScriptCache();
    cache.remove("adm_" + params.token);
    cache.remove("stu_" + params.token);
  }
  return { message: "Sesión cerrada." };
}

function checkRateLimit_(cache, key) {
  const fails = Number(cache.get(key) || 0);
  if (fails >= SETTINGS.LOGIN_MAX_ATTEMPTS) {
    throw new Error(`Demasiados intentos. Espera ${Math.round(SETTINGS.LOGIN_LOCK_S / 60)} minutos.`);
  }
}

function registerFailure_(cache, key) {
  const fails = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(fails), SETTINGS.LOGIN_LOCK_S);
}



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
      sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
      this._textFormat(def, sheet, 2, sheet.getMaxRows() - 1);
      formatTableSheet_(sheet);
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

  /** Columnas de texto (ej. Ciclo "2027-1", que Sheets convertiría en fecha). */
  _textFormat(def, sheet, startRow, numRows) {
    (def.text || []).forEach(name => {
      const col = def.headers.indexOf(name);
      if (col !== -1 && numRows > 0) sheet.getRange(startRow, col + 1, numRows, 1).setNumberFormat("@");
    });
  },

  append(def, objects) {
    if (!objects.length) return;
    const table = this.read(def);
    const matrix = objects.map(obj => table.headers.map(h => toCell_(obj[h])));
    const start = table.sheet.getLastRow() + 1;
    this._textFormat(def, table.sheet, start, matrix.length);
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
    this._textFormat(def, sheet, 2, matrix.length);
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
    this._textFormat(def, table.sheet, obj._row, 1);
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

/** Empieza con letra: un id como "12e45" Sheets lo convertiría en número. */
function shortId_() {
  return "k" + Utilities.getUuid().replace(/-/g, "").slice(0, 9);
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
        iSchedule = col("Horario"), iCiclo = col("Ciclo_Escolar"),
        iSheet = col("Hoja_Reporte"), iActive = col("Activo");

  const map = {};
  data.slice(1).forEach(row => {
    const id = cleanText_(row[iId]);
    if (!id) return;
    map[id] = {
      id,
      name: iName !== -1 ? cleanText_(row[iName]) : id,
      group: iGroup !== -1 ? cleanText_(row[iGroup]) : "",
      schedule: iSchedule !== -1 ? cleanText_(row[iSchedule]) : "",
      ciclo: iCiclo !== -1 ? normalizeCiclo_(row[iCiclo]) : "",
      sheet: iSheet !== -1 ? cleanText_(row[iSheet]) : "",
      active: iActive !== -1 ? toBool_(row[iActive]) : false
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
        iEmail = col("Email"), iCourse = col("Course"), iStatus = col("Status");

  const records = [];
  data.slice(1).forEach(row => {
    const cuenta = limpiarCuenta_(row[iCuenta]);
    if (!cuenta) return;
    records.push({
      cuenta,
      nombre: [iFirst !== -1 ? row[iFirst] : "", iLast !== -1 ? row[iLast] : ""].map(cleanText_).filter(Boolean).join(" "),
      email: iEmail !== -1 ? cleanText_(row[iEmail]) : "",
      course: iCourse !== -1 ? cleanText_(row[iCourse]) : "",
      status: iStatus !== -1 ? cleanText_(row[iStatus]) : ""
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

/** Grupos de la web = filas de Course (Hoja_Reporte y Activo viven en Course). */
function groupsMap_() {
  const map = {};
  Object.values(courseMap_()).forEach(c => {
    map[c.id] = {
      id: c.id,
      label: `${c.name || c.id} · ${c.group || ""}`.trim(),
      sheet: c.sheet,
      ciclo: c.ciclo,
      active: c.active,
      courseName: c.name,
      group: c.group
    };
  });
  return map;
}

/**
 * Escribe celdas de una fila de Course por nombre de columna.
 * data: { Hoja_Reporte: "...", Activo: true, Ciclo_Escolar: "2027-1" }
 */
function updateCourse_(idCurso, data) {
  const sheet = requireSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEETS.COURSE);
  ensureCourseWebColumns_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(cleanText_);
  const iId = findColumn_(headers, "ID_Curso");
  const r = values.findIndex((row, i) => i > 0 && cleanText_(row[iId]) === idCurso);
  if (r === -1) throw new Error(`No existe ${idCurso} en Course.`);
  Object.keys(data).forEach(key => {
    const c = findColumn_(headers, key);
    if (c === -1) return;
    const cell = sheet.getRange(r + 1, c + 1);
    if (key === "Ciclo_Escolar") cell.setNumberFormat("@");
    cell.setValue(data[key]);
  });
  delete Db._cache.__courses;
}

/**
 * Agrega a Course las columnas Hoja_Reporte y Activo si faltan y, si aún
 * existe la hoja W_Grupos (versiones anteriores), copia sus datos y la borra.
 */
function ensureCourseWebColumns_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const course = spreadsheet.getSheetByName(SHEETS.COURSE);
  if (!course) return { added: [], moved: 0 };
  const width = Math.max(course.getLastColumn(), 1);
  const headers = course.getRange(1, 1, 1, width).getValues()[0].map(cleanText_);
  const added = ["Hoja_Reporte", "Activo"].filter(h => findColumn_(headers, h) === -1);
  if (added.length) {
    course.getRange(1, headers.filter(Boolean).length + 1, 1, added.length).setValues([added]).setFontWeight("bold");
    delete Db._cache.__courses;
  }

  let moved = 0;
  const old = spreadsheet.getSheetByName("W_Grupos");
  if (old && old.getLastRow() > 1) {
    const rows = old.getDataRange().getValues();
    const h = rows[0].map(cleanText_);
    const all = course.getDataRange().getValues();
    const ch = all[0].map(cleanText_);
    const iId = findColumn_(ch, "ID_Curso"), iSheet = findColumn_(ch, "Hoja_Reporte"),
          iActive = findColumn_(ch, "Activo"), iCiclo = findColumn_(ch, "Ciclo_Escolar");
    rows.slice(1).forEach(r => {
      const id = cleanText_(r[findColumn_(h, "ID_Curso")]);
      const at = all.findIndex((x, i) => i > 0 && cleanText_(x[iId]) === id);
      if (at === -1) return;
      course.getRange(at + 1, iSheet + 1).setValue(cleanText_(r[findColumn_(h, "Hoja_Reporte")]));
      course.getRange(at + 1, iActive + 1).setValue(toBool_(r[findColumn_(h, "Activo")]));
      const ciclo = normalizeCiclo_(r[findColumn_(h, "Ciclo")]);
      if (/^\d{4}-[12]$/.test(ciclo) && !/^\d{4}-[12]$/.test(normalizeCiclo_(all[at][iCiclo]))) {
        course.getRange(at + 1, iCiclo + 1).setNumberFormat("@").setValue(ciclo);
      }
      moved++;
    });
  }
  if (old) spreadsheet.deleteSheet(old);
  delete Db._cache.__courses;
  return { added, moved };
}

function requireGroup_(idCurso) {
  const group = groupsMap_()[cleanText_(idCurso)];
  if (!group) throw new Error("Ese grupo no está configurado en W_Grupos.");
  return group;
}


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
          ? `Horario del curso: ${info.scheduleText}` + (USE_RETARDO ? ` (Retardo después de ${minutesToText_(info.scheduleMinutes + SETTINGS.ATTENDANCE_TOLERANCE_MINUTES)})` : "") + " ✅"
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

  // Columnas mínimas (REPORT_COLUMNS) + la fecha de hoy; las demás fechas las agrega la sync
  const tz = spreadsheet.getSpreadsheetTimeZone();
  const today = Utilities.parseDate(Utilities.formatDate(new Date(), tz, "yyyy-MM-dd"), tz, "yyyy-MM-dd");
  const headers = REPORT_COLUMNS.concat([today]);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers.map(() => "Visible")]);
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, headers.length).setNumberFormat(SETTINGS.DEFAULT_DATE_FORMAT);
  formatReportSheet_(sheet);

  return { sheetName, message: "Plantilla creada correctamente ✅" };
}

// ============================================================
// FORMATO
// ============================================================

// El formato de las hojas (encabezados, colores de estados, listas
// desplegables) está en formatReportSheet_ / formatTableSheet_ (sección DISEÑO).

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
  // Las fechas nuevas siempre se crean visibles
  const visibility = "Visible";

  sheet.getRange(1, firstNewColumn, 1, count)
    .setValues([dateKeys.map(() => visibility)])
    .setBackground(VISIBILITY_FILL_COLORS[visibility]);
  sheet.getRange(3, firstNewColumn, Math.max(sheet.getMaxRows() - 2, 1), count).setDataValidation(statusValidation_());

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
// 4. Registro después de la tolerancia → "Retardo" (solo si USE_RETARDO)
//
// Se vuelven a evaluar las celdas vacías, "Falta" o "N/D".
// "Asistencia", "Justificante" o cualquier texto manual NO se tocan.
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

  if (!USE_RETARDO) return STATUS.ASISTENCIA;
  return entryMinutes <= row.scheduleMinutes + tolerance ? STATUS.ASISTENCIA : STATUS.RETARDO;
}

/**
 * Escribe SOLO en los bloques de columnas de fecha que tienen cambios
 * (normalmente uno). Por bloque: 2 lecturas (fórmulas y fondos) y
 * 2 escrituras (valores y fondos). Las celdas con fórmula se respetan.
 */
function writeStatusChanges_(sheet, report, changes) {
  const counts = { [STATUS.ASISTENCIA]: 0, [STATUS.RETARDO]: 0, [STATUS.FALTA]: 0, [STATUS.JUSTIFICANTE]: 0, [STATUS.ND]: 0 };
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
          (USE_RETARDO ? `Retardo ${result.counts[STATUS.RETARDO]}, ` : "") +
          `Falta ${result.counts[STATUS.FALTA]}, N/D ${result.counts[STATUS.ND]}.`
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
//   Reporte_MATERIA_101, Reporte_MATERIA_102 …
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

  // Columnas destino por nombre (se crean al final si no existen)
  const columnFor = header => {
    let index = findColumn_(headers, header);
    if (index === -1) {
      index = studentsSheet.getLastColumn();
      studentsSheet.getRange(1, index + 1).setValue(header).setFontWeight("bold");
    }
    return index + 1;
  };
  const statusColumn = columnFor(DUPLICATES.STATUS_HEADER);
  const coursesColumn = columnFor(DUPLICATES.COURSES_HEADER);

  studentsSheet.getRange(2, statusColumn, rowCount, 1)
    .setValues(statusValues)
    .setBackgrounds(statusFills);
  studentsSheet.getRange(2, coursesColumn, rowCount, 1).setValues(courseValues);

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


// ============================================================
// PASE DE LISTA DESDE LA WEB (solo admin)
//
// Escribe el estado directamente en la hoja Reporte_* del grupo:
//   - Si no existe la columna de esa fecha, la inserta en orden.
//   - Si el alumno no está en el reporte (pero sí inscrito), agrega su fila.
// Y deja un registro en Attendance Log (id "web_…") para cada Asistencia,
// así la sincronización y AppSheet coinciden con lo que marcaste:
//   Asistencia   → registro a la hora de inicio del curso
//   Falta        → sin registro
//   Justificante → sin registro (la sync nunca lo sobrescribe)
// Si el alumno escaneó su QR ese día, su registro real se conserva.
// ============================================================

function rollStatuses_() {
  return USE_RETARDO
    ? [STATUS.ASISTENCIA, STATUS.RETARDO, STATUS.FALTA, STATUS.JUSTIFICANTE]
    : [STATUS.ASISTENCIA, STATUS.FALTA, STATUS.JUSTIFICANTE];
}
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
    const status = rollStatuses_().find(s => normalizeKey_(s) === normalizeKey_(m.status)) || "";
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
    backgrounds[r][0] = STATUS_FILL[m.status] || "#FFFFFF";
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
    anchor = Math.max(report.accountIndex, findNameColumn_(report.headers));
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
  sheet.getRange(3, newCol, Math.max(sheet.getMaxRows() - 2, 1), 1).setDataValidation(statusValidation_());
  return newCol - 1;
}

/** Agrega al final del reporte a los inscritos que aún no tienen fila. */
function addMissingStudents_(sheet, report, marks) {
  const present = new Set(report.students.map(s => s.account));
  const missing = marks.filter(m => m.status && !present.has(m.cuenta));
  if (!missing.length) return;

  const names = studentNames_();
  const width = sheet.getLastColumn();
  const nameIndex = findNameColumn_(report.headers);
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
    if ((m.status !== STATUS.ASISTENCIA && m.status !== STATUS.RETARDO) || realScan.has(m.cuenta)) return;
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


// ============================================================
// EVALUACIÓN POR GRUPO
//
// Cada grupo (ID_Curso) tiene sus propios componentes con ponderación:
//   W_Componentes: ID | ID_Curso | Nombre | Tipo | Ponderacion | Maximo | Orden
// Las calificaciones capturadas a mano viven en W_Calificaciones
// (una fila por alumno × componente). "Maximo" es la escala de captura
// (10 para un examen, 15 para sellos, 100 para Teams…); se convierte a 10.
//
// Calificación final (sobre lo evaluado):
//   Σ(calif10 × ponderación) / Σ(ponderación de los componentes con calificación)
// Calificación final (estricta, lo no evaluado cuenta 0):
//   Σ(calif10 × ponderación) / Σ(todas las ponderaciones)
// ============================================================

// ---------- Asistencia leída de la hoja Reporte_* ----------

/**
 * Lee una hoja Reporte_* y devuelve columnas de fecha, otras columnas
 * (Parcial_1… heredadas) y, por alumno, sus estados y conteos.
 */
function reportAttendance_(sheetName) {
  const cacheKey = "__rep_" + sheetName;
  if (Db._cache[cacheKey] !== undefined) return Db._cache[cacheKey];

  const sheet = sheetName ? SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName) : null;
  if (!sheet || sheet.getLastRow() < 2) return (Db._cache[cacheKey] = null);

  const range = sheet.getDataRange();
  const values = range.getValues();
  const display = range.getDisplayValues();
  const tz = getSpreadsheetTz_();

  const headers = display[1].map(cleanText_);
  const accountIndex = findColumn_(headers, "Cuenta");
  if (accountIndex === -1) return (Db._cache[cacheKey] = null);
  const nameIndex = findNameColumn_(headers);

  const dates = [];
  const others = [];
  headers.forEach((header, index) => {
    if (index === accountIndex || index === nameIndex) return;
    const visible = normalizeVisibilityValue_(display[0][index]) === "Visible";
    const key = normalizeDateKey_(values[1][index], tz);
    if (key) dates.push({ index, key, label: formatShortDate_(key), visible });
    else if (header) others.push({ index, label: header, visible });
  });

  const order = [];
  const rows = {};
  for (let r = 2; r < values.length; r++) {
    const cuenta = limpiarCuenta_(values[r][accountIndex]);
    if (!cuenta || rows[cuenta]) continue;
    const statuses = dates.map(d => cleanText_(display[r][d.index]));
    order.push(cuenta);
    rows[cuenta] = {
      nombre: nameIndex !== -1 ? cleanText_(display[r][nameIndex]) : "",
      statuses,
      others: others.map(o => cleanText_(display[r][o.index])),
      counts: countStatuses_(statuses)
    };
  }

  return (Db._cache[cacheKey] = { sheetName, dates, others, order, rows });
}

/** Retardo (si existe en datos viejos) cuenta como asistencia. */
function countStatuses_(statuses) {
  const counts = { asistencia: 0, falta: 0, justificante: 0, nd: 0, otro: 0 };
  statuses.forEach(value => {
    const key = normalizeKey_(value);
    if (!key) return;
    if (key === "asistencia" || key === "retardo") counts.asistencia++;
    else if (key === "falta") counts.falta++;
    else if (key === "justificante" || key === "justificada" || key === "justificado") counts.justificante++;
    else if (key === "n/d") counts.nd++;
    else counts.otro++;
  });
  return counts;
}

/** Asistencias / (Asistencias + Faltas) × 10. Los justificantes no cuentan en contra. */
function attendanceScore_(counts) {
  if (!counts) return null;
  const total = counts.asistencia + counts.falta;
  return total ? counts.asistencia / total * 10 : null;
}

function formatShortDate_(key) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}`;
}

// ---------- Componentes ----------

function componentsFor_(idCurso) {
  return Db.read(WEB.COMPONENTS).rows
    .filter(r => cleanText_(r.ID_Curso) === idCurso)
    .map(r => ({
      id: cleanText_(r.ID),
      nombre: cleanText_(r.Nombre),
      tipo: COMPONENT_TYPES.includes(cleanText_(r.Tipo)) ? cleanText_(r.Tipo) : "manual",
      ponderacion: toNumberOrNull_(r.Ponderacion) || 0,
      maximo: toNumberOrNull_(r.Maximo) || 10,
      orden: toNumberOrNull_(r.Orden) || 0,
      fuente: cleanText_(r.Fuente)
    }))
    .sort((a, b) => a.orden - b.orden);
}

function saveComponents_(params) {
  const idCurso = cleanText_(params.idCurso);
  requireGroup_(idCurso);

  const list = Array.isArray(params.components) ? params.components : [];
  if (!list.length) throw new Error("Agrega al menos un componente.");

  const seen = new Set();
  const newRows = list.map((c, i) => {
    const nombre = cleanText_(c.nombre).slice(0, 60);
    const tipo = cleanText_(c.tipo);
    const ponderacion = toNumberOrNull_(c.ponderacion);
    const maximo = tipo === "manual" ? toNumberOrNull_(c.maximo) : 10;

    if (!nombre) throw new Error(`El componente ${i + 1} no tiene nombre.`);
    if (seen.has(normalizeKey_(nombre))) throw new Error(`Nombre repetido: "${nombre}".`);
    seen.add(normalizeKey_(nombre));
    if (!COMPONENT_TYPES.includes(tipo)) throw new Error(`Tipo inválido en "${nombre}".`);
    if (ponderacion === null || ponderacion < 0 || ponderacion > 100) throw new Error(`Ponderación inválida en "${nombre}" (0 a 100).`);
    if (!maximo || maximo <= 0 || maximo > 1000) throw new Error(`Máximo inválido en "${nombre}".`);
    const fuente = tipo === "examen" ? cleanText_(c.fuente) : "";
    if (tipo === "examen" && !examSources_().some(x => x.id === fuente)) throw new Error(`Elige el examen y parcial de "${nombre}".`);

    return {
      ID: cleanText_(c.id) || shortId_(),
      ID_Curso: idCurso,
      Nombre: nombre,
      Tipo: tipo,
      Ponderacion: ponderacion,
      Maximo: maximo,
      Orden: i + 1,
      Fuente: fuente
    };
  });

  const before = componentsFor_(idCurso);
  const others = Db.read(WEB.COMPONENTS).rows.filter(r => cleanText_(r.ID_Curso) !== idCurso);
  Db.writeAll(WEB.COMPONENTS, others.concat(newRows));

  // Componente ⇄ columna del reporte: borrar, renombrar o crear la columna enlazada
  let notes = [];
  try { notes = pairComponentColumns_(idCurso, before); } catch (e) { notes = [`(No se pudo ajustar el reporte: ${e.message})`]; }

  const total = newRows.reduce((sum, r) => sum + r.Ponderacion, 0);
  return {
    components: componentsFor_(idCurso),
    message: (total === 100
      ? "Ponderaciones guardadas ✅"
      : `Guardado. Ojo: las ponderaciones suman ${total}% (se normalizan al calcular).`) + (notes.length ? " " + notes.join(" ") : "")
  };
}

// ---------- Calificaciones capturadas ----------

/** cuenta → idComponente → valor (escala del componente). */
function gradesFor_(idCurso) {
  const map = {};
  Db.read(WEB.GRADES).rows.forEach(r => {
    if (cleanText_(r.ID_Curso) !== idCurso) return;
    const cuenta = limpiarCuenta_(r.Cuenta);
    const value = toNumberOrNull_(r.Valor);
    if (!cuenta || value === null) return;
    (map[cuenta] || (map[cuenta] = {}))[cleanText_(r.ID_Componente)] = value;
  });
  return map;
}

/**
 * entries: [{ cuenta, componentId, valor }]  valor "" → borra la calificación.
 */
function saveGrades_(params) {
  const idCurso = cleanText_(params.idCurso);
  requireGroup_(idCurso);

  const components = {};
  componentsFor_(idCurso).forEach(c => { components[c.id] = c; });

  const table = Db.read(WEB.GRADES);
  const keyOf = (cuenta, compId) => `${cuenta}|${compId}`;
  const index = {};
  const rows = [];
  table.rows.forEach(r => {
    const copy = Object.assign({}, r);
    rows.push(copy);
    if (cleanText_(r.ID_Curso) === idCurso) index[keyOf(limpiarCuenta_(r.Cuenta), cleanText_(r.ID_Componente))] = copy;
  });

  const errors = [];
  let saved = 0, removed = 0;
  const now = new Date();

  (params.entries || []).forEach(entry => {
    const cuenta = limpiarCuenta_(entry.cuenta);
    const comp = components[cleanText_(entry.componentId)];
    if (!cuenta || !comp) return errors.push(`Registro inválido (${entry.cuenta}).`);
    if (comp.tipo !== "manual" && comp.tipo !== "examen") return errors.push(`"${comp.nombre}" se calcula solo; no se captura.`);

    const key = keyOf(cuenta, comp.id);
    const raw = cleanText_(entry.valor);

    if (raw === "") {
      if (index[key]) { index[key]._delete = true; removed++; }
      return;
    }

    const value = toNumberOrNull_(raw);
    if (value === null || value < 0 || value > comp.maximo) {
      return errors.push(`${cuenta} · ${comp.nombre}: "${raw}" fuera de 0–${comp.maximo}.`);
    }

    if (index[key]) {
      index[key].Valor = value;
      index[key].Actualizado = now;
      delete index[key]._delete;
    } else {
      const row = { ID_Curso: idCurso, Cuenta: cuenta, ID_Componente: comp.id, Valor: value, Actualizado: now };
      rows.push(row);
      index[key] = row;
    }
    saved++;
  });

  if (saved || removed) Db.writeAll(WEB.GRADES, rows.filter(r => !r._delete));

  return {
    saved, removed, errors,
    message: `Guardado: ${saved} calificación(es)${removed ? `, ${removed} borrada(s)` : ""}.` +
      (errors.length ? ` ${errors.length} con error.` : "")
  };
}

// ---------- Lista de alumnos de un grupo ----------

/** Orden del reporte primero; luego inscritos en Students que no estén en el reporte. */
function rosterFor_(idCurso, attendance) {
  const names = studentNames_();
  const list = [];
  const seen = new Set();

  if (attendance) {
    attendance.order.forEach(cuenta => {
      seen.add(cuenta);
      list.push({ cuenta, nombre: names[cuenta] || attendance.rows[cuenta].nombre || "" });
    });
  }

  studentRecords_()
    .filter(r => r.course === idCurso && !seen.has(r.cuenta))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .forEach(r => {
      seen.add(r.cuenta);
      list.push({ cuenta: r.cuenta, nombre: r.nombre });
    });

  return list;
}

// ---------- Cálculo ----------

/**
 * Calcula, por alumno y componente: base, puntos extra aplicados,
 * calificación en escala 10 y calificación final.
 * onlyCuenta: limita el resultado a un alumno (vista del alumno).
 */
function computeCourse_(idCurso, onlyCuenta) {
  const group = requireGroup_(idCurso);
  const components = componentsFor_(idCurso);
  const grades = gradesFor_(idCurso);
  const attendance = reportAttendance_(group.sheet);
  const projects = projectGradesFor_(idCurso);
  const bonus = appliedBonusFor_(idCurso);

  let roster = rosterFor_(idCurso, attendance);
  if (onlyCuenta) roster = roster.filter(s => s.cuenta === onlyCuenta);

  const totalWeight = components.reduce((sum, c) => sum + c.ponderacion, 0);

  const students = roster.map(student => {
    const att = attendance && attendance.rows[student.cuenta];
    const items = {};
    let weighted = 0, evaluatedWeight = 0;

    components.forEach(comp => {
      let base = null;

      if (comp.tipo === "manual") {
        const value = grades[student.cuenta] && grades[student.cuenta][comp.id];
        base = value === undefined ? null : value;
      } else if (comp.tipo === "examen") {
        // El examen en línea manda; si no lo presentó en línea, cuenta lo capturado a mano (ej. examen en papel)
        const nota = examGrades_(comp.fuente)[student.cuenta];
        const manual = grades[student.cuenta] && grades[student.cuenta][comp.id];
        base = nota !== undefined ? nota : manual === undefined ? null : manual;
      } else if (comp.tipo === "asistencia") {
        base = attendanceScore_(att && att.counts);
      } else if (comp.tipo === "proyectos") {
        // Por proyecto ligado: la calificación de su equipo si ya se evaluó;
        // 0 si NO tiene equipo y el registro ya está cerrado; si no, aún no cuenta.
        const mine = projects.byCuenta[student.cuenta] || {};
        const memberOf = projects.membership[student.cuenta] || {};
        const scores = [];
        projects.list
          .filter(p => p.componentId === comp.id && projects.evaluated.has(p.id))
          .forEach(p => {
            if (mine[p.id] !== undefined) scores.push(mine[p.id]);
            else if (!memberOf[p.id] && !p.abierto) scores.push(0);
          });
        if (scores.length) base = scores.reduce((a, b) => a + b, 0) / scores.length;
      }

      const bonusItems = (bonus[student.cuenta] && bonus[student.cuenta][comp.id]) || [];
      const bonusPoints = bonusItems.reduce((sum, b) => sum + b.puntos, 0);
      const raw = base === null ? null : Math.min(base + bonusPoints, comp.maximo);
      const score10 = raw === null ? null : raw / comp.maximo * 10;

      if (score10 !== null && comp.ponderacion > 0) {
        weighted += score10 * comp.ponderacion;
        evaluatedWeight += comp.ponderacion;
      }

      items[comp.id] = {
        base: round_(base, 2),
        bonus: round_(bonusPoints, 2),
        bonusItems,
        raw: round_(raw, 2),
        score10: round_(score10, 2)
      };
    });

    return {
      cuenta: student.cuenta,
      nombre: student.nombre,
      items,
      final: evaluatedWeight ? round_(weighted / evaluatedWeight, 1) : null,
      finalStrict: totalWeight ? round_(weighted / totalWeight, 1) : null,
      // Calificación entera: suma exacta de % SIN redondear antes (7.96 → 7, no 8)
      entero: totalWeight ? truncGrade_(weighted / totalWeight) : null,
      evaluatedWeight,
      counts: att ? att.counts : null
    };
  });

  return { group, components, students, attendance, projects };
}


// ============================================================
// PROYECTOS Y EQUIPOS
//
// W_Proyectos:    un proyecto por grupo, con sus rubros (JSON) y el
//                 componente de evaluación al que alimenta.
// W_Equipos:      una fila por integrante (ID_Equipo se repite).
// W_EvalEquipos:  estrellas por rubro (1–5) de cada equipo.
//
// La calificación del equipo (base 10) = Σ estrellas / (5 × n° rubros) × 10
// y se aplica en automático a TODOS los integrantes del equipo.
// ============================================================

function projectsFor_(idCurso) {
  return Db.read(WEB.PROJECTS).rows
    .filter(r => cleanText_(r.ID_Curso) === idCurso)
    .map(r => ({
      id: cleanText_(r.ID),
      idCurso,
      nombre: cleanText_(r.Nombre),
      rubros: parseJson_(r.Rubros, []),
      componentId: cleanText_(r.ID_Componente),
      abierto: toBool_(r.Registro_Abierto),
      creado: toIso_(r.Creado)
    }))
    .sort((a, b) => a.creado.localeCompare(b.creado));
}

/** Equipos de un curso: [{ id, projectId, nombre, members: [cuenta], registrado }] */
function teamsFor_(idCurso) {
  const teams = {};
  Db.read(WEB.TEAMS).rows.forEach(r => {
    if (idCurso && cleanText_(r.ID_Curso) !== idCurso) return;
    const id = cleanText_(r.ID_Equipo);
    const team = teams[id] || (teams[id] = {
      id,
      projectId: cleanText_(r.ID_Proyecto),
      idCurso: cleanText_(r.ID_Curso),
      nombre: cleanText_(r.Nombre_Equipo),
      members: [],
      registrado: toIso_(r.Registrado),
      registradoPor: cleanText_(r.Registrado_Por)
    });
    const cuenta = limpiarCuenta_(r.Cuenta);
    if (cuenta && !team.members.includes(cuenta)) team.members.push(cuenta);
  });
  return Object.values(teams);
}

function evalsMap_() {
  const map = {};
  Db.read(WEB.TEAM_EVALS).rows.forEach(r => {
    map[cleanText_(r.ID_Equipo)] = {
      stars: parseJson_(r.Estrellas, {}),
      observaciones: cleanText_(r.Observaciones),
      actualizado: toIso_(r.Actualizado)
    };
  });
  return map;
}

/** Calificación base 10 según los rubros ACTUALES del proyecto. */
function teamGrade_(project, stars) {
  if (!project || !project.rubros.length || !stars) return null;
  const total = project.rubros.reduce((sum, rubro) => sum + (Number(stars[rubro]) || 0), 0);
  return round_(total / (5 * project.rubros.length) * 10, 2);
}

/** Proyectos, equipos y calificación por alumno de un curso. */
function projectGradesFor_(idCurso) {
  const list = projectsFor_(idCurso);
  const byId = {};
  list.forEach(p => { byId[p.id] = p; });

  const evals = evalsMap_();
  const teams = teamsFor_(idCurso);
  const byCuenta = {};
  const membership = {};   // cuenta → { idProyecto: true }
  const evaluated = new Set();

  teams.forEach(team => {
    team.members.forEach(cuenta => { (membership[cuenta] || (membership[cuenta] = {}))[team.projectId] = true; });
    const project = byId[team.projectId];
    const ev = evals[team.id];
    team.eval = ev || null;
    team.calificacion = ev ? teamGrade_(project, ev.stars) : null;
    if (team.calificacion === null) return;
    evaluated.add(team.projectId);
    team.members.forEach(cuenta => {
      (byCuenta[cuenta] || (byCuenta[cuenta] = {}))[team.projectId] = team.calificacion;
    });
  });

  return { list, teams, byCuenta, membership, evaluated };
}

// ---------- Administración de proyectos ----------

function saveProject_(params) {
  const idCurso = cleanText_(params.idCurso);
  requireGroup_(idCurso);
  const input = params.project || {};

  const nombre = cleanText_(input.nombre).slice(0, 80);
  if (!nombre) throw new Error("El proyecto necesita un nombre.");

  const rubros = [];
  (Array.isArray(input.rubros) ? input.rubros : []).forEach(r => {
    const text = cleanText_(r).slice(0, 60);
    if (text && !rubros.some(x => normalizeKey_(x) === normalizeKey_(text))) rubros.push(text);
  });
  if (!rubros.length) throw new Error("Agrega al menos un rubro.");
  if (rubros.length > 12) throw new Error("Máximo 12 rubros por proyecto.");

  const componentId = cleanText_(input.componentId);
  if (componentId) {
    const comp = componentsFor_(idCurso).find(c => c.id === componentId);
    if (!comp || comp.tipo !== "proyectos") throw new Error("El componente elegido debe ser de tipo «proyectos».");
  }

  const id = cleanText_(input.id);
  const table = Db.read(WEB.PROJECTS);

  if (id) {
    const row = table.rows.find(r => cleanText_(r.ID) === id && cleanText_(r.ID_Curso) === idCurso);
    if (!row) throw new Error("El proyecto ya no existe.");
    Object.assign(row, { Nombre: nombre, Rubros: rubros, ID_Componente: componentId, Registro_Abierto: !!input.abierto });
    Db.update(WEB.PROJECTS, row);
  } else {
    Db.append(WEB.PROJECTS, [{
      ID: shortId_(), ID_Curso: idCurso, Nombre: nombre, Rubros: rubros,
      ID_Componente: componentId, Registro_Abierto: !!input.abierto, Creado: new Date()
    }]);
  }

  return { projects: projectsFor_(idCurso), message: "Proyecto guardado ✅" };
}

function deleteProject_(params) {
  const id = cleanText_(params.projectId);
  if (!id) throw new Error("Falta el proyecto.");
  const idCurso = cleanText_((Db.read(WEB.PROJECTS).rows.find(r => cleanText_(r.ID) === id) || {}).ID_Curso);

  const teamIds = new Set(Db.read(WEB.TEAMS).rows.filter(r => cleanText_(r.ID_Proyecto) === id).map(r => cleanText_(r.ID_Equipo)));
  Db.writeAll(WEB.PROJECTS, Db.read(WEB.PROJECTS).rows.filter(r => cleanText_(r.ID) !== id));
  Db.writeAll(WEB.TEAMS, Db.read(WEB.TEAMS).rows.filter(r => cleanText_(r.ID_Proyecto) !== id));
  Db.writeAll(WEB.TEAM_EVALS, Db.read(WEB.TEAM_EVALS).rows.filter(r => !teamIds.has(cleanText_(r.ID_Equipo))));

  return { idCurso, message: "Proyecto eliminado junto con sus equipos y evaluaciones." };
}

// ---------- Registro de equipos ----------

/**
 * Valida y guarda un equipo.
 *   - Todas las cuentas deben estar inscritas en el grupo del proyecto.
 *   - Nadie puede estar en dos equipos del mismo proyecto.
 *   - El nombre del equipo no se repite dentro del proyecto.
 * replaceTeamId: al editar (admin) se ignora ese equipo en las validaciones.
 */
function registerTeamCore_(opts) {
  const project = Db.read(WEB.PROJECTS).rows
    .map(r => ({ id: cleanText_(r.ID), idCurso: cleanText_(r.ID_Curso), nombre: cleanText_(r.Nombre), abierto: toBool_(r.Registro_Abierto) }))
    .find(p => p.id === cleanText_(opts.projectId));

  if (!project) throw new Error("El proyecto no existe.");
  if (!opts.admin && !project.abierto) throw new Error("El registro de equipos para este proyecto está cerrado.");

  const nombre = cleanText_(opts.nombre).replace(/\s+/g, " ").slice(0, 50);
  if (!nombre) throw new Error("Escribe el nombre del equipo.");

  const cuentas = [];
  const invalid = [];
  (opts.cuentas || []).forEach(raw => {
    if (!cleanText_(raw)) return;
    const cuenta = limpiarCuenta_(raw);
    if (!cuenta) invalid.push(cleanText_(raw));
    else if (!cuentas.includes(cuenta)) cuentas.push(cuenta);
  });
  if (invalid.length) throw new Error(`Números de cuenta inválidos: ${invalid.join(", ")}.`);
  if (!cuentas.length) throw new Error("Agrega al menos un integrante.");
  if (cuentas.length > SETTINGS.MAX_TEAM_SIZE) throw new Error(`Máximo ${SETTINGS.MAX_TEAM_SIZE} integrantes por equipo.`);

  // Inscritos en el grupo (Students + hoja de reporte)
  const group = requireGroup_(project.idCurso);
  const roster = new Set(rosterFor_(project.idCurso, reportAttendance_(group.sheet)).map(s => s.cuenta));
  const notEnrolled = cuentas.filter(c => !roster.has(c));
  if (notEnrolled.length) throw new Error(`Estas cuentas no están inscritas en ${group.label}: ${notEnrolled.join(", ")}.`);

  const others = teamsFor_(project.idCurso).filter(t => t.projectId === project.id && t.id !== opts.replaceTeamId);
  const taken = cuentas.filter(c => others.some(t => t.members.includes(c)));
  if (taken.length) throw new Error(`Ya tienen equipo en este proyecto: ${taken.join(", ")}.`);
  if (others.some(t => normalizeKey_(t.nombre) === normalizeKey_(nombre))) {
    throw new Error(`Ya existe un equipo llamado "${nombre}" en este proyecto.`);
  }

  const teamId = opts.replaceTeamId || shortId_();
  if (opts.replaceTeamId) {
    Db.writeAll(WEB.TEAMS, Db.read(WEB.TEAMS).rows.filter(r => cleanText_(r.ID_Equipo) !== teamId));
  }

  const now = new Date();
  Db.append(WEB.TEAMS, cuentas.map(cuenta => ({
    ID_Equipo: teamId, ID_Proyecto: project.id, ID_Curso: project.idCurso,
    Nombre_Equipo: nombre, Cuenta: cuenta, Registrado: now, Registrado_Por: opts.by || ""
  })));

  const names = studentNames_();
  return {
    teamId,
    idCurso: project.idCurso,
    members: cuentas.map(c => ({ cuenta: c, nombre: names[c] || "" })),
    message: `Equipo "${nombre}" registrado con ${cuentas.length} integrante(s) ✅`
  };
}

function studentRegisterTeam_(params, ctx) {
  const cuentas = [ctx.cuenta].concat(Array.isArray(params.cuentas) ? params.cuentas : []);
  return registerTeamCore_({
    projectId: params.projectId,
    nombre: params.nombre,
    cuentas,
    by: ctx.cuenta,
    admin: false
  });
}

function adminSaveTeam_(params) {
  const cuentas = Array.isArray(params.cuentas)
    ? params.cuentas
    : String(params.cuentas || "").split(/[\s,;]+/);
  return registerTeamCore_({
    projectId: params.projectId,
    nombre: params.nombre,
    cuentas,
    by: "admin",
    admin: true,
    replaceTeamId: cleanText_(params.teamId) || ""
  });
}

function deleteTeam_(params) {
  const id = cleanText_(params.teamId);
  if (!id) throw new Error("Falta el equipo.");
  const idCurso = cleanText_((Db.read(WEB.TEAMS).rows.find(r => cleanText_(r.ID_Equipo) === id) || {}).ID_Curso);
  Db.writeAll(WEB.TEAMS, Db.read(WEB.TEAMS).rows.filter(r => cleanText_(r.ID_Equipo) !== id));
  Db.writeAll(WEB.TEAM_EVALS, Db.read(WEB.TEAM_EVALS).rows.filter(r => cleanText_(r.ID_Equipo) !== id));
  return { idCurso, message: "Equipo eliminado." };
}

// ---------- Evaluación con estrellas ----------

function saveTeamEval_(params) {
  const teamId = cleanText_(params.teamId);
  const team = teamsFor_("").find(t => t.id === teamId);
  if (!team) throw new Error("El equipo no existe.");

  const project = projectsFor_(team.idCurso).find(p => p.id === team.projectId);
  if (!project) throw new Error("El proyecto del equipo ya no existe.");

  const stars = {};
  project.rubros.forEach(rubro => {
    const n = Math.round(Number((params.stars || {})[rubro]) || 0);
    stars[rubro] = Math.max(0, Math.min(5, n));
  });

  const calificacion = teamGrade_(project, stars);
  const observaciones = cleanText_(params.observaciones).slice(0, 1000);
  const table = Db.read(WEB.TEAM_EVALS);
  const row = table.rows.find(r => cleanText_(r.ID_Equipo) === teamId);
  const data = { ID_Equipo: teamId, ID_Proyecto: project.id, Estrellas: stars, Calificacion: calificacion, Observaciones: observaciones, Actualizado: new Date() };

  if (row) Db.update(WEB.TEAM_EVALS, Object.assign(row, data));
  else Db.append(WEB.TEAM_EVALS, [data]);

  return {
    calificacion,
    idCurso: team.idCurso,
    message: `«${team.nombre}»: ${calificacion} — aplicada a ${team.members.length} integrante(s) ✅`
  };
}


// ============================================================
// EVIDENCIAS Y PUNTOS ADICIONALES
//
// El alumno sube una evidencia (foto/PDF o enlace) → Estado "Pendiente".
// Tú decides: "Aplicada" con N puntos sobre un componente manual
// (p. ej. Parcial 2), o "Rechazada". Los puntos aplicados se suman a la
// calificación de ese componente (tope: su máximo) y el alumno ve un
// aviso sobre esa calificación.
// Los archivos se guardan PRIVADOS en tu Drive, en la carpeta
// Evidencias_Alumnos junto a la hoja de cálculo.
// ============================================================

const EVIDENCE_STATES = ["Pendiente", "Aplicada", "Rechazada"];

function uploadEvidence_(params, ctx) {
  const cuenta = ctx.cuenta;
  const idCurso = cleanText_(params.idCurso);

  const myCourses = studentCourseIds_(cuenta);
  if (!myCourses.includes(idCurso)) throw new Error("Elige uno de tus grupos.");

  const titulo = cleanText_(params.titulo).slice(0, 120);
  const tipo = SETTINGS.EVIDENCE_TYPES.includes(cleanText_(params.tipo)) ? cleanText_(params.tipo) : "Otro";
  const descripcion = cleanText_(params.descripcion).slice(0, 1000);
  const link = cleanText_(params.link);
  if (!titulo) throw new Error("Escribe un título para tu evidencia.");
  if (link && !/^https?:\/\/\S+$/i.test(link)) throw new Error("El enlace debe empezar con http:// o https://");

  let url = link;
  let fileName = "";

  if (params.file && params.file.data) {
    const mime = cleanText_(params.file.type);
    if (!SETTINGS.ALLOWED_MIME.test(mime)) throw new Error("Solo se aceptan imágenes (JPG, PNG, WEBP, HEIC) o PDF.");

    const bytes = Utilities.base64Decode(params.file.data);
    if (bytes.length > SETTINGS.MAX_FILE_MB * 1024 * 1024) throw new Error(`El archivo supera ${SETTINGS.MAX_FILE_MB} MB.`);

    const safeName = cleanText_(params.file.name).replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ ]/g, "_").slice(0, 80) || "evidencia";
    const stamp = Utilities.formatDate(new Date(), getSpreadsheetTz_(), "yyyyMMdd-HHmm");
    const file = evidenceFolder_().createFile(Utilities.newBlob(bytes, mime, `${cuenta}_${stamp}_${safeName}`));
    url = file.getUrl();
    fileName = safeName;
  }

  if (!url) throw new Error("Adjunta un archivo o escribe un enlace.");

  Db.append(WEB.EVIDENCE, [{
    ID: shortId_(), Cuenta: cuenta, ID_Curso: idCurso, Tipo: tipo, Titulo: titulo,
    Descripcion: descripcion, Archivo_URL: url, Archivo_Nombre: fileName || link,
    Enviado: new Date(), Estado: "Pendiente", Puntos: "", ID_Componente: "", Aplicado: "", Nota: ""
  }]);

  return { message: "Evidencia enviada ✅ Tu profesor la revisará." };
}

function evidenceFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(SETTINGS.EVIDENCE_FOLDER_KEY);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* se vuelve a crear */ }
  }
  // Junto a la hoja de cálculo, como las carpetas de AppSheet
  const folder = childFolder_(spreadsheetFolder_(), SETTINGS.EVIDENCE_FOLDER_NAME);
  props.setProperty(SETTINGS.EVIDENCE_FOLDER_KEY, folder.getId());
  return folder;
}

function evidenceRows_() {
  return Db.read(WEB.EVIDENCE).rows.map(r => ({
    _ref: r,
    id: cleanText_(r.ID),
    cuenta: limpiarCuenta_(r.Cuenta),
    idCurso: cleanText_(r.ID_Curso),
    tipo: cleanText_(r.Tipo),
    titulo: cleanText_(r.Titulo),
    descripcion: cleanText_(r.Descripcion),
    url: cleanText_(r.Archivo_URL),
    archivo: cleanText_(r.Archivo_Nombre),
    enviado: toIso_(r.Enviado),
    estado: EVIDENCE_STATES.includes(cleanText_(r.Estado)) ? cleanText_(r.Estado) : "Pendiente",
    puntos: toNumberOrNull_(r.Puntos),
    componentId: cleanText_(r.ID_Componente),
    aplicado: toIso_(r.Aplicado),
    nota: cleanText_(r.Nota)
  }));
}

/** cuenta → idComponente → [{ id, titulo, puntos, aplicado }] (solo "Aplicada"). */
function appliedBonusFor_(idCurso) {
  const map = {};
  evidenceRows_().forEach(e => {
    if (e.idCurso !== idCurso || e.estado !== "Aplicada" || !e.componentId || !e.puntos) return;
    const byComp = map[e.cuenta] || (map[e.cuenta] = {});
    (byComp[e.componentId] || (byComp[e.componentId] = [])).push({
      id: e.id, titulo: e.titulo, tipo: e.tipo, puntos: e.puntos, aplicado: e.aplicado
    });
  });
  return map;
}

/** Evidencias de un alumno sin datos internos (sin _ref). */
function evidenceForStudent_(cuenta) {
  const groups = groupsMap_();
  const compNames = {};
  Db.read(WEB.COMPONENTS).rows.forEach(r => { compNames[cleanText_(r.ID)] = cleanText_(r.Nombre); });

  return evidenceRows_()
    .filter(e => e.cuenta === cuenta)
    .map(e => ({
      id: e.id, idCurso: e.idCurso, grupo: groups[e.idCurso] ? groups[e.idCurso].label : e.idCurso,
      tipo: e.tipo, titulo: e.titulo, descripcion: e.descripcion, archivo: e.archivo,
      enviado: e.enviado, estado: e.estado, puntos: e.puntos,
      componente: compNames[e.componentId] || "", aplicado: e.aplicado, nota: e.nota
    }))
    .sort((a, b) => b.enviado.localeCompare(a.enviado));
}

// ---------- Administración ----------

function listEvidence_(params) {
  const estado = cleanText_(params.estado);
  const idCurso = cleanText_(params.idCurso);
  const names = studentNames_();
  const groups = groupsMap_();

  const componentsByCourse = {};
  Object.keys(groups).forEach(id => {
    componentsByCourse[id] = componentsFor_(id)
      .filter(c => c.tipo === "manual" || c.tipo === "examen")
      .map(c => ({ id: c.id, nombre: c.nombre, maximo: c.maximo }));
  });

  const items = evidenceRows_()
    .filter(e => (!estado || e.estado === estado) && (!idCurso || e.idCurso === idCurso))
    .map(e => {
      const item = Object.assign({}, e, {
        nombre: names[e.cuenta] || "",
        grupo: groups[e.idCurso] ? groups[e.idCurso].label : e.idCurso
      });
      delete item._ref;
      return item;
    })
    .sort((a, b) => b.enviado.localeCompare(a.enviado));

  return { items, componentsByCourse, states: EVIDENCE_STATES };
}

function reviewEvidence_(params) {
  const evidence = evidenceRows_().find(e => e.id === cleanText_(params.id));
  if (!evidence) throw new Error("La evidencia ya no existe.");

  const estado = cleanText_(params.estado);
  if (!EVIDENCE_STATES.includes(estado)) throw new Error("Estado inválido.");

  const row = evidence._ref;
  row.Estado = estado;
  row.Nota = cleanText_(params.nota).slice(0, 500);

  if (estado === "Aplicada") {
    const comp = componentsFor_(evidence.idCurso).find(c => c.id === cleanText_(params.componentId));
    if (!comp || comp.tipo !== "manual") throw new Error("Elige el examen/componente (manual) al que se suman los puntos.");
    const puntos = toNumberOrNull_(params.puntos);
    if (puntos === null || puntos <= 0 || puntos > comp.maximo) throw new Error(`Los puntos deben ser mayores que 0 y hasta ${comp.maximo}.`);
    row.Puntos = puntos;
    row.ID_Componente = comp.id;
    row.Aplicado = new Date();
  } else {
    row.Puntos = "";
    row.ID_Componente = "";
    row.Aplicado = "";
  }

  Db.update(WEB.EVIDENCE, row);
  return { idCurso: evidence.idCurso, message: estado === "Aplicada" ? "Puntos aplicados ✅ El alumno ya lo ve en su calificación." : `Evidencia marcada como ${estado}.` };
}


// ============================================================
// ALUMNOS: vista del alumno, panel de grupos, ficha y comentarios
//
// Identidad = número de cuenta. Un mismo alumno puede aparecer varias
// veces en Students (otro ciclo, o dos materias en el mismo ciclo);
// cada fila es una INSCRIPCIÓN (Cuenta + ID_Curso). Aquí se juntan.
// Los comentarios son SOLO para el docente: nunca se envían al alumno.
// ============================================================

/** Grupos ACTIVOS en los que aparece el alumno (Students o hoja de reporte). */
function studentCourseIds_(cuenta) {
  const groups = groupsMap_();
  const ids = new Set();

  studentRecords_().forEach(r => {
    if (r.cuenta === cuenta && groups[r.course] && groups[r.course].active) ids.add(r.course);
  });

  Object.values(groups).forEach(g => {
    if (!g.active || ids.has(g.id)) return;
    const att = reportAttendance_(g.sheet);
    if (att && att.rows[cuenta]) ids.add(g.id);
  });

  return Array.from(ids);
}

// ---------- Vista del alumno ----------

/**
 * Todo lo de un alumno en un grupo: asistencia, calificaciones y proyectos.
 * opts.admin = true incluye columnas ocultas del reporte.
 */
function buildStudentCourse_(idCurso, cuenta, opts) {
  const admin = !!(opts && opts.admin);
  const names = studentNames_();
  const result = computeCourse_(idCurso, cuenta);
  const me = result.students[0] || { items: {}, final: null, finalStrict: null, counts: null };
  const att = result.attendance;
  const row = att && att.rows[cuenta];

  const dates = att ? att.dates.map((d, i) => ({ d, i })).filter(x => admin || x.d.visible) : [];
  const others = att ? att.others.map((o, i) => ({ o, i })).filter(x => admin || x.o.visible) : [];

  const projects = result.projects.list.map(p => {
    const team = result.projects.teams.find(t => t.projectId === p.id && t.members.includes(cuenta));
    return {
      id: p.id,
      nombre: p.nombre,
      rubros: p.rubros,
      abierto: p.abierto,
      team: team ? {
        nombre: team.nombre,
        members: team.members.map(c => ({ cuenta: c, nombre: names[c] || "" })),
        stars: team.eval ? team.eval.stars : null,
        observaciones: team.eval ? team.eval.observaciones : "",
        calificacion: team.calificacion
      } : null
    };
  });

  return {
    idCurso,
    label: result.group.label,
    ciclo: result.group.ciclo,
    attendance: row ? {
      dates: dates.map(x => ({ key: x.d.key, label: x.d.label, status: row.statuses[x.i] })),
      counts: countStatuses_(dates.map(x => row.statuses[x.i]))
    } : null,
    legacy: row && (admin || !result.components.length)
      ? others.map(x => ({ label: x.o.label, value: row.others[x.i] }))
      : [],
    components: result.components,
    items: me.items,
    final: me.final,
    finalStrict: me.finalStrict,
    projects
  };
}

function studentData_(params, ctx) {
  const cuenta = ctx.cuenta;
  const ids = studentCourseIds_(cuenta);
  // Al alumno nunca se le envían comentarios, observaciones de equipo ni notas,
  // ni los promedios calculados (solo sus calificaciones por componente).
  const courses = ids.map(id => {
    const c = buildStudentCourse_(id, cuenta);
    delete c.final;
    delete c.finalStrict;
    delete c.entero;
    c.projects.forEach(p => { if (p.team) delete p.team.observaciones; });
    return c;
  });
  return {
    student: { cuenta, nombre: studentNames_()[cuenta] || "" },
    courses,
    links: linksFor_(ids),
    evidences: evidenceForStudent_(cuenta).map(e => { const copy = Object.assign({}, e); delete copy.nota; return copy; }),
    evidenceTypes: SETTINGS.EVIDENCE_TYPES,
    maxFileMb: SETTINGS.MAX_FILE_MB,
    maxTeamSize: SETTINGS.MAX_TEAM_SIZE,
    useRetardo: USE_RETARDO
  };
}

// ---------- Panel admin: arranque ----------

function adminBootstrap_() {
  const groups = groupsMap_();
  const courses = courseMap_();
  const counts = {};
  studentRecords_().forEach(r => { counts[r.course] = (counts[r.course] || 0) + 1; });
  const pending = evidenceRows_().filter(e => e.estado === "Pendiente").length;

  return {
    groups: Object.values(groups)
      .map(g => Object.assign({}, g, { students: counts[g.id] || 0 }))
      .sort((a, b) => (b.active - a.active) || a.label.localeCompare(b.label, "es")),
    courses: Object.values(courses).map(c => ({ id: c.id, name: c.name, group: c.group, ciclo: c.ciclo })),
    reports: getReportSheets_(),
    pendingEvidence: pending,
    links: allLinks_(),
    currentCycle: currentCycle_(),
    useRetardo: USE_RETARDO,
    defaults: {
      components: DEFAULT_COMPONENTS.map(c => ({ nombre: c.Nombre, tipo: c.Tipo, ponderacion: c.Ponderacion, maximo: c.Maximo })),
      rubrics: DEFAULT_RUBRICS,
      componentTypes: COMPONENT_TYPES
    },
    version: API_VERSION
  };
}

function saveGroup_(params) {
  const id = cleanText_(params.idCurso);
  const course = courseMap_()[id];
  if (!course) throw new Error("Ese ID_Curso no existe en la hoja Course.");

  const sheetName = cleanText_(params.hojaReporte);
  if (sheetName && !SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName)) {
    throw new Error(`No existe la hoja "${sheetName}".`);
  }

  const ciclo = normalizeCiclo_(params.ciclo);
  if (ciclo && !/^\d{4}-[12]$/.test(ciclo)) throw new Error("Ciclo inválido (ej. 2027-1).");
  const data = { Hoja_Reporte: sheetName, Activo: params.activo !== false };
  if (ciclo) data.Ciclo_Escolar = ciclo;
  updateCourse_(id, data);

  return { message: "Grupo guardado ✅" };
}

// ---------- Panel admin: datos de un grupo ----------

function groupData_(params) {
  const idCurso = cleanText_(params.idCurso);
  refreshExamColumns_(idCurso);
  const result = computeCourse_(idCurso);
  const names = studentNames_();
  const commentCounts = commentCounts_();
  const links = studentLinks_(idCurso, result.group.ciclo);
  const statusOf = {};
  studentRecords_().forEach(r => { if (r.course === idCurso && r.status) statusOf[r.cuenta] = r.status; });

  const att = result.attendance;

  return {
    group: result.group,
    statuses: STUDENT_STATUSES,
    columns: columnLinksFor_(idCurso),
    psi: { grupo: String(result.group.group || "").padStart(4, "0"), periodo: result.group.ciclo },
    currentCycle: currentCycle_(),
    components: result.components,
    examSources: examSources_(),
    attendance: att ? {
      sheetName: att.sheetName,
      dates: att.dates.map(d => ({ key: d.key, label: d.label, visible: d.visible })),
      others: att.others.map(o => ({ label: o.label, visible: o.visible }))
    } : null,
    students: result.students.map(s => {
      const row = att && att.rows[s.cuenta];
      return Object.assign(s, {
        statuses: row ? row.statuses : [],
        others: row ? row.others : [],
        comments: commentCounts[s.cuenta] || 0,
        status: statusOf[s.cuenta] || "",
        // Textos de comentarios (de este grupo o generales) para las sugerencias PSI. Solo admin.
        notas: commentsFor_(s.cuenta).filter(c => !c.idCurso || c.idCurso === idCurso).map(c => c.texto),
        links: links[s.cuenta] || []
      });
    }),
    projects: result.projects.list.map(p => Object.assign({}, p, {
      teams: result.projects.teams
        .filter(t => t.projectId === p.id)
        .map(t => ({
          id: t.id, nombre: t.nombre, registrado: t.registrado, registradoPor: t.registradoPor,
          members: t.members.map(c => ({ cuenta: c, nombre: names[c] || "" })),
          stars: t.eval ? t.eval.stars : {},
          observaciones: t.eval ? t.eval.observaciones : "",
          calificacion: t.calificacion
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true }))
    }))
  };
}

/**
 * Por alumno, sus OTRAS inscripciones respecto al grupo `idCurso`:
 *   rel "mismo"    → otro grupo del mismo ciclo (lo compartes ahora)
 *   rel "anterior" → lo tuviste en un ciclo anterior (Students o W_Historial)
 *   rel "otro"     → ciclo posterior o sin ciclo
 */
function studentLinks_(idCurso, ciclo) {
  const courses = courseMap_();
  const cycles = courseCycles_();
  const groups = groupsMap_();
  const rank = cicloRank_(ciclo);
  const map = {};

  const add = (cuenta, item) => {
    const list = map[cuenta] || (map[cuenta] = []);
    if (!list.some(x => x.idCurso === item.idCurso)) list.push(item);
  };
  const relOf = c => c && ciclo && c === ciclo ? "mismo" : (cicloRank_(c) && rank && cicloRank_(c) < rank ? "anterior" : "otro");

  studentRecords_().forEach(r => {
    if (!r.course || r.course === idCurso) return;
    const c = courses[r.course] || {};
    const cyc = cycles[r.course] || "";
    add(r.cuenta, {
      idCurso: r.course,
      label: groups[r.course] ? groups[r.course].label : `${c.name || r.course} ${c.group || ""}`.trim(),
      ciclo: cyc,
      rel: relOf(cyc)
    });
  });

  const history = historyMap_();
  Object.keys(history).forEach(cuenta => history[cuenta].forEach(h => {
    if (h.idCurso === idCurso) return;
    add(cuenta, {
      idCurso: h.idCurso, label: `${h.curso} ${h.grupo}`.trim(), ciclo: h.ciclo, rel: relOf(h.ciclo),
      final: h.final, faltas: h.faltas, archivado: true
    });
  }));

  Object.keys(map).forEach(k => map[k].sort((a, b) => cicloRank_(b.ciclo) - cicloRank_(a.ciclo)));
  return map;
}

// ---------- Búsqueda y ficha del alumno ----------

function searchStudents_(params) {
  const q = normalizeKey_(params.q);
  if (q.length < 3) throw new Error("Escribe al menos 3 caracteres.");
  const courses = courseMap_();

  const byCuenta = {};
  studentRecords_().forEach(r => {
    if (!r.cuenta.startsWith(q) && !normalizeKey_(r.nombre).includes(q)) return;
    const item = byCuenta[r.cuenta] || (byCuenta[r.cuenta] = { cuenta: r.cuenta, nombre: r.nombre, cursos: [] });
    if (r.course) {
      const c = courses[r.course];
      const label = c ? `${c.name} ${c.group} (${c.ciclo})` : r.course;
      if (!item.cursos.includes(label)) item.cursos.push(label);
    }
  });

  const history = historyMap_();
  Object.keys(history).forEach(cuenta => {
    const entries = history[cuenta];
    const nombre = (Db.read(WEB.HISTORY).rows.find(r => limpiarCuenta_(r.Cuenta) === cuenta) || {}).Nombre || "";
    if (!cuenta.startsWith(q) && !normalizeKey_(nombre).includes(q)) return;
    const item = byCuenta[cuenta] || (byCuenta[cuenta] = { cuenta, nombre: cleanText_(nombre), cursos: [] });
    entries.forEach(h => {
      const label = `${h.curso} ${h.grupo} (${h.ciclo}) · archivado`;
      if (!item.cursos.includes(label)) item.cursos.push(label);
    });
  });

  const counts = commentCounts_();
  return {
    results: Object.values(byCuenta)
      .map(r => Object.assign(r, { comments: counts[r.cuenta] || 0 }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .slice(0, 40)
  };
}

function studentProfile_(params) {
  const cuenta = limpiarCuenta_(params.cuenta);
  if (!cuenta) throw new Error("Número de cuenta inválido.");

  const courses = courseMap_();
  const groups = groupsMap_();
  const records = studentRecords_().filter(r => r.cuenta === cuenta);

  const seen = new Set();
  const enrollments = [];
  records.forEach(r => {
    const key = r.course || "(sin curso)";
    if (seen.has(key)) return;
    seen.add(key);
    const c = courses[r.course] || {};
    const g = groups[r.course];
    let counts = null;
    if (g && g.sheet) {
      const att = reportAttendance_(g.sheet);
      counts = att && att.rows[cuenta] ? att.rows[cuenta].counts : null;
    }
    enrollments.push({
      idCurso: r.course, curso: c.name || r.course || "(sin curso)", grupo: c.group || "", status: r.status,
      ciclo: (g && g.ciclo) || c.ciclo || "", activo: !!(g && g.active), counts
    });
  });

  return {
    cuenta,
    nombres: Array.from(new Set(records.map(r => r.nombre).filter(Boolean))),
    correos: Array.from(new Set(records.map(r => r.email).filter(Boolean))),
    enrollments,
    groups: studentCourseIds_(cuenta).map(id => Object.assign(buildStudentCourse_(id, cuenta, { admin: true }), {
      status: (records.find(r => r.course === id) || {}).status || ""
    })),
    statuses: STUDENT_STATUSES,
    comments: commentsFor_(cuenta),
    history: historyMap_()[cuenta] || [],
    evidences: evidenceForStudent_(cuenta),
    teams: teamsFor_("").filter(t => t.members.includes(cuenta)).map(t => ({
      nombre: t.nombre, grupo: groups[t.idCurso] ? groups[t.idCurso].label : t.idCurso
    }))
  };
}

// ---------- Comentarios ----------

/** Comentarios (W_Comentarios). */
function allComments_() {
  if (Db._cache.__comments) return Db._cache.__comments;
  const courses = courseMap_();
  const list = [];

  Db.read(WEB.COMMENTS).rows.forEach(r => {
    const cuenta = limpiarCuenta_(r.Cuenta);
    if (!cuenta) return;
    const idCurso = cleanText_(r.ID_Curso);
    list.push({ id: cleanText_(r.ID), origen: "Web", cuenta, idCurso, curso: courseLabel_(courses, idCurso), texto: cleanText_(r.Texto), fecha: toIso_(r.Fecha) });
  });

  Db._cache.__comments = list;
  return list;
}

function courseLabel_(courses, idCurso) {
  const c = courses[idCurso];
  return c ? `${c.name} ${c.group} (${c.ciclo})` : (idCurso || "General");
}

function commentsFor_(cuenta) {
  return allComments_().filter(c => c.cuenta === cuenta)
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
}

function commentCounts_() {
  const counts = {};
  allComments_().forEach(c => { counts[c.cuenta] = (counts[c.cuenta] || 0) + 1; });
  return counts;
}

function addComment_(params) {
  const cuenta = limpiarCuenta_(params.cuenta);
  const texto = cleanText_(params.texto).slice(0, 2000);
  if (!cuenta) throw new Error("Número de cuenta inválido.");
  if (!texto) throw new Error("Escribe el comentario.");

  Db.append(WEB.COMMENTS, [{ ID: shortId_(), Cuenta: cuenta, ID_Curso: cleanText_(params.idCurso), Texto: texto, Fecha: new Date() }]);
  delete Db._cache.__comments;
  return { comments: commentsFor_(cuenta), message: "Comentario guardado." };
}

function deleteComment_(params) {
  const id = cleanText_(params.id);
  const rows = Db.read(WEB.COMMENTS).rows;
  const target = rows.find(r => cleanText_(r.ID) === id);
  if (!target) throw new Error("Solo se pueden borrar comentarios creados en la web.");
  Db.writeAll(WEB.COMMENTS, rows.filter(r => r !== target));
  delete Db._cache.__comments;
  return { comments: commentsFor_(limpiarCuenta_(target.Cuenta)), message: "Comentario eliminado." };
}

// ============================================================
// ALTAS DESDE LA WEB: grupos y alumnos
// (escriben en Course / Students con los mismos encabezados de AppSheet)
// ============================================================

/** Agrega una fila a una hoja de AppSheet llenando las columnas por nombre. */
function appendByHeaders_(sheet, data) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(cleanText_);
  const row = headers.map(h => {
    const key = Object.keys(data).find(k => normalizeKey_(k) === normalizeKey_(h));
    return key === undefined ? "" : data[key];
  });
  const target = sheet.getLastRow() + 1;
  // Ciclos "2027-1" como texto (si no, Sheets los convierte en fecha)
  row.forEach((v, i) => { if (/^\d{4}-[12]$/.test(String(v))) sheet.getRange(target, i + 1).setNumberFormat("@"); });
  sheet.getRange(target, 1, 1, row.length).setValues([row]);
}

/**
 * Nuevo grupo: fila en Course + hoja Reporte_<MATERIA>_<GRUPO> + W_Grupos.
 * params: { materia, grupo, ciclo, horario }
 */
function createGroup_(params) {
  const materia = cleanText_(params.materia).slice(0, 40);
  const grupo = cleanText_(params.grupo).replace(/\D/g, "");
  const ciclo = normalizeCiclo_(params.ciclo) || currentCycle_();
  const horario = cleanText_(params.horario);
  if (!materia) throw new Error("Escribe la materia.");
  if (!grupo) throw new Error("Escribe el número de grupo.");
  if (!/^\d{4}-[12]$/.test(ciclo)) throw new Error("Ciclo inválido (ej. 2027-1).");
  if (horario && timeToMinutes_(horario) === null) throw new Error("Horario inválido (ej. 7:00).");

  const slug = normalizeSearchText_(materia).replace(/\s+/g, "").toUpperCase();
  const idCurso = `${slug}_${grupo}_${ciclo}`;
  if (courseMap_()[idCurso]) throw new Error(`Ya existe el curso ${idCurso}.`);

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const report = createReportSheet(`${slug}_${grupo}`);
  ensureCourseWebColumns_();
  appendByHeaders_(requireSheet_(spreadsheet, SHEETS.COURSE), {
    ID_Curso: idCurso, "Nombre Curso": materia, Grupo: Number(grupo), Horario: horario, Ciclo_Escolar: ciclo,
    Hoja_Reporte: report.sheetName, Activo: true
  });
  Db.clearCache();

  return { idCurso, sheetName: report.sheetName, message: `Grupo creado: ${materia} ${grupo} (${ciclo}) con hoja ${report.sheetName}.` };
}

/**
 * Inscribe a un alumno: fila en Students (ID consecutivo) y fila en el Reporte_.
 * params: { idCurso, cuenta, nombre, email }
 */
function addStudent_(params) {
  const idCurso = cleanText_(params.idCurso);
  const group = requireGroup_(idCurso);
  const cuenta = limpiarCuenta_(params.cuenta);
  if (!cuenta) throw new Error("Número de cuenta inválido.");
  const nombre = cleanText_(params.nombre).toUpperCase().slice(0, 80) || studentNames_()[cuenta] || "";
  if (!nombre) throw new Error("Escribe el nombre del alumno.");
  if (studentRecords_().some(r => r.cuenta === cuenta && r.course === idCurso)) throw new Error("Ese alumno ya está inscrito en el grupo.");

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const students = requireSheet_(spreadsheet, SHEETS.STUDENTS);
  const data = students.getDataRange().getValues();
  const iId = findColumn_(data[0].map(cleanText_), "ID");
  const nextId = data.slice(1).reduce((max, r) => Math.max(max, Number(r[iId]) || 0), 0) + 1;
  const status = STUDENT_STATUSES.some(x => x.value === cleanText_(params.status)) ? cleanText_(params.status) : "";
  appendByHeaders_(students, {
    ID: nextId, Cuenta: cuenta, "First Name": nombre, Email: cleanText_(params.email), Course: idCurso, Status: status
  });

  if (group.sheet) {
    const sheet = spreadsheet.getSheetByName(group.sheet);
    if (sheet) {
      const report = readReport_(sheet);
      if (!report.students.some(s => s.account === cuenta)) {
        const row = Array(sheet.getLastColumn()).fill("");
        row[report.accountIndex] = cuenta;
        const iName = findNameColumn_(report.headers);
        if (iName !== -1) row[iName] = nombre;
        sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
      }
    }
  }
  return { message: `${nombre} inscrito en ${group.label}${status ? ` (${status})` : ""}.` };
}

/** Cambia el Status (Acta, Reprobado…) de la inscripción del alumno en ese grupo. */
function setStudentStatus_(params) {
  const idCurso = cleanText_(params.idCurso);
  const cuenta = limpiarCuenta_(params.cuenta);
  const status = cleanText_(params.status);
  if (!STUDENT_STATUSES.some(x => x.value === status)) throw new Error("Estatus inválido.");

  const sheet = requireSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEETS.STUDENTS);
  const values = sheet.getDataRange().getValues();
  const h = values[0].map(cleanText_);
  const iC = findColumn_(h, "Cuenta"), iCourse = findColumn_(h, "Course");
  let iS = findColumn_(h, "Status");
  if (iS === -1) { iS = h.length; sheet.getRange(1, iS + 1).setValue("Status"); }

  let changed = 0;
  values.forEach((r, i) => {
    if (i && limpiarCuenta_(r[iC]) === cuenta && cleanText_(r[iCourse]) === idCurso) {
      sheet.getRange(i + 1, iS + 1).setValue(status);
      changed++;
    }
  });
  if (!changed) throw new Error("Ese alumno no está inscrito en Students para este grupo (agrégalo con «+ Alumno»).");
  const label = (STUDENT_STATUSES.find(x => x.value === status) || {}).label || status;
  return { message: `Estatus: ${label}.` };
}

/** Da de baja a un alumno del grupo: quita su fila de Students y del Reporte_. */
function removeStudent_(params) {
  const idCurso = cleanText_(params.idCurso);
  const group = requireGroup_(idCurso);
  const cuenta = limpiarCuenta_(params.cuenta);
  if (!cuenta) throw new Error("Número de cuenta inválido.");

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let removed = 0;

  const students = requireSheet_(spreadsheet, SHEETS.STUDENTS);
  const values = students.getDataRange().getValues();
  const h = values[0].map(cleanText_);
  const iC = findColumn_(h, "Cuenta"), iCourse = findColumn_(h, "Course");
  const rows = [];
  values.forEach((r, i) => { if (i && limpiarCuenta_(r[iC]) === cuenta && cleanText_(r[iCourse]) === idCurso) rows.push(i + 1); });
  if (rows.length) {
    if (students.getMaxRows() <= students.getLastRow()) students.insertRowsAfter(students.getLastRow(), 1);
    groupContiguous_(rows).reverse().forEach(g => students.deleteRows(g[0], g.length));
    removed += rows.length;
  }

  const sheet = group.sheet && spreadsheet.getSheetByName(group.sheet);
  if (sheet) {
    const report = readReport_(sheet);
    const mine = report.students.filter(s => s.account === cuenta).map(s => s.rowIndex + 1);
    if (mine.length) {
      if (sheet.getMaxRows() <= sheet.getLastRow()) sheet.insertRowsAfter(sheet.getLastRow(), 1);
      mine.reverse().forEach(r => sheet.deleteRows(r, 1));
      removed += mine.length;
    }
  }
  if (!removed) throw new Error("Ese alumno no está en el grupo.");
  return { message: "Alumno dado de baja del grupo (sus registros de Attendance Log se conservan)." };
}


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
      sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
      if (def.name === SHEETS.COURSE) sheet.getRange(2, def.headers.indexOf("Ciclo_Escolar") + 1, sheet.getMaxRows() - 1, 1).setNumberFormat("@");
      formatTableSheet_(sheet);
      created.push(def.name);
      return;
    }
    const current = sheet.getLastColumn()
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(normalizeKey_)
      : [];
    const missing = def.required.filter(h => !current.includes(normalizeKey_(h)));
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

/**
 * Ciclo actual: la propiedad CCH_CICLO_ACTUAL si la fijaste en la web;
 * si no, se calcula con la fecha de hoy (ver cicloFromDate_).
 */
function currentCycle_() {
  const saved = PropertiesService.getScriptProperties().getProperty(SETTINGS.CURRENT_CYCLE_KEY);
  return saved ? normalizeCiclo_(saved) : cicloFromDate_(new Date());
}

function setCurrentCycle_(params) {
  if (cleanText_(params.ciclo) === "") {
    PropertiesService.getScriptProperties().deleteProperty(SETTINGS.CURRENT_CYCLE_KEY);
    return { ciclo: currentCycle_(), message: `Ciclo automático por fecha: ${currentCycle_()}` };
  }
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
    enrollment: enrollmentIssues_(),
    current: currentCycle_(),
    currentAuto: !PropertiesService.getScriptProperties().getProperty(SETTINGS.CURRENT_CYCLE_KEY),
    cycles: cyclesSummary_(),
    tables,
    folder: { name: folder.getName(), url: folder.getUrl() },
    backups: listBackups_(folder),
    confirmWord: SETTINGS.PURGE_CONFIRM_WORD,
    purgeParts: Object.keys(PURGE_PARTS).map(k => ({ key: k, label: PURGE_PARTS[k].label })),
    clearAllWord: SETTINGS.CLEAR_ALL_WORD
  };
}

function listBackups_(folder) {
  const list = [];
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (![SETTINGS.BACKUP_PREFIX, SETTINGS.CLEAN_PREFIX].some(p => name.startsWith(p))) continue;
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
    const result = purgeCourses_(ids, data, purgeOptions_(params));
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

/**
 * Qué se borra al respaldar un ciclo (cada parte con su interruptor en la web).
 * Lo que no se borra se conserva como histórico en la hoja.
 */
const PURGE_PARTS = {
  attendance: { label: "Asistencias (Attendance Log)", tables: ["Attendance Log"] },
  reports:    { label: "Hojas Reporte_ de esos grupos", tables: ["W_Columnas"], reports: true },
  students:   { label: "Inscripciones (Students y Roles)", tables: ["Students", "Roles"] },
  grades:     { label: "Calificaciones, proyectos y evidencias de la web", tables: ["W_Componentes", "W_Calificaciones", "W_Proyectos", "W_Equipos", "W_EvalEquipos", "W_Evidencias", "W_Enlaces"] },
  comments:   { label: "Comentarios", tables: ["W_Comentarios"] },
  courses:    { label: "Cursos (Course)", tables: ["Course"] }
};

function purgeOptions_(params) {
  const what = params.what || {};
  const out = {};
  Object.keys(PURGE_PARTS).forEach(k => { out[k] = what[k] === undefined ? true : !!what[k]; });
  if (params.keepCourses) out.courses = false;   // compatibilidad
  return out;
}

function purgeCourses_(ids, data, options) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const deleted = {};
  const allowed = new Set();
  Object.keys(PURGE_PARTS).forEach(k => { if (options[k]) PURGE_PARTS[k].tables.forEach(t => allowed.add(t)); });

  data.tables.forEach(t => {
    if (!allowed.has(t.name)) return;
    const n = deleteMatchingRows_(spreadsheet.getSheetByName(t.name), t.keyColumn, t.keySet);
    if (n) deleted[t.name] = n;
  });

  if (options.reports) {
    data.reports.forEach(name => {
      const sheet = spreadsheet.getSheetByName(name);
      if (!sheet) return;
      PropertiesService.getScriptProperties().deleteProperty(SETTINGS.LAST_DATE_PROP_PREFIX + sheet.getSheetId());
      spreadsheet.deleteSheet(sheet);
      deleted["Hojas Reporte_"] = (deleted["Hojas Reporte_"] || 0) + 1;
    });
  }
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
        Asistencias: att ? att.counts.asistencia : "",
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

/**
 * Revisión de alumnos agregados a mano en Students:
 *   - Course vacío (aún no ligados a un curso)
 *   - Course que no existe en la hoja Course (ID mal escrito)
 *   - Cursos activos sin alumnos ligados
 */
function enrollmentIssues_() {
  const courses = courseMap_();
  const groups = groupsMap_();
  let sinCurso = 0;
  const inexistente = [];
  const porCurso = {};
  studentRecords_().forEach(r => {
    if (!r.course) { sinCurso++; return; }
    if (!courses[r.course]) inexistente.push({ cuenta: r.cuenta, nombre: r.nombre, course: r.course });
    porCurso[r.course] = (porCurso[r.course] || 0) + 1;
  });
  return {
    sinCurso,
    inexistente: inexistente.slice(0, 50),
    totalInexistente: inexistente.length,
    gruposVacios: Object.values(groups).filter(g => g.active && !porCurso[g.id]).map(g => ({ id: g.id, label: g.label })),
    ids: Object.values(groups).filter(g => g.active).map(g => ({ id: g.id, label: g.label }))
  };
}


// ============================================================
// ENLACES PARA ALUMNOS (W_Enlaces)
// Los ves y editas en la pestaña Grupos del panel. ID_Curso vacío = todos.
// ============================================================

function allLinks_() {
  return Db.read(WEB.LINKS).rows.map(r => ({
    id: cleanText_(r.ID),
    titulo: cleanText_(r.Titulo),
    url: cleanText_(r.URL),
    idCurso: cleanText_(r.ID_Curso),
    orden: toNumberOrNull_(r.Orden) || 0,
    activo: r.Activo === "" ? true : toBool_(r.Activo)
  })).sort((a, b) => a.orden - b.orden);
}

/** Enlaces activos para los grupos de un alumno (más los generales). */
function linksFor_(courseIds) {
  const ids = new Set(courseIds);
  return allLinks_()
    .filter(l => l.activo && l.url && (!l.idCurso || ids.has(l.idCurso)))
    .map(l => ({ titulo: l.titulo, url: l.url }));
}

/** Reemplaza la lista completa de enlaces. */
function saveLinks_(params) {
  const list = Array.isArray(params.links) ? params.links : [];
  const rows = list.map((l, i) => {
    const titulo = cleanText_(l.titulo).slice(0, 60);
    const url = cleanText_(l.url);
    if (!titulo) throw new Error(`El enlace ${i + 1} no tiene título.`);
    if (!/^https?:\/\/\S+$/i.test(url)) throw new Error(`URL inválida en "${titulo}".`);
    return { ID: cleanText_(l.id) || shortId_(), Titulo: titulo, URL: url, ID_Curso: cleanText_(l.idCurso), Orden: i + 1, Activo: l.activo !== false };
  });
  Db.writeAll(WEB.LINKS, rows);
  return { links: allLinks_(), message: "Enlaces guardados ✅" };
}


// ============================================================
// COLUMNAS DEL REPORTE (Parcial_1, Sellos, Ejercicio Clase, Calificación…)
//
// Cada columna que NO es fecha puede enlazarse con:
//   componente → su calificación capturada (con puntos extra), en su escala
//   proyecto   → la calificación del equipo del alumno en ese proyecto
//   final      → promedio actual (sobre lo evaluado)
//   estricta   → final con lo pendiente en 0
//   entero     → suma de porcentajes ganados ÷ 10, SIN redondear (8.9 → 8)
//                (para Calificación y SIAE)
// El enlace vive en W_Columnas. Cada vez que cambias algo en la web
// (captura, estrellas, evidencias, pase de lista…) se reescribe la
// columna en la hoja Reporte_ (reemplaza fórmulas viejas como VLOOKUP).
//
// Visibilidad: fila 1 del Reporte_ ("Visible" / "Oculto"); se edita
// desde la web (botón «Columnas») o directo en la hoja.
// ============================================================

const COLUMN_LINK_TYPES = ["componente", "proyecto", "final", "estricta", "entero"];

/** Entero sin redondear (con tolerancia para 7.9999999 → 8). */
function truncGrade_(v) {
  return v === null || v === undefined || !isFinite(v) ? null : Math.floor(v + 1e-9);
}

function savedColumnLinks_(idCurso) {
  return Db.read(WEB.COLUMNS).rows
    .filter(r => cleanText_(r.ID_Curso) === idCurso && COLUMN_LINK_TYPES.includes(cleanText_(r.Tipo)))
    .map(r => ({ columna: cleanText_(r.Columna), tipo: cleanText_(r.Tipo), ref: cleanText_(r.Ref) }));
}

/** Enlaces con etiqueta (para el encabezado clicable de la tabla). */
function columnLinksFor_(idCurso) {
  const comps = {};
  componentsFor_(idCurso).forEach(c => { comps[c.id] = c.nombre; });
  const projects = {};
  projectsFor_(idCurso).forEach(p => { projects[p.id] = p.nombre; });
  return savedColumnLinks_(idCurso).map(l => Object.assign(l, {
    label: l.tipo === "componente" ? comps[l.ref] || "(componente borrado)"
      : l.tipo === "proyecto" ? projects[l.ref] || "(proyecto borrado)"
      : l.tipo === "final" ? "Promedio actual"
      : l.tipo === "entero" ? "Calificación entera" : "Final estricta"
  }));
}

/** Sugerencia por nombre de columna (no se guarda hasta que presionas Guardar). */
function suggestColumnLink_(name, comps, projects) {
  const key = normalizeKey_(name).replace(/[\s_\-.]+/g, "");
  const comp = comps.find(c => normalizeKey_(c.nombre).replace(/[\s_\-.]+/g, "") === key);
  if (comp) return { tipo: "componente", ref: comp.id };
  if (/^(calificacion|calificacionfinal|siae|final)$/.test(key)) return { tipo: "entero", ref: "" };
  if (/^promedio$/.test(key)) return { tipo: "final", ref: "" };
  if (/ejercicio|proyecto/.test(key) && projects.length === 1) return { tipo: "proyecto", ref: projects[0].id };
  if (/proyecto/.test(key)) {
    const pc = comps.find(c => c.tipo === "proyectos");
    if (pc) return { tipo: "componente", ref: pc.id };
  }
  return null;
}

function columnsInfo_(idCurso) {
  idCurso = cleanText_(idCurso);
  const group = requireGroup_(idCurso);
  const att = reportAttendance_(group.sheet);
  if (!att) throw new Error("Este grupo no tiene hoja Reporte_ ligada.");

  const comps = componentsFor_(idCurso);
  const projects = projectsFor_(idCurso);
  const saved = {};
  savedColumnLinks_(idCurso).forEach(l => { saved[normalizeKey_(l.columna)] = l; });

  return {
    sheetName: att.sheetName,
    columns: att.others.map(o => {
      const link = saved[normalizeKey_(o.label)] || null;
      return { name: o.label, visible: o.visible, link, suggested: link ? null : suggestColumnLink_(o.label, comps, projects) };
    }),
    dates: att.dates.map(d => ({ key: d.key, label: d.label, visible: d.visible })),
    options: comps.map(c => ({ tipo: "componente", ref: c.id, label: `Componente · ${c.nombre}` }))
      .concat(projects.map(p => ({ tipo: "proyecto", ref: p.id, label: `Proyecto · ${p.nombre}` })))
      .concat([
        { tipo: "entero", ref: "", label: "Calificación entera (suma de % sin redondear)" },
        { tipo: "final", ref: "", label: "Promedio actual (con decimales)" },
        { tipo: "estricta", ref: "", label: "Final estricta (con decimales)" }
      ])
  };
}

/**
 * params: { idCurso, columns: [{ name, visible, link: {tipo, ref} | null }], dates: [{ key, visible }] }
 */
function saveColumns_(params) {
  const idCurso = cleanText_(params.idCurso);
  const group = requireGroup_(idCurso);
  const sheet = group.sheet && SpreadsheetApp.getActiveSpreadsheet().getSheetByName(group.sheet);
  if (!sheet) throw new Error("Este grupo no tiene hoja Reporte_ ligada.");

  // 1. Visibilidad (fila 1)
  const width = sheet.getLastColumn();
  const headers = sheet.getRange(2, 1, 1, width).getValues()[0];
  const clean = headers.map(cleanText_);
  const row1 = sheet.getRange(1, 1, 1, width).getValues()[0].map(normalizeVisibilityValue_);
  (params.columns || []).forEach(c => {
    const i = findColumn_(clean, c.name);
    if (i !== -1) row1[i] = c.visible ? "Visible" : "Oculto";
  });
  const tz = getSpreadsheetTz_();
  const dateIndex = {};
  detectDateColumns_(headers, findColumn_(clean, "Cuenta"), tz).forEach(d => { dateIndex[d.key] = d.index; });
  (params.dates || []).forEach(d => {
    if (dateIndex[d.key] !== undefined) row1[dateIndex[d.key]] = d.visible ? "Visible" : "Oculto";
  });
  sheet.getRange(1, 1, 1, width).setValues([row1]);

  // 2. Enlaces
  const others = Db.read(WEB.COLUMNS).rows.filter(r => cleanText_(r.ID_Curso) !== idCurso);
  const links = (params.columns || [])
    .filter(c => c.link && COLUMN_LINK_TYPES.includes(cleanText_(c.link.tipo)) && findColumn_(clean, c.name) !== -1)
    .map(c => ({ ID_Curso: idCurso, Columna: cleanText_(c.name), Tipo: cleanText_(c.link.tipo), Ref: cleanText_(c.link.ref) }));
  Db.writeAll(WEB.COLUMNS, others.concat(links));

  // 3. Orden (solo columnas que no son fecha)
  if (Array.isArray(params.order) && params.order.length) reorderReportColumns_(sheet, params.order);

  delete Db._cache["__rep_" + group.sheet];
  const written = syncReportColumns_(idCurso);
  return { message: `Columnas guardadas. ${written} columna(s) del reporte actualizadas con datos de la web ✅` };
}

/** Escribe en la hoja Reporte_ los valores de las columnas enlazadas. Devuelve cuántas columnas escribió. */
function syncReportColumns_(idCurso) {
  const links = savedColumnLinks_(idCurso);
  if (!links.length) return 0;
  const group = requireGroup_(idCurso);
  const sheet = group.sheet && SpreadsheetApp.getActiveSpreadsheet().getSheetByName(group.sheet);
  if (!sheet || sheet.getLastRow() < 3) return 0;

  delete Db._cache["__rep_" + group.sheet];
  const computed = computeCourse_(idCurso);
  const byCuenta = {};
  computed.students.forEach(s => { byCuenta[s.cuenta] = s; });
  const projects = {};
  computed.projects.list.forEach(p => { projects[p.id] = p; });

  const report = readReport_(sheet);
  const count = sheet.getLastRow() - 2;
  const round = v => (v === null || v === undefined || !isFinite(v)) ? "" : Math.round(v * 100) / 100;

  const valueFor = (link, cuenta) => {
    const s = byCuenta[cuenta];
    if (!s) return "";
    if (link.tipo === "componente") return round(s.items[link.ref] ? s.items[link.ref].raw : null);
    if (link.tipo === "final") return round(s.final);
    if (link.tipo === "estricta") return round(s.finalStrict);
    if (link.tipo === "entero") return s.entero === null || s.entero === undefined ? "" : s.entero;
    // proyecto
    const project = projects[link.ref];
    if (!project) return "";
    const team = computed.projects.teams.find(t => t.projectId === project.id && t.members.includes(cuenta));
    if (team) return round(team.calificacion);
    return computed.projects.evaluated.has(project.id) && !project.abierto ? 0 : "";
  };

  let written = 0;
  links.forEach(link => {
    const col = findColumn_(report.headers, link.columna);
    if (col === -1) return;
    const values = [];
    for (let r = 2; r < count + 2; r++) {
      values.push([valueFor(link, limpiarCuenta_((report.data[r] || [])[report.accountIndex]))]);
    }
    sheet.getRange(3, col + 1, count, 1).setValues(values);
    written++;
  });

  delete Db._cache["__rep_" + group.sheet];
  return written;
}

/** Se llama después de cada cambio de calificaciones/asistencia; nunca rompe la operación principal. */
function afterGradesChange_(idCurso) {
  if (!idCurso) return "";
  try {
    Db.clearCache();
    const n = syncReportColumns_(idCurso);
    return n ? ` Reporte actualizado (${n} columna(s)).` : "";
  } catch (error) {
    return ` (No se pudo actualizar el reporte: ${error.message})`;
  }
}

// ---------- Agregar, borrar y reordenar columnas del Reporte_ ----------

/** Índices (0-based) de columnas que no son Cuenta, Nombre ni fecha. */
function otherColumnIndexes_(sheet) {
  const width = sheet.getLastColumn();
  const headers = sheet.getRange(2, 1, 1, width).getValues()[0];
  const clean = headers.map(cleanText_);
  const iCuenta = findColumn_(clean, "Cuenta"), iName = findNameColumn_(clean);
  const dates = new Set(detectDateColumns_(headers, iCuenta, getSpreadsheetTz_()).map(d => d.index));
  const out = [];
  clean.forEach((h, i) => { if (h && i !== iCuenta && i !== iName && !dates.has(i)) out.push(i); });
  return { out, clean };
}

function reportSheetFor_(idCurso) {
  const group = requireGroup_(cleanText_(idCurso));
  const sheet = group.sheet && SpreadsheetApp.getActiveSpreadsheet().getSheetByName(group.sheet);
  if (!sheet) throw new Error("Este grupo no tiene hoja Reporte_ ligada.");
  return { group, sheet };
}

/**
 * Mueve las columnas (no fecha) al orden de `order` (nombres), ocupando
 * los mismos lugares que ya tenían. Usa moveColumns: conserva valores,
 * fórmulas y formato.
 */
function reorderReportColumns_(sheet, order) {
  const first = otherColumnIndexes_(sheet);
  const slots = first.out.slice();
  const wanted = order.map(cleanText_).filter(n => first.clean.some(h => normalizeKey_(h) === normalizeKey_(n)));
  wanted.forEach((name, k) => {
    if (k >= slots.length) return;
    const now = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0].map(cleanText_);
    const from = findColumn_(now, name);
    const to = slots[k];
    if (from === -1 || from === to) return;
    const letter = columnLetter_(from + 1);
    sheet.moveColumns(sheet.getRange(`${letter}:${letter}`), from > to ? to + 1 : to + 2);
  });
}

function columnLetter_(n) {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// ---------- Componente ⇄ columna (siempre enlazados) ----------

const colKey_ = t => normalizeKey_(t).replace(/[\s_\-.]+/g, "");

/**
 * Deja cada componente con su columna en el Reporte_ y viceversa:
 *  - componente borrado  → se borra su columna enlazada
 *  - componente renombrado → se renombra el encabezado
 *  - componente sin columna → se enlaza la columna del mismo nombre
 *    (Parcial 1 = Parcial_1; Proyectos = Proyecto_Final) o se crea al final.
 * before = componentes antes del cambio (null = solo emparejar).
 * Devuelve notas para el mensaje.
 */
function pairComponentColumns_(idCurso, before) {
  const group = requireGroup_(idCurso);
  const sheet = group.sheet && SpreadsheetApp.getActiveSpreadsheet().getSheetByName(group.sheet);
  if (!sheet || sheet.getLastColumn() < 2) return [];
  const notes = [];
  const after = componentsFor_(idCurso);
  const afterIds = new Set(after.map(c => c.id));
  const all = Db.read(WEB.COLUMNS).rows.map(r => Object.assign({}, r));
  const mine = l => cleanText_(l.ID_Curso) === idCurso;
  const compLink = id => all.find(l => mine(l) && cleanText_(l.Tipo) === "componente" && cleanText_(l.Ref) === id);
  const headersNow = () => sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0].map(cleanText_);

  // 1. Componentes borrados → borrar su columna (de derecha a izquierda)
  const removed = (before || []).filter(c => !afterIds.has(c.id));
  const gone = [];
  removed.forEach(c => {
    const l = compLink(c.id);
    if (!l) return;
    all.splice(all.indexOf(l), 1);
    gone.push(cleanText_(l.Columna));
  });
  if (gone.length) {
    const h = headersNow();
    gone.map(n => findColumn_(h, n)).filter(i => i > 1).sort((a, b) => b - a).forEach(i => sheet.deleteColumn(i + 1));
    notes.push(`Columnas borradas del reporte: ${gone.join(", ")}.`);
  }

  // 2. Renombrados y 3. sin columna
  let h = headersNow();
  const info = otherColumnIndexes_(sheet);
  const linkedCols = new Set(all.filter(mine).map(l => colKey_(l.Columna)));
  const created = [];
  after.forEach(c => {
    const l = compLink(c.id);
    const old = (before || []).find(b => b.id === c.id);
    if (l) {
      if (old && colKey_(old.nombre) !== colKey_(c.nombre) && findColumn_(h, c.nombre) === -1) {
        const i = findColumn_(h, l.Columna);
        if (i !== -1) { sheet.getRange(2, i + 1).setValue(c.nombre); h[i] = c.nombre; }
        l.Columna = c.nombre;
      }
      return;
    }
    const free = info.out.filter(i => !linkedCols.has(colKey_(h[i])));
    let i = free.find(k => colKey_(h[k]) === colKey_(c.nombre));
    if (i === undefined && c.tipo === "proyectos") i = free.find(k => /proyecto|ejercicio/.test(colKey_(h[k])));
    if (i === undefined) {
      i = sheet.getLastColumn();
      sheet.getRange(1, i + 1).setValue("Visible");
      sheet.getRange(2, i + 1).setValue(c.nombre);
      h[i] = c.nombre;
      created.push(c.nombre);
    }
    linkedCols.add(colKey_(h[i]));
    all.push({ ID_Curso: idCurso, Columna: h[i], Tipo: "componente", Ref: c.id });
  });
  if (created.length) notes.push(`Columnas nuevas en el reporte: ${created.join(", ")}.`);

  // Emparejado inicial: Calificación/SIAE y demás sugerencias que no son componente
  if (!before) {
    const projects = projectsFor_(idCurso);
    info.out.forEach(i => {
      if (linkedCols.has(colKey_(h[i]))) return;
      const sug = suggestColumnLink_(h[i], after, projects);
      if (sug && sug.tipo !== "componente") all.push({ ID_Curso: idCurso, Columna: h[i], Tipo: sug.tipo, Ref: sug.ref || "" });
    });
  }

  Db.writeAll(WEB.COLUMNS, all);
  delete Db._cache["__rep_" + group.sheet];
  return notes;
}

/** Una sola vez: empareja componentes y columnas de todos los grupos ya configurados. */
function pairAllComponentColumns_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("CCH_PAIRED_V641")) return;
  Object.keys(courseMap_()).forEach(id => {
    if (!componentsFor_(id).length) return;
    try { Db.clearCache(); pairComponentColumns_(id, null); syncReportColumns_(id); } catch (e) { /* grupo sin hoja */ }
  });
  props.setProperty("CCH_PAIRED_V641", new Date().toISOString());
}

/** Agrega una columna (no fecha) al final del reporte y, por defecto, su componente (0 %). */
function addReportColumn_(params) {
  const { group, sheet } = reportSheetFor_(params.idCurso);
  const name = cleanText_(params.name).slice(0, 40);
  if (!name) throw new Error("Escribe el nombre de la columna.");
  if (normalizeDateKey_(name, getSpreadsheetTz_())) throw new Error("Las fechas se agregan solas; usa otro nombre.");
  const headers = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0].map(cleanText_);
  if (findColumn_(headers, name) !== -1) throw new Error(`Ya existe la columna «${name}».`);
  const col = sheet.getLastColumn() + 1;
  sheet.getRange(1, col).setValue("Visible");
  sheet.getRange(2, col).setValue(name);
  delete Db._cache["__rep_" + group.sheet];
  if (params.component === false) return { message: `Columna «${name}» agregada a ${group.sheet}.` };

  // Su componente en la ponderación (manual, 0 %), enlazado a la columna
  const idCurso = cleanText_(params.idCurso);
  let comp = componentsFor_(idCurso).find(c => colKey_(c.nombre) === colKey_(name));
  const taken = comp && savedColumnLinks_(idCurso).some(l => l.tipo === "componente" && l.ref === comp.id);
  if (!comp || taken) {
    const all = Db.read(WEB.COMPONENTS).rows;
    const order = all.filter(r => cleanText_(r.ID_Curso) === idCurso).length + 1;
    comp = { id: shortId_(), nombre: taken ? `${name} (columna)` : name };
    Db.append(WEB.COMPONENTS, [{ ID: comp.id, ID_Curso: idCurso, Nombre: comp.nombre, Tipo: "manual", Ponderacion: 0, Maximo: 10, Orden: order }]);
  }
  Db.append(WEB.COLUMNS, [{ ID_Curso: idCurso, Columna: name, Tipo: "componente", Ref: comp.id }]);
  return { message: `Columna «${name}» agregada a ${group.sheet} y a la ponderación con 0 % (ajústala en Ponderación).`, link: { tipo: "componente", ref: comp.id, label: `Componente · ${comp.nombre}` } };
}

/**
 * Borra una columna (no fecha) del reporte.
 * Si tiene datos y no viene force=true, NO borra y devuelve needsConfirm.
 */
function deleteReportColumn_(params) {
  const { group, sheet } = reportSheetFor_(params.idCurso);
  const name = cleanText_(params.name);
  const info = otherColumnIndexes_(sheet);
  const col = info.out.find(i => normalizeKey_(info.clean[i]) === normalizeKey_(name));
  if (col === undefined) throw new Error("Solo se pueden borrar columnas que no sean Cuenta, Nombre ni fechas.");

  const idCurso0 = cleanText_(params.idCurso);
  const link = savedColumnLinks_(idCurso0).find(l => l.tipo === "componente" && normalizeKey_(l.columna) === normalizeKey_(name));
  const comp = link && componentsFor_(idCurso0).find(c => c.id === link.ref);
  const compNote = comp ? ` También se quitará su componente «${comp.nombre}» (${comp.ponderacion} %) de la ponderación.` : "";

  let filled = 0;
  if (sheet.getLastRow() >= 3) {
    const range = sheet.getRange(3, col + 1, sheet.getLastRow() - 2, 1);
    const values = range.getValues(), formulas = range.getFormulas();
    values.forEach((r, i) => { if (cleanText_(r[0]) !== "" || formulas[i][0]) filled++; });
  }
  if (filled && !params.force) return { needsConfirm: true, filled, message: `«${name}» tiene ${filled} dato(s).${compNote}` };

  sheet.deleteColumn(col + 1);
  const idCurso = cleanText_(params.idCurso);
  Db.writeAll(WEB.COLUMNS, Db.read(WEB.COLUMNS).rows.filter(r => !(cleanText_(r.ID_Curso) === idCurso && normalizeKey_(r.Columna) === normalizeKey_(name))));
  delete Db._cache["__rep_" + group.sheet];
  let extra = "";
  if (comp) {
    Db.writeAll(WEB.COMPONENTS, Db.read(WEB.COMPONENTS).rows.filter(r => !(cleanText_(r.ID_Curso) === idCurso && cleanText_(r.ID) === comp.id)));
    const total = componentsFor_(idCurso).reduce((s, c) => s + c.ponderacion, 0);
    extra = ` También se quitó «${comp.nombre}» de la ponderación: ahora suma ${total} %${total === 100 ? "" : ", ajústala para llegar a 100 %"}.`;
    try { syncReportColumns_(idCurso); } catch (e) { /* nada */ }
  }
  return { message: `Columna «${name}» borrada de ${group.sheet}${filled ? ` (tenía ${filled} dato(s))` : ""}.${extra}`, componentRemoved: !!comp };
}

/** Calificación y SIAE enlazadas como "final" (decimales) pasan a "entero". Una sola vez, sin costo. */
function upgradeIntegerLinks_() {
  const rows = Db.read(WEB.COLUMNS).rows;
  let changed = 0;
  const out = rows.map(r => {
    const copy = Object.assign({}, r);
    const key = normalizeKey_(r.Columna).replace(/[\s_]+/g, "");
    if (cleanText_(r.Tipo) === "final" && (key === "calificacion" || key === "siae")) { copy.Tipo = "entero"; changed++; }
    return copy;
  });
  if (changed) Db.writeAll(WEB.COLUMNS, out);
  return changed;
}


// ============================================================
// ESTADO DE FÁBRICA Y DEMO
//
// - Si no existe la propiedad CCH_ADMIN_PASSWORD, la contraseña es la
//   de fábrica (SETTINGS.FACTORY_PASSWORD) y el panel lo avisa.
// - La primera vez (hoja sin cursos) se crea un grupo DEMO.
// - «Restaurar a fábrica»: respaldo ZIP completo → borra W_* y Reporte_*,
//   vacía Course/Students/Attendance Log/Roles, borra las propiedades
//   CCH_* (contraseña incluida) y vuelve a crear el DEMO.
//   Las demás hojas que hayas agregado tú no se tocan.
// ============================================================

const DEMO_ = {
  materia: "Demo Estadística",
  grupo: "101",
  students: [
    ["300000001", "ACOSTA BRAVO ANDREA"], ["300000002", "BENÍTEZ CRUZ LUIS"], ["300000003", "CASTRO DÍAZ MARIANA"],
    ["300000004", "DOMÍNGUEZ ESTRADA JOSÉ"], ["300000005", "ESPINOSA FLORES VALERIA"], ["300000006", "FUENTES GÓMEZ DIEGO"],
    ["300000007", "GUERRERO HERRERA SOFÍA"], ["300000008", "IBARRA JUÁREZ EMILIO"], ["300000009", "LARA MÉNDEZ CAMILA"],
    ["300000010", "MORALES NAVARRO RICARDO"], ["300000011", "ORTEGA PÉREZ XIMENA"], ["300000012", "RÍOS SALAZAR MATEO"]
  ],
  // por alumno: faltas en las 6 fechas (índices) y Parcial 1
  faltas: [[], [2], [], [1, 4], [], [0, 2, 3, 5], [], [5], [], [3], [1], [0, 1, 2, 3, 4]],
  parcial1: [9, 7.5, 10, 6, 8.5, 5, 9.5, 7, 8, 6.5, 9, 4]
};

/** Contraseña vigente: la de la propiedad o, si no existe, la de fábrica. */
function adminPassword_() {
  const saved = PropertiesService.getScriptProperties().getProperty(SETTINGS.ADMIN_PASSWORD_KEY);
  return { value: saved || SETTINGS.FACTORY_PASSWORD, factory: !saved };
}

/** Primera instalación: hoja sin cursos → grupo DEMO (una sola vez). */
function ensureDemoOnFirstInstall_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("CCH_DEMO_CREADO")) return null;
  props.setProperty("CCH_DEMO_CREADO", new Date().toISOString());
  if (Object.keys(courseMap_()).length) return null;
  try { return loadDemo_(); } catch (e) { console.error("Demo: " + e.message); return null; }
}

function loadDemo_() {
  Db.clearCache();
  const g = createGroup_({ materia: DEMO_.materia, grupo: DEMO_.grupo, horario: "7:00" });
  const idCurso = g.idCurso;
  Db.clearCache();

  DEMO_.students.forEach(([cuenta, nombre]) => {
    addStudent_({ idCurso, cuenta, nombre, email: `${cuenta}@alumno.demo` });
    Db.clearCache();
  });

  // Ponderación por defecto
  saveComponents_({ idCurso, components: DEFAULT_COMPONENTS.map(c => ({ nombre: c.Nombre, tipo: c.Tipo, ponderacion: c.Ponderacion, maximo: c.Maximo })) });
  Db.clearCache();

  // Asistencia: 6 días hábiles anteriores a hoy
  const tz = getSpreadsheetTz_();
  const days = [];
  const d = new Date();
  while (days.length < 6) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.unshift(Utilities.formatDate(d, tz, "yyyy-MM-dd"));
  }
  days.forEach((date, k) => {
    saveRollCall_({
      idCurso, date,
      marks: DEMO_.students.map(([cuenta], i) => ({
        cuenta,
        status: DEMO_.faltas[i].includes(k) ? (i === 3 && k === 4 ? "Justificante" : "Falta") : "Asistencia"
      }))
    });
    Db.clearCache();
  });

  // Parcial 1
  const p1 = componentsFor_(idCurso).find(c => /parcial1/.test(normalizeKey_(c.nombre).replace(/\s+/g, "")));
  if (p1) saveGrades_({ idCurso, entries: DEMO_.students.map(([cuenta], i) => ({ cuenta, componentId: p1.id, valor: String(DEMO_.parcial1[i]) })) });
  Db.clearCache();

  // Proyecto con 3 equipos (2 calificados) y registro abierto
  const projComp = componentsFor_(idCurso).find(c => c.tipo === "proyectos");
  saveProject_({ idCurso, project: { nombre: "Proyecto demo", rubros: DEFAULT_RUBRICS.slice(), componentId: projComp ? projComp.id : "", abierto: true } });
  Db.clearCache();
  const project = projectsFor_(idCurso)[0];
  const teams = [["Los Pitagóricos", 0, 3], ["Media y Moda", 3, 6], ["Los Outliers", 6, 9]];
  teams.forEach(([nombre, a, b], k) => {
    const r = registerTeamCore_({ projectId: project.id, nombre, cuentas: DEMO_.students.slice(a, b).map(s => s[0]), by: "admin", admin: true });
    Db.clearCache();
    if (k < 2) {
      const stars = {};
      DEFAULT_RUBRICS.forEach((rb, j) => { stars[rb] = k === 0 ? 5 - (j % 2) : 4 - (j % 3 === 0 ? 1 : 0); });
      saveTeamEval_({ teamId: r.teamId, stars, observaciones: "Equipo de demostración" });
      Db.clearCache();
    }
  });

  try {
    pairComponentColumns_(idCurso, null);
    addReportColumn_({ idCurso, name: "Calificación", component: false });
    Db.append(WEB.COLUMNS, [{ ID_Curso: idCurso, Columna: "Calificación", Tipo: "entero", Ref: "" }]);
    Db.clearCache();
    syncReportColumns_(idCurso);
  } catch (e) { console.error("Demo columnas: " + e.message); }
  Db.clearCache();
  return { idCurso, sheet: g.sheetName, students: DEMO_.students.length };
}

/** Borra TODO lo del sistema (con respaldo) y deja el DEMO. */
function factoryReset_(params) {
  if (cleanText_(params.confirm).toUpperCase() !== SETTINGS.FACTORY_WORD) {
    throw new Error(`Escribe ${SETTINGS.FACTORY_WORD} para confirmar.`);
  }
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Respaldo completo (todas las hojas, valores)
  const blob = exportXlsx_(`Respaldo completo ${stamp_()}`, spreadsheet.getSheets().map(sh => ({ name: sh.getName(), matrix: sheetMatrix_(sh) })));
  const backup = saveZip_(`${SETTINGS.BACKUP_PREFIX}antes_de_fabrica_${stamp_()}.zip`, [blob]);

  // 2. Hojas de la web y reportes
  ensureBaseSheets_();
  const removed = [];
  spreadsheet.getSheets().slice().forEach(sh => {
    const name = sh.getName();
    if (/^W_/.test(name) || /^Reporte_/i.test(name)) { spreadsheet.deleteSheet(sh); removed.push(name); }
  });

  // 3. Tablas de AppSheet: solo encabezados
  BASE_SHEETS.forEach(def => {
    const sh = spreadsheet.getSheetByName(def.name);
    if (!sh || sh.getLastRow() < 2) return;
    if (sh.getMaxRows() <= sh.getLastRow()) sh.insertRowsAfter(sh.getLastRow(), 1);
    sh.deleteRows(2, sh.getLastRow() - 1);
  });

  // 4. Propiedades CCH_* (contraseña, ciclo fijo, carpetas, banderas)
  const props = PropertiesService.getScriptProperties();
  Object.keys(props.getProperties()).filter(k => /^CCH_/.test(k)).forEach(k => props.deleteProperty(k));

  // 5. Estructura y DEMO
  Db.clearCache();
  Object.keys(WEB).forEach(key => Db.sheet(WEB[key]));
  props.setProperty("CCH_DEMO_CREADO", new Date().toISOString());
  props.setProperty("CCH_PAIRED_V641", new Date().toISOString());
  const demo = loadDemo_();

  return {
    backup,
    removed: removed.length,
    demo,
    message: `Restaurado a fábrica. Respaldo: ${backup.name}. Se creó el grupo DEMO (${demo.students} alumnos). ` +
      `Contraseña de administrador: ${SETTINGS.FACTORY_PASSWORD} (cámbiala en Propiedades del script → ${SETTINGS.ADMIN_PASSWORD_KEY}).`
  };
}


// ============================================================
// ENLACE CON LOS EXÁMENES EN LÍNEA (Examenes.gs)
//
// Un componente de tipo «examen» toma la «Calificación (0-10)» de la hoja
// «Resultados …» del examen, por número de cuenta y parcial (solo entregados).
// Fuente = "<hoja de resultados>|<parcial>", ej. "Resultados Estadística|1".
// Solo cuentan los alumnos inscritos en el grupo (mismo número de cuenta).
// ============================================================

const EXAM_RESULTS_PREFIX = "Resultados ";
const EXAM_PARCIALES = [1, 2];

/** Exámenes disponibles: una opción por hoja «Resultados …» y parcial. */
function examSources_() {
  if (Db._cache.__examSources) return Db._cache.__examSources;
  const out = [];
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(sh => {
    const name = sh.getName();
    if (name.indexOf(EXAM_RESULTS_PREFIX) !== 0) return;
    const materia = name.slice(EXAM_RESULTS_PREFIX.length);
    EXAM_PARCIALES.forEach(p => out.push({ id: `${name}|${p}`, label: `Examen ${materia} · Parcial ${p}` }));
  });
  Db._cache.__examSources = out;
  return out;
}

/** { cuenta: calificación } de un examen y parcial (solo «Entregado»). */
function examGrades_(fuente) {
  const key = "__exam_" + fuente;
  if (Db._cache[key]) return Db._cache[key];
  const map = {};
  const [sheetName, parcialText] = String(fuente || "").split("|");
  const sheet = sheetName && SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (sheet && sheet.getLastRow() > 1) {
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(cleanText_);
    const iCuenta = findColumn_(headers, "Número de cuenta");
    const iParcial = findColumn_(headers, "Parcial");
    const iEstado = findColumn_(headers, "Estado");
    const iNota = headers.findIndex(h => /^calificaci/i.test(h));
    if (iCuenta !== -1 && iParcial !== -1 && iNota !== -1) {
      values.slice(1).forEach(r => {
        if (Number(r[iParcial]) !== Number(parcialText)) return;
        if (iEstado !== -1 && cleanText_(r[iEstado]) !== "Entregado") return;
        const cuenta = limpiarCuenta_(r[iCuenta]);
        const nota = toNumberOrNull_(r[iNota]);
        if (cuenta && nota !== null) map[cuenta] = Math.max(0, Math.min(10, nota));
      });
    }
  }
  Db._cache[key] = map;
  return map;
}

/**
 * Lo llama Examenes.gs al entregar. Solo anota la hora (rápido, sin candado extra);
 * las columnas del Reporte_ se reescriben al abrir el grupo en el panel o con Sync.
 */
function examSubmitted_(sheetName, parcial) {
  CacheService.getScriptCache().put(`exam_ts_${sheetName}|${parcial}`, String(Date.now()), 21600);
}

/** Si hubo entregas nuevas de un examen ligado al grupo, reescribe sus columnas. */
function refreshExamColumns_(idCurso) {
  const fuentes = componentsFor_(idCurso).filter(c => c.tipo === "examen" && c.fuente).map(c => c.fuente);
  if (!fuentes.length) return;
  const cache = CacheService.getScriptCache();
  const last = Number(cache.get("exam_sync_" + idCurso) || 0);
  const newest = Math.max.apply(null, fuentes.map(f => Number(cache.get("exam_ts_" + f) || 0)));
  if (newest <= last) return;
  try {
    withScriptLock_(() => syncReportColumns_(idCurso));
    cache.put("exam_sync_" + idCurso, String(Date.now()), 21600);
  } catch (e) { /* lo hará el siguiente Sync */ }
}


// ============================================================
// DISEÑO DE LAS HOJAS (estilo Bootstrap 5.3)
//   Encabezado oscuro (#212529), texto blanco en negritas, fila
//   congelada, filas alternas #F8F9FA y estados con colores "subtle".
// ============================================================

const SHEET_STYLE = {
  FONT: "Arial",
  SIZE: 10,
  HEADER_BG: "#212529",
  HEADER_FG: "#FFFFFF",
  BAND: "#F8F9FA",
  VISIBLE_BG: "#CFE2FF",
  VISIBLE_FG: "#084298",
  HIDDEN_BG: "#E9ECEF",
  HIDDEN_FG: "#6C757D"
};

/** Tabla normal: encabezados en la fila 1. */
function formatTableSheet_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const maxRows = sheet.getMaxRows();

  sheet.getBandings().forEach(b => b.remove());
  sheet.getRange(1, 1, maxRows, lastColumn)
    .setFontFamily(SHEET_STYLE.FONT).setFontSize(SHEET_STYLE.SIZE).setVerticalAlignment("middle");

  sheet.getRange(1, 1, maxRows, lastColumn)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
    .setHeaderRowColor(SHEET_STYLE.HEADER_BG)
    .setFirstRowColor("#FFFFFF")
    .setSecondRowColor(SHEET_STYLE.BAND);

  sheet.getRange(1, 1, 1, lastColumn)
    .setFontColor(SHEET_STYLE.HEADER_FG).setFontWeight("bold").setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

/** Hoja Reporte_*: fila 1 visibilidad, fila 2 encabezados, fechas con estados. */
function formatReportSheet_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const maxRows = sheet.getMaxRows();
  const tz = getSpreadsheetTz_();

  sheet.getBandings().forEach(b => b.remove());
  sheet.getRange(1, 1, maxRows, lastColumn)
    .setFontFamily(SHEET_STYLE.FONT).setFontSize(SHEET_STYLE.SIZE)
    .setVerticalAlignment("middle").setHorizontalAlignment("center");

  sheet.getRange(1, 1, 1, lastColumn).setFontSize(8).setFontWeight("bold");
  sheet.getRange(2, 1, 1, lastColumn)
    .setBackground(SHEET_STYLE.HEADER_BG).setFontColor(SHEET_STYLE.HEADER_FG).setFontWeight("bold");

  const headers = sheet.getRange(2, 1, 1, lastColumn).getValues()[0];
  const accountIndex = findColumn_(headers.map(cleanText_), "Cuenta");
  const nameIndex = findNameColumn_(headers.map(cleanText_));
  if (nameIndex !== -1) sheet.getRange(3, nameIndex + 1, Math.max(maxRows - 2, 1), 1).setHorizontalAlignment("left");

  const dateIndexes = detectDateColumns_(headers, accountIndex, tz).map(c => c.index);
  groupContiguous_(dateIndexes).forEach(group => {
    sheet.getRange(2, group[0] + 1, 1, group.length).setNumberFormat(SETTINGS.DEFAULT_DATE_FORMAT);
    sheet.getRange(3, group[0] + 1, Math.max(maxRows - 2, 1), group.length).setDataValidation(statusValidation_());
  });

  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(Math.max(accountIndex, nameIndex) + 1);

  // Reglas de color (fila 1 y estados)
  const visibility = sheet.getRange(1, 1, 1, lastColumn);
  const data = sheet.getRange(3, 1, Math.max(maxRows - 2, 1), lastColumn);
  const rule = (text, range, bg, fg) => SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([range]).build();

  const rules = [
    rule("Visible", visibility, SHEET_STYLE.VISIBLE_BG, SHEET_STYLE.VISIBLE_FG),
    rule("Oculto", visibility, SHEET_STYLE.HIDDEN_BG, SHEET_STYLE.HIDDEN_FG)
  ];
  Object.keys(STATUS_FILL).forEach(status => {
    if (status === STATUS.RETARDO && !USE_RETARDO) return;
    rules.push(rule(status, data, STATUS_FILL[status], STATUS_FONT[status]));
  });
  sheet.setConditionalFormatRules(rules);
}



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

/**
 * Ciclo escolar UNAM a partir de una fecha (2 por año):
 *   agosto–enero   → (año siguiente)-1   ej. 15/oct/2026 → 2027-1, 20/ene/2027 → 2027-1
 *   febrero–julio  → (año)-2             ej. 10/mar/2027 → 2027-2
 * Equivalente en Sheets (fecha en A2):
 *   =IF(MONTH(A2)>=8, YEAR(A2)+1&"-1", IF(MONTH(A2)=1, YEAR(A2)&"-1", YEAR(A2)&"-2"))
 */
function cicloFromDate_(date) {
  const tz = getSpreadsheetTz_();
  const year = Number(Utilities.formatDate(date, tz, "yyyy"));
  const month = Number(Utilities.formatDate(date, tz, "M"));
  if (month >= 8) return `${year + 1}-1`;
  if (month === 1) return `${year}-1`;
  return `${year}-2`;
}

/** Columna de nombre en hojas Reporte_ ("Nombre" o "First Name"). */
function findNameColumn_(headers) {
  for (let i = 0; i < REPORT_NAME_HEADERS.length; i++) {
    const index = findColumn_(headers, REPORT_NAME_HEADERS[i]);
    if (index !== -1) return index;
  }
  return -1;
}

/** Lista desplegable para celdas de asistencia (permite N/D y textos viejos). */
function statusValidation_() {
  const list = USE_RETARDO
    ? [STATUS.ASISTENCIA, STATUS.RETARDO, STATUS.FALTA, STATUS.JUSTIFICANTE]
    : [STATUS.ASISTENCIA, STATUS.FALTA, STATUS.JUSTIFICANTE];
  return SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(true).build();
}


