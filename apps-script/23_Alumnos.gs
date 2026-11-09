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

function studentData_(params, ctx) {
  const cuenta = ctx.cuenta;
  const names = studentNames_();
  const evals = evalsMap_();

  const courses = studentCourseIds_(cuenta).map(idCurso => {
    const result = computeCourse_(idCurso, cuenta);
    const me = result.students[0] || { items: {}, final: null, finalStrict: null, counts: null };
    const att = result.attendance;
    const row = att && att.rows[cuenta];

    // Solo columnas marcadas "Visible" en la fila 1 del reporte
    const visibleDates = att ? att.dates.map((d, i) => ({ d, i })).filter(x => x.d.visible) : [];
    const visibleOthers = att ? att.others.map((o, i) => ({ o, i })).filter(x => x.o.visible) : [];

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
        dates: visibleDates.map(x => ({ key: x.d.key, label: x.d.label, status: row.statuses[x.i] })),
        counts: countStatuses_(visibleDates.map(x => row.statuses[x.i]))
      } : null,
      legacy: row && !result.components.length
        ? visibleOthers.map(x => ({ label: x.o.label, value: row.others[x.i] }))
        : [],
      components: result.components,
      items: me.items,
      final: me.final,
      finalStrict: me.finalStrict,
      projects
    };
  });

  return {
    student: { cuenta, nombre: names[cuenta] || "" },
    courses,
    evidences: evidenceForStudent_(cuenta),
    evidenceTypes: SETTINGS.EVIDENCE_TYPES,
    maxFileMb: SETTINGS.MAX_FILE_MB,
    maxTeamSize: SETTINGS.MAX_TEAM_SIZE
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

  const data = {
    ID_Curso: id,
    Etiqueta: cleanText_(params.etiqueta).slice(0, 60) || `${course.name} · ${course.group}`,
    Hoja_Reporte: sheetName,
    Ciclo: cleanText_(params.ciclo) || course.ciclo,
    Activo: params.activo !== false
  };

  const row = Db.read(WEB.GROUPS).rows.find(r => cleanText_(r.ID_Curso) === id);
  if (row) Db.update(WEB.GROUPS, Object.assign(row, data));
  else Db.append(WEB.GROUPS, [data]);

  return { message: "Grupo guardado ✅" };
}

// ---------- Panel admin: datos de un grupo ----------

function groupData_(params) {
  const idCurso = cleanText_(params.idCurso);
  const result = computeCourse_(idCurso);
  const names = studentNames_();
  const commentCounts = commentCounts_();
  const links = studentLinks_(idCurso, result.group.ciclo);

  const att = result.attendance;

  return {
    group: result.group,
    currentCycle: currentCycle_(),
    components: result.components,
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
      idCurso: r.course, curso: c.name || r.course || "(sin curso)", grupo: c.group || "",
      ciclo: (g && g.ciclo) || c.ciclo || "", activo: !!(g && g.active), counts
    });
  });

  return {
    cuenta,
    nombres: Array.from(new Set(records.map(r => r.nombre).filter(Boolean))),
    correos: Array.from(new Set(records.map(r => r.email).filter(Boolean))),
    enrollments,
    comments: commentsFor_(cuenta),
    history: historyMap_()[cuenta] || [],
    evidences: evidenceForStudent_(cuenta),
    teams: teamsFor_("").filter(t => t.members.includes(cuenta)).map(t => ({
      nombre: t.nombre, grupo: groups[t.idCurso] ? groups[t.idCurso].label : t.idCurso
    }))
  };
}

// ---------- Comentarios ----------

/** Comentarios de la hoja Calificaciones (AppSheet) + W_Comentarios. */
function allComments_() {
  if (Db._cache.__comments) return Db._cache.__comments;
  const courses = courseMap_();
  const list = [];

  const legacy = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LEGACY_GRADES);
  if (legacy && legacy.getLastRow() > 1) {
    const data = legacy.getDataRange().getDisplayValues();
    const headers = data[0].map(cleanText_);
    const iCuenta = findColumn_(headers, "Cuenta");
    const iCurso = findColumn_(headers, "ID_Curso");
    const iText = findColumn_(headers, "Comentarios");
    if (iCuenta !== -1 && iText !== -1) {
      data.slice(1).forEach(row => {
        const cuenta = limpiarCuenta_(row[iCuenta]);
        const texto = cleanText_(row[iText]);
        if (!cuenta || !texto) return;
        const idCurso = iCurso !== -1 ? cleanText_(row[iCurso]) : "";
        list.push({ id: "", origen: "AppSheet", cuenta, idCurso, curso: courseLabel_(courses, idCurso), texto, fecha: "" });
      });
    }
  }

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
