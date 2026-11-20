# Plantilla — Rubro III: Trabajos en la Formación de Profesores

**Fuente:** Protocolo de Equivalencias para el Ingreso y la Promoción de los Profesores Ordinarios de Carrera del CCH (2020), Cuadro de Rubros, Niveles y Actividades, pp. 53-57 del PDF subido por Nequiz el 2026-11-18. Lista **corregida contra el Cuadro**; el JSON guardado (`protocolo-puntaje-cch.json`, 158 actividades) trae errores en este rubro, detallados abajo. No se modificó el JSON original.
**Fecha de la plantilla:** 2026-11-18
**Actualización v2:** 2026-11-18 — glosario unificado (107 términos); ver sección «Actualización v2» en esta plantilla.
**Actualización v2:** 2026-11-18 — glosario unificado (107 términos); ver sección «Actualización v2» en esta plantilla.
**Total de actividades en este rubro (Cuadro):** 35

## Descripción

Actualización disciplinaria, pedagógica y didáctica de los docentes.

## Mínimos por categoría en este rubro

| Categoría | Mínimo en Rubro III | Condición de nivel |
|---|---|---|
| Titular A (TC, 300) | 75 (25%) | Al menos una actividad de formación de nivel B |
| Titular B (TC, 350) | 50 (14.28%) | Actividad de nivel B |
| Titular C (TC, 400) | 50 (12.5%) | Actividad de nivel B |
| Titular A/B/C Medio Tiempo (200) | 50 de nivel B en Rubro III **o** IV | — |

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
| 1 | Compilación de lecturas | A | 25 |  |
| 2 | Cursos recibidos | A | 25 |  |
| 3 | Participación en jornadas académicas | A | 25 | Glosario: RUBRO I o III-A; mínimo 20 horas y 90% de asistencia. |
| 4 | Acreditación de Diplomado | B | 50 |  |
| 5 | Apoyos bibliográficos, hemerográficos, filmográficos, cibergráficos para un curso | B | 50 |  |
| 6 | Asesoría para profesores | B | 50 |  |
| 7 | Asesorías didáctico-disciplinarias individualizadas para profesores | B | 50 |  |
| 8 | Boletín informativo digital o impreso | B | 50 |  |
| 9 | Colaborador de libro | B | 50 |  |
| 10 | Compilación de lecturas | B | 50 |  |
| 11 | Compilador de libro | B | 50 |  |
| 12 | Cursos para la MADEMS | B | 50 |  |
| 13 | Cursos para profesores | B | 50 |  |
| 14 | Desarrollo de un tema con fines didácticos | B | 50 |  |
| 15 | Director o asesor de tesis | B | 50 |  |
| 16 | Diseño de un curso para profesores | B | 50 |  |
| 17 | Ensayo | B | 50 |  |
| 18 | Estancias | B | 50 | Glosario: estancias cortas, RUBRO III-B, al menos 40 horas, con informe avalado por el asesor. |
| 19 | Examen de conocimientos y habilidades disciplinarias para la docencia | B | 50 |  |
| 20 | Formador de asesores en línea | B | 50 |  |
| 21 | Glosario de términos por asignatura o área de conocimientos | B | 50 |  |
| 22 | Guía de estudios para el examen de conocimientos y habilidades disciplinarias para la docencia | B | 50 |  |
| 23 | Participación en la elaboración y publicación de una revista | B | 50 | Glosario: RUBRO I, III y V-B o C; nivel C si además colabora con al menos 2 artículos o ensayos propios. |
| 24 | Coordinador de libro | C | 150 |  |
| 25 | Diseño, organización, realización y evaluación de un diplomado | C | 150 |  |
| 26 | Estancias | C | 150 | Glosario: estancias continuas, RUBRO III-C, no menos de 160 horas, con informe del profesor. |
| 27 | Formación de profesores | C | 150 |  |
| 28 | Formador de asesores | C | 150 |  |
| 29 | Formador de profesores en actividades experimentales, de laboratorios o de campo, realizadas en sistemas de laboratorios para el desarrollo y la innovación (SILADIN) | C | 150 |  |
| 30 | Guía para el profesor | C | 150 |  |
| 31 | Impartición de un diplomado | C | 150 |  |
| 32 | Libro | C | 150 |  |
| 33 | Libro para la actualización de profesores | C | 150 |  |
| 34 | Participación en la elaboración y publicación de una revista | C | 150 | Glosario: nivel C si además colabora con al menos 2 artículos o ensayos propios. |
| 35 | Traducción de libro | C | 150 |  |

> Valores: Nivel A = 25 puntos, B = 50 puntos, C = 150 puntos. Son los únicos valores del Cuadro, sin excepciones.


## Actualización v2 — Glosario unificado (2026-11-18)

Fuente: `cch_normatividad_unificada_2020_2023.json` (fecha de generación 2026-11-18), glosario completo de 107 términos. Catálogo v2: `protocolo-puntaje-cch-v2.json` (el JSON v1 de 158 actividades no se tocó).

**Términos del glosario que tocan este rubro: 34** (22 solo en este rubro; el resto se comparte con otros rubros). Por nivel en este rubro: A: 3, B: 21, C: 10. Digitales (isDigital): 12 de 34.

**Ojo:** el glosario tiene 107 términos y el Cuadro 165 actividades. El glosario agrupa variantes (alcance, horas, unidades) en un solo término, así que un término puede cubrir varios niveles: cuando la definición menciona más de un nivel, el nivel real se elige por alcance/horas según la definición, no por el campo `level` solo. Esos casos están marcados con ⚠ en la tabla.

### Cambios v2 en este rubro

- «Estancias cortas» (gl-053, ≥40 h, B) y «Estancias continuas» (gl-054, ≥160 h, C) ya vienen desdobladas en el glosario con sus horas mínimas.
- «Participación en jornadas académicas» (gl-095) es I o III, nivel A: se resuelve la contradicción del análisis v1.
- «Formador de profesores en actividades experimentales / SILADIN» (gl-066, III-C) y «Formador de tutores» (gl-067, I-C) son términos distintos; no confundirlos.
- «Acreditación de Diplomado» (gl-001, III-B, 120 h mínimo) trae además su equivalencia en el Instructivo de Horarios (Art. 29-II: 8 pts/año).

### Términos del glosario unificado en este rubro

| ID | Actividad | Nivel | Pts | Digital | Definición | Ejemplo | Sede |
|---|---|---|---|---|---|---|---|
| gl-028 | Compilación de Lecturas (Una Unidad — Nivel A) | A | 25 | No | Lecturas de uno o varios autores dirigidas a alumnos o profesores que cubren al menos una unidad de un curso, con índice, presentación, actividades didácticas y fuentes en formato APA. | Compilación de lecturas y actividades de comprensión sobre historia de la estadística para la Unidad I. | Academia de Asignatura / Secretaría Académica del Plantel. |
| gl-041 | Cursos Recibidos | A | 25 | Sí | Cursos con mínimo 20 horas de formación pedagógica o actualización de conocimientos acreditados presencialmente o a distancia en UNAM, ANUIES o UDUAL. | Acreditación de curso de 20 horas sobre evaluación formativa o herramientas digitales en el Centro de Formación Continua CCH. | Centro de Formación Continua CCH / DGAPA / DGTIC. |
| gl-095 | Participación en Jornadas Académicas | A | 25 | No | Cumplimiento de tareas y actividades periódicas y sistemáticas en seminarios de área o semanas académicas con duración mínima de 20 horas y asistencia mínima al 90% de las sesiones. | Asistencia y participación acreditada (>90%) en Semana Académica o Seminario Local de Área (20 horas). | Jefatura de Área / Secretaría Académica del Plantel. |
| gl-001 | Acreditación de Diplomado | B | 50 | Sí | Cumplimiento satisfactorio de la acreditación de un Diplomado presencial, semipresencial o a distancia, en apoyo a la actualización disciplinaria o formación docente, conforme al Plan de Estudios, con duración mínima de 120 horas, avalado por IES afiliada a ANUIES/UDUAL o apoyado por el CFC-CCH. (En Instructivo Horarios 2023 Art. 29-II otorga 8 pts/año si es de especialidad, psicopedagógico o habilidades digitales). | Diplomado en Línea 'Desarrollo de Habilidades Digitales y Ciencia de Datos para el Bachillerato' (120 hrs) en el Centro de Formación Continua del CCH. | Centro de Formación Continua del CCH / DGTIC / Facultades UNAM. |
| gl-009 | Apoyos Bibliográficos, Hemerográficos, Filmográficos y Cibergráficos para un Curso (Rubro III) | B | 50 | Sí | Recopilación y análisis crítico de recursos bibliográficos, hemerográficos, filmográficos y cibergráficos orientados a la actualización docente y formación de profesores (mínimo 10 reseñas críticas y fuentes APA). | Guía cibergráfica y filmográfica comentada de recursos didácticos digitales para profesores de Historia Universal. | Centro de Formación Continua / Biblioteca del Plantel. |
| gl-016 | Asesoría para Profesores | B | 50 | No | Apoyo sistemático a un profesor o grupo de profesores a lo largo de un semestre en: a) instrumentación de Programas de Estudio y b) superación disciplinaria y psicopedagógica, con balance conjunto asesor-asesorado. | Acompañamiento semestral a profesores de nuevo ingreso en la planeación didáctica de Taller de Cómputo. | Secretaría Docente del Plantel / Jefatura de Sección. |
| gl-017 | Asesorías Didáctico-Disciplinarias Individualizadas para Profesores | B | 50 | No | Asesoría semestral impartida a un profesor del Colegio en estudios de Maestría en Docencia para la Educación Media Superior (MADEMS) o posgrado/actualización promovida por la UNAM a nivel bachillerato. | Asesoría didáctico-disciplinaria semestral a estudiante docente de la MADEMS en el área de Matemáticas. | Coordinación MADEMS UNAM / Secretaría Académica. |
| gl-021 | Boletín Informativo Digital o Impreso | B | 50 | Sí | Publicación periódica con información actualizada de apoyo a la docencia (reseñas, bibliografía audiovisual, nuevas adquisiciones). Mínimo 3 números en un año elaborados por Consejo Editorial de asignatura/área. | Edición de 3 números anuales del Boletín Digital del Área de Matemáticas del Plantel Naucalpan. | Jefatura de Área / Consejo Editorial Local. |
| gl-025 | Colaborador de Libro | B | 50 | No | Profesor(es) que participan en la elaboración de un libro en actividades como redacción, preparación de cuadros estadísticos, selección de imágenes/dibujos propios o corrección de estilo. | Elaboración de gráficos estadísticos, ejercicios y revisión de estilo para libro institucional del CCH. | Comité Editorial del CCH / Dependencia Editora. |
| gl-029 | Compilación de Lecturas (Curso Completo — Nivel B) | B | 50 | No | Compilación de lecturas estructurada con actividades de instrumentación didáctica y fuentes APA que cubre el total de un curso semestral. | Compilación integral de lecturas comentadas para todas las unidades de Taller de Lectura y Redacción I. | Academia de Asignatura / Secretaría Académica del Plantel. |
| gl-030 | Compilador de Libro | B | 50 | No | Encargado de: a) seleccionar; b) organizar; c) presentar y d) publicar un libro con colaboraciones originales sobre una temática determinada. Máximo 2 compiladores. | Compilación de memorias académicas sobre innovación educativa en el bachillerato universitario. | Programa Editorial del CCH / Instituciones Académicas. |
| gl-039 | Cursos para la MADEMS | B | 50 | No | Cursos impartidos por un profesor del Colegio en la Maestría en Docencia para la Educación Media Superior (MADEMS), con duración mínima de un semestre, incluyendo planeación, materiales, evaluación y bibliografía. | Impartición semestral de seminario de didáctica disciplinaria en la MADEMS UNAM. | Posgrado MADEMS UNAM (Facultad de Ciencias / FES Acatlán / Iztacala). |
| gl-040 | Cursos para Profesores (Impartición) | B | 50 | Sí | Cursos presenciales o en línea impartidos a otros profesores (mínimo 20 horas) para formación o actualización docente. Informe: justificación, evaluación reflexiva, programa, materiales, formas de evaluación y concentrado de participantes. | Impartición de curso intersemestral de 20 horas 'Uso de GeoGebra y RStudio en el Aula' en el CFC-CCH. | Centro de Formación Continua del CCH / Secretarías Docentes. |
| gl-043 | Desarrollo de un Tema con Fines Didácticos | B | 50 | No | Exposición escrita de un tema del Programa de Estudio dirigida a alumnos o profesores (mínimo 10 cuartillas). Incluye: índice, presentación de aprendizajes, desarrollo, aparato crítico, instrumentación didáctica y fuentes APA. | Documento didáctico de 14 cuartillas sobre Distribuciones de Probabilidad con secuencias didácticas para Estadística I. | Academia de Asignatura / Secretaría Académica del Plantel. |
| gl-047 | Director o Asesor de Tesis | B | 50 | No | Profesor reconocido institucionalmente por facultad o escuela que asesora o dirige actividades académicas hasta la presentación del examen profesional de licenciatura o de grado. | Dirección de tesis de licenciatura en Matemáticas Aplicadas o de maestría en la MADEMS hasta examen de grado. | Facultades y Escuelas de la UNAM / Posgrado MADEMS. |
| gl-048 | Diseño de un Curso para Profesores | B | 50 | Sí | Planeación de un curso para formación/actualización docente (mínimo 20 horas, máximo 2 diseñadores). Incluye presentación, propósitos, enfoque, contenidos, actividades, evaluación, materiales y fuentes APA, dictaminado por Comité Académico CFC-CCH. | Diseño aprobado de curso-taller de 20 horas 'Modelación Matemática con Software Libre' para el catálogo del CFC-CCH. | Comité Académico del Centro de Formación Continua del CCH. |
| gl-052 | Ensayo | B | 50 | No | Escrito original individual (mínimo 5 cuartillas) de carácter argumentativo con tesis, argumentos, conclusiones y fuentes APA, publicado en proyecto editorial del Colegio o institución avalada por ANUIES. | Ensayo argumentativo sobre el Modelo Educativo del CCH y la alfabetización estadística publicado en revista del Colegio. | Proyectos Editoriales del CCH / Publicaciones ANUIES. |
| gl-053 | Estancias Cortas (Mínimo 40 horas — Nivel B) | B | 50 | No | Conjunto de actividades que el profesor realiza en un seminario o laboratorio de investigación en escuelas, facultades o institutos bajo asesoría de investigadores durante al menos 40 horas, acreditadas con informe avalado. | Estancia corta de investigación de 45 horas en laboratorio de estadística aplicada de la Facultad de Ciencias UNAM. | Facultades, Centros e Institutos de Investigación UNAM. |
| gl-059 | Examen de Conocimientos y Habilidades Disciplinarias para la Docencia | B | 50 | No | Instrumento elaborado colegiadamente por profesores de distintos planteles, coordinado por Secretaría Académica, para valorar conocimientos y habilidades disciplinarias de una asignatura conforme a la guía correspondiente. | Elaboración colegiada de reactivos y problemas para el Examen de Conocimientos Disciplinarios de Matemáticas. | Secretaría Académica de la Dirección General del CCH. |
| gl-065 | Formador de Asesores en Línea | B | 50 | Sí | Trabajo de profesores experimentados para formar a dos o más asesores en línea de un curso con aprobación institucional, entregando planeación, registro de actividad en plataforma y evaluación. | Formación y acompañamiento en plataforma Moodle de tres asesores en línea para cursos remediales del PAL. | Programa de Asesoría en Línea (PAL) / SSAA. |
| gl-069 | Glosario de Términos por Asignatura o Área de Conocimiento | B | 50 | No | Acopio y definición alfabética de conceptos significativos de una asignatura acorde con enfoques disciplinario y didáctico, con justificación, marco teórico, ejemplos y fuentes APA. | Glosario didáctico ilustrado de conceptos fundamentales de Estadística Descriptiva e Inferencial para bachillerato. | Academia de Asignatura / Secretaría Académica del Plantel. |
| gl-070 | Guía de Estudio para el Examen de Conocimientos y Habilidades Disciplinarias | B | 50 | No | Documento coordinado por Secretaría Académica (máximo 5 profesores) para apoyar preparación del examen disciplinario de docentes, con actividades semejantes, fuentes APA y rúbrica. | Guía oficial de estudio y rúbrica de evaluación para aspirantes a profesores de Cibernética y Computación. | Secretaría Académica de la Dirección General del CCH. |
| gl-096 | Participación en la Elaboración y Publicación de una Revista (Nivel B / Con 2 Artículos Propios Nivel C) ⚠ | B | 50 | Sí | Actividades durante un año en Comité Editorial de revista impresa o digital del Colegio (mínimo 2 números publicados). Nivel B = 50 pts; Nivel C = 150 pts si además colabora con al menos 2 artículos o ensayos de su autoría. | Integrante del Comité Editorial de revista académica digital del CCH con 2 números publicados en el año. | Comité Editorial de Revista Institucional / Plantel. |
| gl-107 | Sinodal de Examen de Grado / Traducción de Artículo o Libro / Tutoría para Alumnos (PIT) / Video Educativo / Visitas Guiadas ⚠ | B | 50 | Sí | Sinodal examen de grado (V-A: 25 pts); Visitas guiadas (I-A: 25 pts); Traducción artículo/ensayo (V-B: 50 pts); Traducción de libro (I/III/V-C: 150 pts con Pares); Video educativo digital original con guion ≥5 min (I-B: 50 pts); Tutoría para alumnos PIT (I-B: 50 pts por 1 grupo anual; I-C: 150 pts por 2 grupos curriculares). | Tutoría grupal anual dentro del PIT (50 pts 1 grupo / 150 pts 2 grupos) o Video Educativo digital guionizado (50 pts). | Programa Institucional de Tutorías (PIT) / Mediateca / Facultades UNAM. |
| gl-034 | Coordinador de Libro | C | 150 | No | Profesor(es) (máximo 2) a cargo de: a) organización; b) planeación; c) dirección; d) supervisión de la elaboración de un libro y e) autoría de una de las partes que componen la obra. | Coordinación general y autoría de capítulo en libro colectivo del Seminario Institucional de Matemáticas. | Comité Editorial del CCH / Dirección General. |
| gl-049 | Diseño, Organización, Realización y Evaluación de un Diplomado | C | 150 | Sí | Participación de máximo 4 profesores en concepción, organización, realización y evaluación de un diplomado docente (mínimo 120 horas), presencial, semipresencial o en línea, avalado por IES (ANUIES/UDUAL) y apoyado por el CFC-CCH. | Diseño y coordinación integral del Diplomado en Línea 'Competencias Digitales y Didáctica de las Ciencias' (120 hrs). | Centro de Formación Continua del CCH / Facultades e Institutos UNAM. |
| gl-054 | Estancias Continuas (Mínimo 160 horas — Nivel C) | C | 150 | No | Incorporación del profesor en tareas de investigación de su disciplina durante un lapso no menor a 160 horas bajo asesoría de investigadores, con informe y constancia oficial de colaboración y aportación individual. | Estancia continua de 160 horas en el Instituto de Investigaciones en Matemáticas Aplicadas y en Sistemas (IIMAS-UNAM). | Institutos y Centros de Investigación de la UNAM. |
| gl-062 | Formación de Profesores | C | 150 | Sí | Planeación, diseño e impartición de al menos dos módulos o cursos de 40 horas cada uno (80 horas total), secuenciados e integrados, organizados por hasta 8 profesores y avalados institucionalmente. | Diseño e impartición de programa modular de 80 horas (2 cursos de 40h) sobre Didáctica de la Estadística y Ciencia de Datos. | Centro de Formación Continua del CCH / Secretaría Académica. |
| gl-064 | Formador de Asesores | C | 150 | No | Profesor con al menos 3 años de experiencia en el PIA que capacita durante un año al menos a 3 profesores de nuevo ingreso al PIA, impartiendo curso y dando seguimiento. | Capacitación anual y seguimiento a cuatro nuevos profesores asesores del Programa Institucional de Asesorías (PIA). | Coordinación Central y Local del PIA / Secretaría Académica. |
| gl-066 | Formador de Profesores en Actividades Experimentales en el SILADIN | C | 150 | No | Trabajo de formación dirigido a dos o más profesores de asignatura durante un año en actividades experimentales, de laboratorio o de campo en el SILADIN, avalado por SSAA y Secretaría Técnica del SILADIN. | Formación anual en laboratorio experimental del SILADIN dirigida a profesores de asignatura de Biología y Química. | Secretaría Técnica del SILADIN y SSAA. |
| gl-073 | Guía para el Profesor | C | 150 | No | Documento realizado por grupo de trabajo que cubre todas las unidades del curso (introducción, conceptos clave, estrategias, actividades, materiales, puntos problemáticos y fuentes APA), con evaluación satisfactoria de Comité de Pares. | Guía completa para el profesor de Matemáticas IV aprobada por Comité de Pares para su publicación institucional. | Secretaría Académica DGCCH / Comité de Pares. |
| gl-077 | Impartición de un Diplomado | C | 150 | Sí | Participación de máximo 6 profesores en impartición y evaluación de un diplomado docente (mínimo 120 horas), presencial, semipresencial o en línea, avalado por IES o CFC-CCH. | Impartición y evaluación de módulos en el Diplomado Institucional de Actualización Docente (120 horas). | Centro de Formación Continua del CCH / Facultades UNAM. |
| gl-081 | Libro ⚠ | C | 150 | No | Obra original coherente e integrada con rigor conceptual y metodológico vinculada al Modelo Educativo y Plan de Estudios, revisada por Comité Editorial y publicada impresa o digital. Nivel C (150 pts) hasta 6 autores; más de 6 autores = Nivel B (50 pts), salvo dictamen de alta calidad. | Libro publicado por el CCH sobre historia, epistemología y enseñanza de las matemáticas en el nivel medio superior. | Comité Editorial del CCH / Dirección General. |
| gl-083 | Libro para la Actualización de Profesores | C | 150 | No | Obra que contribuye a la formación de profesores, relacionada con el Modelo Educativo y Plan de Estudios dentro de un programa institucional, elaborada a partir de ensayos, artículos o investigaciones educativas. | Libro de actualización disciplinaria y didáctica dirigido a profesores del Área de Matemáticas del CCH. | Comité Editorial del CCH / Centro de Formación Continua. |

Los términos con ⚠ mencionan más de un nivel en su definición; el campo Nivel es el nivel base del término y el nivel aplicable se decide por alcance/horas (ver «Cambios v2» y la definición).

## Correcciones aplicadas en este rubro (respecto al JSON del usuario)

- **Eliminada de este rubro:** III-B «Conferencias o videoconferencias». En el Cuadro (pp. 54-55) esa actividad está en I-B, II-B y V-B, **no** en III-B. El JSON la había agregado aquí.
- **Nombres corregidos a como dice el Cuadro:** «Estancias (cortas)» → «Estancias» (III-B; el Glosario aclara: cortas, al menos 40 h) y «Estancias (continuas)» → «Estancias» (III-C; continuas, no menos de 160 h). Los calificativos «cortas/continuas» se conservan como nota, no como parte del nombre.
- **Nombre corregido:** «Guía de estudios para el examen de conocimientos y habilidades disciplinarias» (JSON, truncado) → «Guía de estudios para el examen de conocimientos y habilidades disciplinarias **para la docencia**» (Cuadro, III-B).
- **Numeración del PDF:** en la p. 55 los tres últimos ítems del Rubro III-B vienen mal numerados como «18.» los tres (Glosario, Guía de estudios y Participación en revista); son los ítems 18, 19 y 20. Error de imprenta del Protocolo, no del JSON.


## Machote 1 — Correo de envío / solicitud

> **Nota:** para un COA no se envía el expediente por correo: se registra y se cargan las pruebas en la plataforma COA (https://www.cch.unam.mx). Este correo es para consultas y aclaraciones ante la Secretaría Académica del plantel, o para el trámite que la convocatoria indique por correo.

**Para:** Secretaría Académica del Plantel [Oriente / tu plantel] — [correo publicado en el calendario de Secretarías Académicas de tu plantel]
**Asunto:** Solicitud de revisión de expediente — Rubro III (Trabajos en la Formación de Profesores) — [Tu nombre completo] — [Categoría a la que aspiras, p. ej. Profesor de Carrera Titular "A"]

**Cuerpo:**

Estimada Secretaría Académica:

Por medio del presente, yo, [Nombre completo], profesor(a) de [asignatura(s)] del Plantel [Oriente], con número de trabajador [___], solicito la revisión de mi expediente de producción académica correspondiente al **Rubro III — Trabajos en la Formación de Profesores**, conforme al Protocolo de Equivalencias para el Ingreso y la Promoción de los Profesores Ordinarios de Carrera del CCH (2020), para [ingreso / promoción] a la categoría de [Asociado "A/B/C" o Titular "A/B/C", Tiempo Completo / Medio Tiempo].

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

RUBRO III — TRABAJOS EN LA FORMACIÓN DE PROFESORES

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
*Archivo: `plantillas-rubro/rubro-III-formacion-profesores.md` — Parte del sistema de bitácoras (`#PuntajeCch`, propuesta pendiente de autorización).*
