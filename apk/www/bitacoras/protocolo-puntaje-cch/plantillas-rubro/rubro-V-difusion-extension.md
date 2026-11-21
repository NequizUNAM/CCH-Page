# Plantilla — Rubro V: Trabajos de Difusión y Extensión Cultural

**Fuente:** Protocolo de Equivalencias para el Ingreso y la Promoción de los Profesores Ordinarios de Carrera del CCH (2020), Cuadro de Rubros, Niveles y Actividades, pp. 53-57 del PDF subido por Nequiz el 2026-11-18. Lista **corregida contra el Cuadro**; el JSON guardado (`protocolo-puntaje-cch.json`, 158 actividades) trae errores en este rubro, detallados abajo. No se modificó el JSON original.
**Fecha de la plantilla:** 2026-11-18
**Actualización v2:** 2026-11-18 — glosario unificado (107 términos); ver sección «Actualización v2» en esta plantilla.
**Actualización v2:** 2026-11-18 — glosario unificado (107 términos); ver sección «Actualización v2» en esta plantilla.
**Total de actividades en este rubro (Cuadro):** 28

## Descripción

Divulgación de la cultura, ciencia, humanidades y artes.

## Mínimos por categoría en este rubro

El Rubro V no tiene mínimo propio en ninguna categoría: suma al resto libre. Ojo en Medio Tiempo, Asociado C: el resto libre debe incluir **no más de un trabajo de los rubros V y VI** (Adenda, Asociado C).

| Categoría | Papel del Rubro V |
|---|---|
| Asociado A/B/C | Resto libre (después del mínimo del Rubro I) |
| Titular A/B/C | Resto libre (después de los mínimos) |
| Medio Tiempo Asociado C | Resto libre, con tope de 1 trabajo entre V y VI |

## A quién va dirigido

### Presencial (entrega en físico)
- **Secretaría Académica del plantel de adscripción** (en el caso de Nequiz, Plantel Oriente): ahí se presenta el expediente y se reciben las indicaciones del trámite. Lleva original y copia de cada constancia; la constancia oficial o documento probatorio es obligatorio para cada actividad (Protocolo, Criterio de aplicación 10).
- **Comisión Dictaminadora respectiva** (por área de conocimiento): es la instancia que evalúa el expediente con el Protocolo y decide si procede el ingreso o la promoción. No se le entrega el expediente directamente por ventanilla: se llega a ella a través de la convocatoria y de la Secretaría Académica / Dirección General.
- **H. Consejo Técnico del CCH** (Dirección General): instancia que aprueba el Protocolo y resuelve en última instancia los concursos. No es ventanilla de recepción de expedientes.

### Por correo / en línea
- **Concurso de Oposición Abierto (COA): NO se envía por correo.** El registro y la carga de las pruebas se hacen en la **plataforma COA disponible en la página oficial de la ENCCH: https://www.cch.unam.mx** (convocatorias COA 2025: registro dentro de los 15 días hábiles contados a partir de la publicación; las pruebas escritas se cargan en la plataforma y se obtiene el acuse de entrega; plazo de 15 a 30 días hábiles para presentarlas). Las notificaciones de la Comisión Dictaminadora llegan **al correo electrónico personal que el concursante proporcionó en la plataforma COA**. No hay un correo genérico publicado en la convocatoria para enviar el expediente: no se inventa ninguno aquí.
- **Concurso cerrado (promoción):** se rige por la convocatoria de cada concurso cerrado; el canal es la Secretaría Académica del plantel y la Dirección General. Tampoco hay un correo único publicado: se usa el que indique la convocatoria de ese concurso.
- **Lista jerarquizada (horarios):** documentos en PDF en **http://trayectoria.cch.unam.mx**; se emite un comprobante digital. Las aclaraciones a la lista preliminar se piden a la Secretaría Académica del plantel (ver plantilla de lista jerarquizada para los correos por plantel publicados en los calendarios de Secretarías Académicas).

> **Si te piden un correo:** el correo que vale es el que publique la convocatoria de tu concurso o el calendario de tu plantel. No uses un correo que no esté publicado oficialmente.


## Campos a llenar por cada actividad registrada

| Campo | Qué poner | Obligatorio |
|---|---|---|
| `actividad_id` | Clave del catálogo, p. ej. `I-B-paquete-didactico` (rubro-nivel-nombre) | Sí |
| `actividad` | Nombre tal cual está en el Cuadro del Protocolo (sin inventar variantes) | Sí |
| `rubro` | I, II, III, IV, V o VI | Sí |
| `nivel` | A (25 pts), B (50 pts) o C (150 pts) | Sí |
| `puntos` | Se calculan solos: A 25, B 50, C 150. No se escriben a mano | Calculado |
| `titulo` | Título del trabajo / producto / curso, tal como aparece en la constancia | Sí |
| `fecha` | Fecha de realización o de la constancia (AAAA-MM-DD) | Sí |
| `periodo` | Año lectivo, p. ej. 2026-2027 | Sí |
| `alcance` | local / general en el Colegio / nacional o internacional — solo si el nivel depende del alcance (ver notas de la tabla) | Cuando aplique |
| `constancia` | Sí / No + archivo (PDF o foto). Sin documento probatorio no se dictamina | Sí |
| `dictamen` | pendiente / favorable / no favorable (lo pone la dictaminadora, no el profesor) | Al evaluar |
| `evidencia` | Enlace al archivo en `Bitacoras/Evidencias/` o en Drive | Sí |
| `categoria_objetivo` | Asociado A/B/C o Titular A/B/C (o Medio Tiempo) a la que se aspira | Sí |
| `notas` | Topes y condiciones del Glosario que apliquen (horas mínimas, núm. de participantes, Comité de Pares) | Cuando aplique |

**Reglas de registro (Protocolo, Criterios de aplicación, e Instructivo Art. 29, nota 2):** una misma constancia se ubica en **un solo rubro**; no se cuenta el mismo trabajo en dos rubros ni dos veces. Las partes de un trabajo integral no se valoran por separado. La Comisión Dictaminadora puede subir o bajar el nivel de un trabajo, argumentando por escrito.


## Actividades de este rubro (Cuadro, pp. 53-57)

| # | Actividad | Nivel | Puntos | Nota / condición del Glosario |
|---|---|---|---|---|
| 1 | Cursos especiales o extracurriculares para alumnos | A | 25 | Glosario: RUBRO I y V-A o B; nivel B si es de 40 horas o más. |
| 2 | Charlas de divulgación | A | 25 |  |
| 3 | Jurado en actividades académicas | A | 25 |  |
| 4 | Lectura con fines didácticos | A | 25 |  |
| 5 | Organización de actividades académicas | A | 25 | Nivel por alcance: A local, B general, C nacional/internacional; hasta 4 organizadores. |
| 6 | Presentación de un libro o revista | A | 25 |  |
| 7 | Relator | A | 25 |  |
| 8 | Reseña bibliográfica o videográfica | A | 25 |  |
| 9 | Sinodal de examen de grado | A | 25 |  |
| 10 | Artículo de divulgación | B | 50 |  |
| 11 | Asesorías a los alumnos para la presentación de trabajos en actividades académicas | B | 50 |  |
| 12 | Charlas de divulgación | B | 50 |  |
| 13 | Colaborador de libro | B | 50 |  |
| 14 | Compilador de libro | B | 50 |  |
| 15 | Conferencias o videoconferencias | B | 50 |  |
| 16 | Cursos especiales o extracurriculares para alumnos | B | 50 | Glosario: nivel B si es de 40 horas o más. |
| 17 | Ensayo | B | 50 |  |
| 18 | Organización de actividades académicas | B | 50 | Nivel por alcance: A local, B general, C nacional/internacional; hasta 4 organizadores. |
| 19 | Participación en la elaboración y publicación de una revista | B | 50 | Glosario: RUBRO I, III y V-B o C; nivel C si además colabora con al menos 2 artículos o ensayos propios. |
| 20 | Ponencia | B | 50 |  |
| 21 | Seminarios o talleres extracurriculares para alumnos monitores o formadores de alumnos | B | 50 |  |
| 22 | Traducción de artículo o ensayo | B | 50 |  |
| 23 | Coordinador de libro | C | 150 |  |
| 24 | Libro | C | 150 |  |
| 25 | Organización de actividades académicas | C | 150 | Nivel por alcance: A local, B general, C nacional/internacional; hasta 4 organizadores. |
| 26 | Participación en la elaboración y publicación de una revista | C | 150 | Glosario: nivel C si además colabora con al menos 2 artículos o ensayos propios. |
| 27 | Seminarios o talleres extracurriculares para alumnos monitores o formadores de alumnos | C | 150 |  |
| 28 | Traducción de libro | C | 150 |  |

> Valores: Nivel A = 25 puntos, B = 50 puntos, C = 150 puntos. Son los únicos valores del Cuadro, sin excepciones.


## Actualización v2 — Glosario unificado (2026-11-18)

Fuente: `cch_normatividad_unificada_2020_2023.json` (fecha de generación 2026-11-18), glosario completo de 107 términos. Catálogo v2: `protocolo-puntaje-cch-v2.json` (el JSON v1 de 158 actividades no se tocó).

**Términos del glosario que tocan este rubro: 19** (6 solo en este rubro; el resto se comparte con otros rubros). Por nivel en este rubro: A: 5, B: 11, C: 3. Digitales (isDigital): 4 de 19.

**Ojo:** el glosario tiene 107 términos y el Cuadro 165 actividades. El glosario agrupa variantes (alcance, horas, unidades) en un solo término, así que un término puede cubrir varios niveles: cuando la definición menciona más de un nivel, el nivel real se elige por alcance/horas según la definición, no por el campo `level` solo. Esos casos están marcados con ⚠ en la tabla.

### Cambios v2 en este rubro

- «Charlas de divulgación» (gl-042): un solo término con nivel por cantidad — A individual (25), B ciclo de al menos 5 charlas (50). El campo `level` trae A; el nivel real depende del ciclo.
- «Organización de actividades académicas» (gl-090) también toca el Rubro V, con el mismo nivel por alcance que en el Rubro I.
- «Cursos especiales o extracurriculares» (gl-038): A si son menos de 40 h, B si son 40 h o más. El campo trae B; ver la definición.
- «Participación en la elaboración y publicación de una revista» (gl-096): B, y C con al menos 2 artículos propios. Toca Rubros I, III y V.

### Términos del glosario unificado en este rubro

| ID | Actividad | Nivel | Pts | Digital | Definición | Ejemplo | Sede |
|---|---|---|---|---|---|---|---|
| gl-042 | Charlas de Divulgación (Individual Nivel A / Ciclo 5 Charlas Nivel B) ⚠ | A | 25 | No | Exposición oral frente a auditorio sobre tema científico, humanístico o cultural con sinopsis mínima de 1 cuartilla (Nivel A: 25 pts). Nivel B (50 pts) cuando se realiza un conjunto de al menos 5 charlas con eje integrador relacionado con un curso e informe. | Charla magistral o ciclo de 5 charlas sobre aplicaciones de la estadística en la ciencia contemporánea. | Departamento de Difusión Cultural / Jornadas Estudiantiles. |
| gl-079 | Jurado en Actividades Académicas | A | 25 | No | Profesor que dictamina la calidad de un artículo académico/divulgación o valora méritos de participantes en cualquier actividad o certamen académico. | Jurado evaluador de carteles y ponencias estudiantiles en la Feria de las Ciencias o Encuentro de Jóvenes Investigadores. | Coordinación Local de Eventos / Feria de las Ciencias. |
| gl-080 | Lectura con Fines Didácticos | A | 25 | No | Lectura en voz alta de obra fundamental realizada ante auditorio o evento cultural/académico para difundir obras indispensables en formación humanística y científica, con constancia. | Lectura comentada de textos clásicos de divulgación científica y filosófica en jornada cultural del plantel. | Departamento de Difusión Cultural / Biblioteca del Plantel. |
| gl-099 | Presentación de un Libro o Revista | A | 25 | No | Presentación del autor y exposición oral ante un público sobre un libro o revista publicado recientemente o reeditado, entregando un texto de 3 cuartillas como mínimo. | Presentación comentada de novedad editorial del CCH en feria del libro o auditorio de plantel (texto de 4 cuartillas). | Departamento de Difusión Cultural / Programa Editorial CCH. |
| gl-105 | Relator / Reseña Bibliográfica o Videográfica / Revisión Técnica de Libro / Secuencia Didáctica ⚠ | A | 25 | No | Agrupa productos de nivel A y B: Relator (V-A, 25 pts, sinopsis ≥1 cuartilla); Reseña bibliográfica o videográfica (V-A, 25 pts, ≥3 cuartillas); Secuencia didáctica (I-A, 25 pts, fases inicial, desarrollo y síntesis con anexos); Revisión técnica de libro (I-B, 50 pts). | Secuencia didáctica completa de 3 fases (inicio, desarrollo, síntesis) para un aprendizaje de Estadística I (Nivel A: 25 pts). | Secretaría Académica del Plantel / Comités Editoriales. |
| gl-012 | Artículo de Divulgación | B | 50 | No | Escrito original publicado para aportar conocimientos, experiencias o puntos de vista de interés en cultura, ciencias y humanidades, así como su difusión general o en el Colegio. | Artículo de divulgación científica sobre criptografía y estadística publicado en suplemento o revista del CCH. | Gaceta CCH / Revistas de divulgación científica y cultural. |
| gl-013 | Asesorías a los Alumnos para la Presentación de Trabajos en Actividades Académicas | B | 50 | No | Apoyo sistemático a un grupo de alumnos para elaboración y presentación de trabajos en actividades académicas locales, generales o institucionales. Informe con procedimientos, número de alumnos, resumen y reflexión de logros. | Asesoría a equipo estudiantil para presentar cartel científico en la Feria de las Ciencias de la UNAM. | Coordinación Local de Eventos Académicos / Feria de las Ciencias. |
| gl-025 | Colaborador de Libro | B | 50 | No | Profesor(es) que participan en la elaboración de un libro en actividades como redacción, preparación de cuadros estadísticos, selección de imágenes/dibujos propios o corrección de estilo. | Elaboración de gráficos estadísticos, ejercicios y revisión de estilo para libro institucional del CCH. | Comité Editorial del CCH / Dependencia Editora. |
| gl-030 | Compilador de Libro | B | 50 | No | Encargado de: a) seleccionar; b) organizar; c) presentar y d) publicar un libro con colaboraciones originales sobre una temática determinada. Máximo 2 compiladores. | Compilación de memorias académicas sobre innovación educativa en el bachillerato universitario. | Programa Editorial del CCH / Instituciones Académicas. |
| gl-031 | Conferencia o Videoconferencia | B | 50 | Sí | Exposición de un tema relacionado con la especialidad o interés del Colegio en jornada académica interna o externa. Debe entregarse por escrito en un mínimo de 10 cuartillas. | Videoconferencia magistral sobre Inteligencia Artificial y Educación Matemática con texto entregado de 12 cuartillas. | Jornadas Académicas / Coloquios / Auditorios del CCH. |
| gl-038 | Cursos Especiales o Extracurriculares para Alumnos (<40h Nivel A / ≥40h Nivel B) ⚠ | B | 50 | Sí | Cursos presenciales o en línea de apoyo en orientación vocacional, regularización, deporte, divulgación científica o idiomas. Informe: planeación, logros, recursos y evaluación individual. Nivel A = 25 pts (<40h); Nivel B = 50 pts (40 horas o más). | Curso extracurricular en línea de 40 horas de 'Introducción a Python y Análisis de Datos' para alumnos (Nivel B: 50 pts). | Secretaría de Servicios Estudiantiles / Difusión Cultural / SILADIN. |
| gl-052 | Ensayo | B | 50 | No | Escrito original individual (mínimo 5 cuartillas) de carácter argumentativo con tesis, argumentos, conclusiones y fuentes APA, publicado en proyecto editorial del Colegio o institución avalada por ANUIES. | Ensayo argumentativo sobre el Modelo Educativo del CCH y la alfabetización estadística publicado en revista del Colegio. | Proyectos Editoriales del CCH / Publicaciones ANUIES. |
| gl-090 | Organización de Actividades Académicas (Local A / General B / Nacional-Internacional C) ⚠ | B | 50 | No | Planeación, difusión y realización de coloquios, congresos, ferias, encuentros, muestras o torneos (máximo 4 organizadores). Nivel A (25 pts) = locales; Nivel B (50 pts) = generales en el Colegio; Nivel C (150 pts) = nacionales o internacionales. | Comité organizador de Jornada Académica General del Colegio (50 pts) o Congreso Nacional/Internacional (150 pts). | Dirección del Plantel / Dirección General del CCH. |
| gl-096 | Participación en la Elaboración y Publicación de una Revista (Nivel B / Con 2 Artículos Propios Nivel C) ⚠ | B | 50 | Sí | Actividades durante un año en Comité Editorial de revista impresa o digital del Colegio (mínimo 2 números publicados). Nivel B = 50 pts; Nivel C = 150 pts si además colabora con al menos 2 artículos o ensayos de su autoría. | Integrante del Comité Editorial de revista académica digital del CCH con 2 números publicados en el año. | Comité Editorial de Revista Institucional / Plantel. |
| gl-097 | Ponencia | B | 50 | No | Aportación presentada por escrito en un mínimo de 5 cuartillas en foros, congresos, simposia, coloquios o encuentros académicos, basada en estudio o experiencia docente. | Ponencia escrita de 7 cuartillas presentada en el Coloquio Nacional de Enseñanza de las Ciencias en el Bachillerato. | Congresos, Simposia y Encuentros Académicos Nacionales/Internacionales. |
| gl-107 | Sinodal de Examen de Grado / Traducción de Artículo o Libro / Tutoría para Alumnos (PIT) / Video Educativo / Visitas Guiadas ⚠ | B | 50 | Sí | Sinodal examen de grado (V-A: 25 pts); Visitas guiadas (I-A: 25 pts); Traducción artículo/ensayo (V-B: 50 pts); Traducción de libro (I/III/V-C: 150 pts con Pares); Video educativo digital original con guion ≥5 min (I-B: 50 pts); Tutoría para alumnos PIT (I-B: 50 pts por 1 grupo anual; I-C: 150 pts por 2 grupos curriculares). | Tutoría grupal anual dentro del PIT (50 pts 1 grupo / 150 pts 2 grupos) o Video Educativo digital guionizado (50 pts). | Programa Institucional de Tutorías (PIT) / Mediateca / Facultades UNAM. |
| gl-034 | Coordinador de Libro | C | 150 | No | Profesor(es) (máximo 2) a cargo de: a) organización; b) planeación; c) dirección; d) supervisión de la elaboración de un libro y e) autoría de una de las partes que componen la obra. | Coordinación general y autoría de capítulo en libro colectivo del Seminario Institucional de Matemáticas. | Comité Editorial del CCH / Dirección General. |
| gl-081 | Libro ⚠ | C | 150 | No | Obra original coherente e integrada con rigor conceptual y metodológico vinculada al Modelo Educativo y Plan de Estudios, revisada por Comité Editorial y publicada impresa o digital. Nivel C (150 pts) hasta 6 autores; más de 6 autores = Nivel B (50 pts), salvo dictamen de alta calidad. | Libro publicado por el CCH sobre historia, epistemología y enseñanza de las matemáticas en el nivel medio superior. | Comité Editorial del CCH / Dirección General. |
| gl-106 | Seguimiento, Análisis y Preparación Grupal de la Experiencia Docente / Seminarios Monitores ⚠ | C | 150 | No | Seguimiento grupal institucional de dos cursos de asignaturas impartidas durante el mismo ciclo escolar con planeación, ajustes, evaluación de aprendizajes y reflexión (Rubro I-C: 150 pts); y Seminarios/talleres extracurriculares para alumnos monitores (Rubro V-B: 50 pts / V-C: 150 pts con réplica). | Informe grupal anual de seguimiento y análisis de la experiencia docente en dos cursos curriculares del ciclo escolar. | Secretaría Académica del Plantel / Grupos Institucionales. |

Los términos con ⚠ mencionan más de un nivel en su definición; el campo Nivel es el nivel base del término y el nivel aplicable se decide por alcance/horas (ver «Cambios v2» y la definición).

## Correcciones aplicadas en este rubro (respecto al JSON del usuario)

- **Calificativos del Glosario, no del Cuadro:** el JSON agrega «(locales)» (V-A Organización), «(generales)» (V-B Organización), «(nacionales/internacionales)» (V-C Organización), «(40 hrs o más)» (V-B Cursos especiales), «(conjunto)» (V-B Charlas) y «(con artículos propios)» (V-C Revista) y «(con réplica)» (V-C Seminarios). En el Cuadro los nombres van **sin** esos paréntesis; los calificativos son la condición del Glosario que define el nivel y se conservan aquí como nota, no como parte del nombre.
- **Nombre:** «Seminarios o talleres extracurriculares para alumnos monitores o formadores» (JSON, V-B) → en el Cuadro es «…para alumnos monitores o formadores **de alumnos**».


## Machote 1 — Correo de envío / solicitud

> **Nota:** para un COA no se envía el expediente por correo: se registra y se cargan las pruebas en la plataforma COA (https://www.cch.unam.mx). Este correo es para consultas y aclaraciones ante la Secretaría Académica del plantel, o para el trámite que la convocatoria indique por correo.

**Para:** Secretaría Académica del Plantel [Oriente / tu plantel] — [correo publicado en el calendario de Secretarías Académicas de tu plantel]
**Asunto:** Solicitud de revisión de expediente — Rubro V (Trabajos de Difusión y Extensión Cultural) — [Tu nombre completo] — [Categoría a la que aspiras, p. ej. Profesor de Carrera Titular "A"]

**Cuerpo:**

Estimada Secretaría Académica:

Por medio del presente, yo, [Nombre completo], profesor(a) de [asignatura(s)] del Plantel [Oriente], con número de trabajador [___], solicito la revisión de mi expediente de producción académica correspondiente al **Rubro V — Trabajos de Difusión y Extensión Cultural**, conforme al Protocolo de Equivalencias para el Ingreso y la Promoción de los Profesores Ordinarios de Carrera del CCH (2020), para [ingreso / promoción] a la categoría de [Asociado "A/B/C" o Titular "A/B/C", Tiempo Completo / Medio Tiempo].

Anexo en formato PDF las constancias de las siguientes actividades (con su nivel y puntaje según el Cuadro de Rubros, Niveles y Actividades, pp. 53-57 del Protocolo):

1. [Actividad] — Nivel [A/B/C] — [25/50/150] puntos — [fecha] — Constancia: [archivo PDF]
2. [Actividad] — Nivel [A/B/C] — [25/50/150] puntos — [fecha] — Constancia: [archivo PDF]
3. [Actividad] — Nivel [A/B/C] — [25/50/150] puntos — [fecha] — Constancia: [archivo PDF]

Puntaje acumulado en este rubro: [___] puntos.

Quedo atento(a) a sus indicaciones y al acuse de recibido.

Atentamente,
[Nombre completo]
[Plantel y asignatura]
[Teléfono] — [Correo electrónico personal]
[Fecha]


## Machote 2 — Oficio / documento de entrega del expediente

```
[Ciudad de México, a ___ de __________ de 20___]

H. COMISIÓN DICTAMINADORA
[Área de conocimiento: ____________________]
Presente

Por conducto de la Secretaría Académica del Plantel [Oriente],
y con fundamento en los artículos 38 al 44 del Estatuto del
Personal Académico de la UNAM y en el Protocolo de
Equivalencias para el Ingreso y la Promoción de los Profesores
Ordinarios de Carrera del Colegio de Ciencias y Humanidades
(2020, Gaceta CCH, Suplemento, 17 de enero de 2020; Adenda
1 de junio de 2020), presento mi expediente de producción
académica para [ingreso / promoción] a la categoría de
Profesor de Carrera [Asociado "A/B/C" / Titular "A/B/C"],
[Tiempo Completo / Medio Tiempo].

RUBRO V — TRABAJOS DE DIFUSIÓN Y EXTENSIÓN CULTURAL

Relación de actividades y documentos probatorios:

Núm. | Actividad (según el Cuadro, pp. 53-57) | Nivel | Puntos | Fecha | Constancia (anexo)
-----|------------------------------------------|-------|--------|-------|--------------------
  1  | [Actividad]                            | [A/B/C] | [25/50/150] | [fecha] | Anexo [n]
  2  | [Actividad]                            | [A/B/C] | [25/50/150] | [fecha] | Anexo [n]

Puntaje total del rubro: [___] puntos.
Puntaje total acumulado (todos los rubros): [___] puntos.
Categoría objetivo: [___] — Total mínimo requerido: [100/200/250/300/350/400] puntos
(Medio Tiempo: Asociado A 75, B 100, C 125; Titular A/B/C 200 puntos).

Declaro bajo protesta de decir verdad que los documentos
anexos son auténticos y que cada constancia se presenta en
un solo rubro, conforme al Criterio de aplicación 10 del
Protocolo y a la nota 2 del Art. 29 del Instructivo de
Asignación de Horarios (2023).

ANEXOS:
- Anexo 1. [Constancia de ...] (PDF)
- Anexo 2. [Constancia de ...] (PDF)
- Anexo 3. [Dictamen de Comité de Pares, si aplica] (PDF)

Atentamente,

__________________________________
[Nombre completo]
Profesor(a) de [asignatura(s)] — Plantel [Oriente]
Núm. de trabajador: [___] — Correo: [___] — Tel.: [___]
```


## Referencias para consultar más tarde

- Protocolo de Equivalencias 2020 (PDF oficial, Gaceta CCH): https://gaceta.cch.unam.mx/sites/default/files/2025-12/protocolo_equivalencias_ingreso_promocion_.pdf
- Adenda de Medio Tiempo, 1 de junio de 2020 (PDF oficial): https://cch.unam.mx/sites/default/files/suplementoadendo.pdf
- Instructivos y Protocolos vigentes (página oficial): http://www.cch.unam.mx/instructivos — también https://www.cch.unam.mx/academica/instructivos
- Instructivo de Asignación de Horarios 2023 (PDF oficial, Gaceta CCH 10-mar-2023): https://gaceta.cch.unam.mx/sites/default/files/2023-03/suplemento_horario.pdf
- Plataforma COA (concursos de oposición abierto, registro y carga de pruebas): https://www.cch.unam.mx
- Convocatoria COA de ejemplo (9-oct-2025, PDF): https://www.cch.unam.mx/sites/default/files/ConvocatoriaCOA_091025.pdf
- Plataforma Trayectoria CCH (lista jerarquizada, carga de documentos en PDF): http://trayectoria.cch.unam.mx
- Listas jerarquizadas publicadas: http://www.cch.unam.mx/listasjerarquizadas
- Cuadernillo de Orientaciones 2026-2027 (PDF): https://gaceta.cch.unam.mx/sites/default/files/2026-07/cuadernillo-orientacion-2026-2027_2_julio_2026_ok.pdf

---
*Archivo: `plantillas-rubro/rubro-V-difusion-extension.md` — Parte del sistema de bitácoras (`#PuntajeCch`, propuesta pendiente de autorización).*
