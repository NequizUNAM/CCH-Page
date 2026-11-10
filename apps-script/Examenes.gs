/**
 * EXÁMENES EN LÍNEA · Cibernética y Estadística  (archivo aparte dentro del MISMO proyecto de Apps Script)
 *
 * Es el servidor de examenes_cibernetica.html y examenes_estadistica.html, integrado al proyecto de Asistencias:
 *   - Pégalo como un archivo nuevo llamado «Examenes» junto a Codigo.gs (Codigo.gs se queda igual).
 *   - Usa la MISMA URL /exec del panel de Asistencias: Codigo.gs recibe todo y le pasa a este archivo
 *     las acciones del examen (login, start, progress, submit, admin_*).
 *   - Sus hojas viven en la hoja de cálculo de Asistencias:
 *       «Resultados Cibernética», «Config Cibernética», «Resultados Estadística», «Config Estadística»
 *     Se crean solas al primer uso, o ejecuta  crearTablasExamenes  una vez.
 *   - Contraseña de administrador del examen = la del panel (propiedad CCH_ADMIN_PASSWORD). Ya no está en el código.
 *   - Las contraseñas de cada parcial siguen en la hoja «Config …» y se cambian desde el panel de cada examen.
 *   - Al entregar, la calificación llega sola al componente del panel ligado a ese examen y parcial
 *     (Ponderaciones → tipo «Examen en línea»), y de ahí a su columna del Reporte_.
 *
 * Todo lo demás funciona igual que antes: intentos, bloqueo, continuar con su cuenta, cierre, procedimiento…
 * Va envuelto en «Examenes» para que sus nombres (C, COLS, login_, start_…) no choquen con Codigo.gs.
 */

const Examenes = (function () {
  const adminPass_ = () => (typeof adminPassword_ === 'function' ? adminPassword_().value : '');

  const MAX_PREGUNTAS = 35;        // tope de preguntas que el administrador puede habilitar por parcial (por defecto se habilita el máximo)
  const MAX_SALIDAS_CIERRE = 3;    // el administrador solo puede cerrar un examen si el alumno acumula MÁS salidas de ventana que estas
  const MAX_FALLOS = 5;            // contraseñas incorrectas permitidas por dispositivo…
  const VENTANA_S = 300;           // …dentro de esta ventana (segundos)
  const BLOQUEO_S = 300;           // bloqueo del dispositivo (segundos)
  const MAX_FALLOS_GLOBAL = 80;    // freno general: fallos de todos los dispositivos en 10 min
  const BLOQUEO_GLOBAL_S = 300;

  const MATERIAS = {                                    // una entrada por materia: nombres de sus hojas
    cib: { nombre: 'Cibernética 1', res: 'Resultados Cibernética', cfg: 'Config Cibernética', viejoRes: 'Resultados', viejoCfg: 'Config', c1: 'parcial1', c2: 'parcial2' },
    est: { nombre: 'Estadística', res: 'Resultados Estadística', cfg: 'Config Estadística', c1: 'estadistica1', c2: 'estadistica2' }   // contraseñas iniciales (cámbialas desde el panel)
  };
  const mat_ = d => (d && MATERIAS[d.materia]) ? d.materia : 'cib';
  const COLS = ['Inicio (fecha y hora)', 'Entrega (fecha y hora)', 'Parcial', 'Nombre', 'Número de cuenta', 'Grupo', 'Tipo de examen', 'Estado',
                'Aciertos', 'Total', 'Calificación (0-10)', 'Tiempo usado', 'Segundos', 'Salidas de pestaña', 'Motivo de entrega',
                'Detalle (1=bien, 0=mal)', 'Respuestas', 'Semilla', 'Sesión (no borrar)', 'Procedimiento'];
  const C = { INICIO: 0, ENTREGA: 1, PARCIAL: 2, NOMBRE: 3, CUENTA: 4, GRUPO: 5, TIPO: 6, ESTADO: 7, ACIERTOS: 8, TOTAL: 9, NOTA: 10, TIEMPO: 11, SEG: 12, SALIDAS: 13, MOTIVO: 14, DETALLE: 15, RESP: 16, SEMILLA: 17, SESION: 18, PROC: 19 };
  /* Config de cada materia (hoja «Config …»), claves nuevas: preguntas1/2 = preguntas habilitadas · cierreon1/2 = SI/NO · cierre1/2 = fecha y hora de cierre (ISO) */
  const nPreg_ = (cfg, p) => { const n = parseInt(cfg['preguntas' + p], 10); return n >= 1 && n <= MAX_PREGUNTAS ? n : MAX_PREGUNTAS; };
  const cierre_ = (cfg, p) => { if (cfg['cierreon' + p] !== 'SI') return ''; const d = new Date(cfg['cierre' + p]); return isNaN(d) ? '' : d.toISOString(); };

  /* ---------------------------------- Entrada ----------------------------------
   * CANDADO SOLO PARA ESCRIBIR. Entrar con contraseña, preguntar por el cierre (ping) y los datos del panel solo LEEN,
   * así que no hacen fila. Iniciar, guardar avance, entregar y los cambios del administrador sí toman el candado,
   * pero esperan como máximo LOCK_WAIT_MS; si no lo obtienen responden code:'ocupado' y la página reintenta sola.
   */
  const LOCK_WAIT_MS = 10000;                       // espera máxima por el candado (antes 25 s)
  const CFG_CACHE_S = 20;                           // segundos que se guarda la configuración en caché (cambios del panel se ven al instante)
  const ESCRITURA = { start: 1, submit: 1, admin_setclave: 1, admin_abierto: 1, admin_liberar: 1, admin_reloj: 1, admin_cerrar: 1, admin_cfgexamen: 1 };
  const ocupado_ = err => /lock|candado|too many|demasiad|tiempo de espera/i.test(String(err));
  function handle(e) {
    let d = {};
    try { d = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return out({ ok: false, code: 'datos', msg: 'Solicitud inválida' }); }
    const m = mat_(d), escribe = !!ESCRITURA[d.action] || (d.action === 'progress' && !d.ping);
    const lock = escribe ? LockService.getScriptLock() : null;
    try {
      if (lock && !lock.tryLock(LOCK_WAIT_MS)) return out({ ok: false, code: 'ocupado', msg: 'Servidor ocupado' });
      switch (d.action) {
        case 'login': return out(login_(d, m));
        case 'start': return out(start_(d, m));
        case 'progress': return out(progress_(d, m));
        case 'submit': return out(submit_(d, m));
        case 'admin_data':    return out(adminOnly_(d, m, adminData_));
        case 'admin_cfg':     return out(adminOnly_(d, m, adminCfg_));
        case 'admin_setclave': return out(adminOnly_(d, m, setClave_));
        case 'admin_abierto': return out(adminOnly_(d, m, setAbierto_));
        case 'admin_liberar': return out(adminOnly_(d, m, liberar_));
        case 'admin_reloj':   return out(adminOnly_(d, m, setReloj_));
        case 'admin_cerrar':  return out(adminOnly_(d, m, cerrar_));
        case 'admin_cfgexamen': return out(adminOnly_(d, m, cfgExamen_));
        default:              return out({ ok: false, code: 'accion', msg: 'Acción desconocida' });
      }
    } catch (err) {
      return out(ocupado_(err) ? { ok: false, code: 'ocupado', msg: 'Servidor ocupado' } : { ok: false, code: 'error', msg: String(err) });
    } finally {
      if (lock) { try { if (escribe) SpreadsheetApp.flush(); } catch (x) { } try { lock.releaseLock(); } catch (x) { } }
    }
  }
  function ping() { return out({ ok: true, msg: 'El servicio del examen está activo.' }); }
  function out(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

  /* ---------------------------------- Config ---------------------------------- */
  function cfgSheet_(m) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(MATERIAS[m].cfg);
    if (!sh && MATERIAS[m].viejoCfg && ss.getSheetByName(MATERIAS[m].viejoCfg)) { sh = ss.getSheetByName(MATERIAS[m].viejoCfg); sh.setName(MATERIAS[m].cfg); }   // renombra la hoja anterior
    if (!sh) {
      sh = ss.insertSheet(MATERIAS[m].cfg);
      sh.getRange(1, 1, 1, 3).setValues([['Clave', 'Valor', 'Para qué sirve']]).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
      const filas = [['clave1', MATERIAS[m].c1, 'Contraseña de acceso al PARCIAL 1'], ['clave2', MATERIAS[m].c2, 'Contraseña de acceso al PARCIAL 2'],
                     ['abierto1', 'SI', 'SI = el Parcial 1 admite alumnos · NO = cerrado'], ['abierto2', 'SI', 'SI = el Parcial 2 admite alumnos · NO = cerrado'],
                     ['anteriores1', '[]', 'Contraseñas viejas del Parcial 1 (avisan «la contraseña ha cambiado»). No editar'], ['anteriores2', '[]', 'Contraseñas viejas del Parcial 2. No editar'],
                     ['cambios1', 0, 'Veces que se cambió la contraseña del Parcial 1'], ['cambios2', 0, 'Veces que se cambió la contraseña del Parcial 2'],
                     ['reloj', 'NO', 'SI = los alumnos ven el cronómetro · NO = oculto (por defecto). Se cambia desde el panel admin'],
                     ['preguntas1', MAX_PREGUNTAS, 'Preguntas habilitadas en el Parcial 1 (1 a ' + MAX_PREGUNTAS + '). Se cambia desde el panel admin'], ['preguntas2', MAX_PREGUNTAS, 'Preguntas habilitadas en el Parcial 2'],
                     ['cierreon1', 'NO', 'SI = el Parcial 1 cierra en la fecha de cierre1 · NO = 2 horas desde que inicia cada alumno'], ['cierreon2', 'NO', 'Igual para el Parcial 2'],
                     ['cierre1', '', 'Fecha y hora de cierre del Parcial 1 (formato ISO, UTC). Se cambia desde el panel admin'], ['cierre2', '', 'Fecha y hora de cierre del Parcial 2']];
      sh.getRange(2, 1, filas.length, 3).setNumberFormat('@').setValues(filas.map(f => [f[0], String(f[1]), f[2]]));
      sh.setColumnWidth(1, 110); sh.setColumnWidth(2, 220); sh.setColumnWidth(3, 460);
    }
    return sh;
  }
  function getCfg_(m) {                                   // con caché de CFG_CACHE_S segundos: casi ningún pedido tiene que leer la hoja
    const k = 'cfg_' + m, c = cacheGet_(k); if (c) return c;
    const o = {}; cfgSheet_(m).getDataRange().getValues().slice(1).forEach(r => { if (r[0]) o[r[0]] = String(r[1]); });
    try { cachePut_(k, o, CFG_CACHE_S); } catch (e) { }
    return o;
  }
  const cfgOlvidar_ = m => { try { CacheService.getScriptCache().remove('cfg_' + m); } catch (e) { } };
  function setCfg_(m, k, v) {
    const sh = cfgSheet_(m), vals = sh.getDataRange().getValues();
    cfgOlvidar_(m);                                       // el cambio se ve en el siguiente pedido
    for (let i = 1; i < vals.length; i++) if (vals[i][0] === k) { sh.getRange(i + 1, 2).setNumberFormat('@').setValue(String(v)); return; }
    sh.appendRow([k, String(v)]);
  }

  /* ---------------------------------- Resultados ---------------------------------- */
  function resSheet_(m) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(MATERIAS[m].res);
    if (!sh && MATERIAS[m].viejoRes && ss.getSheetByName(MATERIAS[m].viejoRes)) { sh = ss.getSheetByName(MATERIAS[m].viejoRes); sh.setName(MATERIAS[m].res); }   // renombra la hoja anterior
    if (!sh) {
      sh = ss.insertSheet(MATERIAS[m].res);
      sh.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
      sh.setFrozenRows(1);
      sh.getRange('A:B').setNumberFormat('dd/mm/yyyy hh:mm:ss');
      sh.getRange('E:E').setNumberFormat('@');
    } else if (sh.getLastColumn() < COLS.length) {
      sh.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
    }
    return sh;
  }
  function findRow_(sh, parcial, cuenta) {          // devuelve el número de fila (1-based) o 0
    const n = sh.getLastRow(); if (n < 2) return 0;
    const v = sh.getRange(2, C.PARCIAL + 1, n - 1, 3).getValues();           // solo columnas Parcial, Nombre y Cuenta
    for (let i = 0; i < v.length; i++) if (Number(v[i][0]) === Number(parcial) && String(v[i][2]) === String(cuenta)) return i + 2;
    return 0;
  }

  /* ---------------------------------- Login (con límite de intentos) ---------------------------------- */
  function cacheGet_(k) { const v = CacheService.getScriptCache().get(k); try { return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function cachePut_(k, o, s) { CacheService.getScriptCache().put(k, JSON.stringify(o), Math.max(1, Math.min(21600, Math.ceil(s)))); }
  function bloqueo_(clave) { const b = cacheGet_(clave); const left = b ? Math.ceil((b.hasta - Date.now()) / 1000) : 0; return left > 0 ? left : 0; }
  function anotarFallo_(k, ventanaS, max, bloqueoKey, bloqueoS) {
    const now = Date.now(); let f = cacheGet_(k); if (!f || now - f.t0 > ventanaS * 1000) f = { n: 0, t0: now };
    f.n++; cachePut_(k, f, ventanaS);
    if (f.n >= max) { cachePut_(bloqueoKey, { hasta: now + bloqueoS * 1000 }, bloqueoS); CacheService.getScriptCache().remove(k); return bloqueoS; }
    return 0;
  }
  function login_(d, m) {
    const dev = String(d.dev || 'anon').replace(/[^\w-]/g, '').slice(0, 40) || 'anon';
    const wait = bloqueo_('blk_' + dev);
    if (wait) return { ok: false, code: 'bloqueado', espera: wait };               // este dispositivo está bloqueado (aunque la clave fuera buena)
    const clave = String(d.clave || '').trim();
    if (!clave) return { ok: false, code: 'incorrecta' };
    if (clave && clave === adminPass_()) {
      const token = Utilities.getUuid();
      CacheService.getScriptCache().put('adm_' + token, '1', 21600);          // sesión de 6 horas
      CacheService.getScriptCache().remove('fl_' + dev);
      return { ok: true, role: 'admin', token: token };
    }
    const cfg = getCfg_(m);
    for (const p of [1, 2]) {
      if (cfg['clave' + p] === clave) {
        if (cfg['abierto' + p] !== 'SI') return { ok: false, code: 'cerrado' };
        CacheService.getScriptCache().remove('fl_' + dev);
        return { ok: true, role: 'alumno', parcial: p, materia: m, reloj: cfg.reloj === 'SI', preguntas: nPreg_(cfg, p), cierre: cierre_(cfg, p), t: Date.now() };
      }
    }
    for (const p of [1, 2]) {
      let ant = []; try { ant = JSON.parse(cfg['anteriores' + p] || '[]'); } catch (e) { }
      if (ant.indexOf(clave) >= 0) return { ok: false, code: 'cambio' };      // era una contraseña vieja (no cuenta como intento fallido)
    }
    /* contraseña incorrecta: se cuenta el fallo */
    const g = bloqueo_('blk_global'); if (g) return { ok: false, code: 'bloqueado', espera: g };
    const w = anotarFallo_('fl_' + dev, VENTANA_S, MAX_FALLOS, 'blk_' + dev, BLOQUEO_S);
    anotarFallo_('fl_global', 600, MAX_FALLOS_GLOBAL, 'blk_global', BLOQUEO_GLOBAL_S);
    if (w) return { ok: false, code: 'bloqueado', espera: w };
    const f = cacheGet_('fl_' + dev);
    return { ok: false, code: 'incorrecta', restan: f ? MAX_FALLOS - f.n : MAX_FALLOS };
  }

  /* ---------------------------------- Alumno ---------------------------------- */
  const norm_ = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  function start_(d, m) {
    const parcial = Number(d.parcial), cuenta = String(d.cuenta || '').trim();
    if (!(parcial === 1 || parcial === 2) || !/^\d{9}$/.test(cuenta)) return { ok: false, code: 'datos', msg: 'Datos inválidos' };
    const cfg = getCfg_(m); if (cfg['abierto' + parcial] !== 'SI') return { ok: false, code: 'cerrado' };
    const sh = resSheet_(m), found = findRow_(sh, parcial, cuenta), sid = Utilities.getUuid();
    if (found) {
      const v = sh.getRange(found, 1, 1, COLS.length).getValues()[0];
      if (v[C.ESTADO] === 'Entregado') return { ok: false, code: 'duplicado' };                 // ya respondido
      if (norm_(v[C.NOMBRE]) !== norm_(d.nombre)) return { ok: false, code: 'enCurso' };         // en curso: solo continúa quien escribe el mismo nombre
      sh.getRange(found, C.SESION + 1).setValue(sid);                                           // la sesión pasa a este dispositivo
      let pr = {}; try { pr = JSON.parse(v[C.RESP] || '{}'); } catch (e) { }
      return { ok: true, reloj: cfg.reloj === 'SI', cerrar: String(v[C.MOTIVO]) === 'CERRAR', total: Number(v[C.TOTAL]) || 0, cierre: cierre_(cfg, parcial), t: Date.now(), resumed: true, sid: sid, tipo: v[C.TIPO], seed: Number(v[C.SEMILLA]), inicio: iso_(v[C.INICIO]), nombre: v[C.NOMBRE], grupo: String(v[C.GRUPO]), progreso: pr, salidas: Number(v[C.SALIDAS]) || 0 };
    }
    const cz = cierre_(cfg, parcial); if (cz && Date.now() > Date.parse(cz)) return { ok: false, code: 'cierre' };          // pasó la fecha de cierre: ya no se admiten alumnos nuevos
    const ahora = new Date(), tot = Math.min(nPreg_(cfg, parcial), Math.max(1, Math.min(MAX_PREGUNTAS, Number(d.disp) || MAX_PREGUNTAS)));   // preguntas de este alumno (fijas desde que inicia)
    const row = new Array(COLS.length).fill('');
    row[C.INICIO] = ahora; row[C.TOTAL] = tot;          // el inicio lo marca el servidor, no el equipo del alumno
    row[C.PARCIAL] = parcial; row[C.NOMBRE] = String(d.nombre || ''); row[C.CUENTA] = cuenta;
    row[C.GRUPO] = String(d.grupo || ''); row[C.TIPO] = String(d.tipo || ''); row[C.ESTADO] = 'En curso'; row[C.SEMILLA] = d.seed || ''; row[C.SESION] = sid;
    sh.appendRow(row);
    const r = sh.getLastRow(); sh.getRange(r, C.CUENTA + 1).setNumberFormat('@').setValue(cuenta);
    return { ok: true, sid: sid, inicio: ahora.toISOString(), reloj: cfg.reloj === 'SI', preguntas: tot, cierre: cz, t: Date.now() };
  }
  function progress_(d, m) {                       // guarda el avance del alumno en la hoja (cada ~minuto) para poder continuar desde otro dispositivo
    const parcial = Number(d.parcial), cuenta = String(d.cuenta || '').trim();
    const sh = resSheet_(m), r = findRow_(sh, parcial, cuenta); if (!r) return { ok: false, code: 'sinregistro' };
    const v = sh.getRange(r, 1, 1, COLS.length).getValues()[0];
    if (v[C.ESTADO] === 'Entregado') return { ok: false, code: 'duplicado' };
    if (v[C.SESION] && String(v[C.SESION]) !== String(d.sid)) return { ok: false, code: 'sesion' };
    if (!d.ping) { sh.getRange(r, C.RESP + 1).setValue(String(d.progreso || '').slice(0, 40000)); sh.getRange(r, C.SALIDAS + 1).setValue(Number(d.salidas) || 0); }   // ping = solo preguntar si hay cierre pendiente
    const cf = getCfg_(m);
    return { ok: true, reloj: cf.reloj === 'SI', cerrar: String(v[C.MOTIVO]) === 'CERRAR', cierre: cierre_(cf, parcial), t: Date.now() };
  }
  function submit_(d, m) {
    const parcial = Number(d.parcial), cuenta = String(d.cuenta || '').trim();
    if (!(parcial === 1 || parcial === 2) || !/^\d{9}$/.test(cuenta)) return { ok: false, code: 'datos', msg: 'Datos inválidos' };
    const sh = resSheet_(m); let r = findRow_(sh, parcial, cuenta);
    if (r) {
      const v = sh.getRange(r, 1, 1, COLS.length).getValues()[0];
      if (v[C.ESTADO] === 'Entregado') return { ok: false, code: 'duplicado' };                                  // ya respondido
      if (d.sid && v[C.SESION] && String(v[C.SESION]) !== String(d.sid)) return { ok: false, code: 'sesion' };    // el examen continuó en otro dispositivo
    }
    const vals = [new Date(d.inicio || new Date()), new Date(d.fecha || new Date()), parcial, String(d.nombre || ''), cuenta, String(d.grupo || ''), String(d.tipo || ''), 'Entregado',
                  d.aciertos, d.total, d.calificacion, String(d.tiempo || ''), d.tiempoSeg, d.salidas, String(d.motivo || ''), String(d.detalle || ''), String(d.respuestas || ''), d.seed || '', String(d.sid || ''), String(d.procedimiento || '').slice(0, 45000)];
    if (!r) { sh.appendRow(vals); r = sh.getLastRow(); } else sh.getRange(r, 1, 1, COLS.length).setValues([vals]);
    sh.getRange(r, C.CUENTA + 1).setNumberFormat('@').setValue(cuenta);
    sh.getRange(r, C.TIEMPO + 1).setNumberFormat('@').setValue(String(d.tiempo || ''));   // «Tiempo usado» como texto hh:mm:ss (si no, Sheets lo convierte en hora)
    try { if (typeof examSubmitted_ === 'function') examSubmitted_(MATERIAS[m].res, parcial, cuenta); } catch (e) { }   // enlace con el panel de asistencias
    return { ok: true };
  }
  /* Ejecútala una vez desde el editor para crear todas las hojas (Cibernética y Estadística) y autorizar permisos. */
  function crearTablas() { Object.keys(MATERIAS).forEach(m => { cfgSheet_(m); resSheet_(m); }); return 'Hojas listas: Config/Resultados Cibernética y Config/Resultados Estadística.'; }

  /* ---------------------------------- Administrador ---------------------------------- */
  function adminOnly_(d, m, fn) {
    if (!d.token || !CacheService.getScriptCache().get('adm_' + d.token)) return { ok: false, code: 'auth' };
    return fn(d, m);
  }
  function iso_(v) { return v instanceof Date ? v.toISOString() : (v ? String(v) : ''); }
  function adminData_(d, m) {
    const sh = resSheet_(m), n = sh.getLastRow(); if (n < 2) return { ok: true, rows: [] };
    const rows = sh.getRange(2, 1, n - 1, COLS.length).getValues().map(v => ({
      inicio: iso_(v[C.INICIO]), entrega: iso_(v[C.ENTREGA]), parcial: Number(v[C.PARCIAL]), nombre: v[C.NOMBRE], cuenta: String(v[C.CUENTA]), grupo: String(v[C.GRUPO]), tipo: v[C.TIPO],
      estado: v[C.ESTADO], aciertos: v[C.ACIERTOS], total: v[C.TOTAL], nota: v[C.NOTA], tiempo: v[C.TIEMPO], seg: v[C.SEG], salidas: v[C.SALIDAS], motivo: v[C.MOTIVO],
      det: v[C.ESTADO] === 'Entregado' ? String(v[C.DETALLE] || '') : '', seed: Number(v[C.SEMILLA]) || 0,         // para las métricas por bloque del panel
      resp: v[C.ESTADO] === 'Entregado' ? String(v[C.RESP] || '') : '', proc: v[C.ESTADO] === 'Entregado' ? String(v[C.PROC] || '') : ''   // revisión por alumno: lo que contestó y su procedimiento
    }));
    return { ok: true, rows: rows };
  }
  function adminCfg_(d, m) {
    const c = getCfg_(m), cfg = {};
    [1, 2].forEach(p => { cfg['clave' + p] = c['clave' + p] || ''; cfg['abierto' + p] = c['abierto' + p] || 'SI'; cfg['cambios' + p] = Number(c['cambios' + p] || 0); });
    cfg.reloj = c.reloj === 'SI' ? 'SI' : 'NO';
    [1, 2].forEach(p => { cfg['preguntas' + p] = nPreg_(c, p); cfg['cierreon' + p] = c['cierreon' + p] === 'SI' ? 'SI' : 'NO'; cfg['cierre' + p] = c['cierre' + p] || ''; });
    return { ok: true, cfg: cfg };
  }
  function setClave_(d, m) {
    const p = Number(d.parcial), nueva = String(d.clave || '').trim(), otra = p === 1 ? 2 : 1, c = getCfg_(m);
    if (!(p === 1 || p === 2)) return { ok: false, msg: 'Parcial inválido' };
    if (nueva.length < 4) return { ok: false, msg: 'La contraseña debe tener al menos 4 caracteres.' };
    if (nueva === adminPass_()) return { ok: false, msg: 'Esa contraseña está reservada.' };
    if (nueva === c['clave' + otra]) return { ok: false, msg: 'Esa contraseña ya la usa el otro parcial.' };
    if (nueva === c['clave' + p]) return { ok: true };
    let ant = []; try { ant = JSON.parse(c['anteriores' + p] || '[]'); } catch (e) { }
    if (ant.indexOf(c['clave' + p]) < 0) ant.push(c['clave' + p]);
    ant = ant.filter(x => x !== nueva);                    // si regresas a una contraseña vieja, deja de contar como «cambiada»
    setCfg_(m, 'anteriores' + p, JSON.stringify(ant));
    setCfg_(m, 'clave' + p, nueva); setCfg_(m, 'cambios' + p, Number(c['cambios' + p] || 0) + 1);
    return { ok: true };
  }
  function setAbierto_(d, m) {
    const p = Number(d.parcial); if (!(p === 1 || p === 2)) return { ok: false, msg: 'Parcial inválido' };
    setCfg_(m, 'abierto' + p, d.abierto === 'SI' ? 'SI' : 'NO'); return { ok: true };
  }
  /* Cierre desde el panel: marca el examen en curso; el alumno lo recibe en su siguiente sincronización y se entrega solo. */
  function cerrar_(d, m) {
    const sh = resSheet_(m), r = findRow_(sh, d.parcial, d.cuenta);
    if (!r) return { ok: false, msg: 'No se encontró el registro.' };
    const v = sh.getRange(r, 1, 1, COLS.length).getValues()[0];
    if (v[C.ESTADO] === 'Entregado') return { ok: false, msg: 'Ese examen ya fue entregado.' };
    if ((Number(v[C.SALIDAS]) || 0) <= MAX_SALIDAS_CIERRE) return { ok: false, msg: 'Solo se puede cerrar con más de ' + MAX_SALIDAS_CIERRE + ' salidas de ventana.' };
    sh.getRange(r, C.MOTIVO + 1).setValue('CERRAR'); return { ok: true };
  }
  /* Preguntas habilitadas y fecha de cierre de un parcial (se aplican a los alumnos que inicien después; quien ya está contestando conserva sus preguntas) */
  function cfgExamen_(d, m) {
    const p = Number(d.parcial), n = parseInt(d.preguntas, 10); if (!(p === 1 || p === 2)) return { ok: false, msg: 'Parcial inválido' };
    if (!(n >= 1 && n <= MAX_PREGUNTAS)) return { ok: false, msg: 'Las preguntas habilitadas deben ser de 1 a ' + MAX_PREGUNTAS + '.' };
    const on = d.cierreOn === 'SI', f = new Date(d.cierre);
    if (on && isNaN(f)) return { ok: false, msg: 'La fecha de cierre no es válida.' };
    setCfg_(m, 'preguntas' + p, n); setCfg_(m, 'cierreon' + p, on ? 'SI' : 'NO'); setCfg_(m, 'cierre' + p, on ? f.toISOString() : '');
    return { ok: true };
  }
  function setReloj_(d, m) { setCfg_(m, 'reloj', d.valor === 'SI' ? 'SI' : 'NO'); return { ok: true }; }
  function liberar_(d, m) {
    const sh = resSheet_(m), r = findRow_(sh, d.parcial, d.cuenta);
    if (!r) return { ok: false, msg: 'No se encontró el registro.' };
    sh.deleteRow(r); return { ok: true };
  }

  const ACTIONS = ['login', 'start', 'progress', 'submit', 'admin_data', 'admin_cfg', 'admin_setclave', 'admin_abierto', 'admin_liberar', 'admin_reloj', 'admin_cerrar', 'admin_cfgexamen'];
  /* ---- Para el panel de Asistencias (no cambian el examen) ---- */
  // Estado de cada materia sin crear hojas: ¿existe su Config y qué parciales admiten alumnos?
  function estado() {
    const ss = SpreadsheetApp.getActiveSpreadsheet(), out = {};
    Object.keys(MATERIAS).forEach(m => {
      const existe = !!ss.getSheetByName(MATERIAS[m].cfg) || !!(MATERIAS[m].viejoCfg && ss.getSheetByName(MATERIAS[m].viejoCfg));
      const c = existe ? getCfg_(m) : {};
      out[m] = { nombre: MATERIAS[m].nombre, existe, abierto1: c.abierto1 === 'SI', abierto2: c.abierto2 === 'SI' };
    });
    return out;
  }
  function abrir(m, p, on) {
    if (!MATERIAS[m] || !(p === 1 || p === 2)) throw new Error('Examen o parcial inválido.');
    setCfg_(m, 'abierto' + p, on ? 'SI' : 'NO');
  }
  // Estado de fábrica: borra resultados y configuración, los vuelve a crear con las contraseñas iniciales y CERRADOS
  function reiniciar() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Object.keys(MATERIAS).forEach(m => {
      [MATERIAS[m].res, MATERIAS[m].cfg, MATERIAS[m].viejoRes, MATERIAS[m].viejoCfg].filter(Boolean).forEach(n => {
        const sh = ss.getSheetByName(n); if (sh) ss.deleteSheet(sh);
      });
      cfgOlvidar_(m);
    });
    crearTablas();
    Object.keys(MATERIAS).forEach(m => { setCfg_(m, 'abierto1', 'NO'); setCfg_(m, 'abierto2', 'NO'); });
  }

  return { handle, ping, crearTablas, estado, abrir, reiniciar, ACTIONS, MATERIAS, COLS };
})();

/* Ejecútala una vez desde el editor (botón Ejecutar) para crear las hojas de los exámenes y autorizar permisos. */
function crearTablasExamenes() { return Examenes.crearTablas(); }
