/**
 * ============================================================
 * SISTEMA CCH — Backend de Google Apps Script (v5 · Web)
 * ============================================================
 *
 * ARCHIVOS DEL PROYECTO (todos comparten el mismo ámbito global)
 *   00_Config.gs     Constantes y ajustes (este archivo)
 *   01_Api.gs        doGet / doPost y tabla de rutas
 *   02_Auth.gs       Sesiones de administrador y de alumno (tokens)
 *   03_Db.gs         Lectura/escritura de las hojas W_* como tablas
 *   10_Asistencia.gs Sincronización de asistencias (sin cambios de lógica v4)
 *   20_Evaluacion.gs Componentes, ponderaciones, captura y cálculo
 *   21_Proyectos.gs  Proyectos, equipos y evaluación con estrellas
 *   22_Evidencias.gs Evidencias de alumnos y puntos adicionales
 *   11_PaseLista.gs  Pase de lista desde la web
 *   23_Alumnos.gs    Vista del alumno, ficha y comentarios
 *   24_Mantenimiento.gs  Hojas/carpetas base, ciclos, respaldo ZIP, limpieza
 *   90_Utils.gs      Fechas, horas, texto y utilidades de hojas
 *
 * HOJAS QUE NO SE TOCAN (las sigue usando AppSheet)
 *   Students, Course, Attendance Log, Roles, Calificaciones, Reporte_*
 *
 * HOJAS NUEVAS (las crea "🌐 Preparar hojas de la web")
 *   W_Grupos, W_Componentes, W_Calificaciones, W_Proyectos,
 *   W_Equipos, W_EvalEquipos, W_Evidencias, W_Comentarios, W_Historial
 *   (y las hojas base de AppSheet si la hoja está en blanco)
 *
 * PROPIEDADES DE SCRIPT
 *   CCH_ADMIN_PASSWORD        (obligatoria) contraseña del panel admin
 *   CCH_EVIDENCE_FOLDER_ID    (opcional) carpeta de Drive para evidencias;
 *                             si no existe se crea "Evidencias_Alumnos"
 *                             junto a la hoja de cálculo
 *   CCH_CICLO_ACTUAL          (se edita desde la web) ej. 2027-1
 * ============================================================
 */

const API_VERSION = "5.1.0";
const REPORT_PREFIX = "Reporte_";

const SHEETS = {
  ATTENDANCE: "Attendance Log",
  STUDENTS: "Students",
  COURSE: "Course",
  LEGACY_GRADES: "Calificaciones"
};

/** Hojas nuevas de la web: nombre + encabezados (fila 1). */
const WEB = {
  GROUPS:      { name: "W_Grupos",         headers: ["ID_Curso", "Etiqueta", "Hoja_Reporte", "Ciclo", "Activo"] },
  COMPONENTS:  { name: "W_Componentes",    headers: ["ID", "ID_Curso", "Nombre", "Tipo", "Ponderacion", "Maximo", "Orden"] },
  GRADES:      { name: "W_Calificaciones", headers: ["ID_Curso", "Cuenta", "ID_Componente", "Valor", "Actualizado"] },
  PROJECTS:    { name: "W_Proyectos",      headers: ["ID", "ID_Curso", "Nombre", "Rubros", "ID_Componente", "Registro_Abierto", "Creado"] },
  TEAMS:       { name: "W_Equipos",        headers: ["ID_Equipo", "ID_Proyecto", "ID_Curso", "Nombre_Equipo", "Cuenta", "Registrado", "Registrado_Por"] },
  TEAM_EVALS:  { name: "W_EvalEquipos",    headers: ["ID_Equipo", "ID_Proyecto", "Estrellas", "Calificacion", "Observaciones", "Actualizado"] },
  EVIDENCE:    { name: "W_Evidencias",     headers: ["ID", "Cuenta", "ID_Curso", "Tipo", "Titulo", "Descripcion", "Archivo_URL", "Archivo_Nombre", "Enviado", "Estado", "Puntos", "ID_Componente", "Aplicado", "Nota"] },
  COMMENTS:    { name: "W_Comentarios",    headers: ["ID", "Cuenta", "ID_Curso", "Texto", "Fecha"] },
  // Resumen de cada alumno de los ciclos que se respaldaron y borraron
  HISTORY:     { name: "W_Historial",      headers: ["Cuenta", "Nombre", "ID_Curso", "Curso", "Grupo", "Ciclo", "Asistencias", "Faltas", "Final", "Comentarios", "Respaldo", "Fecha"] }
};

/**
 * Hojas base de la plantilla "Attendance Log" de AppSheet.
 * Si alguna NO existe (hoja nueva en blanco) se crea con estos encabezados.
 * Si ya existe, NO se modifica (AppSheet depende de su estructura);
 * solo se avisa si le falta alguna columna.
 * cycleKey: columna con el ID_Curso, para respaldar/borrar por ciclo.
 */
const BASE_SHEETS = [
  { name: "Course",         cycleKey: "ID_Curso", headers: ["ID_Curso", "Nombre Curso", "Grupo", "Horario", "Ciclo_Escolar", "Description", "PDF Programas Estudio", "Dalmata", "Image"] },
  { name: "Students",       cycleKey: "Course",   headers: ["ID", "Cuenta", "First Name", "Last Name", "Email", "Course", "Headshot", "Status", "Materias Cursadas"] },
  { name: "Attendance Log", cycleKey: "Course",   headers: ["id", "fk_id_student", "Cuenta", "Course", "Date", "Time"] },
  { name: "Calificaciones", cycleKey: "ID_Curso", headers: ["ID_Calificacion", "ID_Curso", "Student_Ref", "Cuenta", "Parcial_1", "Parcial_2", "Parcial_3", "Sellos", "Proyecto_Final", "Puntos Adicionales", "Calificacion", "Comentarios"] },
  { name: "Roles",          cycleKey: "ID_Curso", headers: ["ID", "ID_Curso", "Nombre", "Correo", "Rol", "Date"] }
];

/** Carpetas de la plantilla (junto a la hoja de cálculo). Se crean si faltan. */
const DRIVE_FOLDERS = [
  "Course_Files_", "Course_Images", "eventos_CCH", "Eventos_Images", "Horarios Profesor",
  "Logos", "Material_Archivos", "Material_Images", "notas_alumnos", "programas_estudio", "Students_Images"
];

/**
 * Tipos de componente de evaluación
 *   manual      lo capturas tú (parciales, sellos, Teams, tareas…)
 *   asistencia  se calcula: (Asistencias + Retardos) / días con lista × 10
 *   proyectos   se calcula: promedio de los proyectos ligados a este componente
 */
const COMPONENT_TYPES = ["manual", "asistencia", "proyectos"];

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

/** Columnas de la hoja Calificaciones (AppSheet) → nombre de componente al importar. */
const LEGACY_GRADE_COLUMNS = {
  "Parcial_1": "Parcial 1",
  "Parcial_2": "Parcial 2",
  "Parcial_3": "Parcial 3",
  "Sellos": "Sellos",
  "Proyecto_Final": "Proyecto Final"
};

const SETTINGS = {
  ADMIN_PASSWORD_KEY: "CCH_ADMIN_PASSWORD",
  EVIDENCE_FOLDER_KEY: "CCH_EVIDENCE_FOLDER_ID",
  EVIDENCE_FOLDER_NAME: "Evidencias_Alumnos",   // dentro de la carpeta de la hoja

  // ---- Ciclos y respaldos ----
  CURRENT_CYCLE_KEY: "CCH_CICLO_ACTUAL",        // ej. "2027-1" (2 ciclos por año)
  BACKUP_PREFIX: "Respaldo_CCH_",
  CLEAN_PREFIX: "Limpieza_CCH_",
  PURGE_CONFIRM_WORD: "BORRAR",
  CLEAR_ALL_WORD: "BORRAR TODO",

  // ---- Sesiones ----
  ADMIN_TOKEN_TTL_S: 6 * 60 * 60,    // 6 h (máximo de CacheService)
  STUDENT_TOKEN_TTL_S: 2 * 60 * 60,  // 2 h
  LOGIN_MAX_ATTEMPTS: 5,             // intentos fallidos antes de bloquear
  LOGIN_LOCK_S: 10 * 60,             // bloqueo de 10 min
  // Si el alumno no tiene correo registrado en Students, ¿puede entrar solo con su cuenta?
  ALLOW_LOGIN_WITHOUT_EMAIL: true,

  // ---- Equipos y evidencias ----
  MAX_TEAM_SIZE: 8,
  MAX_FILE_MB: 8,
  ALLOWED_MIME: /^(image\/(png|jpe?g|webp|heic|heif)|application\/pdf)$/i,
  EVIDENCE_TYPES: ["Evento", "Proyecto", "Actividad", "Otro"],

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

const STATUS = {
  ASISTENCIA: "Asistencia",
  RETARDO: "Retardo",
  FALTA: "Falta",
  ND: "N/D"
};

const STATUS_FILL = {
  [STATUS.ASISTENCIA]: "#D1E7DD",
  [STATUS.RETARDO]: "#FBE4E4",
  [STATUS.FALTA]: "#F8D7DA",
  [STATUS.ND]: "#E5E7EB"
};

const OVERWRITABLE_STATUS = new Set(["", "falta", "n/d"]);
const DELETABLE_STATUS = new Set(["falta", "n/d"]);
const VISIBLE_SYNONYMS = new Set(["visible", "show", "mostrar", "si", "true", "1"]);

const VISIBILITY_FILL_COLORS = {
  Visible: "#DBEAFE",
  Oculto: "#E5E7EB"
};

const DUPLICATES = {
  STATUS_COLUMN: 8,  // H
  COURSES_COLUMN: 9  // I
};

const NO_DATE_COLUMNS_MESSAGE =
  "La hoja no tiene ninguna columna con fecha en la fila 2.\n\n" +
  "Agrega al menos una columna con una fecha (por ejemplo 14/10/2026) " +
  "y vuelve a sincronizar. A partir de esa columna se agregarán " +
  "automáticamente las fechas hasta el día de hoy.";
