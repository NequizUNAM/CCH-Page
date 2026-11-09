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
      .filter(c => c.tipo === "manual")
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
  return { message: estado === "Aplicada" ? "Puntos aplicados ✅ El alumno ya lo ve en su calificación." : `Evidencia marcada como ${estado}.` };
}
