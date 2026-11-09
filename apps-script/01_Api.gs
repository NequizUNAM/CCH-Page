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
  saveComponents:     { auth: "admin", fn: saveComponents_, lock: true },
  importLegacyGrades: { auth: "admin", fn: importLegacyGrades_, lock: true },
  saveGrades:         { auth: "admin", fn: saveGrades_, lock: true },
  saveProject:        { auth: "admin", fn: saveProject_, lock: true },
  deleteProject:      { auth: "admin", fn: deleteProject_, lock: true },
  adminSaveTeam:      { auth: "admin", fn: adminSaveTeam_, lock: true },
  deleteTeam:         { auth: "admin", fn: deleteTeam_, lock: true },
  saveTeamEval:       { auth: "admin", fn: saveTeamEval_, lock: true },
  listEvidence:       { auth: "admin", fn: listEvidence_ },
  reviewEvidence:     { auth: "admin", fn: reviewEvidence_, lock: true },
  searchStudents:     { auth: "admin", fn: searchStudents_ },
  studentProfile:     { auth: "admin", fn: studentProfile_ },
  addComment:         { auth: "admin", fn: addComment_, lock: true },
  deleteComment:      { auth: "admin", fn: deleteComment_, lock: true },
  getReports:         { auth: "admin", fn: () => ({ reports: getReportSheets_() }) },
  createReportSheet:  { auth: "admin", fn: p => createReportSheet(p.reportName) },
  // syncAllData ya usa su propio candado
  syncAttendance:     { auth: "admin", fn: p => syncAllData(p.sheetName) },
  diagnose:           { auth: "admin", fn: p => diagnoseAttendance_(p.sheetName) },

  // ---- Pase de lista ----
  saveRollCall:       { auth: "admin", fn: saveRollCall_, lock: true },

  // ---- Mantenimiento ----
  maintenanceInfo:    { auth: "admin", fn: maintenanceInfo_ },
  setupStructure:     { auth: "admin", fn: () => setupWeb_({ folders: true }), lock: true },
  setCurrentCycle:    { auth: "admin", fn: setCurrentCycle_, lock: true },
  backupPreview:      { auth: "admin", fn: backupPreview_ },
  backupCycles:       { auth: "admin", fn: backupCycles_, lock: true },
  clearTable:         { auth: "admin", fn: clearTable_, lock: true }
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

  const groups = Db.read(WEB.GROUPS);
  if (groups.rows.length === 0) {
    const courses = courseMap_();
    const studentCourses = studentCourseMap_();

    getReportSheets_().forEach(report => {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(report.name);
      let accounts = [];
      try { accounts = readReport_(sheet).students.map(s => s.account); } catch (e) { /* hoja vacía */ }

      const match = findReportCourseId_(report.name, courses, accounts, studentCourses);
      if (!match.courseId || linked.some(g => g.ID_Curso === match.courseId)) return;

      const course = courses[match.courseId];
      linked.push({
        ID_Curso: match.courseId,
        Etiqueta: `${course.name} · ${course.group}`.trim(),
        Hoja_Reporte: report.name,
        Ciclo: course.ciclo,
        Activo: true
      });
    });

    if (linked.length) Db.append(WEB.GROUPS, linked);
  }

  return { sheets, linked, created: base.created, missingColumns: base.missingColumns, folders };
}
