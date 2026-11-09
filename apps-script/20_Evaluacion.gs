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
  const nameIndex = findColumn_(headers, "First Name");

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

function countStatuses_(statuses) {
  const counts = { asistencia: 0, retardo: 0, falta: 0, nd: 0, otro: 0 };
  statuses.forEach(value => {
    const key = normalizeKey_(value);
    if (!key) return;
    if (key === "asistencia") counts.asistencia++;
    else if (key === "retardo") counts.retardo++;
    else if (key === "falta") counts.falta++;
    else if (key === "n/d") counts.nd++;
    else counts.otro++;
  });
  return counts;
}

/** (Asistencias + Retardos) / (días con lista) × 10. null si no hay días. */
function attendanceScore_(counts) {
  if (!counts) return null;
  const total = counts.asistencia + counts.retardo + counts.falta;
  return total ? (counts.asistencia + counts.retardo) / total * 10 : null;
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
      orden: toNumberOrNull_(r.Orden) || 0
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

    return {
      ID: cleanText_(c.id) || shortId_(),
      ID_Curso: idCurso,
      Nombre: nombre,
      Tipo: tipo,
      Ponderacion: ponderacion,
      Maximo: maximo,
      Orden: i + 1
    };
  });

  const others = Db.read(WEB.COMPONENTS).rows.filter(r => cleanText_(r.ID_Curso) !== idCurso);
  Db.writeAll(WEB.COMPONENTS, others.concat(newRows));

  const total = newRows.reduce((sum, r) => sum + r.Ponderacion, 0);
  return {
    components: componentsFor_(idCurso),
    message: total === 100
      ? "Ponderaciones guardadas ✅"
      : `Guardado. Ojo: las ponderaciones suman ${total}% (se normalizan al calcular).`
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
    if (comp.tipo !== "manual") return errors.push(`"${comp.nombre}" se calcula solo; no se captura.`);

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

/**
 * Copia Parcial_1, Parcial_2, Parcial_3, Sellos y Proyecto_Final de la hoja
 * Calificaciones (AppSheet) a W_Calificaciones para el grupo. Si el grupo
 * no tiene componentes, primero crea la plantilla por defecto.
 * Nunca sobrescribe una calificación ya capturada en la web.
 */
function importLegacyGrades_(params) {
  const idCurso = cleanText_(params.idCurso);
  requireGroup_(idCurso);

  let components = componentsFor_(idCurso);
  if (!components.length) {
    saveComponents_({ idCurso, components: DEFAULT_COMPONENTS.map(c => ({ nombre: c.Nombre, tipo: c.Tipo, ponderacion: c.Ponderacion, maximo: c.Maximo })) });
    components = componentsFor_(idCurso);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LEGACY_GRADES);
  if (!sheet) throw new Error(`No existe la hoja "${SHEETS.LEGACY_GRADES}".`);

  const data = sheet.getDataRange().getValues();
  const headers = (data[0] || []).map(cleanText_);
  const iCurso = findColumn_(headers, "ID_Curso");
  const iCuenta = findColumn_(headers, "Cuenta");

  const mapping = [];
  Object.keys(LEGACY_GRADE_COLUMNS).forEach(column => {
    const colIndex = findColumn_(headers, column);
    const comp = components.find(c => c.tipo === "manual" && normalizeKey_(c.nombre) === normalizeKey_(LEGACY_GRADE_COLUMNS[column]));
    if (colIndex !== -1 && comp) mapping.push({ colIndex, comp });
  });

  if (!mapping.length) {
    return { imported: 0, message: "No hay componentes manuales con nombres equivalentes (Parcial 1, Parcial 2, Parcial 3, Sellos, Proyecto Final)." };
  }

  const existing = gradesFor_(idCurso);
  const entries = [];
  let raised = 0;

  data.slice(1).forEach(row => {
    if (cleanText_(row[iCurso]) !== idCurso) return;
    const cuenta = limpiarCuenta_(row[iCuenta]);
    if (!cuenta) return;
    mapping.forEach(({ colIndex, comp }) => {
      const value = toNumberOrNull_(row[colIndex]);
      if (value === null || (existing[cuenta] && existing[cuenta][comp.id] !== undefined)) return;
      if (value > comp.maximo) { raised++; return; }
      entries.push({ cuenta, componentId: comp.id, valor: value });
    });
  });

  const result = saveGrades_({ idCurso, entries });
  return {
    imported: result.saved,
    message: `Importadas ${result.saved} calificación(es) desde "${SHEETS.LEGACY_GRADES}".` +
      (raised ? ` ${raised} valor(es) superan el máximo del componente y se omitieron (ajusta "Máximo").` : "")
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
      evaluatedWeight,
      counts: att ? att.counts : null
    };
  });

  return { group, components, students, attendance, projects };
}
