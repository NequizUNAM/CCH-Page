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

  const teamIds = new Set(Db.read(WEB.TEAMS).rows.filter(r => cleanText_(r.ID_Proyecto) === id).map(r => cleanText_(r.ID_Equipo)));
  Db.writeAll(WEB.PROJECTS, Db.read(WEB.PROJECTS).rows.filter(r => cleanText_(r.ID) !== id));
  Db.writeAll(WEB.TEAMS, Db.read(WEB.TEAMS).rows.filter(r => cleanText_(r.ID_Proyecto) !== id));
  Db.writeAll(WEB.TEAM_EVALS, Db.read(WEB.TEAM_EVALS).rows.filter(r => !teamIds.has(cleanText_(r.ID_Equipo))));

  return { message: "Proyecto eliminado junto con sus equipos y evaluaciones." };
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
  Db.writeAll(WEB.TEAMS, Db.read(WEB.TEAMS).rows.filter(r => cleanText_(r.ID_Equipo) !== id));
  Db.writeAll(WEB.TEAM_EVALS, Db.read(WEB.TEAM_EVALS).rows.filter(r => cleanText_(r.ID_Equipo) !== id));
  return { message: "Equipo eliminado." };
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
    message: `«${team.nombre}»: ${calificacion} — aplicada a ${team.members.length} integrante(s) ✅`
  };
}
