/**
 * ============================================================
 * IMPORTAR CALIFICACIONES DE ESTADÍSTICA (ejecutar UNA sola vez)
 * ============================================================
 * Contiene las calificaciones de tu antigua hoja «Calificaciones»
 * (la que borraste) para Estadística 504, 512 y 526, y las coloca
 * en la web (W_Calificaciones) y en tus hojas Reporte_.
 *
 * Cómo usarlo:
 *   1. En Apps Script crea un archivo nuevo llamado
 *      ImportarEstadistica y pega TODO este contenido.
 *      (Codigo.gs debe seguir en el proyecto.)
 *   2. Arriba elige la función  importarCalificacionesEstadistica
 *      y presiona ▶ Ejecutar. Revisa el registro de ejecución.
 *   3. Borra este archivo.
 *
 * Reglas:
 *   - Solo llena lo que esté VACÍO en la web: nunca sobrescribe lo
 *     que ya capturaste.
 *   - Busca el componente por nombre: «Parcial 1/2/3» y el que
 *     contenga «Sello». «Puntos Adicionales» solo si ya existe un
 *     componente con ese nombre.
 *   - Si un valor pasa el «Máximo» del componente (ej. 10.2 de 10),
 *     se guarda el máximo y se anota en el registro.
 * Filas: 119 · grupos: Estadística 504, Estadística 512, Estadística 526
 * ============================================================
 */

const CALIFICACIONES_ESTADISTICA_ = [
  // [ID_Curso, Cuenta, Parcial_1, Parcial_2, Parcial_3, Sellos, Puntos Adicionales]
  ["cae8eb75", "325490467", 8.4, null, null, null, null],
  ["87c800ea", "325284169", 7.8, null, null, null, null],
  ["cae8eb75", "325231981", null, 4.2, null, null, null],
  ["54526c57", "325146511", 0, null, null, null, null],
  ["cae8eb75", "324031575", 6.6, null, null, null, null],
  ["54526c57", "325029076", 7.2, null, null, null, null],
  ["54526c57", "325311762", 6, null, null, null, null],
  ["54526c57", "325034531", 7.2, null, null, null, null],
  ["54526c57", "325294818", 3, null, null, null, null],
  ["54526c57", "325080428", 4, null, null, null, null],
  ["54526c57", "325110936", 6, null, null, null, null],
  ["54526c57", "325168968", 6, null, null, null, null],
  ["54526c57", "325168346", 8.4, null, null, null, null],
  ["54526c57", "325062866", 6, null, null, null, null],
  ["54526c57", "325288411", 7, null, null, null, null],
  ["54526c57", "325118224", 10.2, null, null, null, null],
  ["54526c57", "325213491", 7, null, null, null, null],
  ["54526c57", "325068576", 1.8, null, null, null, null],
  ["54526c57", "325045610", 8.4, null, null, null, null],
  ["54526c57", "325114714", 7.2, null, null, null, null],
  ["54526c57", "325268707", null, 7.2, null, null, null],
  ["54526c57", "325077840", 7.8, null, null, null, null],
  ["54526c57", "325233617", 7.8, null, null, null, null],
  ["54526c57", "325261045", 10.2, null, null, null, null],
  ["54526c57", "325309480", 5, null, null, null, null],
  ["54526c57", "325015123", 7.8, null, null, null, null],
  ["54526c57", "325026343", 8.4, null, null, null, null],
  ["54526c57", "325236089", 7.8, null, null, null, null],
  ["54526c57", "325210995", 7.2, null, null, null, null],
  ["54526c57", "325050120", 5, null, null, null, null],
  ["54526c57", "325047542", 9, null, null, null, null],
  ["54526c57", "325214917", 7.2, null, null, null, null],
  ["54526c57", "325083405", 4, null, null, null, null],
  ["54526c57", "325171175", 8.4, null, null, null, null],
  ["54526c57", "325210672", 10.2, null, null, null, null],
  ["54526c57", "325268738", 5, null, null, null, null],
  ["54526c57", "325180999", 7.8, null, null, null, null],
  ["54526c57", "325037752", 5, null, null, null, null],
  ["54526c57", "325251846", 4, null, null, null, null],
  ["54526c57", "325335175", 8, null, null, null, null],
  ["54526c57", "325006347", 6, null, null, null, null],
  ["54526c57", "325319263", 5, null, null, null, null],
  ["54526c57", "325187871", 9, null, null, null, null],
  ["cae8eb75", "325299026", 5, null, null, null, null],
  ["cae8eb75", "325162674", 7.2, null, null, null, null],
  ["cae8eb75", "324077902", 6, null, null, null, null],
  ["cae8eb75", "325338932", 4, null, null, null, null],
  ["cae8eb75", "325129231", 6.6, null, null, null, null],
  ["cae8eb75", "325120111", 7.2, null, null, null, null],
  ["cae8eb75", "325283629", 5, null, null, null, null],
  ["cae8eb75", "325050649", 1.8, null, null, null, null],
  ["cae8eb75", "325239004", 8.4, null, null, null, null],
  ["cae8eb75", "325338310", 7.2, null, null, null, null],
  ["cae8eb75", "325266356", 6, null, null, null, null],
  ["cae8eb75", "325230984", 5, null, null, null, null],
  ["cae8eb75", "325052461", 7.2, null, null, null, null],
  ["cae8eb75", "325320160", 7.8, null, null, null, null],
  ["cae8eb75", "324203024", 5.4, null, null, null, null],
  ["cae8eb75", "325184038", 7.2, null, null, null, null],
  ["cae8eb75", "325199809", 8.4, null, null, null, null],
  ["cae8eb75", "325125381", 8.4, null, null, null, null],
  ["cae8eb75", "325199926", 7.2, null, null, null, null],
  ["cae8eb75", "325309923", 7.2, null, null, null, null],
  ["cae8eb75", "325090249", 9.6, null, null, null, null],
  ["cae8eb75", "325029629", 6.6, null, null, null, null],
  ["cae8eb75", "324314052", 6, null, null, null, null],
  ["cae8eb75", "325226701", 5, null, null, null, null],
  ["cae8eb75", "325171429", 6, null, null, null, null],
  ["cae8eb75", "325136099", 5, null, null, null, null],
  ["cae8eb75", "325079040", 5, null, null, null, null],
  ["cae8eb75", "325257680", 4, null, null, null, null],
  ["cae8eb75", "325302625", 4, null, null, null, null],
  ["cae8eb75", "325056854", 6.6, null, null, null, null],
  ["cae8eb75", "325275091", 7.2, null, null, null, null],
  ["cae8eb75", "325065953", 4, null, null, null, null],
  ["cae8eb75", "325073990", 3, null, null, null, null],
  ["cae8eb75", "325234559", 9, null, null, null, null],
  ["cae8eb75", "325156215", 9, null, null, null, null],
  ["cae8eb75", "325156521", 7.8, null, null, null, null],
  ["cae8eb75", "325169800", 7.8, null, null, null, null],
  ["87c800ea", "325050670", 6.6, null, null, null, null],
  ["87c800ea", "325043489", 6, null, null, null, null],
  ["87c800ea", "325119726", 6.6, null, null, null, null],
  ["87c800ea", "325081157", 7.8, null, null, null, null],
  ["87c800ea", "325297039", 7.2, null, null, null, null],
  ["87c800ea", "325068820", 7.8, null, null, null, null],
  ["87c800ea", "325190253", 6, null, null, null, null],
  ["87c800ea", "325098788", 7.8, null, null, null, null],
  ["87c800ea", "325145019", 7.8, null, null, null, null],
  ["87c800ea", "325287517", 6.6, null, null, null, null],
  ["87c800ea", "325262224", 6, null, null, null, null],
  ["87c800ea", "325032544", 7.8, null, null, null, null],
  ["87c800ea", "325334484", 6.6, null, null, null, null],
  ["87c800ea", "325296551", 7.2, null, null, null, null],
  ["87c800ea", "325233105", 6.6, null, null, null, null],
  ["87c800ea", "325112600", 7.2, null, null, null, null],
  ["87c800ea", "325045380", 6, null, null, null, null],
  ["87c800ea", "324204320", 5.4, null, null, null, null],
  ["87c800ea", "325246563", 7.8, null, null, null, null],
  ["87c800ea", "325220637", 3, null, null, null, null],
  ["87c800ea", "325147673", 8.4, null, null, null, null],
  ["87c800ea", "325047858", 6.6, null, null, null, null],
  ["87c800ea", "325264981", 7.8, null, null, null, null],
  ["87c800ea", "325275792", 7.2, null, null, null, null],
  ["87c800ea", "325074083", 7.8, null, null, null, null],
  ["87c800ea", "324068676", 6, null, null, null, null],
  ["87c800ea", "325158910", 6, null, null, null, null],
  ["87c800ea", "325161237", 6.6, null, null, null, null],
  ["87c800ea", "325270230", 4.8, null, null, null, null],
  ["87c800ea", "325231730", 4.2, null, null, null, null],
  ["87c800ea", "325277442", 6, null, null, null, null],
  ["87c800ea", "325099510", 7.8, null, null, null, null],
  ["87c800ea", "325076939", 6, null, null, null, null],
  ["87c800ea", "325220943", 6.6, null, null, null, null],
  ["87c800ea", "325141509", 6, null, null, null, null],
  ["87c800ea", "325106124", 8.4, null, null, null, null],
  ["87c800ea", "325173928", 7.8, null, null, null, null],
  ["87c800ea", "324024188", 3.6, null, null, null, null],
  ["87c800ea", "325026271", 4.8, null, null, null, null]
];

function importarCalificacionesEstadistica() {
  if (typeof saveGrades_ !== "function") throw new Error("Falta Codigo.gs en el proyecto.");
  const NOMBRES = ["Parcial 1", "Parcial 2", "Parcial 3", "Sello", "Puntos Adicionales"];
  const llave = t => normalizeKey_(t).replace(/[\s_\-.\/]+/g, "");
  const log = [];

  withScriptLock_(() => {
    const porCurso = {};
    CALIFICACIONES_ESTADISTICA_.forEach(r => (porCurso[r[0]] = porCurso[r[0]] || []).push(r));

    Object.keys(porCurso).forEach(idCurso => {
      Db.clearCache();
      if (!courseMap_()[idCurso]) { log.push(`${idCurso}: no existe en Course, se omite.`); return; }
      const comps = componentsFor_(idCurso).filter(c => c.tipo === "manual");
      const destino = NOMBRES.map((n, k) => k === 3
        ? comps.find(c => llave(c.nombre).includes("sello"))
        : comps.find(c => llave(c.nombre) === llave(n)));
      const actuales = gradesFor_(idCurso);
      const entries = [];
      let yaHabia = 0, fuera = 0, sinComp = 0;

      porCurso[idCurso].forEach(r => {
        const cuenta = limpiarCuenta_(r[1]);
        r.slice(2).forEach((original, k) => {
          let valor = original;
          if (valor === null || valor === undefined) return;
          const comp = destino[k];
          if (!comp) { sinComp++; return; }
          if (actuales[cuenta] && actuales[cuenta][comp.id] !== undefined) { yaHabia++; return; }
          if (valor > comp.maximo) { fuera++; valor = comp.maximo; } // ej. 10.2 → 10 (la web nunca pasa del máximo)
          entries.push({ cuenta, componentId: comp.id, valor: String(valor) });
        });
      });

      const res = entries.length ? saveGrades_({ idCurso, entries }) : { saved: 0, errors: [] };
      Db.clearCache();
      let reporte = 0;
      try { reporte = syncReportColumns_(idCurso); } catch (e) { /* sin columnas enlazadas */ }
      const label = groupsMap_()[idCurso] ? groupsMap_()[idCurso].label : idCurso;
      log.push(`${label}: ${res.saved} guardadas · ${yaHabia} ya existían (no se tocaron)` +
        (fuera ? ` · ${fuera} pasaban del máximo y quedaron en el máximo` : "") +
        (sinComp ? ` · ${sinComp} sin componente con ese nombre` : "") +
        (res.errors.length ? ` · errores: ${res.errors.slice(0, 3).join("; ")}` : "") +
        ` · columnas del reporte actualizadas: ${reporte}`);
    });
  });

  Logger.log(log.join("\n"));
  return log;
}
