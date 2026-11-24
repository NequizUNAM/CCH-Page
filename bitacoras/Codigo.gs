/**
 * ============================================================================
 * Codigo.gs — Bitácoras CCH (Web App de Google Apps Script)
 * ============================================================================
 * Programa de bitácoras / minutas para varios proyectos en paralelo (CCH-UNAM).
 *
 * ARQUITECTURA
 *   - Interfaz: página en GitHub Pages (index.html, un solo archivo).
 *     Llama a este Web App con fetch GET / POST y JSON.
 *   - Datos: Google Drive, carpeta raíz "Bitacoras/".
 *       Bitacoras/
 *         INDICE-bitacoras.json
 *         Proyectos/
 *           Bitacoras (hoja de cálculo)
 *           <folio>/{bitacora.json, ficha.md, plantilla-sesion.json,
 *             formato-exportacion.json, Evidencias/}
 *       Los proyectos heredados conservan su ubicación actual.
 *   - Hojas de cálculo: un libro "Bitacoras" con las pestañas
 *     Bitacoras, Sesiones, Pendientes, Hitos y Puntaje.
 *     Las mismas hojas las puede leer AppSheet (ver docs/guia-configuracion-appsheet.md).
 *
 * SEGURIDAD (sin credenciales reales en este archivo)
 *   - La contraseña web NO se guarda en texto plano: se guarda su hash
 *     SHA-256 CON SAL en Script Properties, claves WEB_PASS_HASH y
 *     WEB_PASS_SALT (M2, corregido 2026-11-18). La sal es aleatoria y se
 *     genera sola; sin ella el hash no se puede verificar ni reutilizar.
 *   - Para fijarla, se añade temporalmente WEB_PASS_SETUP en Script
 *     Properties y se ejecuta fijarPasswordWebDesdePropiedad(). La función
 *     elimina la propiedad temporal después de guardar el hash y la sal.
 *   - Los proyectos activos se cargan desde INDICE-bitacoras.json.
 *   - El token de sesión es un string aleatorio (UUID) guardado en
 *     CacheService con expiración de 6 horas. Todas las acciones de
 *     escritura Y DE LECTURA de datos exigen un token válido, salvo
 *     login, ping y el HTML mínimo de estado (C5, corregido 2026-11-18).
 *     Auditoría v2 Paso 7e: el token ya NO viaja en la URL; en POST va en el body.
 *   - El token de servicio Muse solo puede ejecutar leer, leerProyecto,
 *     guardarSesion, guardarPendiente, cerrarPendiente, guardarHito,
 *     subirEvidencia, crearProyecto, guardar, verEvidencia y
 *     registrarPuntaje. Nunca puede ejecutar login, cambiarPassword,
 *     crearEstructura, guardarConfigCiclo, verificarEstructura, cerrarProyecto
 *     ni acciones de borrado/edición fuera de esa lista. Su acción guardar fusiona por id
 *     y conserva los registros omitidos; el token no puede borrar datos.
 *   - Tras 5 intentos fallidos de login, el login se bloquea 5 minutos
 *     SOLO para ese cliente (M1): el bloqueo se guarda por identificador
 *     de cliente, no global, para que un visitante no pueda bloquear al
 *     dueño. Apps Script no expone la IP del cliente, así que el
 *     identificador lo genera la página y viaja en el body del login;
 *     alguien que lo rote podría eludirlo: es una mitigación, no una
 *     garantía, y queda documentada en README/CONFIGURACION.
 *   - Escrituras protegidas con LockService (M3): dos escrituras
 *     simultáneas no se pisan en bitacora.json ni en las hojas.
 *   - CUENTAS_AUTORIZADAS_APPSHEET es solo un placeholder: Nequiz pone
 *     ahí los correos autorizados para AppSheet. No hay correos reales aquí.
 *
 * Los seis proyectos de demostración heredados se ocultan, pero sus
 * carpetas y bitácoras se conservan.
 *
 * ACCIONES GET  (doGet, auditoría v2 Paso 7e: las lecturas de datos ya NO
 *   van por GET — el token en una URL GET quedaba en historial y logs —,
 *   van por POST. La web envía el token en el body; solo integraciones de
 *   servicio pueden usar ?token= en POST como alternativa.
 *   Por GET solo queda ping y el HTML mínimo de estado.)
 *   ping
 *   Sin acción: devuelve un HTML mínimo de estado.
 *
 * ACCIONES POST (doPost, JSON en el body: {accion, token, ...})
 *   login, leer, leerProyecto, crearProyecto, cerrarProyecto, guardar, guardarSesion,
 *   guardarPendiente, cerrarPendiente, guardarHito, editarHito,
 *   eliminarHito, subirEvidencia, subirInforme, guardarFormato,
 *   crearEstructura, cambiarPassword, registrarPuntaje, validarSesion,
 *   verificarAppSheet
 *
 * NOTA SOBRE CORS: ContentService (TextOutput) de Apps Script no expone
 * un método setHeader para fijar cabeceras propias. El Web App desplegado
 * con acceso "Anyone" responde a fetch cross-origin desde GitHub Pages
 * (Google sirve la respuesta con Access-Control-Allow-Origin: *); por eso
 * responder_() devuelve JSON con mime JSON y la página debe llamar con
 * fetch simple, sin cabeceras personalizadas (sin Authorization, sin
 * Content-Type distinto de text/plain). El token viaja dentro del JSON
 * del body, nunca en una cabecera.
 * ============================================================================
 */
// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

var CONFIG = {
  // Carpeta raíz en Google Drive (se crea si no existe).
  ROOT_FOLDER: 'Bitacoras',
  PROJECTS_FOLDER: 'Proyectos',

  // Nombre del libro de cálculo (se crea si no existe, o se usa el
  // existente con este mismo nombre).
  SPREADSHEET_NAME: 'Bitacoras',

  // Nombres de las pestañas del libro.
  SHEET_NAMES: ['Bitacoras', 'Sesiones', 'Pendientes', 'Hitos', 'Puntaje'],

  // Clave en Script Properties donde vive el hash SHA-256 de la contraseña web.
  PASS_HASH_KEY: 'WEB_PASS_HASH',
  PASS_SETUP_KEY: 'WEB_PASS_SETUP',

  // M2: sal aleatoria (Script Properties, clave WEB_PASS_SALT) con la que
  // se calcula el hash: SHA-256(sal + ':' + contraseña). Se genera sola
  // la primera vez que se fija o se verifica una contraseña.
  PASS_SALT_KEY: 'WEB_PASS_SALT',
  MUSE_SERVICE_TOKEN_HASH_KEY: 'MUSE_SERVICE_TOKEN_HASH',

  // Seguridad de sesión / login.
  TOKEN_HORAS: 6,          // Vigencia del token de sesión (CacheService).
  INTENTOS_MAX: 5,         // Intentos fallidos de login antes del bloqueo.
  BLOQUEO_MINUTOS: 5,      // Duración del bloqueo tras INTENTOS_MAX fallos.
  ZONA_HORARIA: 'America/Mexico_City'
};

var MUSE_SERVICE_ALLOWED_ACTIONS = [
  'leer', 'leerProyecto', 'guardarSesion', 'guardarPendiente',
  'cerrarPendiente', 'guardarHito', 'subirEvidencia', 'crearProyecto',
  'guardar', 'verEvidencia', 'registrarPuntaje'
];

var PALETA_PROYECTOS = [
  '#002663', '#0B3D91', '#7C3AED', '#0F766E', '#B45309',
  '#BE123C', '#1D4ED8', '#15803D', '#A21CAF', '#C2410C'
];

var ACCIONES_REQUIEREN_PROYECTO_ABIERTO = [
  'guardar', 'guardarSesion', 'editarSesion', 'eliminarSesion',
  'guardarPendiente', 'cerrarPendiente', 'guardarHito', 'editarHito',
  'eliminarHito', 'subirEvidencia', 'subirInforme', 'guardarFormato',
  'registrarPuntaje'
];

function validarProyectoAbierto_(accion, datos) {
  if (ACCIONES_REQUIEREN_PROYECTO_ABIERTO.indexOf(accion) === -1) return null;
  var slug = String((datos && datos.slug) || '');
  var proyecto = proyectoPorSlug_(slug);
  if (!proyecto) return { ok: false, error: 'Slug no reconocido: ' + slug };
  if (String(proyecto.estado || 'Activo').toLowerCase() === 'cerrado') {
    return { ok: false, error: 'El proyecto está cerrado y solo permite lectura y descarga.' };
  }
  return null;
}

/** Solo se conserva como filtro de migración, no como catálogo activo. */
var PROYECTOS_INICIALES_OCULTOS = {
  'estadistica-1': true, 'estadistica-2': true, 'cch-page': true,
  'control-facturas': true, 'asistencia-cch': true, 'moodle-dgtic': true
};
var PROYECTOS = [];

function esProyectoInicialOculto_(proyecto) {
  return !!proyecto && !!PROYECTOS_INICIALES_OCULTOS[proyecto.slug];
}

function indiceVisible_(indice) {
  if (!indice || !Array.isArray(indice.projects)) return indice;
  return Object.assign({}, indice, {
    projects: indice.projects.filter(function (p) { return !esProyectoInicialOculto_(p); })
  });
}

function archivarProyectosIniciales_(indice) {
  var proyectos = Array.isArray(indice.projects) ? indice.projects : [];
  var archivados = Array.isArray(indice.archived_projects) ? indice.archived_projects : [];
  var slugsArchivados = {};
  archivados.forEach(function (p) { if (p && p.slug) slugsArchivados[p.slug] = true; });
  proyectos.forEach(function (p) {
    if (esProyectoInicialOculto_(p) && !slugsArchivados[p.slug]) {
      archivados.push(p);
      slugsArchivados[p.slug] = true;
    }
  });
  indice.projects = proyectos.filter(function (p) { return !esProyectoInicialOculto_(p); });
  indice.archived_projects = archivados;
  return archivados;
}

/**
 * Correos autorizados para leer/escribir vía AppSheet.
 * PLACEHOLDER: Nequiz pone aquí los correos autorizados, por ejemplo:
 *   ['correo1@ejemplo.com', 'correo2@ejemplo.com']
 * Vacío = nadie autorizado todavía. No hay correos reales en este archivo.
 * Verificar con verificarCuentaAppSheet_(correo) antes de confiar en
 * Session.getActiveUser().getEmail() dentro de AppSheet.
 */
var CUENTAS_AUTORIZADAS_APPSHEET = [];

// Encabezados exactos de cada pestaña del libro "Bitacoras".
// ---------------------------------------------------------------------------
// DICCIONARIO ÚNICO DE DATOS (A1, 2026-11-18) — lo usan página, backend,
// hojas y formatos; ya no hay traducción parcial entre nombres.
// Sesión: {id, slug, fecha, titulo, tipo, texto, asistentes, acuerdos,
//   evidencias:[{url, pie, nombre, mime, tipo, tamano}], campos, plantilla_version}
//   Evidencia tipo: 'imagen' | 'documento' (v2: también PDF, Word y Excel,
//   máx. 10 MB por archivo; el mime y el nombre original se conservan).
// Pendiente: {id, sesion_id, slug, texto, responsable, fecha_compromiso,
//   prioridad, estado, fecha_cierre, minuta_origen, notas}
//   estado: 'Pendiente' | 'En proceso' | 'Cerrado' (nunca 'Hecho')
// Hito: {id, slug, titulo, fecha, descripcion, estado, fecha_cierre}
//   estado: 'Pendiente' | 'En curso' | 'Cerrado' (nunca 'completado')
// Formato: {nombre, formato_version, secciones:[{titulo, campos}]}
// Zona horaria de todas las fechas del backend: America/Mexico_City.
// ---------------------------------------------------------------------------
// No cambiar el orden ni los nombres: la página y AppSheet los usan tal cual.
var ENCABEZADOS = {
  Bitacoras: ['slug', 'hashtag', 'nombre', 'color', 'estado', 'drive_folder', 'bitacora_json'],
  Sesiones: ['id', 'slug', 'fecha', 'titulo', 'tipo', 'texto', 'asistentes', 'acuerdos', 'plantilla_version'],
  Pendientes: ['id', 'sesion_id', 'slug', 'texto', 'responsable', 'fecha_compromiso', 'prioridad', 'estado', 'minuta_origen', 'fecha_cierre', 'notas'],
  Hitos: ['id', 'slug', 'titulo', 'fecha', 'descripcion', 'estado', 'fecha_cierre'],
  Puntaje: ['id', 'slug', 'rubro', 'actividad', 'nivel', 'puntos', 'alcance', 'constancia', 'dictamen', 'periodo', 'categoria_objetivo', 'glosario_id']
};

// ---------------------------------------------------------------------------
// doGet — Solo ping y el HTML mínimo de estado son públicos (auditoría v2
// Paso 7e: las lecturas leer/leerProyecto/verificarEstructura van por POST;
// doGet no autentica con token. La web usa el body y solo POST admite el
// parámetro de consulta como alternativa para integraciones de servicio.)
// ---------------------------------------------------------------------------

/**
 * GET ?accion=ping -> {ok:true, ...} (salud del Web App)
 * Sin ?accion=     -> HTML mínimo de estado.
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var accion = params.accion || '';
    if (!accion) {
      var html = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
        '<title>Bitácoras CCH — Web App</title></head><body style="font-family:sans-serif">' +
        '<h1>Bitácoras CCH</h1>' +
        '<p>Web App de Google Apps Script en funcionamiento.</p>' +
        '<p>Acción GET: <code>ping</code>. Las lecturas de datos (leer, leerProyecto, ' +
        'verificarEstructura) van por POST con el token en el body.</p>' +
        '<p>La interfaz (GitHub Pages) llama a este servicio con fetch JSON.</p>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Bitácoras CCH — Web App');
    }
    if (accion === 'ping') {
      return responder_({ ok: true, accion: 'ping', fecha: ahoraISO_(),
        mensaje: 'Bitácoras CCH en línea.' });
    }
    return responder_({ ok: false, error: 'Acción GET no reconocida: ' + accion +
      '. Las lecturas de datos van por POST.' });
  } catch (err) {
    return responder_({ ok: false, error: 'Error en doGet: ' + err.message });
  }
}

// ---------------------------------------------------------------------------
// doPost — ESCRITURA (exige token válido, salvo login y ping)
// ---------------------------------------------------------------------------

/**
 * POST con JSON en el body: {accion, token, ...datos de la acción...}
 * Acciones:
 *   login            {password} -> {ok, token} o error (bloqueo tras 5 fallos)
 *   guardar          {slug, bitacora} -> escribe bitacora.json con respaldo
 *   guardarSesion    {slug, sesion} -> agrega sesión a bitacora.json + hoja Sesiones
 *   guardarPendiente {slug, pendiente} -> agrega pendiente + hoja Pendientes
 *   cerrarPendiente  {slug, id, estado} -> marca pendiente como cerrada
 *   guardarHito      {slug, hito} -> agrega hito + hoja Hitos
 *   editarHito       {slug, hito} -> actualiza hito + hoja Hitos (M6)
 *   eliminarHito     {slug, id} -> borra hito de bitacora.json y de la hoja (M6)
 *   subirEvidencia   {slug, nombre, base64, mime, carpeta} -> sube a Drive
 *   subirInforme     {slug, nombre, base64, mime} -> guarda el informe Word
 *                     en Informes/ dentro de la carpeta del proyecto (D7)
 *   guardarFormato   {slug, formato} -> guarda formato-exportacion.json versionado
 *   crearProyecto   {proyecto} -> registra el proyecto y crea su estructura
 *   cerrarProyecto  {slug, confirmacion:"CERRAR"} -> cierre irreversible; libera hashtag
 *   guardarConfigCiclo {config, proyectos} -> guarda config-ciclo.json
 *                     (ciclo vigente + siguiente + usados) y los folios en
 *                     INDICE-bitacoras.json (v4, folios CICLO-NN)
 *   crearEstructura  {} -> crea toda la estructura desde cero (idempotente)
 *   cambiarPassword  {passwordActual, passwordNueva} -> cambia el hash guardado
 *   registrarPuntaje {slug, puntaje} -> guarda actividad en la hoja Puntaje
 *   validarSesion    {} -> {ok, valido:true} si el token sigue vigente (M4)
 *   leer             {} -> índice + bitacora.json de todos los proyectos (POST, v2)
 *   leerProyecto    {slug} -> bitacora + plantilla + formato (POST, v2)
 *   verificarEstructura {} -> lista de faltantes (POST, v2)
 *   editarSesion     {slug, sesion} -> actualiza por id (v2, Paso 2)
 *   eliminarSesion   {slug, id} -> borra sesión + sus pendientes (v2, Paso 2)
 *   verEvidencia     {id} -> base64 de la evidencia dentro de Bitacoras/ (v2, Paso 3)
 *   cerrarSesion     {} -> revoca el token en el servidor (v2, Paso 7d)
 *   verificarAppSheet {correo} -> {ok, autorizado} según la lista (D10)
 */
function doPost(e) {
  try {
    var datos = {};
    if (e && e.postData && e.postData.contents) {
      datos = JSON.parse(e.postData.contents);
    }
    var accion = datos.accion || '';
    var token = datos.token || ((e && e.parameter && e.parameter.token) || '');
    var tipoToken = token ? verificarToken_(token) : null;

    if (tipoToken === 'servicio' && MUSE_SERVICE_ALLOWED_ACTIONS.indexOf(accion) === -1) {
      return responder_({ ok: false, error: 'Acción no permitida con token de servicio' });
    }

    // --- Acciones públicas (sin token) ---
    if (accion === 'login') {
      return responder_(login_(datos.password || '', datos.cliente || ''));
    }
    if (accion === 'ping') {
      return responder_({ ok: true, accion: 'ping', fecha: ahoraISO_() });
    }
    if (!accion) {
      return responder_({ ok: false, error: 'Falta el campo "accion" en el JSON.' });
    }

    // --- El resto exige token válido ---
    if (!tipoToken) {
      return responder_({ ok: false, error: 'Token inválido o expirado. Inicia sesión de nuevo.' });
    }

    // Paso 7d: cerrar sesión revoca el token (no necesita bloqueo de escritura).
    if (accion === 'cerrarSesion') {
      CacheService.getScriptCache().remove('sesion_' + datos.token);
      return responder_({ ok: true, mensaje: 'Sesión cerrada.' });
    }

    // Paso 7e: lecturas por POST (no necesitan el LockService de escritura).
    if (accion === 'leer') {
      return responder_({ ok: true, accion: 'leer', datos: leerTodo_() });
    }
    if (accion === 'leerProyecto') {
      if (!proyectoPorSlug_(datos.slug || '')) return responder_({ ok: false, error: 'Slug no reconocido: ' + datos.slug });
      return responder_({ ok: true, accion: 'leerProyecto', slug: datos.slug,
        datos: leerProyecto_(datos.slug) });
    }
    if (accion === 'verificarEstructura') {
      return responder_({ ok: true, accion: 'verificarEstructura',
        resultado: verificarEstructura_() });
    }

    // M3: LockService — una sola escritura a la vez. Dos escrituras
    // simultáneas (dos pestañas, web + AppSheet) no se pisan en
    // bitacora.json ni en las hojas. Si no se consigue el bloqueo en
    // 10 s, se devuelve error en vez de escribir a medias.
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      return responder_({ ok: false,
        error: 'Otro guardado está en curso. Inténtalo de nuevo en unos segundos.' });
    }
    try {
      var bloqueoProyecto = validarProyectoAbierto_(accion, datos);
      if (bloqueoProyecto) return responder_(bloqueoProyecto);
      switch (accion) {
        case 'guardar':          return responder_(tipoToken === 'servicio'
          ? guardarBitacoraServicio_(datos) : guardarBitacora_(datos));
        case 'guardarSesion':    return responder_(guardarSesion_(datos));
        case 'editarSesion':     return responder_(editarSesion_(datos));
        case 'eliminarSesion':   return responder_(eliminarSesion_(datos));
        case 'verEvidencia':     return responder_(verEvidencia_(datos));
        case 'guardarPendiente': return responder_(guardarPendiente_(datos));
        case 'cerrarPendiente':  return responder_(cerrarPendiente_(datos));
        case 'guardarHito':      return responder_(guardarHito_(datos));
        case 'editarHito':       return responder_(editarHito_(datos));
        case 'eliminarHito':     return responder_(eliminarHito_(datos));
        case 'subirEvidencia':   return responder_(subirEvidencia_(datos));
        case 'subirInforme':     return responder_(subirInforme_(datos));
        case 'guardarFormato':   return responder_(guardarFormato_(datos));
        case 'guardarConfigCiclo': return responder_(guardarConfigCiclo_(datos));
        case 'crearProyecto':    return responder_(crearProyecto_(datos));
        case 'cerrarProyecto':   return responder_(cerrarProyecto_(datos));
        case 'reasignarColores': return responder_(reasignarColoresProyectos_());
        case 'crearEstructura':  return responder_({ ok: true, accion: 'crearEstructura',
                                       resultado: crearEstructuraDesdeCero() });
        case 'cambiarPassword':  return responder_(cambiarPassword_(datos));
        case 'registrarPuntaje': return responder_(registrarPuntaje_(datos));
        case 'validarSesion':    return responder_({ ok: true, valido: true });
        case 'verificarAppSheet':
          return responder_({ ok: true,
            autorizado: verificarCuentaAppSheet_(datos.correo || '') });
        default:
          return responder_({ ok: false, error: 'Acción POST no reconocida: ' + accion });
      }
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return responder_({ ok: false, error: 'Error en doPost: ' + err.message });
  }
}

// ---------------------------------------------------------------------------
// LOGIN, TOKEN Y CONTRASEÑA
// ---------------------------------------------------------------------------

/**
 * Login: recibe {password}, compara su SHA-256 con el hash guardado en
 * Script Properties (WEB_PASS_HASH). Si coincide, devuelve {ok:true, token}.
 * Si falla, registra el intento; tras INTENTOS_MAX (5) fallos seguidos,
 * bloquea el login BLOQUEO_MINUTOS (5) minutos.
 * Si aún no se ha fijado ninguna contraseña (sin hash guardado), devuelve
 * error indicando que hay que ejecutar fijarPasswordWebDesdePropiedad().
 */
function login_(password, cliente) {
  var cache = CacheService.getScriptCache();
  var ahora = new Date().getTime();
  // M1: bloqueo POR CLIENTE, no global. Apps Script no expone la IP, así
  // que el identificador lo genera la página (localStorage) y viaja en el
  // body del login. Se limpia a solo letras/números/guion (máx. 64).
  var idCliente = String(cliente || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 64) || 'anonimo';
  var claveIntentos = 'login_intentos_' + idCliente;
  var claveBloqueo = 'login_bloqueo_hasta_' + idCliente;

  // Paso 7c: freno GLOBAL a la fuerza bruta (100 fallos/hora en total).
  // El bloqueo por cliente se puede eludir rotando el id; este contador
  // global no. Si se activa por error, el dueño lo libera con limpiarBloqueos().
  if (Number(cache.get('login_fallos_global') || 0) >= 100) {
    return { ok: false, error: 'Login suspendido por actividad sospechosa. Espera una hora.' };
  }

  // 1) ¿Hay un bloqueo activo para ESTE cliente?
  var bloqueoHasta = Number(cache.get(claveBloqueo) || 0);
  if (bloqueoHasta && ahora < bloqueoHasta) {
    var minutos = Math.ceil((bloqueoHasta - ahora) / 60000);
    return { ok: false, error: 'Demasiados intentos. Espera ' + minutos +
      ' minuto(s) antes de volver a intentarlo.' };
  }

  // 2) ¿Existe contraseña fijada?
  var hashGuardado = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.PASS_HASH_KEY);
  if (!hashGuardado) {
    return { ok: false, error: 'Aún no se ha fijado la contraseña web. ' +
      'Agrega WEB_PASS_SETUP en Script Properties y ejecuta fijarPasswordWebDesdePropiedad().' };
  }

  // 3) Comparar hashes con sal (nunca la contraseña en texto plano).
  // M2: si el hash guardado es de antes de la sal (hash simple), se
  // acepta una vez y se actualiza al hash con sal automáticamente.
  if (!password || (hashConSal_(password) !== hashGuardado &&
      hash_(password) !== hashGuardado)) {
    Utilities.sleep(2000); // Paso 7c: cada intento fallido tarda ~2 s.
    cache.put('login_fallos_global', String(Number(cache.get('login_fallos_global') || 0) + 1), 3600);
    var intentos = Number(cache.get(claveIntentos) || 0) + 1;
    cache.put(claveIntentos, String(intentos), 3600); // contador 1 hora
    if (intentos >= CONFIG.INTENTOS_MAX) {
      cache.put(claveBloqueo,
        String(ahora + CONFIG.BLOQUEO_MINUTOS * 60000), 3600);
      cache.remove(claveIntentos);
      return { ok: false, error: 'Demasiados intentos fallidos. ' +
        'Login bloqueado ' + CONFIG.BLOQUEO_MINUTOS + ' minutos.' };
    }
    return { ok: false, error: 'Contraseña incorrecta. Intento ' + intentos +
      ' de ' + CONFIG.INTENTOS_MAX + '.' };
  }
  if (hash_(password) === hashGuardado && hashConSal_(password) !== hashGuardado) {
    PropertiesService.getScriptProperties()
      .setProperty(CONFIG.PASS_HASH_KEY, hashConSal_(password));
  }

  // 4) Éxito: limpiar intentos de ESTE cliente y emitir token (6 horas).
  cache.remove(claveIntentos);
  cache.remove(claveBloqueo);
  var token = Utilities.getUuid() + '-' + Utilities.getUuid();
  cache.put('sesion_' + token, epoca_(), CONFIG.TOKEN_HORAS * 3600);
  return { ok: true, token: token, expira_horas: CONFIG.TOKEN_HORAS };
}

/** Época de sesión; el token de servicio no depende de esta época. */
/* Paso 7d: época de sesión. Todos los tokens guardan la época vigente;
   al cambiar la contraseña la época cambia y los tokens viejos dejan de
   valer, aunque no hayan expirado (6 h). */
function epoca_() {
  return PropertiesService.getScriptProperties().getProperty('SESSION_EPOCH') || '1';
}
/* Paso 7c: libera el freno global de login (ejecutar desde el editor). */
function limpiarBloqueos() {
  CacheService.getScriptCache().remove('login_fallos_global');
  return 'Bloqueo global de login liberado.';
}
function verificarToken_(token) {
  if (!token) return null;
  var hashServicio = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.MUSE_SERVICE_TOKEN_HASH_KEY);
  if (hashServicio && hashConSal_(token) === hashServicio) return 'servicio';
  if (CacheService.getScriptCache().get('sesion_' + token) === epoca_()) return 'sesion';
  return null;
}

/**
 * Guarda el hash y la sal de la contraseña web, nunca la contraseña en texto
 * plano. La configuración inicial se realiza con
 * fijarPasswordWebDesdePropiedad(), no pasando secretos en el código.
 */
function fijarPasswordWeb(nuevaPassword) {
  if (!nuevaPassword || nuevaPassword.length < 12) {
    throw new Error('La contraseña debe tener al menos 12 caracteres.');
  }
  // M2: se guarda el hash CON SAL, no el hash simple de antes.
  var props = PropertiesService.getScriptProperties();
  props.setProperty(CONFIG.PASS_HASH_KEY, hashConSal_(nuevaPassword));
  props.setProperty('SESSION_EPOCH', String(new Date().getTime()));
  return 'Contraseña web fijada (hash SHA-256 con sal guardado en Script Properties).';
}

/**
 * Fija la contraseña inicial leyendo una propiedad temporal que se introduce
 * desde Project Settings. Después de guardar el hash con sal, elimina el
 * valor en texto plano para que no permanezca en Script Properties.
 */
function fijarPasswordWebDesdePropiedad() {
  var props = PropertiesService.getScriptProperties();
  var nuevaPassword = props.getProperty(CONFIG.PASS_SETUP_KEY);
  if (!nuevaPassword) {
    throw new Error('Agrega primero la propiedad ' + CONFIG.PASS_SETUP_KEY +
      ' en Project Settings → Script Properties.');
  }
  var resultado = fijarPasswordWeb(nuevaPassword);
  props.deleteProperty(CONFIG.PASS_SETUP_KEY);
  return resultado + ' La propiedad temporal ' + CONFIG.PASS_SETUP_KEY +
    ' fue eliminada; WEB_PASS_HASH y WEB_PASS_SALT permanecen.';
}

/**
 * Genera un token de servicio para Muse. El token completo solo se escribe
 * una vez en Logger; guarda el hash con sal en Script Properties.
 */
function generarTokenServicioMuse() {
  var token = Utilities.getUuid() + '-' + Utilities.getUuid();
  PropertiesService.getScriptProperties()
    .setProperty(CONFIG.MUSE_SERVICE_TOKEN_HASH_KEY, hashConSal_(token));
  Logger.log('Token de servicio Muse (cópialo ahora; no se volverá a mostrar): ' + token);
  return 'Token generado. Cópialo ahora desde View > Logs y guárdalo de forma segura.';
}

/**
 * Alternativa para fijar un token propio. Ejecuta una vez y BORRA del código
 * el valor del token inmediatamente después.
 */
function fijarTokenServicioMuse() {
  var NUEVO_TOKEN_SERVICIO = 'TU_TOKEN_SERVICIO_AQUI'; // <-- reemplaza, ejecuta una vez y BORRA el token
  if (!NUEVO_TOKEN_SERVICIO || NUEVO_TOKEN_SERVICIO === 'TU_TOKEN_SERVICIO_AQUI' ||
      NUEVO_TOKEN_SERVICIO.length < 32) {
    throw new Error('Define un token de al menos 32 caracteres antes de ejecutarla.');
  }
  PropertiesService.getScriptProperties()
    .setProperty(CONFIG.MUSE_SERVICE_TOKEN_HASH_KEY, hashConSal_(NUEVO_TOKEN_SERVICIO));
  return 'Token de servicio guardado como hash. BORRA ahora el token de esta función.';
}

/** Revoca de inmediato el token de servicio guardado en Script Properties. */
function revocarTokenServicioMuse() {
  PropertiesService.getScriptProperties()
    .deleteProperty(CONFIG.MUSE_SERVICE_TOKEN_HASH_KEY);
  Logger.log('Token de servicio Muse revocado.');
  return 'Token de servicio Muse revocado.';
}

/**
 * Cambia la contraseña web desde la página. Requiere token válido
 * (lo verifica doPost) + la contraseña actual correcta.
 * Recibe {passwordActual, passwordNueva}.
 */
function cambiarPassword_(datos) {
  var hashGuardado = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.PASS_HASH_KEY);
  if (!datos.passwordActual || (hashConSal_(datos.passwordActual) !== hashGuardado &&
      hash_(datos.passwordActual) !== hashGuardado)) {
    return { ok: false, error: 'La contraseña actual no es correcta.' };
  }
  if (!datos.passwordNueva || datos.passwordNueva.length < 12) {
    return { ok: false, error: 'La contraseña nueva debe tener al menos 12 caracteres.' };
  }
  PropertiesService.getScriptProperties()
    .setProperty(CONFIG.PASS_HASH_KEY, hashConSal_(datos.passwordNueva));
  // Paso 7d: cambiar la contraseña invalida TODOS los tokens vigentes.
  PropertiesService.getScriptProperties()
    .setProperty('SESSION_EPOCH', String(new Date().getTime()));
  return { ok: true, mensaje: 'Contraseña web actualizada.' };
}

/**
 * ¿Está este correo autorizado para AppSheet? (placeholder).
 * Nequiz llena CUENTAS_AUTORIZADAS_APPSHEET con los correos autorizados.
 * Si la lista está vacía, nadie está autorizado todavía.
 */
function verificarCuentaAppSheet_(correo) {
  if (!correo) return false;
  return CUENTAS_AUTORIZADAS_APPSHEET.indexOf(correo) !== -1;
}

// ---------------------------------------------------------------------------
// LECTURA (doGet)
// ---------------------------------------------------------------------------

/** Devuelve el índice + el bitacora.json de todos los proyectos registrados. */
function leerTodo_() {
  var root = getRootFolder_();
  var indice = null;
  if (root) {
    indice = leerJSON_(root, 'INDICE-bitacoras.json');
  }
  var configCiclo = leerConfigCiclo_();
  var proyectos = proyectosRegistrados_(indice).map(function (p) {
    // Paso 8d: leer solo bitacora.json (leerProyecto_ leía 3 archivos por
    // proyecto: bitacora + plantilla + formato; 12 lecturas de sobra).
    var c = getCarpetaProyecto_(p.slug);
    var bit = (c && leerJSON_(c, 'bitacora.json')) || bitacoraVacia_(p.slug);
    bit.revision = revisionBitacora_(bit);
    // v4: el folio del índice manda si lo trae; si no, el del catálogo.
    var folio = p.folio || '';
    if (indice && Array.isArray(indice.projects)) {
      for (var i = 0; i < indice.projects.length; i++) {
        if (indice.projects[i].slug === p.slug && indice.projects[i].folio) {
          folio = indice.projects[i].folio;
        }
      }
    }
    return { slug: p.slug, hashtag: p.hashtag, nombre: p.nombre,
      color: p.color || '#002663', campos_propios: p.campos_propios || [],
      folio: folio, estado: p.estado || 'Activo', cerrado_en: p.cerrado_en || '',
      bitacora: bit };
  });
  return { indice: indiceVisible_(indice), proyectos: proyectos,
    configCiclo: configCiclo, actualizado: ahoraISO_() };
}

/**
 * Devuelve bitacora.json + plantilla-sesion.json + formato-exportacion.json
 * de un proyecto. Si falta bitacora.json, devuelve la estructura vacía
 * (no es error: el proyecto puede no tener sesiones todavía).
 */
function leerProyecto_(slug) {
  var carpeta = getCarpetaProyecto_(slug);
  var bitacora = carpeta
    ? leerJSON_(carpeta, 'bitacora.json')
    : null;
  if (!bitacora) {
    bitacora = bitacoraVacia_(slug);
  }
  bitacora.revision = revisionBitacora_(bitacora);
  var plantilla = carpeta ? leerJSON_(carpeta, 'plantilla-sesion.json') : null;
  var formato = carpeta ? leerJSON_(carpeta, 'formato-exportacion.json') : null;
  return { bitacora: bitacora, plantilla: plantilla, formato: formato };
}

// ---------------------------------------------------------------------------
// ESCRITURA: BITÁCORA COMPLETA Y SESIONES / PENDIENTES / HITOS
// ---------------------------------------------------------------------------

/**
 * guardar — recibe {slug, bitacora} con los datos COMPLETOS del proyecto
 * y los escribe en <slug>/bitacora.json, con respaldo previo
 * bitacora-YYYY-MM-DD-HHmm.json en la misma carpeta del proyecto.
 * El respaldo solo se crea si ya existía un bitacora.json anterior.
 * También actualiza la fila del proyecto en la hoja Bitacoras.
 */
function guardarBitacora_(datos) {
  var slug = datos.slug || '';
  if (!proyectoPorSlug_(slug)) {
    return { ok: false, error: 'Slug no reconocido: ' + slug };
  }
  if (!datos.bitacora || typeof datos.bitacora !== 'object') {
    return { ok: false, error: 'Falta el objeto "bitacora" con los datos completos.' };
  }
  var carpeta = getOrCreateCarpetaProyecto_(slug);
  var existente = leerJSON_(carpeta, 'bitacora.json') || bitacoraVacia_(slug);
  var conflicto = conflictoRevisionBitacora_(existente, datos.revisionEsperada);
  if (conflicto) return conflicto;
  var bitacora = datos.bitacora;
  bitacora.slug = slug; // el slug manda: nunca se guarda con otro slug
  bitacora.revision = revisionBitacora_(existente) + 1;
  if (!Array.isArray(bitacora.sesiones)) bitacora.sesiones = [];
  if (!Array.isArray(bitacora.pendientes)) bitacora.pendientes = [];
  if (!Array.isArray(bitacora.hitos)) bitacora.hitos = [];
  if (!Array.isArray(bitacora.puntaje)) bitacora.puntaje = [];

  var respaldo = escribirJSON_(carpeta, 'bitacora.json', bitacora, true);
  asegurarFilaProyecto_(slug);
  return { ok: true, mensaje: 'Bitácora de ' + slug + ' guardada.',
    revision: bitacora.revision, respaldo: respaldo };
}

function fusionarValorMuseSinBorrar_(actual, recibido) {
  if (recibido === null || recibido === undefined || recibido === '') return actual;
  if (Array.isArray(recibido)) {
    var elementos = Array.isArray(actual) ? actual.slice() : [];
    recibido.forEach(function (nuevo) {
      if (nuevo === null || nuevo === undefined || nuevo === '') return;
      var indice = -1;
      if (nuevo && typeof nuevo === 'object' && nuevo.id) {
        for (var i = 0; i < elementos.length; i++) {
          if (elementos[i] && elementos[i].id === nuevo.id) {
            indice = i;
            break;
          }
        }
      } else {
        var firma = JSON.stringify(nuevo);
        for (var j = 0; j < elementos.length; j++) {
          if (JSON.stringify(elementos[j]) === firma) {
            indice = j;
            break;
          }
        }
      }
      if (indice === -1) elementos.push(fusionarValorMuseSinBorrar_({}, nuevo));
      else elementos[indice] = fusionarValorMuseSinBorrar_(elementos[indice], nuevo);
    });
    return elementos;
  }
  if (typeof recibido === 'object') {
    var propiedades = actual && typeof actual === 'object' && !Array.isArray(actual)
      ? Object.assign({}, actual) : {};
    Object.keys(recibido).forEach(function (clave) {
      var valor = fusionarValorMuseSinBorrar_(propiedades[clave], recibido[clave]);
      if (valor !== undefined) propiedades[clave] = valor;
    });
    return propiedades;
  }
  return recibido;
}

/**
 * Sincronización Muse no destructiva: fusiona por id y conserva registros,
 * elementos de arreglos y valores existentes omitidos o vacíos.
 */
function guardarBitacoraServicio_(datos) {
  var slug = datos.slug || '';
  var entrante = datos.bitacora;
  if (!proyectoPorSlug_(slug)) return { ok: false, error: 'Slug no reconocido: ' + slug };
  if (!entrante || typeof entrante !== 'object') {
    return { ok: false, error: 'Falta el objeto "bitacora" con los datos completos.' };
  }
  var colecciones = ['sesiones', 'pendientes', 'hitos', 'puntaje'];
  for (var v = 0; v < colecciones.length; v++) {
    var nombreValidar = colecciones[v];
    if (entrante[nombreValidar] !== undefined && !Array.isArray(entrante[nombreValidar])) {
      return { ok: false, error: 'La colección "' + nombreValidar + '" debe ser un arreglo.' };
    }
    if (Array.isArray(entrante[nombreValidar])) {
      for (var r = 0; r < entrante[nombreValidar].length; r++) {
        if (!entrante[nombreValidar][r] || !entrante[nombreValidar][r].id) {
          return { ok: false, error: 'Cada registro de "' + nombreValidar + '" debe tener id.' };
        }
      }
    }
  }
  var carpeta = getOrCreateCarpetaProyecto_(slug);
  var existente = leerJSON_(carpeta, 'bitacora.json') || bitacoraVacia_(slug);
  var bitacora = fusionarValorMuseSinBorrar_(existente, entrante);
  bitacora.slug = slug;
  return guardarBitacora_({ slug: slug, bitacora: bitacora,
    revisionEsperada: revisionBitacora_(existente) });
}

/**
 * guardarSesion — recibe {slug, sesion}. Si la sesión no trae id, se
 * genera uno con nuevoId_(). La agrega a bitacora.json (sin respaldo,
 * para no llenar Drive de copias en cada captura) y a la hoja Sesiones.
 * Los campos que no trae la sesión quedan en null (no se inventan).
 */
function guardarSesion_(datos) {
  var slug = datos.slug || '';
  if (!proyectoPorSlug_(slug)) {
    return { ok: false, error: 'Slug no reconocido: ' + slug };
  }
  var sesion = datos.sesion || {};
  if (!sesion.fecha) sesion.fecha = ahoraISO_();
  if (!sesion.id) sesion.id = nuevoId_(slug, sesion.fecha);
  if (sesion.plantilla_version === undefined || sesion.plantilla_version === null) {
    sesion.plantilla_version = 1;
  }

  var carpeta = getOrCreateCarpetaProyecto_(slug);
  var bitacora = leerJSON_(carpeta, 'bitacora.json') || bitacoraVacia_(slug);
  var conflicto = conflictoRevisionBitacora_(bitacora, datos.revisionEsperada);
  if (conflicto) return conflicto;
  // Paso 5: rechazar id duplicado (la página ya usa uid(), esto es el freno del servidor).
  for (var i = 0; i < bitacora.sesiones.length; i++) {
    if (bitacora.sesiones[i].id === sesion.id) return { ok: false, code: 'CONFLICT',
      conflictTipo: 'id',
      error: 'Ya existe una sesión con el id ' + sesion.id + '.',
      revisionActual: revisionBitacora_(bitacora), actual: bitacora.sesiones[i] };
  }
  bitacora.sesiones.push(sesion);
  bitacora.revision = revisionBitacora_(bitacora) + 1;
  escribirJSON_(carpeta, 'bitacora.json', bitacora, false);

  agregarFila_('Sesiones', [
    sesion.id, slug, sesion.fecha, sesion.titulo || '',
    sesion.tipo || '', sesion.texto || '',
    Array.isArray(sesion.asistentes) ? sesion.asistentes.join(', ') : (sesion.asistentes || ''),
    Array.isArray(sesion.acuerdos) ? sesion.acuerdos.length : 0,
    sesion.plantilla_version
  ]);
  return { ok: true, mensaje: 'Sesión guardada.', id: sesion.id, revision: bitacora.revision };
}

/**
 * guardarPendiente — recibe {slug, pendiente} (texto, responsable,
 * fecha_compromiso, prioridad, sesion_id, minuta_origen). Estado inicial:
 * "Pendiente" si no trae otro. La agrega a bitacora.json y a la hoja
 * Pendientes. No se inventan responsable ni fecha: si faltan, quedan vacíos.
 */
function guardarPendiente_(datos) {
  var slug = datos.slug || '';
  if (!proyectoPorSlug_(slug)) {
    return { ok: false, error: 'Slug no reconocido: ' + slug };
  }
  var pendiente = datos.pendiente || {};
  if (!pendiente.texto) {
    return { ok: false, error: 'El pendiente necesita un texto.' };
  }
  if (!pendiente.estado) pendiente.estado = 'Pendiente';

  var carpeta = getOrCreateCarpetaProyecto_(slug);
  var bitacora = leerJSON_(carpeta, 'bitacora.json') || bitacoraVacia_(slug);
  var conflicto = conflictoRevisionBitacora_(bitacora, datos.revisionEsperada);
  if (conflicto) return conflicto;
  // D11: no duplicar: si ya existe un pendiente con el mismo texto en la
  // misma sesión, se devuelve el existente en vez de crear otro.
  var textoNorm = String(pendiente.texto).trim().toLowerCase();
  for (var i = 0; i < bitacora.pendientes.length; i++) {
    var ex = bitacora.pendientes[i];
    if (String(ex.sesion_id || '') === String(pendiente.sesion_id || '') &&
        String(ex.texto || '').trim().toLowerCase() === textoNorm) {
      bitacora.revision = revisionBitacora_(bitacora) + 1;
      escribirJSON_(carpeta, 'bitacora.json', bitacora, false);
      return { ok: true, mensaje: 'Ese pendiente ya existía.', id: ex.id,
        duplicado: true, revision: bitacora.revision };
    }
  }
  if (!pendiente.id) pendiente.id = nuevoId_(slug, ahoraISO_());
  if (bitacora.pendientes.some(function (p) { return p.id === pendiente.id; })) {
    var pendienteExistente = bitacora.pendientes.find(function (p) { return p.id === pendiente.id; });
    return { ok: false, code: 'CONFLICT', conflictTipo: 'id',
      error: 'Ya existe un pendiente con ese id.',
      revisionActual: revisionBitacora_(bitacora), actual: pendienteExistente };
  }
  bitacora.pendientes.push(pendiente);
  bitacora.revision = revisionBitacora_(bitacora) + 1;
  escribirJSON_(carpeta, 'bitacora.json', bitacora, false);

  agregarFila_('Pendientes', [
    pendiente.id, pendiente.sesion_id || '', slug, pendiente.texto,
    pendiente.responsable || '', pendiente.fecha_compromiso || '',
    pendiente.prioridad || '', pendiente.estado, pendiente.minuta_origen || '',
    pendiente.fecha_cierre || '', pendiente.notas || ''
  ]);
  return { ok: true, mensaje: 'Pendiente guardado.', id: pendiente.id, revision: bitacora.revision };
}

/**
 * cerrarPendiente — recibe {slug, id, estado}. Marca el pendiente con ese
 * id como "Cerrado" (o el estado que se pase: "Cerrado" / "Cancelado")
 * en bitacora.json y en la hoja Pendientes (columna estado).
 */
function cerrarPendiente_(datos) {
  var slug = datos.slug || '';
  var id = datos.id || '';
  var estado = datos.estado || 'Cerrado';
  if (!proyectoPorSlug_(slug)) {
    return { ok: false, error: 'Slug no reconocido: ' + slug };
  }
  if (!id) return { ok: false, error: 'Falta el id del pendiente.' };

  var carpeta = getOrCreateCarpetaProyecto_(slug);
  var bitacora = leerJSON_(carpeta, 'bitacora.json') || bitacoraVacia_(slug);
  var conflicto = conflictoRevisionBitacora_(bitacora, datos.revisionEsperada);
  if (conflicto) return conflicto;
  var encontrado = false;
  var fechaCierre = (estado === 'Cerrado') ? ahoraISO_().slice(0, 10) : '';
  bitacora.pendientes.forEach(function (p) {
    if (p.id === id) { p.estado = estado; p.fecha_cierre = fechaCierre; encontrado = true; }
  });
  if (!encontrado) {
    return { ok: false, code: 'CONFLICT', conflictTipo: 'registro',
      error: 'El pendiente ya no existe; recarga antes de reintentar.',
      revisionActual: revisionBitacora_(bitacora), actual: null };
  }
  bitacora.revision = revisionBitacora_(bitacora) + 1;
  escribirJSON_(carpeta, 'bitacora.json', bitacora, false);
  actualizarFilaPorId_('Pendientes', id, { 8: estado, 10: fechaCierre });
  return { ok: true, mensaje: 'Pendiente marcado como ' + estado + '.', id: id,
    revision: bitacora.revision };
}

/**
 * guardarHito — recibe {slug, hito} (titulo, fecha, descripcion, estado).
 * Estado inicial: "Pendiente". Lo agrega a bitacora.json y a la hoja Hitos.
 * Si el hito trae estado "Cerrado" y no trae fecha_cierre, se pone la
 * fecha actual como fecha_cierre.
 */
function guardarHito_(datos) {
  var slug = datos.slug || '';
  if (!proyectoPorSlug_(slug)) {
    return { ok: false, error: 'Slug no reconocido: ' + slug };
  }
  var hito = datos.hito || {};
  if (!hito.titulo) return { ok: false, error: 'El hito necesita un título.' };
  if (!hito.id) hito.id = nuevoId_(slug, ahoraISO_());
  if (!hito.estado) hito.estado = 'Pendiente';
  if (hito.estado === 'Cerrado' && !hito.fecha_cierre) {
    hito.fecha_cierre = ahoraISO_().slice(0, 10);
  }

  var carpeta = getOrCreateCarpetaProyecto_(slug);
  var bitacora = leerJSON_(carpeta, 'bitacora.json') || bitacoraVacia_(slug);
  var conflicto = conflictoRevisionBitacora_(bitacora, datos.revisionEsperada);
  if (conflicto) return conflicto;
  var hitoExistente = bitacora.hitos.find(function (h) { return h.id === hito.id; });
  if (hitoExistente) return { ok: false, code: 'CONFLICT',
    conflictTipo: 'id',
    error: 'Ya existe un hito con ese id.', revisionActual: revisionBitacora_(bitacora),
    actual: hitoExistente };
  bitacora.hitos.push(hito);
  bitacora.revision = revisionBitacora_(bitacora) + 1;
  escribirJSON_(carpeta, 'bitacora.json', bitacora, false);

  agregarFila_('Hitos', [
    hito.id, slug, hito.titulo, hito.fecha || '', hito.descripcion || '',
    hito.estado, hito.fecha_cierre || ''
  ]);
  return { ok: true, mensaje: 'Hito guardado.', id: hito.id, revision: bitacora.revision };
}

/**
 * editarHito — recibe {slug, hito:{id, titulo, fecha, descripcion, estado}}.
 * Actualiza el hito en bitacora.json y en la hoja Hitos (columnas 3-7).
 * Si se marca 'Cerrado' sin fecha_cierre, se pone la fecha actual.
 * (M6: antes un hito no se podía editar ni completar después de crearlo.)
 */
function editarHito_(datos) {
  var slug = datos.slug || '';
  if (!proyectoPorSlug_(slug)) {
    return { ok: false, error: 'Slug no reconocido: ' + slug };
  }
  var hito = datos.hito || {};
  if (!hito.id) return { ok: false, error: 'Falta el id del hito.' };
  if (!hito.titulo) return { ok: false, error: 'El hito necesita un título.' };
  if (hito.estado === 'Cerrado' && !hito.fecha_cierre) {
    hito.fecha_cierre = ahoraISO_().slice(0, 10);
  }
  if (hito.estado !== 'Cerrado') hito.fecha_cierre = hito.fecha_cierre || '';

  var carpeta = getOrCreateCarpetaProyecto_(slug);
  var bitacora = leerJSON_(carpeta, 'bitacora.json') || bitacoraVacia_(slug);
  var conflicto = conflictoRevisionBitacora_(bitacora, datos.revisionEsperada);
  if (conflicto) return conflicto;
  var encontrado = false;
  bitacora.hitos.forEach(function (h) {
    if (h.id === hito.id) {
      h.titulo = hito.titulo; h.fecha = hito.fecha || h.fecha;
      h.descripcion = hito.descripcion || ''; h.estado = hito.estado || 'Pendiente';
      h.fecha_cierre = hito.fecha_cierre || ''; encontrado = true;
    }
  });
  if (!encontrado) {
    return { ok: false, code: 'CONFLICT', conflictTipo: 'registro',
      error: 'El hito ya no existe; recarga antes de reintentar.',
      revisionActual: revisionBitacora_(bitacora), actual: null };
  }
  bitacora.revision = revisionBitacora_(bitacora) + 1;
  escribirJSON_(carpeta, 'bitacora.json', bitacora, false);
  actualizarFilaPorId_('Hitos', hito.id, { 3: hito.titulo, 4: hito.fecha || '',
    5: hito.descripcion || '', 6: hito.estado, 7: hito.fecha_cierre || '' });
  return { ok: true, mensaje: 'Hito actualizado.', id: hito.id, revision: bitacora.revision };
}

/**
 * eliminarHito — recibe {slug, id}. Borra el hito de bitacora.json y
 * su fila de la hoja Hitos. (M6.)
 */
function eliminarHito_(datos) {
  var slug = datos.slug || '';
  var id = datos.id || '';
  if (!proyectoPorSlug_(slug)) {
    return { ok: false, error: 'Slug no reconocido: ' + slug };
  }
  if (!id) return { ok: false, error: 'Falta el id del hito.' };
  var carpeta = getOrCreateCarpetaProyecto_(slug);
  var bitacora = leerJSON_(carpeta, 'bitacora.json') || bitacoraVacia_(slug);
  var conflicto = conflictoRevisionBitacora_(bitacora, datos.revisionEsperada);
  if (conflicto) return conflicto;
  var antes = bitacora.hitos.length;
  bitacora.hitos = bitacora.hitos.filter(function (h) { return h.id !== id; });
  if (bitacora.hitos.length === antes) {
    return { ok: false, code: 'CONFLICT', conflictTipo: 'registro',
      error: 'El hito ya no existe; recarga antes de reintentar.',
      revisionActual: revisionBitacora_(bitacora), actual: null };
  }
  bitacora.revision = revisionBitacora_(bitacora) + 1;
  escribirJSON_(carpeta, 'bitacora.json', bitacora, false);
  eliminarFilaPorId_('Hitos', id);
  return { ok: true, mensaje: 'Hito eliminado.', id: id, revision: bitacora.revision };
}

/**
 * editarSesion — auditoría v2, Paso 2. Actualiza UNA sesión por id en
 * bitacora.json (merge en el servidor), sin pisar el resto del proyecto
 * ni los cambios de AppSheet/Muse. Si ya no existe, devuelve un conflicto
 * para evitar resucitar un registro eliminado desde otra sesión.
 * También actualiza su fila en la hoja Sesiones.
 */
function editarSesion_(datos) {
  var slug = datos.slug || '';
  if (!proyectoPorSlug_(slug)) return { ok: false, error: 'Slug no reconocido: ' + slug };
  var s = datos.sesion || {};
  if (!s.id) return { ok: false, error: 'Falta el id de la sesión.' };
  var carpeta = getOrCreateCarpetaProyecto_(slug);
  var bit = leerJSON_(carpeta, 'bitacora.json') || bitacoraVacia_(slug);
  var conflicto = conflictoRevisionBitacora_(bit, datos.revisionEsperada);
  if (conflicto) return conflicto;
  var hallada = false;
  bit.sesiones = bit.sesiones.map(function (x) {
    if (x.id === s.id) { hallada = true; return Object.assign({}, x, s); }
    return x;
  });
  if (!hallada) return { ok: false, code: 'CONFLICT',
    conflictTipo: 'registro',
    error: 'La sesión ya no existe; recarga antes de editar.',
    revisionActual: revisionBitacora_(bit), actual: null };
  bit.revision = revisionBitacora_(bit) + 1;
  escribirJSON_(carpeta, 'bitacora.json', bit, false);
  var asist = Array.isArray(s.asistentes) ? s.asistentes.join(', ') : (s.asistentes || '');
  var fila = { 3: s.fecha || '', 4: s.titulo || '', 5: s.tipo || '', 6: s.texto || '',
    7: asist, 8: Array.isArray(s.acuerdos) ? s.acuerdos.length : 0, 9: s.plantilla_version || 1 };
  if (!actualizarFilaPorId_('Sesiones', s.id, fila)) {
    agregarFila_('Sesiones', [s.id, slug, fila[3], fila[4], fila[5], fila[6], fila[7], fila[8], fila[9]]);
  }
  return { ok: true, mensaje: 'Sesión actualizada.', id: s.id, revision: bit.revision };
}

/**
 * eliminarSesion — auditoría v2, Paso 2. Borra UNA sesión por id y sus
 * pendientes asociados, en bitacora.json y en las hojas Sesiones/Pendientes.
 */
function eliminarSesion_(datos) {
  var slug = datos.slug || '', id = datos.id || '';
  if (!proyectoPorSlug_(slug)) return { ok: false, error: 'Slug no reconocido: ' + slug };
  if (!id) return { ok: false, error: 'Falta el id de la sesión.' };
  var carpeta = getOrCreateCarpetaProyecto_(slug);
  var bit = leerJSON_(carpeta, 'bitacora.json') || bitacoraVacia_(slug);
  var conflicto = conflictoRevisionBitacora_(bit, datos.revisionEsperada);
  if (conflicto) return conflicto;
  var antes = bit.sesiones.length;
  bit.sesiones = bit.sesiones.filter(function (x) { return x.id !== id; });
  if (bit.sesiones.length === antes) return { ok: false, code: 'CONFLICT',
    conflictTipo: 'registro', error: 'La sesión ya no existe; recarga antes de reintentar.',
    revisionActual: revisionBitacora_(bit), actual: null };
  var idsPend = bit.pendientes.filter(function (p) { return p.sesion_id === id; }).map(function (p) { return p.id; });
  bit.pendientes = bit.pendientes.filter(function (p) { return p.sesion_id !== id; });
  bit.revision = revisionBitacora_(bit) + 1;
  escribirJSON_(carpeta, 'bitacora.json', bit, true);
  eliminarFilaPorId_('Sesiones', id);
  idsPend.forEach(function (pid) { eliminarFilaPorId_('Pendientes', pid); });
  return { ok: true, mensaje: 'Sesión eliminada.', id: id, revision: bit.revision };
}

/**
 * verEvidencia — devuelve el base64 de una evidencia si está dentro de
 * Bitacoras/ o de una carpeta de proyecto registrada. La URL /file/d/ID/view
 * es una página HTML y no sirve como <img src>.
 */
function dentroDeRaiz_(archivo) {
  var raiz = getRootFolder_(); if (!raiz) return false;
  var permitidas = {};
  permitidas[raiz.getId()] = true;
  proyectosRegistrados_().forEach(function (p) {
    var carpeta = getCarpetaProyecto_(p.slug);
    if (carpeta) permitidas[carpeta.getId()] = true;
  });
  var cola = [archivo], vistos = 0;
  while (cola.length && vistos < 20) {
    var x = cola.shift(); vistos++;
    var padres = x.getParents();
    while (padres.hasNext()) {
      var c = padres.next();
      if (permitidas[c.getId()]) return true;
      cola.push(c);
    }
  }
  return false;
}
function verEvidencia_(datos) {
  var id = String(datos.id || '').replace(/[^A-Za-z0-9_-]/g, '');
  if (!id) return { ok: false, error: 'Falta el id.' };
  try {
    var f = DriveApp.getFileById(id);
    if (!dentroDeRaiz_(f)) return { ok: false, error: 'Archivo fuera de una carpeta de bitácoras registrada.' };
    var blob = f.getBlob();
    return { ok: true, mime: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
  } catch (err) { return { ok: false, error: 'No se pudo leer: ' + err.message }; }
}

/**
 * subirInforme — recibe {slug, nombre, base64, mime}. Guarda el informe
 * Word (.doc) en la carpeta del proyecto/Informes/ y, si ya existe un archivo con ese
 * mismo nombre, LO SOBRESCRIBE (D7: es lo que promete el botón Word de
 * la página). Devuelve {ok, url, nombre, sobrescrito}.
 */
function subirInforme_(datos) {
  var slug = datos.slug || '';
  if (!proyectoPorSlug_(slug)) {
    return { ok: false, error: 'Slug no reconocido: ' + slug };
  }
  if (!datos.nombre) return { ok: false, error: 'Falta el nombre del informe.' };
  if (!datos.base64) return { ok: false, error: 'Falta el contenido base64 del informe.' };
  try {
    var limpio = String(datos.base64).replace(/^data:[^;]+;base64,/, '');
    var bytes = Utilities.base64Decode(limpio);
    var blob = Utilities.newBlob(bytes, datos.mime || 'application/msword', datos.nombre);
    var carpetaProyecto = getOrCreateCarpetaProyecto_(slug);
    var informes = getOrCreateSubfolder_(carpetaProyecto, 'Informes');
    var existente = buscarArchivo_(informes, datos.nombre);
    var sobrescrito = !!existente;
    if (existente) {
      existente.setContent(blob.getDataAsString());
    } else {
      informes.createFile(blob);
    }
    var archivo = buscarArchivo_(informes, datos.nombre);
    return { ok: true, id: archivo.getId(),
      url: 'https://drive.google.com/file/d/' + archivo.getId() + '/view',
      nombre: datos.nombre, sobrescrito: sobrescrito };
  } catch (err) {
    return { ok: false, error: 'No se pudo guardar el informe en Drive: ' + err.message };
  }
}

/**
 * subirEvidencia — recibe {slug, nombre, base64, mime}.
 * Sube el archivo a la carpeta del proyecto/Evidencias/ en Drive y
 * devuelve {ok, id, url, nombre}. El base64 puede venir con o sin
 * prefijo data:...;base64, (se limpia antes de decodificar).
 * Genérico: vale para imágenes y para documentos (PDF, Word, Excel);
 * el mime y el nombre se conservan tal cual, no se asume .jpg ni imagen.
 */
function subirEvidencia_(datos) {
  var slug = datos.slug || '';
  if (!proyectoPorSlug_(slug)) {
    return { ok: false, error: 'Slug no reconocido: ' + slug };
  }
  if (!datos.nombre) return { ok: false, error: 'Falta el nombre del archivo.' };
  if (!datos.base64) return { ok: false, error: 'Falta el contenido base64 del archivo.' };
  return subirArchivoADrive_(slug, 'Evidencias', datos.nombre,
    datos.base64, datos.mime || 'application/octet-stream');
}

/**
 * guardarFormato — guarda el formato de exportación de un proyecto.
 * Recibe {slug, formato} y lo escribe en <slug>/formato-exportacion.json,
 * VERSIONADO: si ya existía un formato, formato_version sube en 1 y se
 * guarda una copia del anterior como formato-exportacion-v<N>.json.
 * El formato por defecto tiene las secciones: Sesión / Detalle /
 * Acuerdos y pendientes / Hitos / Evidencias.
 */
function guardarFormato_(datos) {
  var slug = datos.slug || '';
  if (!proyectoPorSlug_(slug)) {
    return { ok: false, error: 'Slug no reconocido: ' + slug };
  }
  if (!datos.formato || typeof datos.formato !== 'object') {
    return { ok: false, error: 'Falta el objeto "formato".' };
  }
  var carpeta = getOrCreateCarpetaProyecto_(slug);
  var anterior = leerJSON_(carpeta, 'formato-exportacion.json');
  var version = 1;
  if (anterior) {
    version = (Number(anterior.formato_version) || 1) + 1;
    // Copia de seguridad del formato anterior (versionado, sin borrar).
    escribirJSON_(carpeta, 'formato-exportacion-v' + anterior.formato_version + '.json',
      anterior, false);
  }
  /* A4: normalizar al modelo único (titulo / formato_version). Se aceptan
     las variantes viejas (nombre de sección, version) pero no se guardan. */
  var formato = normalizarFormato_(datos.formato);
  formato.formato_version = version;
  formato.slug = slug;
  formato.actualizado = ahoraISO_();
  escribirJSON_(carpeta, 'formato-exportacion.json', formato, false);
  return { ok: true, mensaje: 'Formato de ' + slug + ' guardado.',
    formato_version: version };
}

/**
 * registrarPuntaje — guarda una actividad del protocolo de puntaje CCH.
 * Recibe {slug, puntaje:{rubro, actividad, nivel, puntos, alcance,
 * constancia, dictamen, periodo, categoria_objetivo, glosario_id}}.
 * Se guarda en la hoja Puntaje (el catálogo de actividades vive en el
 * protocolo-puntaje-cch-v2.json, glosario unificado 2020; aquí solo se
 * registra lo realizado; glosario_id es la clave gl-xxx del término elegido).
 * rubro, actividad y puntos son obligatorios; el resto puede quedar vacío.
 */
function registrarPuntaje_(datos) {
  var slug = datos.slug || '';
  if (!proyectoPorSlug_(slug)) {
    return { ok: false, error: 'Slug no reconocido: ' + slug };
  }
  var p = datos.puntaje || {};
  if (!p.rubro) return { ok: false, error: 'El puntaje necesita el rubro (I–VI).' };
  if (!p.actividad) return { ok: false, error: 'El puntaje necesita la actividad.' };
  if (p.puntos === undefined || p.puntos === null || p.puntos === '') {
    return { ok: false, error: 'El puntaje necesita los puntos.' };
  }
  if (!p.id) p.id = nuevoId_(slug, ahoraISO_());

  // Paso 6: el puntaje también vive en bitacora.json, para que se lea al
  // recargar / en otro navegador (antes solo iba a la hoja Puntaje).
  var carpeta = getOrCreateCarpetaProyecto_(slug);
  var bitacora = leerJSON_(carpeta, 'bitacora.json') || bitacoraVacia_(slug);
  var conflicto = conflictoRevisionBitacora_(bitacora, datos.revisionEsperada);
  if (conflicto) return conflicto;
  if (!Array.isArray(bitacora.puntaje)) bitacora.puntaje = [];
  var puntajeExistente = bitacora.puntaje.find(function (x) { return x.id === p.id; });
  if (puntajeExistente) return { ok: false, code: 'CONFLICT',
    conflictTipo: 'id',
    error: 'Ya existe un registro de puntaje con ese id.',
    revisionActual: revisionBitacora_(bitacora), actual: puntajeExistente };
  bitacora.puntaje.push(p);
  bitacora.revision = revisionBitacora_(bitacora) + 1;
  escribirJSON_(carpeta, 'bitacora.json', bitacora, false);

  agregarFila_('Puntaje', [
    p.id, slug, p.rubro, p.actividad, p.nivel || '', p.puntos,
    p.alcance || '', p.constancia || '', p.dictamen || '',
    p.periodo || '', p.categoria_objetivo || '', p.glosario_id || ''
  ]);
  return { ok: true, mensaje: 'Actividad de puntaje registrada.', id: p.id,
    revision: bitacora.revision };
}

// ---------------------------------------------------------------------------
// CREAR ESTRUCTURA DESDE CERO (idempotente: no sobrescribe sin avisar)
// ---------------------------------------------------------------------------

/**
 * crearEstructuraDesdeCero()
 * Crea, SOLO SI NO EXISTE, todo lo necesario:
 *   - Carpeta raíz Bitacoras/ en Drive.
 *   - INDICE-bitacoras.json con los proyectos iniciales y los proyectos
 *     ya agregados desde la página.
 *   - Por proyecto: carpeta <folio>/ (o carpeta existente del proyecto),
 *     bitacora.json vacío
 *     {slug, sesiones:[], pendientes:[], hitos:[]},
 *     ficha.md, plantilla-sesion.json (base + campos propios),
 *     formato-exportacion.json (formato simple por defecto),
 *     carpeta Evidencias/.
 *   - Carpeta Bitacoras/Proyectos/ para proyectos y el libro "Bitacoras".
 *   - Libro "Bitacoras" (o usa el existente por nombre) con las pestañas
 *     Bitacoras, Sesiones, Pendientes, Hitos y Puntaje, cada una
 *     con su encabezado exacto, y una fila de ejemplo en Sesiones y
 *     en Pendientes.
 * Devuelve un informe {creado:[...], existente:[...]}: lo que ya existía
 * NO se sobrescribe. Para regenerar algo existente, borrarlo primero
 * a mano en Drive y volver a ejecutar esta función.
 * Se puede ejecutar desde el editor de Apps Script o con la acción
 * POST crearEstructura (con token válido).
 */
function crearEstructuraDesdeCero() {
  var informe = { creado: [], existente: [] };
  var root = getRootFolder_();
  if (!root) {
    root = DriveApp.createFolder(CONFIG.ROOT_FOLDER);
    informe.creado.push('Carpeta raíz: ' + CONFIG.ROOT_FOLDER + '/');
  } else {
    informe.existente.push('Carpeta raíz: ' + CONFIG.ROOT_FOLDER + '/ (ya existía)');
  }

  var padreProyectos = getProyectosFolder_(false);
  if (!padreProyectos) {
    padreProyectos = getOrCreateProyectosFolder_();
    informe.creado.push('Carpeta: ' + CONFIG.ROOT_FOLDER + '/' + CONFIG.PROJECTS_FOLDER + '/');
  } else {
    informe.existente.push('Carpeta: ' + CONFIG.ROOT_FOLDER + '/' + CONFIG.PROJECTS_FOLDER + '/ (ya existía)');
  }

  // --- Índice central ---
  if (!buscarArchivo_(root, 'INDICE-bitacoras.json')) {
    escribirJSON_(root, 'INDICE-bitacoras.json', indicePorDefecto_(), false);
    informe.creado.push('INDICE-bitacoras.json');
  } else {
    informe.existente.push('INDICE-bitacoras.json (ya existía, no se sobrescribió)');
  }

  // --- Por proyecto ---
  proyectosRegistrados_().forEach(function (p) {
    var carpeta = getCarpetaProyecto_(p.slug);
    if (!carpeta) {
      var nombreCarpeta = p.folio || p.slug;
      carpeta = padreProyectos.createFolder(nombreCarpeta);
      informe.creado.push('Carpeta: ' + CONFIG.PROJECTS_FOLDER + '/' + nombreCarpeta + '/');
    } else {
      informe.existente.push('Carpeta: ' + carpeta.getName() + '/ (ya existía)');
    }
    var rutaProyecto = carpeta.getName() + '/';

    if (!buscarArchivo_(carpeta, 'bitacora.json')) {
      escribirJSON_(carpeta, 'bitacora.json', bitacoraVacia_(p.slug), false);
      informe.creado.push(rutaProyecto + 'bitacora.json');
    } else {
      informe.existente.push(rutaProyecto + 'bitacora.json (ya existía)');
    }

    if (!buscarArchivo_(carpeta, 'ficha.md')) {
      crearArchivoTexto_(carpeta, 'ficha.md', fichaPorDefecto_(p));
      informe.creado.push(rutaProyecto + 'ficha.md');
    } else {
      informe.existente.push(rutaProyecto + 'ficha.md (ya existía)');
    }

    if (!buscarArchivo_(carpeta, 'plantilla-sesion.json')) {
      escribirJSON_(carpeta, 'plantilla-sesion.json', plantillaPorDefecto_(p), false);
      informe.creado.push(rutaProyecto + 'plantilla-sesion.json');
    } else {
      informe.existente.push(rutaProyecto + 'plantilla-sesion.json (ya existía)');
    }

    if (!buscarArchivo_(carpeta, 'formato-exportacion.json')) {
      escribirJSON_(carpeta, 'formato-exportacion.json', formatoPorDefecto_(p.slug), false);
      informe.creado.push(rutaProyecto + 'formato-exportacion.json');
    } else {
      informe.existente.push(rutaProyecto + 'formato-exportacion.json (ya existía)');
    }

    // Evidencias/
    var evidencias = buscarCarpeta_(carpeta, 'Evidencias');
    if (!evidencias) {
      evidencias = carpeta.createFolder('Evidencias');
      informe.creado.push(rutaProyecto + 'Evidencias/');
    } else {
      informe.existente.push(rutaProyecto + 'Evidencias/ (ya existía)');
    }
  });

  // --- Libro de cálculo ---
  var libro = getHojaCalculo_(true);
  CONFIG.SHEET_NAMES.forEach(function (nombre) {
    var hoja = libro.getSheetByName(nombre);
    if (!hoja) {
      hoja = libro.insertSheet(nombre);
      hoja.appendRow(ENCABEZADOS[nombre]);
      informe.creado.push('Hoja: ' + nombre + ' (con encabezado)');
    } else {
      // Si la hoja existe pero está vacía, poner el encabezado.
      if (hoja.getLastRow() === 0) {
        hoja.appendRow(ENCABEZADOS[nombre]);
        informe.creado.push('Hoja: ' + nombre + ' (encabezado agregado, estaba vacía)');
      } else {
        informe.existente.push('Hoja: ' + nombre + ' (ya existía con datos)');
      }
    }
  });
  // Fila del proyecto en la hoja Bitacoras (una por proyecto).
  proyectosRegistrados_().forEach(function (p) { asegurarFilaProyecto_(p.slug); });
  // Una fila de ejemplo en Sesiones y en Pendientes (solo si están vacías
  // aparte del encabezado, para que se vea el formato esperado).
  agregarEjemploSiVacia_('Sesiones', [
    'ejemplo-sesion-001', 'estadistica-2', '2026-11-17 12:00',
    'Sesión de ejemplo — borrar al capturar la primera real',
    'Sesion', 'Texto de ejemplo de una sesión.', '', 0, 1
  ]);
  agregarEjemploSiVacia_('Pendientes', [
    'ejemplo-pendiente-001', 'ejemplo-sesion-001', 'estadistica-2',
    'Pendiente de ejemplo — borrar al capturar el primer pendiente real',
    '', '', 'Media', 'Pendiente', 'Sesión de ejemplo', '', ''
  ]);

  informe.resumen = 'Creados: ' + informe.creado.length +
    '. Ya existían (sin tocar): ' + informe.existente.length + '.';
  return informe;
}

/**
 * verificarEstructura_()
 * Revisa carpeta raíz, índice, plantillas, formatos y hojas, y devuelve
 * la lista de faltantes: {ok, faltantes:[...], revisado:...}.
 * No crea archivos de datos ni pestañas. Si encuentra el libro existente
 * fuera de Bitacoras/Proyectos/, lo mueve al contenedor estándar y reutiliza.
 */
function verificarEstructura_() {
  var faltantes = [];
  var root = getRootFolder_();
  if (!root) {
    return { ok: false, faltantes: ['Carpeta raíz: ' + CONFIG.ROOT_FOLDER + '/'],
      revisado: ahoraISO_() };
  }
  if (!buscarArchivo_(root, 'INDICE-bitacoras.json')) {
    faltantes.push('INDICE-bitacoras.json');
  }
  proyectosRegistrados_().forEach(function (p) {
    var carpeta = getCarpetaProyecto_(p.slug);
    if (!carpeta) {
      faltantes.push('Carpeta: ' + p.slug + '/ (falta todo el proyecto)');
      return;
    }
    ['bitacora.json', 'ficha.md', 'plantilla-sesion.json', 'formato-exportacion.json']
      .forEach(function (archivo) {
        if (!buscarArchivo_(carpeta, archivo)) faltantes.push(p.slug + '/' + archivo);
      });
    var evidencias = buscarCarpeta_(carpeta, 'Evidencias');
    if (!evidencias) {
      faltantes.push(p.slug + '/Evidencias/');
    }
  });
  var libro = getHojaCalculo_(false);
  if (!getProyectosFolder_(false)) {
    faltantes.push('Carpeta: ' + CONFIG.PROJECTS_FOLDER + '/');
  }
  if (!libro) {
    faltantes.push('Libro de cálculo: ' + CONFIG.SPREADSHEET_NAME);
  } else {
    CONFIG.SHEET_NAMES.forEach(function (nombre) {
      if (!libro.getSheetByName(nombre)) faltantes.push('Hoja: ' + nombre);
    });
  }
  return { ok: faltantes.length === 0, faltantes: faltantes, revisado: ahoraISO_(),
    mensaje: faltantes.length === 0
      ? 'Estructura completa.'
      : 'Faltan ' + faltantes.length + ' elemento(s). Ejecuta crearEstructuraDesdeCero().' };
}

// ---------------------------------------------------------------------------
// PLANTILLAS POR DEFECTO (índice, bitácora vacía, ficha, plantilla, formato)
// ---------------------------------------------------------------------------

/** Índice central hashtag -> slug -> carpeta (igual que INDICE-bitacoras.json). */
function rutaCarpetaProyecto_(proyecto) {
  if (proyecto && proyecto.drive_folder) return proyecto.drive_folder;
  var nombreCarpeta = proyecto && (proyecto.folio || proyecto.slug);
  return CONFIG.ROOT_FOLDER + '/' + CONFIG.PROJECTS_FOLDER + '/' +
    nombreCarpeta + '/';
}

function indicePorDefecto_() {
  return {
    version: 1,
    updated: ahoraISO_().slice(0, 10),
    root: CONFIG.ROOT_FOLDER + '/',
 
    rule: 'El primer hashtag del mensaje, en CamelCase, identifica el proyecto. ' +
      'Si falta o no está en esta tabla, preguntar; no adivinar.',
    base_fields: ['id', 'fecha', 'titulo', 'tipo', 'texto', 'asistentes',
      'acuerdos', 'pendientes', 'hitos', 'evidencias'],
    projects: PROYECTOS.map(function (p) {
      var rutaProyecto = rutaCarpetaProyecto_(p);
      return {
        slug: p.slug, hashtag: p.hashtag, nombre: p.nombre,
        folio: p.folio || '',
        color: p.color, campos_propios: p.campos_propios,
        drive_folder: rutaProyecto,
        bitacora_json: rutaProyecto + 'bitacora.json',
        ficha: rutaProyecto + 'ficha.md',
        github_repo: p.slug === 'cch-page' ? 'NequizUNAM/CCH-Page' : ''
      };
    })
  };
}

/**
 * Folio consecutivo por proyecto (v4): CICLO-NN, p. ej. 20271-01.
 * El ciclo se configura en Mantenimiento (página); al cambiarlo, el
 * contador se reinicia en 01 y los folios del ciclo anterior NO cambian.
 * El consecutivo es global por ciclo (no por proyecto) y un número ya
 * asignado nunca se reutiliza aunque se borre el proyecto (queda en
 * `usados`). Se guarda en Bitacoras/config-ciclo.json y los folios en
 * INDICE-bitacoras.json.
 */
function configCicloPorDefecto_() {
  return { ciclo: '20271', siguiente: 1, usados: [], historial: {} };
}
function validarCiclo_(c) {
  return typeof c === 'string' && /^\d{4,6}$/.test(c);
}
function numeroDeFolio_(folio, ciclo) {
  var m = /^\d{4,6}-(\d+)$/.exec(String(folio || ''));
  return (m && String(folio).indexOf(ciclo + '-') === 0) ? parseInt(m[1], 10) : 0;
}
function normalizarConfigCiclo_(cfg) {
  var c = (cfg && typeof cfg === 'object') ? cfg : {};
  var ciclo = validarCiclo_(c.ciclo) ? c.ciclo : '20271';
  var usados = [];
  proyectosRegistrados_().forEach(function (p) {
    if (numeroDeFolio_(p.folio, ciclo) > 0 && usados.indexOf(p.folio) < 0) usados.push(p.folio);
  });
  (Array.isArray(c.usados) ? c.usados : []).forEach(function (f) {
    if (numeroDeFolio_(f, ciclo) > 0 && usados.indexOf(f) < 0) usados.push(f);
  });
  /* v5: historial por ciclo — igual que en la página. */
  var hist = (c.historial && typeof c.historial === 'object') ? c.historial : {};
  (Array.isArray(hist[ciclo]) ? hist[ciclo] : []).forEach(function (f) {
    if (numeroDeFolio_(f, ciclo) > 0 && usados.indexOf(f) < 0) usados.push(f);
  });
  usados.sort();
  var max = 0;
  usados.forEach(function (f) { max = Math.max(max, numeroDeFolio_(f, ciclo)); });
  return { ciclo: ciclo, siguiente: Math.max(max + 1, 1), usados: usados, historial: hist };
}
function leerConfigCiclo_() {
  var root = getRootFolder_();
  var cfg = root ? leerJSON_(root, 'config-ciclo.json') : null;
  cfg = cfg || configCicloPorDefecto_();
  if (!Array.isArray(cfg.usados)) cfg.usados = [];
  var indice = root ? leerJSON_(root, 'INDICE-bitacoras.json') : null;
  var proyectos = indice
    ? (indice.projects || []).concat(indice.archived_projects || [])
    : [];
  proyectos.forEach(function (p) {
    if (!esProyectoInicialOculto_(p) || !p.folio) return;
    if (cfg.usados.indexOf(p.folio) < 0) cfg.usados.push(p.folio);
  });
  return normalizarConfigCiclo_(cfg);
}
/**
 * guardarConfigCiclo — recibe {config:{ciclo, siguiente, usados},
 * proyectos:[{slug, folio}]}. Valida el ciclo (solo dígitos, 4-6);
 * recalcula `siguiente` como el mayor usado + 1 (el cliente no puede
 * hacer reutilizar un número). Guarda config-ciclo.json en la raíz y
 * actualiza los folios en INDICE-bitacoras.json (con respaldo).
 */
function guardarConfigCiclo_(datos) {
  var cfg = normalizarConfigCiclo_(datos.config || {});
  if (datos.config && datos.config.ciclo && !validarCiclo_(datos.config.ciclo)) {
    return { ok: false, error: 'Ciclo no válido. Usa solo dígitos, de 4 a 6 caracteres (p. ej. 20271).' };
  }
  var root = getRootFolder_();
  if (!root) return { ok: false, error: 'No se encontró la carpeta raíz Bitacoras/.' };
  escribirJSON_(root, 'config-ciclo.json', cfg, false);
  if (Array.isArray(datos.proyectos)) {
    var indice = leerJSON_(root, 'INDICE-bitacoras.json') || indicePorDefecto_();
    datos.proyectos.forEach(function (pf) {
      if (!pf.slug || !pf.folio) return;
      (indice.projects || []).forEach(function (ip) {
        if (ip.slug === pf.slug && String(ip.estado || 'Activo').toLowerCase() !== 'cerrado') {
          ip.folio = pf.folio;
        }
      });
    });
    escribirJSON_(root, 'INDICE-bitacoras.json', indice, true);
  }
  return { ok: true, mensaje: 'Ciclo guardado: ' + cfg.ciclo + ', siguiente folio ' + cfg.ciclo + '-' + String(cfg.siguiente).padStart(2, '0') + '.', config: cfg };
}

/** Registra un proyecto nuevo en el índice y crea su estructura inicial. */
function nombreDirectorioProyecto_(folio, hashtag) {
  var nombre = String(hashtag || '').replace(/^#/, '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!nombre) nombre = 'Proyecto';
  return String(folio || '') + '-' + nombre;
}

function colorAleatorioProyecto_(indice) {
  var usados = {};
  (indice.projects || []).forEach(function (p) {
    if (p && /^#[0-9a-fA-F]{6}$/.test(String(p.color || ''))) {
      usados[String(p.color).toUpperCase()] = true;
    }
  });
  var disponibles = PALETA_PROYECTOS.filter(function (color) {
    return !usados[color.toUpperCase()];
  });
  var lista = disponibles.length ? disponibles : PALETA_PROYECTOS;
  return lista[Math.floor(Math.random() * lista.length)];
}

function reasignarColoresProyectos_() {
  var root = getOrCreateFolder_();
  var indice = leerJSON_(root, 'INDICE-bitacoras.json') || indicePorDefecto_();
  if (!Array.isArray(indice.projects)) indice.projects = [];
  var usados = {};
  var disponibles = [];
  indice.projects.forEach(function (p) {
    var color = String(p.color || '').toUpperCase();
    if (/^#[0-9A-F]{6}$/.test(color) && PALETA_PROYECTOS.map(function (x) { return x.toUpperCase(); }).indexOf(color) >= 0) {
      usados[color] = true;
    }
  });
  PALETA_PROYECTOS.forEach(function (color) {
    if (!usados[color.toUpperCase()]) disponibles.push(color);
  });
  indice.projects.forEach(function (p, i) {
    var colorAnterior = String(p.color || '').toUpperCase();
    if (colorAnterior === '#002663' || !/^#[0-9A-F]{6}$/.test(colorAnterior)) {
      var nuevo = disponibles.shift() || PALETA_PROYECTOS[i % PALETA_PROYECTOS.length];
      p.color = nuevo;
      usados[nuevo.toUpperCase()] = true;
    }
  });
  indice.updated = ahoraISO_().slice(0, 10);
  escribirJSON_(root, 'INDICE-bitacoras.json', indice, true);
  indice.projects.forEach(function (p) {
    var fila = proyectoPorSlug_(p.slug);
    if (fila) asegurarFilaProyecto_(p.slug);
  });
  return { ok: true, proyectos: indice.projects };
}

function crearProyecto_(datos) {
  var entrada = datos.proyecto || {};
  var slug = String(entrada.slug || '').trim();
  var nombre = String(entrada.nombre || '').trim();
  var hashtag = String(entrada.hashtag || '').trim();
  var color = String(entrada.color || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
    return { ok: false, error: 'El identificador del proyecto no es válido.' };
  }
  if (!nombre || nombre.length > 100) {
    return { ok: false, error: 'El nombre del proyecto es obligatorio y no debe exceder 100 caracteres.' };
  }
  if (!/^#[A-Za-z][A-Za-z0-9]*$/.test(hashtag) || hashtag.length > 50) {
    return { ok: false, error: 'El hashtag debe iniciar con # y contener letras o números.' };
  }
  var root = getOrCreateFolder_();
  var libro = getHojaCalculo_(false);
  if (!libro) return { ok: false, error: 'No se encontró la hoja de cálculo Bitacoras; crea o ubica el libro antes de agregar proyectos.' };
  var padreProyectos = carpetaPadreHojaCalculo_(libro);
  var indice = leerJSON_(root, 'INDICE-bitacoras.json') || indicePorDefecto_();
  if (!Array.isArray(indice.projects)) indice.projects = [];
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    color = colorAleatorioProyecto_(indice);
  }
  var proyectosArchivados = archivarProyectosIniciales_(indice);
  var hashtagNormalizado = hashtag.toLowerCase();
  var duplicado = indice.projects.some(function (p) {
    var cerrado = String(p.estado || 'Activo').toLowerCase() === 'cerrado';
    return !cerrado && (p.slug === slug ||
      String(p.hashtag || '').toLowerCase() === hashtagNormalizado);
  });
  if (duplicado) {
    return { ok: false, error: 'Ya existe un proyecto activo con ese nombre o hashtag.' };
  }

  var config = leerConfigCiclo_();
  proyectosArchivados.forEach(function (p) {
    if (p.folio && config.usados.indexOf(p.folio) < 0) config.usados.push(p.folio);
  });
  indice.projects.forEach(function (p) {
    if (numeroDeFolio_(p.folio, config.ciclo) > 0 && config.usados.indexOf(p.folio) < 0) {
      config.usados.push(p.folio);
    }
  });
  config = normalizarConfigCiclo_(config);
  var folio = config.ciclo + '-' + String(config.siguiente).padStart(2, '0');
  config.usados.push(folio);
  config.siguiente++;
  slug = slugUnicoProyecto_(slug, folio, indice.projects);
  var nombreDirectorio = nombreDirectorioProyecto_(folio, hashtag);
  var carpeta = buscarCarpeta_(padreProyectos, folio);
  if (!carpeta) carpeta = buscarCarpeta_(padreProyectos, nombreDirectorio);
  if (carpeta) {
    var bitacoraExistente = leerJSON_(carpeta, 'bitacora.json');
    var correspondeAlProyecto = bitacoraExistente && bitacoraExistente.slug === slug;
    if (!correspondeAlProyecto &&
        (bitacoraExistente || carpeta.getFiles().hasNext() || carpeta.getFolders().hasNext())) {
      return { ok: false, error: 'Ya existe una carpeta con el folio ' + folio + ' asignada a otro proyecto.' };
    }
  }
  var nombreRuta = carpeta ? carpeta.getName() : nombreDirectorio;
  var rutaProyecto = CONFIG.ROOT_FOLDER + '/' + CONFIG.PROJECTS_FOLDER + '/' + nombreRuta + '/';

  var proyecto = {
    slug: slug, hashtag: hashtag, nombre: nombre, color: color,
    folio: folio, estado: 'Activo', campos_propios: [],
    drive_folder: rutaProyecto,
    bitacora_json: rutaProyecto + 'bitacora.json',
    ficha: rutaProyecto + 'ficha.md',
    github_repo: ''
  };
  indice.projects.push(proyecto);
  indice.updated = ahoraISO_().slice(0, 10);
  carpeta = carpeta || padreProyectos.createFolder(nombreDirectorio);
  proyecto.drive_folder_id = carpeta.getId();
  escribirJSON_(root, 'INDICE-bitacoras.json', indice, true);
  if (!buscarArchivo_(carpeta, 'bitacora.json')) escribirJSON_(carpeta, 'bitacora.json', bitacoraVacia_(slug), false);
  if (!buscarArchivo_(carpeta, 'ficha.md')) carpeta.createFile('ficha.md', fichaPorDefecto_(proyecto), MimeType.PLAIN_TEXT);
  if (!buscarArchivo_(carpeta, 'plantilla-sesion.json')) escribirJSON_(carpeta, 'plantilla-sesion.json', plantillaPorDefecto_(proyecto), false);
  if (!buscarArchivo_(carpeta, 'formato-exportacion.json')) escribirJSON_(carpeta, 'formato-exportacion.json', formatoPorDefecto_(slug), false);
  if (!buscarCarpeta_(carpeta, 'Evidencias')) carpeta.createFolder('Evidencias');
  escribirJSON_(root, 'config-ciclo.json', config, false);
  asegurarFilaProyecto_(slug);
  return { ok: true, proyecto: proyecto, configCiclo: config };
}

function slugUnicoProyecto_(slugBase, folio, proyectos) {
  var slug = slugBase;
  var existe = function (valor) {
    return (proyectos || []).some(function (p) { return p && p.slug === valor; });
  };
  if (!existe(slug)) return slug;
  var numeroFolio = String(folio || '').split('-').pop();
  var intento = 1;
  do {
    var sufijo = '-' + numeroFolio + (intento > 1 ? '-' + intento : '');
    var base = slugBase.substring(0, 60 - sufijo.length).replace(/-+$/g, '');
    slug = base + sufijo;
    intento++;
  } while (existe(slug));
  return slug;
}

function cerrarProyecto_(datos) {
  var slug = String((datos && datos.slug) || '');
  if (!slug) return { ok: false, error: 'Falta el proyecto que se va a cerrar.' };
  if (String((datos && datos.confirmacion) || '') !== 'CERRAR') {
    return { ok: false, error: 'Escribe CERRAR para confirmar el cierre.' };
  }
  var proyectoActual = proyectoPorSlug_(slug);
  if (!proyectoActual) return { ok: false, error: 'Slug no reconocido: ' + slug };
  if (String(proyectoActual.estado || 'Activo').toLowerCase() === 'cerrado') {
    return { ok: false, error: 'El proyecto ya está cerrado.' };
  }
  var root = getOrCreateFolder_();
  var indice = leerJSON_(root, 'INDICE-bitacoras.json') || indicePorDefecto_();
  if (!Array.isArray(indice.projects)) indice.projects = [];
  var proyecto = indice.projects.find(function (p) { return p && p.slug === slug; });
  if (!proyecto) {
    proyecto = Object.assign({}, proyectoActual);
    indice.projects.push(proyecto);
  }
  proyecto.estado = 'Cerrado';
  proyecto.cerrado_en = ahoraISO_();
  indice.updated = ahoraISO_().slice(0, 10);
  escribirJSON_(root, 'INDICE-bitacoras.json', indice, true);

  var aviso = '';
  try {
    asegurarFilaProyecto_(slug);
    actualizarEstadoProyectoEnHoja_(slug, 'Cerrado');
  } catch (err) {
    aviso = 'El proyecto se cerró en el índice, pero no se pudo actualizar su estado en la hoja Bitacoras: ' + err.message;
    Logger.log(aviso);
  }
  return { ok: true, mensaje: 'Proyecto cerrado. El hashtag quedó disponible para un proyecto nuevo.',
    aviso: aviso, proyecto: proyecto };
}

function actualizarEstadoProyectoEnHoja_(slug, estado) {
  var hoja = getHoja_('Bitacoras');
  var valores = hoja.getDataRange().getValues();
  for (var i = 1; i < valores.length; i++) {
    if (valores[i][0] === slug) {
      hoja.getRange(i + 1, 5).setValue(estado);
      return;
    }
  }
  asegurarFilaProyecto_(slug);
}

/** Estructura vacía de bitacora.json para un proyecto. */
function bitacoraVacia_(slug) {
  return { slug: slug, revision: 0, sesiones: [], pendientes: [], hitos: [], puntaje: [] };
}

function revisionBitacora_(bitacora) {
  var revision = Number(bitacora && bitacora.revision);
  return Number.isInteger(revision) && revision >= 0 ? revision : 0;
}

function conflictoRevisionBitacora_(bitacora, revisionEsperada) {
  var actual = revisionBitacora_(bitacora);
  var esperada = revisionEsperada === null || revisionEsperada === undefined || revisionEsperada === ''
    ? NaN : Number(revisionEsperada);
  if (!Number.isInteger(esperada) || esperada !== actual) {
    return {
      ok: false,
      code: 'CONFLICT',
      conflictTipo: 'revision',
      error: 'La bitácora cambió en el servidor. Revisa los datos antes de reintentar.',
      revisionActual: actual,
      actual: bitacora || null
    };
  }
  return null;
}

/** Contenido inicial de ficha.md de un proyecto. */
function fichaPorDefecto_(p) {
  return '# ' + p.nombre + '\n\n' +
    '- Hashtag: ' + p.hashtag + '\n' +
    '- Slug: ' + p.slug + '\n' +
    '- Carpeta en Drive: ' + rutaCarpetaProyecto_(p) + '\n' +
    '- Campos propios: ' + p.campos_propios.join(', ') + '\n\n' +
    '## Descripción\n\n' +
    '[Completar: descripción del proyecto, objetivo y responsables.]\n\n' +
    '## Notas\n\n' +
    '[Completar: acuerdos generales, enlaces y referencias.]\n';
}

/**
 * plantilla-sesion.json por defecto: texto base para la captura y datos
 * comunes del proyecto. Los registros antiguos conservan sus campos propios.
 */
function plantillaPorDefecto_(p) {
  return {
    plantilla_version: 1,
    hashtag: p.hashtag,
    slug: p.slug,
    nombre: p.nombre,
    instrucciones: 'Usa el campo texto para capturar el contenido. Puedes ' +
      'organizarlo con encabezados como #acuerdos y #ejercicios.',
    sesion: {
      id: p.slug + '-AAAA-MM-DD-001',
      fecha: 'AAAA-MM-DD HH:MM (por defecto, la actual al capturar)',
      titulo: '',
      tipo: 'Reunion | Sesion | Online | Avance | Nota',
      texto: '',
      asistentes: [''],
      acuerdos: [''],
      pendientes: [],
      hitos: [{ titulo: '', fecha: 'AAAA-MM-DD', estado: 'Pendiente' }],
      evidencias: [{ archivo: '', descripcion: '' }],
      campos_propios: {},
      plantilla_version: 1
    }
  };
}

/** formato-exportacion.json por defecto (formato simple). */
function normalizarFormato_(f) {
  if (!f || typeof f !== 'object') return formatoPorDefecto_('');
  var secciones = Array.isArray(f.secciones) ? f.secciones : [];
  return {
    nombre: f.nombre || 'Formato simple por defecto',
    formato_version: f.formato_version != null ? f.formato_version : (f.version != null ? f.version : 1),
    instrucciones: f.instrucciones || '',
    secciones: secciones.map(function (s) {
      return { titulo: (s && (s.titulo || s.nombre)) || '',
        campos: (s && Array.isArray(s.campos)) ? s.campos : [] };
    }).filter(function (s) { return s.titulo; }),
    campos: Array.isArray(f.campos) ? f.campos : []
  };
}

function formatoPorDefecto_(slug) {
  return {
    formato_version: 1,
    slug: slug,
    nombre: 'Información',
    instrucciones: 'Formato base cuando el proyecto no tiene un formato ' +
      'cargado o cuando su JSON está vacío. No se ' +
      'inventan campos: si un campo no tiene valor, se muestra vacío o como null.',
    secciones: [
      { titulo: 'Información', campos: ['fecha', 'titulo', 'tipo'] },
      { titulo: 'Contenido de las bitácoras', campos: ['bitacoras'] },
      { titulo: 'Pendientes', campos: ['pendientes'] },
      { titulo: 'Hitos', campos: ['hitos'] }
    ],
    campos: [
      { campo: 'fecha', etiqueta: 'Fecha', obligatorio: true },
      { campo: 'titulo', etiqueta: 'Título', obligatorio: true },
      { campo: 'tipo', etiqueta: 'Tipo', obligatorio: false },
      { campo: 'texto', etiqueta: 'Texto', obligatorio: true },
      { campo: 'bitacoras', etiqueta: 'Contenido de las bitácoras', obligatorio: false },
      { campo: 'asistentes', etiqueta: 'Asistentes', obligatorio: false },
      { campo: 'acuerdos', etiqueta: 'Acuerdos', obligatorio: false },
      { campo: 'pendientes', etiqueta: 'Pendientes', obligatorio: false },
      { campo: 'hitos', etiqueta: 'Hitos', obligatorio: false },
      { campo: 'evidencias', etiqueta: 'Evidencias', obligatorio: false }
    ],
    actualizado: ahoraISO_()
  };
}

// ---------------------------------------------------------------------------
// FUNCIONES DE UTILIDAD
// ---------------------------------------------------------------------------

/**
 * responder_() — Devuelve un objeto como JSON para doGet/doPost.
 * (Ver la nota sobre CORS al inicio del archivo: Apps Script no expone
 * setHeader en TextOutput; el Web App desplegado como "Anyone" es el
 * que sirve la respuesta con Access-Control-Allow-Origin: *.)
 */
function responder_(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Hash SHA-256 en hexadecimal minúscula (Utilities.computeDigest). */
function hash_(texto) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/**
 * M2: sal aleatoria guardada en Script Properties (WEB_PASS_SALT).
 * Se genera sola la primera vez. El hash de la contraseña es
 * SHA-256(sal + ':' + contraseña); hash_() queda solo para migrar
 * hashes viejos sin sal (ver login_()).
 */
function obtenerSal_() {
  var props = PropertiesService.getScriptProperties();
  var sal = props.getProperty(CONFIG.PASS_SALT_KEY);
  if (!sal) {
    // Paso 7a: sal con Utilities.getUuid() (Math.random no es criptográfico).
    sal = Utilities.getUuid().replace(/-/g, '');
    props.setProperty(CONFIG.PASS_SALT_KEY, sal);
  }
  return sal;
}
function hashConSal_(password) {
  return hash_(obtenerSal_() + ':' + String(password || ''));
}

/**
 * nuevoId_(slug, fecha) — Id único legible: slug-AAAAMMDD-HHmmss-xxxx
 * (xxxx = 4 caracteres aleatorios). `fecha` puede ser 'AAAA-MM-DD',
 * 'AAAA-MM-DD HH:MM' o vacía (entonces se usa la fecha actual).
 */
function nuevoId_(slug, fecha) {
  var f = fecha ? String(fecha) : ahoraISO_();
  var compacta = f.replace(/[^0-9]/g, '').slice(0, 14); // AAAAMMDDHHmmss
  var azar = Math.floor(Math.random() * 1296).toString(36);
  while (azar.length < 4) azar = '0' + azar;
  return slug + '-' + compacta + '-' + azar;
}

/** Fecha/hora actual en la zona horaria configurada, formato ISO local. */
function ahoraISO_() {
  return Utilities.formatDate(new Date(), CONFIG.ZONA_HORARIA,
    'yyyy-MM-dd HH:mm:ss');
}

/** Fecha actual compacta YYYY-MM-DD-HHmm (para nombres de respaldo). */
function fechaRespaldo_() {
  return Utilities.formatDate(new Date(), CONFIG.ZONA_HORARIA,
    'yyyy-MM-dd-HHmm');
}

/** Busca primero el estado persistido del proyecto; después usa el catálogo base. */
function proyectoPorSlug_(slug) {
  var root = getRootFolder_();
  var indice = root ? leerJSON_(root, 'INDICE-bitacoras.json') : null;
  if (indice && Array.isArray(indice.projects)) {
    for (var j = 0; j < indice.projects.length; j++) {
      if (indice.projects[j].slug === slug && !esProyectoInicialOculto_(indice.projects[j])) {
        return proyectoPorSlugDesdeIndice_(indice.projects[j]);
      }
    }
  }
  for (var i = 0; i < PROYECTOS.length; i++) {
    if (PROYECTOS[i].slug === slug) return PROYECTOS[i];
  }
  return null;
}

/** Devuelve todos los proyectos registrados, incluidos los cerrados para lectura. */
function proyectosRegistrados_(indice) {
  var root = getRootFolder_();
  var catalogo = indice || (root ? leerJSON_(root, 'INDICE-bitacoras.json') : null);
  var proyectos = PROYECTOS.map(function (p) {
    return {
      slug: p.slug, folio: p.folio || '', hashtag: p.hashtag, nombre: p.nombre,
      color: p.color, estado: p.estado || 'Activo',
      campos_propios: (p.campos_propios || []).slice()
    };
  });
  if (!catalogo || !Array.isArray(catalogo.projects)) return proyectos;
  catalogo.projects.forEach(function (item) {
    if (esProyectoInicialOculto_(item)) return;
    var proyecto = proyectoPorSlugDesdeIndice_(item);
    var existente = proyectos.findIndex(function (p) { return p.slug === proyecto.slug; });
    if (existente >= 0) proyectos[existente] = Object.assign(proyectos[existente], proyecto);
    else proyectos.push(proyecto);
  });
  return proyectos;
}

function proyectoPorSlugDesdeIndice_(p) {
  return {
    slug: p.slug, folio: p.folio || '', hashtag: p.hashtag || '',
    nombre: p.nombre || p.slug, color: p.color || '#002663',
    estado: p.estado || 'Activo',
    cerrado_en: p.cerrado_en || '',
    campos_propios: Array.isArray(p.campos_propios) ? p.campos_propios : [],
    drive_folder: p.drive_folder || '',
    drive_folder_id: p.drive_folder_id || ''
  };
}

/** Carpeta raíz Bitacoras/ en Drive, o null si no existe. */
function getRootFolder_() {
  var carpetas = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER);
  return carpetas.hasNext() ? carpetas.next() : null;
}

/** Carpeta raíz Bitacoras/; la crea si no existe. */
function getOrCreateFolder_() {
  var root = getRootFolder_();
  return root || DriveApp.createFolder(CONFIG.ROOT_FOLDER);
}

function getProyectosFolder_(crear) {
  var root = crear ? getOrCreateFolder_() : getRootFolder_();
  if (!root) return null;
  var proyectos = buscarCarpeta_(root, CONFIG.PROJECTS_FOLDER);
  if (!proyectos && crear) proyectos = root.createFolder(CONFIG.PROJECTS_FOLDER);
  return proyectos;
}

function getOrCreateProyectosFolder_() {
  return getProyectosFolder_(true);
}

/**
 * getOrCreateFolder_(padre, nombre) — subcarpeta `nombre` dentro de
 * `padre`; la crea si no existe. (Sobrecarga por número de argumentos
 * de getOrCreateFolder_() sin argumentos, que devuelve la raíz.)
 * Nota: Apps Script no admite dos funciones con el mismo nombre, así
 * que esta variante se llama getOrCreateSubfolder_().
 */
function getOrCreateSubfolder_(padre, nombre) {
  var carpeta = buscarCarpeta_(padre, nombre);
  return carpeta || padre.createFolder(nombre);
}

/** Carpeta registrada del proyecto, o la carpeta heredada bajo la raíz. */
function getCarpetaProyecto_(slug) {
  var proyecto = proyectoPorSlug_(slug);
  var root = getRootFolder_();
  var carpetaProyectos = root
    ? buscarCarpeta_(root, CONFIG.PROJECTS_FOLDER) : null;
  if (proyecto && proyecto.drive_folder_id) {
    try { return DriveApp.getFolderById(proyecto.drive_folder_id); }
    catch (err) {
      var carpetaAnterior = proyecto.folio && carpetaProyectos
        ? buscarCarpeta_(carpetaProyectos, proyecto.folio) : null;
      if (carpetaAnterior) return carpetaAnterior;
      carpetaAnterior = root ? buscarCarpeta_(root, slug) : null;
      if (carpetaAnterior) return carpetaAnterior;
      throw new Error('No se pudo acceder a la carpeta de ' + slug + ': ' + err.message);
    }
  }
  var carpetaPorFolio = proyecto && proyecto.folio && carpetaProyectos
    ? buscarCarpeta_(carpetaProyectos, proyecto.folio) : null;
  if (carpetaPorFolio) return carpetaPorFolio;
  return root ? buscarCarpeta_(root, slug) : null;
}

/** Carpeta registrada del proyecto; si falta, la crea en Bitacoras/Proyectos/. */
function getOrCreateCarpetaProyecto_(slug) {
  var carpeta = getCarpetaProyecto_(slug);
  if (carpeta) return carpeta;
  var proyecto = proyectoPorSlug_(slug);
  var padreProyectos = getOrCreateProyectosFolder_();
  return getOrCreateSubfolder_(padreProyectos,
    proyecto && proyecto.folio ? proyecto.folio : slug);
}

/** Primera carpeta con ese nombre dentro de `padre`, o null. */
function buscarCarpeta_(padre, nombre) {
  var carpetas = padre.getFoldersByName(nombre);
  return carpetas.hasNext() ? carpetas.next() : null;
}

/** Primer archivo con ese nombre dentro de `carpeta`, o null. */
function buscarArchivo_(carpeta, nombre) {
  var archivos = carpeta.getFilesByName(nombre);
  return archivos.hasNext() ? archivos.next() : null;
}

/** Lee un JSON de `carpeta`; null si no existe o no es JSON válido. */
function leerJSON_(carpeta, nombre) {
  var archivo = buscarArchivo_(carpeta, nombre);
  if (!archivo) return null;
  try {
    return JSON.parse(archivo.getBlob().getDataAsString());
  } catch (err) {
    return null;
  }
}

/**
 * escribirJSON_() — Escribe (o actualiza) `nombre` con el objeto dado
 * en `carpeta`, en JSON con sangría de 2 espacios.
 * Con respaldo=true: si ya existía el archivo, antes de sobrescribirlo
 * guarda una copia con el nombre base + '-YYYY-MM-DD-HHmm.json'
 * (ej.: bitacora-2026-11-18-1230.json) en la misma carpeta.
 * Devuelve el nombre del respaldo creado, o null si no hubo respaldo.
 */
function escribirJSON_(carpeta, nombre, objeto, conRespaldo) {
  var respaldo = null;
  var existente = buscarArchivo_(carpeta, nombre);
  if (existente && conRespaldo) {
    var base = nombre.replace(/\.json$/i, '');
    respaldo = base + '-' + fechaRespaldo_() + '.json';
    // Copia tal cual del contenido anterior (sin re-interpretarlo,
    // para que el respaldo no falle si el JSON anterior está dañado).
    carpeta.createFile(respaldo, existente.getBlob().getDataAsString(),
      MimeType.PLAIN_TEXT);
  }
  /* Auditoría v4 (M2): si el archivo existe pero su JSON está corrupto,
     guardar una copia '-corrupto-fecha' ANTES de sobrescribirlo, aunque
     no se haya pedido respaldo. Sin esto, leerJSON_ devuelve null, el
     código cree que la bitácora está vacía y el guardado borraría datos
     que ya no se pueden leer. La copia conserva el contenido tal cual. */
  if (existente && !respaldo) {
    try { JSON.parse(existente.getBlob().getDataAsString()); }
    catch (e) {
      var base2 = nombre.replace(/\.json$/i, '');
      respaldo = base2 + '-corrupto-' + fechaRespaldo_() + '.json';
      carpeta.createFile(respaldo, existente.getBlob().getDataAsString(),
        MimeType.PLAIN_TEXT);
    }
  }
  var contenido = JSON.stringify(objeto, null, 2);
  if (existente) {
    existente.setContent(contenido);
  } else {
    carpeta.createFile(nombre, contenido, MimeType.PLAIN_TEXT);
  }
  return respaldo;
}

/** Crea un archivo de texto plano (p. ej. ficha.md) en `carpeta`. */
function crearArchivoTexto_(carpeta, nombre, contenido) {
  return carpeta.createFile(nombre, contenido, MimeType.PLAIN_TEXT);
}

/**
 * Sube un archivo en base64 a la carpeta Evidencias del proyecto.
 * Devuelve {ok, id, url, nombre}.
 */
function subirArchivoADrive_(slug, carpeta, nombre, base64, mime) {
  try {
    var limpio = String(base64).replace(/^data:[^;]+;base64,/, '');
    var bytes = Utilities.base64Decode(limpio);
    var blob = Utilities.newBlob(bytes, mime || 'application/octet-stream', nombre);
    var carpetaProyecto = getOrCreateCarpetaProyecto_(slug);
    var evidencias = getOrCreateSubfolder_(carpetaProyecto, 'Evidencias');
    var existente = evidencias.getFilesByName(nombre);
    if (existente.hasNext()) {
      var archivoExistente = existente.next();
      return { ok: true, id: archivoExistente.getId(),
        url: 'https://drive.google.com/file/d/' + archivoExistente.getId() + '/view',
        nombre: archivoExistente.getName(), duplicado: true };
    }
    var archivo = evidencias.createFile(blob);
    return { ok: true, id: archivo.getId(),
      url: 'https://drive.google.com/file/d/' + archivo.getId() + '/view',
      nombre: archivo.getName() };
  } catch (err) {
    return { ok: false, error: 'No se pudo subir el archivo: ' + err.message };
  }
}

// ---------------------------------------------------------------------------
// HOJAS DE CÁLCULO (libro "Bitacoras")
// ---------------------------------------------------------------------------

/**
 * Devuelve el libro "Bitacoras" dentro de Bitacoras/Proyectos/.
 * Busca primero en esa carpeta; si encuentra el libro fuera, lo mueve ahí
 * y lo reutiliza. Solo lo crea si no existe y `crear` es true.
 */
function getHojaCalculo_(crear) {
  var props = PropertiesService.getScriptProperties();
  var idLibro = props.getProperty('SHEET_ID');
  var libro = null;
  if (idLibro) {
    try {
      var libroCacheado = SpreadsheetApp.openById(idLibro);
      if (libroCacheado.getName() === CONFIG.SPREADSHEET_NAME) libro = libroCacheado;
      else props.deleteProperty('SHEET_ID');
    } catch (e) { /* seguir buscando */ }
  }
  if (!libro) {
    var carpetaProyectos = getProyectosFolder_(false);
    var archivo = carpetaProyectos
      ? buscarHojaCalculoEnCarpeta_(carpetaProyectos) : null;
    if (!archivo) {
      var archivos = DriveApp.getFilesByName(CONFIG.SPREADSHEET_NAME);
      while (archivos.hasNext()) {
        var candidato = archivos.next();
        if (candidato.getMimeType() === MimeType.GOOGLE_SHEETS) {
          archivo = candidato;
          break;
        }
      }
    }
    if (archivo) libro = SpreadsheetApp.openById(archivo.getId());
  }
  if (libro) {
    moverLibroAProyectos_(libro, getOrCreateProyectosFolder_());
    props.setProperty('SHEET_ID', libro.getId());
    return libro;
  }
  if (!crear) return null;
  var proyectos = getOrCreateProyectosFolder_();
  libro = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
  moverLibroAProyectos_(libro, proyectos);
  props.setProperty('SHEET_ID', libro.getId());
  return libro;
}

function buscarHojaCalculoEnCarpeta_(carpeta) {
  var archivos = carpeta.getFilesByName(CONFIG.SPREADSHEET_NAME);
  while (archivos.hasNext()) {
    var archivo = archivos.next();
    if (archivo.getMimeType() === MimeType.GOOGLE_SHEETS) return archivo;
  }
  return null;
}

function moverLibroAProyectos_(libro, carpetaProyectos) {
  var archivo = DriveApp.getFileById(libro.getId());
  var padres = archivo.getParents();
  while (padres.hasNext()) {
    if (padres.next().getId() === carpetaProyectos.getId()) return;
  }
  archivo.moveTo(carpetaProyectos);
}

/** Devuelve el contenedor estándar del libro y las carpetas nuevas. */
function carpetaPadreHojaCalculo_(libro) {
  if (!libro) throw new Error('No se encontró la hoja de cálculo Bitacoras.');
  var proyectos = getOrCreateProyectosFolder_();
  moverLibroAProyectos_(libro, proyectos);
  return proyectos;
}

/** Devuelve la pestaña `nombre` (creándola con su encabezado si falta). */
function getHoja_(nombre) {
  var libro = getHojaCalculo_(true);
  var hoja = libro.getSheetByName(nombre);
  if (!hoja) {
    hoja = libro.insertSheet(nombre);
    hoja.appendRow(ENCABEZADOS[nombre]);
  } else if (hoja.getLastRow() === 0) {
    hoja.appendRow(ENCABEZADOS[nombre]);
  }
  return hoja;
}

/** Agrega una fila al final de la pestaña `nombre`. */
function agregarFila_(nombre, fila) {
  getHoja_(nombre).appendRow(fila);
}

/**
 * Agrega la fila de ejemplo solo si la pestaña tiene únicamente el
 * encabezado (1 fila). Si ya hay datos, no hace nada.
 */
function agregarEjemploSiVacia_(nombre, filaEjemplo) {
  var hoja = getHoja_(nombre);
  if (hoja.getLastRow() <= 1) hoja.appendRow(filaEjemplo);
}

/**
 * Asegura que el proyecto tenga su fila en la hoja Bitacoras
 * (slug, hashtag, nombre, color, estado, drive_folder, bitacora_json).
 * Si ya existe una fila con ese slug, no duplica.
 */
function asegurarFilaProyecto_(slug) {
  var p = proyectoPorSlug_(slug);
  if (!p) return;
  var hoja = getHoja_('Bitacoras');
  var valores = hoja.getDataRange().getValues();
  for (var i = 1; i < valores.length; i++) {
    if (valores[i][0] === slug) return; // ya tiene fila
  }
  var rutaProyecto = rutaCarpetaProyecto_(p);
  hoja.appendRow([
    p.slug, p.hashtag, p.nombre, p.color, p.estado,
    rutaProyecto, rutaProyecto + 'bitacora.json'
  ]);
}

/**
 * Actualiza una celda por id: busca en la pestaña `nombre` la fila cuya
 * primera columna sea `id` y escribe `valor` en la columna `columna`
 * (1 = primera columna). Se usa para cambiar el estado de un pendiente.
 */
function actualizarCeldaPorId_(nombre, id, columna, valor) {
  var hoja = getHoja_(nombre);
  var valores = hoja.getDataRange().getValues();
  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === String(id)) {
      hoja.getRange(i + 1, columna).setValue(valor);
      return true;
    }
  }
  return false;
}

/**
 * Actualiza varias celdas de una fila por id: valoresPorColumna es un
 * objeto {columna: valor} con columnas 1-based. (M6, editar hito.)
 */
function actualizarFilaPorId_(nombre, id, valoresPorColumna) {
  var hoja = getHoja_(nombre);
  var valores = hoja.getDataRange().getValues();
  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === String(id)) {
      Object.keys(valoresPorColumna).forEach(function (col) {
        hoja.getRange(i + 1, Number(col)).setValue(valoresPorColumna[col]);
      });
      return true;
    }
  }
  return false;
}

/** Borra la fila cuya primera columna sea `id` en la pestaña `nombre`. (M6.) */
function eliminarFilaPorId_(nombre, id) {
  var hoja = getHoja_(nombre);
  var valores = hoja.getDataRange().getValues();
  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === String(id)) {
      hoja.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

/*
 * ============================================================================
 * PASOS DE DESPLIEGUE
 * ============================================================================
 * 1. Crear el proyecto en script.google.com:
 *    - Ir a script.google.com > New project (Nuevo proyecto).
 *    - Borrar el contenido de Code.gs y pegar este archivo completo.
 *    - Guardar (el nombre del proyecto puede ser "Bitacoras CCH").
 *
 * 2. Fijar la contraseña web:
 *    - En Project Settings → Script Properties, añade WEB_PASS_SETUP con
 *      una contraseña de al menos 12 caracteres.
 *    - Ejecuta fijarPasswordWebDesdePropiedad() desde el editor. La función
 *      elimina WEB_PASS_SETUP y conserva solo WEB_PASS_HASH y WEB_PASS_SALT.
 *    - Para cambiarla después, usa Mantenimiento → Cambiar contraseña,
 *      estando autenticado.
 *
 * 3. Crear la estructura en Drive (opcional, también se puede hacer
 *    desde la página con la acción crearEstructura, con token válido):
 *    - Ejecutar crearEstructuraDesdeCero() una vez desde el editor.
 *    - Crea Bitacoras/, el índice y las carpetas de todos los proyectos
 *      registrados,
 *      sus bitacora.json, ficha.md, plantilla-sesion.json,
 *      formato-exportacion.json y Evidencias/,
 *      y el libro "Bitacoras" con sus 5 pestañas y encabezados.
 *    - Es idempotente: lo que ya existe no se sobrescribe; el informe
 *      dice qué se creó y qué ya existía.
 *
 * 4. Desplegar como Web App:
 *    - Deploy > New deployment > tipo: Web app.
 *    - Execute as: Me (ejecutar como el propietario).
 *    - Who has access: Anyone (cualquier persona con el enlace)
 *      o "Anyone with Google account" (cualquier cuenta de Google),
 *      según se prefiera. Con "Anyone" la página de GitHub Pages
 *      puede llamar sin que el visitante inicie sesión en Google;
 *      la protección es la contraseña web + el token de sesión.
 *    - Deploy y copiar la URL que termina en /exec.
 *
 * 5. Conectar la página (GitHub Pages):
 *    - Pegar la URL /exec copiada en index.html, en
 *      CONFIG.appsScriptUrl.
 *    - Probar primero: abrir la URL /exec en el navegador (debe verse
 *      el HTML mínimo de estado) y luego ?accion=ping (debe devolver
 *      JSON con ok:true).
 *
 * 6. Poner los correos autorizados para AppSheet:
 *    - Editar CUENTAS_AUTORIZADAS_APPSHEET al inicio de este archivo
 *      con los correos autorizados y volver a desplegar (Deploy >
 *      Manage deployments > editar el despliegue existente y elegir
 *      "New version" — D6: NO crear un despliegue nuevo, porque cambiaría
 *      la URL /exec; editar el existente conserva la misma URL).
 *    - Mientras la lista esté vacía, nadie está autorizado por esa vía.
 *
 * 7. Verificar la estructura cuando algo falle:
 *    - POST verificarEstructura (con token) devuelve la lista de faltantes.
 *    - Si falta algo, ejecutar crearEstructuraDesdeCero() de nuevo.
 * ============================================================================
 */