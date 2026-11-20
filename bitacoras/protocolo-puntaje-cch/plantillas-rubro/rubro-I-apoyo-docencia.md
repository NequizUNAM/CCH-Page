# Plantilla — Rubro I: Trabajos de Apoyo a la Docencia

**Fuente:** Protocolo de Equivalencias para el Ingreso y la Promoción de los Profesores Ordinarios de Carrera del CCH (2020), Cuadro de Rubros, Niveles y Actividades, pp. 53-57 del PDF subido por Nequiz el 2026-11-18. Lista **corregida contra el Cuadro**; el JSON guardado (`protocolo-puntaje-cch.json`, 158 actividades) trae errores en este rubro, detallados abajo. No se modificó el JSON original.
**Fecha de la plantilla:** 2026-11-18
**Actualización v2:** 2026-11-18 — glosario unificado (107 términos); ver sección «Actualización v2» en esta plantilla.
**Actualización v2:** 2026-11-18 — glosario unificado (107 términos); ver sección «Actualización v2» en esta plantilla.
**Total de actividades en este rubro (Cuadro):** 79

## Descripción

Actividades que redundan en la optimización del proceso de enseñanza-aprendizaje. Es el rubro con más peso para Asociados: mínimo el 50% del puntaje total debe venir de aquí (Asociado A 50 de 100, B 100 de 200, C 125 de 250).

## Mínimos por categoría en este rubro

| Categoría | Total | Mínimo en Rubro I | Condición de nivel |
|---|---|---|---|
| Asociado A (TC) | 100 | 50 (50%) | Trabajos que no sean de una misma actividad, cualquier nivel |
| Asociado B (TC) | 200 | 100 (50%) | Trabajos que no sean de una misma actividad, cualquier nivel |
| Asociado C (TC) | 250 | 125 (50%) | Al menos una actividad de nivel B |
| Titular A (TC) | 300 | 150 (50%) en Rubro I **o** II | Al menos una actividad de nivel C |
| Titular B (TC) | 350 | 150 (42.85%) en Rubro I **o** II **o** III | Al menos una actividad de nivel C |
| Titular C (TC) | 400 | 200 (50%) en Rubro I **o** II **o** III | Al menos una actividad de nivel C |
| Medio Tiempo: Asociado A 75 (mín. I: 25), B 100 (mín. I: 50), C 125 (mín. I: 75, al menos una B); Titular A/B/C 200 (mín. 150 en cualquier rubro con una C + 50 de nivel B en Rubro III o IV) | | |

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
| 2 | Cursos especiales o extracurriculares para alumnos | A | 25 | Glosario: RUBRO I y V-A o B; nivel B si es de 40 horas o más. |
| 3 | Examen extraordinario | A | 25 |  |
| 4 | Guía de lectura | A | 25 |  |
| 5 | Lectura con fines didácticos | A | 25 |  |
| 6 | Material educativo de audio | A | 25 |  |
| 7 | Organización de actividades académicas | A | 25 | Nivel por alcance: A local, B general, C nacional/internacional; hasta 4 organizadores. |
| 8 | Participación en jornadas académicas | A | 25 | Glosario: RUBRO I o III-A; mínimo 20 horas y 90% de asistencia. |
| 9 | Secuencia didáctica | A | 25 |  |
| 10 | Visitas guiadas | A | 25 |  |
| 11 | Actividades Creativas | B | 50 | Glosario: RUBRO I-B; mínimo 40 horas. |
| 12 | Actualización de paquete didáctico | B | 50 |  |
| 13 | Adaptación de equipo o programas de cómputo para la enseñanza | B | 50 |  |
| 14 | Antología | B | 50 |  |
| 15 | Apoyos bibliográficos, hemerográficos, filmográficos, cibergráficos para un curso | B | 50 |  |
| 16 | Artículo académico | B | 50 | Glosario: RUBRO I o II-B; mínimo 5 cuartillas; hasta 2 profesores. |
| 17 | Asesoría para alumnos orientada a mejorar la calidad del aprendizaje y el egreso | B | 50 |  |
| 18 | Banco de datos meteorológicos | B | 50 |  |
| 19 | Banco de información para una asignatura | B | 50 |  |
| 20 | Banco de reactivos | B | 50 |  |
| 21 | Colaborador de libro | B | 50 |  |
| 22 | Comité académico local para la evaluación de las guías de exámenes extraordinarios | B | 50 |  |
| 23 | Compilación de lecturas | B | 50 | También en III-A y III-B; no existe variante de nivel C de esta actividad en el Cuadro. |
| 24 | Compilador de libro | B | 50 |  |
| 25 | Conferencias o videoconferencias | B | 50 |  |
| 26 | Cuaderno de trabajo | B | 50 |  |
| 27 | Curso curricular o no curricular en línea | B | 50 |  |
| 28 | Cursos especiales o extracurriculares para alumnos | B | 50 | Glosario: nivel B si es de 40 horas o más. |
| 29 | Desarrollo de un tema con fines didácticos | B | 50 |  |
| 30 | Dirección de obra de teatro de carácter didáctico | B | 50 |  |
| 31 | Diseño y seguimiento de actividades experimentales o virtuales aplicables en los laboratorios | B | 50 |  |
| 32 | Ensayo | B | 50 |  |
| 33 | Estrategia didáctica | B | 50 |  |
| 34 | Glosario de términos por asignatura o área de conocimientos | B | 50 |  |
| 35 | Guía de lectura | B | 50 |  |
| 36 | Guía para examen extraordinario | B | 50 |  |
| 37 | Infografía o infograma | B | 50 |  |
| 38 | Impartición de cursos en línea para alumnos | B | 50 |  |
| 39 | Material audiovisual | B | 50 |  |
| 40 | Material didáctico con uso de software | B | 50 |  |
| 41 | Monografía | B | 50 |  |
| 42 | Organización de actividades académicas | B | 50 | Nivel por alcance (Glosario): A local, B general en el Colegio, C nacional/internacional; hasta 4 organizadores. |
| 43 | Paquete didáctico | B | 50 | Glosario: RUBRO I-B o C; nivel C solo si cubre todas las unidades del curso y con evaluación satisfactoria de Comité de Pares; hasta 6 profesores. |
| 44 | Participación en la elaboración y publicación de una revista | B | 50 | Glosario: RUBRO I, III y V-B o C; nivel C si además colabora con al menos 2 artículos o ensayos propios; mínimo 2 números al año. |
| 45 | Prácticas de campo | B | 50 |  |
| 46 | Programas de cómputo para la enseñanza | B | 50 |  |
| 47 | Programa operativo | B | 50 |  |
| 48 | Revisión técnica de libro | B | 50 |  |
| 49 | Tutoría para alumnos | B | 50 |  |
| 50 | Video educativo | B | 50 | Glosario: RUBRO I-B; duración mínima 5 minutos; hasta 4 profesores; con guía y guion. |
| 51 | Actividades experimentales para reforzar aprendizajes curriculares en SILADIN | C | 150 |  |
| 52 | Apoyo a la instrumentación de los programas de estudio | C | 150 |  |
| 53 | Asesoría para alumnos orientada a mejorar la calidad del aprendizaje y el egreso | C | 150 |  |
| 54 | Coordinador de libro | C | 150 |  |
| 55 | Cuaderno de trabajo | C | 150 |  |
| 56 | Curso curricular o no curricular en línea | C | 150 |  |
| 57 | Dirección de obra de teatro de carácter didáctico | C | 150 |  |
| 58 | Diseño y elaboración de materiales didácticos interactivos para el Portal Académico | C | 150 |  |
| 59 | Diseño y seguimiento de actividades experimentales o virtuales aplicables en los laboratorios | C | 150 |  |
| 60 | Examen diagnóstico académico (EDA) | C | 150 |  |
| 61 | Formación personalizada de profesores | C | 150 |  |
| 62 | Formador de tutores | C | 150 | Actividad del Cuadro nivel C que faltaba en el JSON del usuario; se incorpora aquí. |
| 63 | Libro | C | 150 |  |
| 64 | Libro de texto | C | 150 |  |
| 65 | Manual de prácticas de laboratorio | C | 150 |  |
| 66 | Material didáctico con uso de software | C | 150 |  |
| 67 | Monografía | C | 150 |  |
| 68 | Organización de actividades académicas | C | 150 | Nivel por alcance: A local, B general, C nacional/internacional; hasta 4 organizadores. |
| 69 | Paquete didáctico | C | 150 | Glosario: nivel C solo si cubre todas las unidades del curso y con evaluación satisfactoria de Comité de Pares; hasta 6 profesores. |
| 70 | Paquete para la evaluación de un curso | C | 150 |  |
| 71 | Paquete para la evaluación extraordinaria de un curso | C | 150 |  |
| 72 | Participación en la elaboración y publicación de una revista | C | 150 | Glosario: nivel C si además colabora con al menos 2 artículos o ensayos propios; mínimo 2 números al año. |
| 73 | Programa de cómputo para la enseñanza | C | 150 |  |
| 74 | Programa operativo | C | 150 |  |
| 75 | Programa permanente de atención al rezago escolar | C | 150 |  |
| 76 | Propuesta educativa | C | 150 |  |
| 77 | Seguimiento, análisis y preparación grupal de la experiencia docente | C | 150 |  |
| 78 | Traducción de libro | C | 150 |  |
| 79 | Tutoría para alumnos | C | 150 |  |

> Valores: Nivel A = 25 puntos, B = 50 puntos, C = 150 puntos. Son los únicos valores del Cuadro, sin excepciones.


## Actualización v2 — Glosario unificado (2026-11-18)

Fuente: `cch_normatividad_unificada_2020_2023.json` (fecha de generación 2026-11-18), glosario completo de 107 términos. Catálogo v2: `protocolo-puntaje-cch-v2.json` (el JSON v1 de 158 actividades no se tocó).

**Términos del glosario que tocan este rubro: 63** (44 solo en este rubro; el resto se comparte con otros rubros). Por nivel en este rubro: A: 7, B: 34, C: 22. Digitales (isDigital): 22 de 63.

**Ojo:** el glosario tiene 107 términos y el Cuadro 165 actividades. El glosario agrupa variantes (alcance, horas, unidades) en un solo término, así que un término puede cubrir varios niveles: cuando la definición menciona más de un nivel, el nivel real se elige por alcance/horas según la definición, no por el campo `level` solo. Esos casos están marcados con ⚠ en la tabla.

### Cambios v2 en este rubro

- «Participación en jornadas académicas» queda en Rubro I o III, nivel A (gl-095): se resuelve la contradicción Glosario vs Cuadro del análisis v1.
- «Organización de actividades académicas» (gl-090): un solo término con nivel por alcance — A local (25), B general (50), C nacional/internacional (150). El campo `level` del glosario trae B; el nivel real se elige por alcance según la definición.
- «Paquete didáctico» (gl-091), «Programas de cómputo para la enseñanza» (gl-100), «Material didáctico con uso de software» (gl-086/gl-087), «Cuaderno de trabajo» (gl-035/gl-036) y «Monografía» (gl-089) se desdoblan por alcance/unidades en el glosario (B parcial/unidad, C curso completo o Comité de Pares).
- «Relator / Reseña / Revisión técnica / Secuencia didáctica» (gl-105) agrupa 4 actividades de nivel A (y Revisión técnica en B): en el Cuadro son filas separadas; aquí van juntas con su nivel propio en la definición.
- «Sinodal / Traducción / Tutoría PIT / Video educativo / Visitas guiadas» (gl-107) agrupa 5 actividades (A, B y C según la actividad): no usar el nivel B del campo para todas; ver la definición.
- «Conferencia o videoconferencia» (gl-031) ahora es un solo término en Rubros I, II y V, nivel B.
- «Formador de tutores» (gl-067, I-C, 150 pts) ya estaba en la plantilla v1; el glosario lo confirma.

### Términos del glosario unificado en este rubro

| ID | Actividad | Nivel | Pts | Digital | Definición | Ejemplo | Sede |
|---|---|---|---|---|---|---|---|
| gl-028 | Compilación de Lecturas (Una Unidad — Nivel A) | A | 25 | No | Lecturas de uno o varios autores dirigidas a alumnos o profesores que cubren al menos una unidad de un curso, con índice, presentación, actividades didácticas y fuentes en formato APA. | Compilación de lecturas y actividades de comprensión sobre historia de la estadística para la Unidad I. | Academia de Asignatura / Secretaría Académica del Plantel. |
| gl-061 | Examen Extraordinario | A | 25 | No | Instrumento de evaluación elaborado colegiadamente con preguntas/actividades acordes al programa y guía, criterios de calificación y aplicación en periodo de exámenes. | Elaboración colegiada y aplicación oficial de examen extraordinario de Matemáticas III en periodo ordinario de extraordinarios. | Secretaría de Administración Escolar / Jefatura de Área del Plantel. |
| gl-071 | Guía de Lectura (Una Unidad — Nivel A) | A | 25 | No | Conjunto de secuencias didácticas elaboradas para que los estudiantes interpreten, comprendan, profundicen e interactúen con diferentes textos relativos al logro de los aprendizajes de una unidad de una asignatura. | Guía de lectura analítica para la Unidad I de Taller de Lectura y Redacción I. | Academia Local / Secretaría Académica del Plantel. |
| gl-080 | Lectura con Fines Didácticos | A | 25 | No | Lectura en voz alta de obra fundamental realizada ante auditorio o evento cultural/académico para difundir obras indispensables en formación humanística y científica, con constancia. | Lectura comentada de textos clásicos de divulgación científica y filosófica en jornada cultural del plantel. | Departamento de Difusión Cultural / Biblioteca del Plantel. |
| gl-088 | Material Educativo de Audio | A | 25 | Sí | Producción de uno o más materiales digitalizados de audio con base en una estrategia didáctica para apoyar el aprendizaje de una asignatura, incluyendo guion detallado. | Cápsulas de audio digitalizado con guion didáctico para comprensión auditiva en Inglés o Francés I-IV. | Mediateca / Departamento de Idiomas o Área Académica. |
| gl-095 | Participación en Jornadas Académicas | A | 25 | No | Cumplimiento de tareas y actividades periódicas y sistemáticas en seminarios de área o semanas académicas con duración mínima de 20 horas y asistencia mínima al 90% de las sesiones. | Asistencia y participación acreditada (>90%) en Semana Académica o Seminario Local de Área (20 horas). | Jefatura de Área / Secretaría Académica del Plantel. |
| gl-105 | Relator / Reseña Bibliográfica o Videográfica / Revisión Técnica de Libro / Secuencia Didáctica ⚠ | A | 25 | No | Agrupa productos de nivel A y B: Relator (V-A, 25 pts, sinopsis ≥1 cuartilla); Reseña bibliográfica o videográfica (V-A, 25 pts, ≥3 cuartillas); Secuencia didáctica (I-A, 25 pts, fases inicial, desarrollo y síntesis con anexos); Revisión técnica de libro (I-B, 50 pts). | Secuencia didáctica completa de 3 fases (inicio, desarrollo, síntesis) para un aprendizaje de Estadística I (Nivel A: 25 pts). | Secretaría Académica del Plantel / Comités Editoriales. |
| gl-002 | Actividades Creativas | B | 50 | No | Actividades extra-aula dirigidas a alumnos para fomentar su interés y mejorar su conocimiento acerca de ciencia, tecnología, humanidades, cultura y artes, con base en construcción o manipulación de instrumentos/recursos. Duración mínima de 40 horas. Informe: a) diseño; b) desarrollo; c) evaluación. | Taller extra-aula de 40 horas de construcción de instrumentos ópticos y prototipos geométricos en el Plantel Vallejo. | Secretaría de Servicios de Apoyo al Aprendizaje / Departamentos de Plantel. |
| gl-004 | Actualización de Paquete Didáctico | B | 50 | No | Actualización o adaptación de un paquete didáctico original orientada a mejorar el logro de aprendizajes y vigencia de contenidos. Informe: a) justificación; b) cambios conceptuales/metodológicos; c) cambios en estrategias y recursos; d) nuevas fuentes en APA; e) mejoras en edición; f) paquete de origen como anexo. | Actualización integral del Paquete Didáctico de Estadística y Probabilidad I incorporando bases de datos actuales y formato APA. | Secretaría Académica del Plantel / Seminario de Área. |
| gl-005 | Adaptación de Equipo o Programas de Cómputo para la Enseñanza | B | 50 | Sí | Selección y acoplamiento de equipos o programas de cómputo, de preferencia de uso libre, para apoyo de la enseñanza y aprendizaje (experimentos simulados virtuales, medición computarizada de datos, representación gráfica de modelos matemáticos). Informe: a) manual; b) aprendizajes atendidos; c) aplicaciones didácticas interactivas. | Acoplamiento de software libre GeoGebra y sensores digitales de movimiento para modelación gráfica en Matemáticas IV. | SILADIN / Salas de Cómputo / Secretaría Académica del Plantel. |
| gl-006 | Antología | B | 50 | No | Selección de textos o materiales audiovisuales para instrumentación didáctica y logro de aprendizajes de una asignatura o unidad. Incluye: a) portada; b) índice; c) presentación; d) justificación con ficha y sinopsis; e) sugerencias de actividades de aprendizaje. | Antología comentada de textos filosóficos y documentales digitales sobre ética y ciencia para Filosofía II. | Departamento de Materia / Academia Local del Plantel. |
| gl-008 | Apoyos Bibliográficos, Hemerográficos, Filmográficos y Cibergráficos para un Curso (Rubro I) | B | 50 | Sí | Recopilación, comprensión, interpretación y aplicación de recursos bibliográficos, hemerográficos, filmográficos, cibergráficos o sitios web vigentes y accesibles al bachillerato. Incluye al menos 10 reseñas críticas, vinculación con programa y fuentes en formato APA. | Compendio con 12 reseñas críticas de repositorios digitales, simuladores web y bibliografía especializada para Cálculo I. | Biblioteca / Mediateca / Secretaría Académica del Plantel. |
| gl-010 | Artículo Académico (Rubro I) | B | 50 | No | Escrito original elaborado hasta por dos profesores, publicado en revista especializada, que aporte ideas o reflexiones sobre la didáctica del área o el aprendizaje en el bachillerato (extensión mínima de 5 cuartillas). | Artículo 'Estrategias didácticas para la enseñanza de la probabilidad frecuencial en el CCH' publicado en revista arbitrada. | Revistas académicas arbitradas (UNAM, Perfiles Educativos, Eutopía). |
| gl-014 | Asesoría para Alumnos Orientada a Mejorar la Calidad del Aprendizaje y el Egreso (Nivel B) | B | 50 | No | Labor de apoyo académico sistemático presencial o semipresencial (mínimo 4 horas semanales durante un semestre) en modalidad curricular o extracurricular, con registro en el PSI y materiales didácticos. | Programa semestral de asesorías de Matemáticas I-IV dentro del PIA registrado en el Sistema de Seguimiento Integral (PSI). | Programa Institucional de Asesorías (PIA) del Plantel y Sistema PSI. |
| gl-018 | Banco de Datos Meteorológicos | B | 50 | Sí | Presentación organizada de datos de una estación meteorológica que cubra al menos un año de observaciones y registros en formato internacional, con estadísticas anuales, interpretaciones climáticas y bitácora de alumnos. | Base de datos climatológicos anuales de la Estación Meteorológica del Plantel Sur con análisis estadístico para Geografía y Estadística. | Programa de Estaciones Meteorológicas del Bachillerato Universitario (PEMBU). |
| gl-019 | Banco de Información para una Asignatura | B | 50 | Sí | Selección de mínimo 50 referencias (hemerográficas, bibliográficas, filmográficas, sitios web) realizada por hasta 4 profesores de una asignatura, coadyuvando al logro de aprendizajes, con descripción y formato APA. | Banco digital de 55 fuentes comentadas en APA para la asignatura de Estadística y Probabilidad II. | Secretaría Académica del Plantel / Academia Local. |
| gl-020 | Banco de Reactivos | B | 50 | Sí | Elaboración de reactivos de evaluación, impresos o en línea, organizados conforme a aprendizajes del programa. Incluye mínimo 100 reactivos de diferentes tipos y modalidades clasificados por grado de dificultad e instructivo. | Banco en línea de 120 reactivos clasificados por nivel cognitivo y dificultad para Matemáticas II. | Secretaría Académica / Plataforma de Evaluación del Plantel. |
| gl-025 | Colaborador de Libro | B | 50 | No | Profesor(es) que participan en la elaboración de un libro en actividades como redacción, preparación de cuadros estadísticos, selección de imágenes/dibujos propios o corrección de estilo. | Elaboración de gráficos estadísticos, ejercicios y revisión de estilo para libro institucional del CCH. | Comité Editorial del CCH / Dependencia Editora. |
| gl-027 | Comité Académico Local para la Evaluación de las Guías de Exámenes Extraordinarios | B | 50 | No | Grupo de profesores convocado por área académica y avalado por el Director del plantel que revisa, corrige y aprueba guías de examen extraordinario con base en una rúbrica durante 1 o 2 años lectivos. | Integrante del Comité Local de Evaluación de Guías Extraordinarias de Cibernética y Computación en Plantel Oriente. | Dirección del Plantel y Jefatura de Área. |
| gl-029 | Compilación de Lecturas (Curso Completo — Nivel B) | B | 50 | No | Compilación de lecturas estructurada con actividades de instrumentación didáctica y fuentes APA que cubre el total de un curso semestral. | Compilación integral de lecturas comentadas para todas las unidades de Taller de Lectura y Redacción I. | Academia de Asignatura / Secretaría Académica del Plantel. |
| gl-030 | Compilador de Libro | B | 50 | No | Encargado de: a) seleccionar; b) organizar; c) presentar y d) publicar un libro con colaboraciones originales sobre una temática determinada. Máximo 2 compiladores. | Compilación de memorias académicas sobre innovación educativa en el bachillerato universitario. | Programa Editorial del CCH / Instituciones Académicas. |
| gl-031 | Conferencia o Videoconferencia | B | 50 | Sí | Exposición de un tema relacionado con la especialidad o interés del Colegio en jornada académica interna o externa. Debe entregarse por escrito en un mínimo de 10 cuartillas. | Videoconferencia magistral sobre Inteligencia Artificial y Educación Matemática con texto entregado de 12 cuartillas. | Jornadas Académicas / Coloquios / Auditorios del CCH. |
| gl-035 | Cuaderno de Trabajo (Una Unidad — Nivel B) | B | 50 | No | Publicación con actividades teórico-prácticas dosificadas por complejidad sobre una unidad del Programa de Estudio, con guía de uso, estrategias, instrumentos de evaluación, valoración y fuentes APA. | Cuaderno de trabajo con ejercicios progresivos y rúbricas para la Unidad II de Física I. | Secretaría Académica / Comité Editorial del Plantel. |
| gl-038 | Cursos Especiales o Extracurriculares para Alumnos (<40h Nivel A / ≥40h Nivel B) ⚠ | B | 50 | Sí | Cursos presenciales o en línea de apoyo en orientación vocacional, regularización, deporte, divulgación científica o idiomas. Informe: planeación, logros, recursos y evaluación individual. Nivel A = 25 pts (<40h); Nivel B = 50 pts (40 horas o más). | Curso extracurricular en línea de 40 horas de 'Introducción a Python y Análisis de Datos' para alumnos (Nivel B: 50 pts). | Secretaría de Servicios Estudiantiles / Difusión Cultural / SILADIN. |
| gl-043 | Desarrollo de un Tema con Fines Didácticos | B | 50 | No | Exposición escrita de un tema del Programa de Estudio dirigida a alumnos o profesores (mínimo 10 cuartillas). Incluye: índice, presentación de aprendizajes, desarrollo, aparato crítico, instrumentación didáctica y fuentes APA. | Documento didáctico de 14 cuartillas sobre Distribuciones de Probabilidad con secuencias didácticas para Estadística I. | Academia de Asignatura / Secretaría Académica del Plantel. |
| gl-046 | Dirección de Obra de Teatro de Carácter Didáctico (Nivel B / Evento Nivel C) ⚠ | B | 50 | No | Organización y seguimiento con alumnos/profesores que culmina con puesta en escena didáctica ante público externo (Nivel B: 50 pts). Nivel C (150 pts) si incorpora reflexión conjunta y presentación en evento local o general. | Puesta en escena de obra didáctica sobre historia de la ciencia presentada en encuentro teatral del CCH. | Departamento de Difusión Cultural del Plantel. |
| gl-052 | Ensayo | B | 50 | No | Escrito original individual (mínimo 5 cuartillas) de carácter argumentativo con tesis, argumentos, conclusiones y fuentes APA, publicado en proyecto editorial del Colegio o institución avalada por ANUIES. | Ensayo argumentativo sobre el Modelo Educativo del CCH y la alfabetización estadística publicado en revista del Colegio. | Proyectos Editoriales del CCH / Publicaciones ANUIES. |
| gl-055 | Estrategia Didáctica | B | 50 | Sí | Conjunto estructurado de procedimientos y actividades para orientar enseñanza-aprendizaje de un tema o unidad: contenidos y aprendizajes; apertura, desarrollo y cierre; evaluación diagnóstica, formativa y sumativa. Si es interactiva, usar software libre. | Estrategia didáctica completa con apertura, desarrollo y cierre e instrumentos de evaluación para Estadística I. | Secretaría Académica del Plantel / Seminario Local. |
| gl-069 | Glosario de Términos por Asignatura o Área de Conocimiento | B | 50 | No | Acopio y definición alfabética de conceptos significativos de una asignatura acorde con enfoques disciplinario y didáctico, con justificación, marco teórico, ejemplos y fuentes APA. | Glosario didáctico ilustrado de conceptos fundamentales de Estadística Descriptiva e Inferencial para bachillerato. | Academia de Asignatura / Secretaría Académica del Plantel. |
| gl-072 | Guía de Lectura (Todas las Unidades — Nivel B) | B | 50 | No | Conjunto de secuencias didácticas de comprensión e interpretación de textos que abarca todas las unidades del Programa de Estudio de la asignatura. | Guía de lectura completa para todas las unidades de Historia de México I. | Academia Local / Secretaría Académica del Plantel. |
| gl-074 | Guía para Examen Extraordinario | B | 50 | Sí | Documento impreso o en línea elaborado colegiadamente (introducción, instrucciones, conceptos clave por unidad, actividades, autoevaluación y fuentes APA), aprobado por Dirección y aplicado. | Guía oficial en línea para examen extraordinario de Estadística y Probabilidad I aprobada por el Comité Local. | Comité Local de Evaluación de Guías / Dirección del Plantel. |
| gl-075 | Infografía o Infograma | B | 50 | Sí | Elaboración de al menos 10 infografías o infogramas acordes a los aprendizajes o temas de un Programa de Estudio, combinando imágenes sintéticas, gráficos y textos explicativos. | Colección digital de 12 infografías didácticas sobre distribución normal, muestreo y correlación para Estadística II. | Secretaría Académica del Plantel / Portal Académico. |
| gl-076 | Impartición de Cursos en Línea para Alumnos | B | 50 | Sí | Cursos a distancia semestrales en plataforma LMS donde el profesor revisa y retroalimenta tareas/exámenes, ingresa al menos 2 veces al día y obtiene evaluación favorable de alumnos en PIA/PAL. | Asesoría semestral en línea en el Programa de Asesoría en Línea (PAL) para alumnos de Matemáticas III. | Programa de Asesoría en Línea (PAL) / PIA / Sistema PSI. |
| gl-085 | Material Audiovisual | B | 50 | Sí | Material original (serie de diapositivas, filmaciones, videos, podcast) organizado conforme a un guion para presentar temas del Programa de Estudio, con información de utilidad y sugerencias de aplicación. | Serie de podcasts educativos y presentaciones multimedia guionizadas para apoyar la asignatura de Cibernética. | Mediateca / Departamento Audiovisual / Secretaría Académica. |
| gl-086 | Material Didáctico con Uso de Software (Una Unidad — Nivel B) | B | 50 | Sí | Material didáctico interactivo elaborado con software o aplicaciones de uso libre para dispositivos móviles/computadoras con elementos audiovisuales, texto y secuencia didáctica para un tema o unidad. | Colección de applets interactivos en GeoGebra con secuencia didáctica para la Unidad II de Matemáticas III. | Secretaría Académica del Plantel / Salas de Cómputo. |
| gl-089 | Monografía (Nivel B / Comité de Pares Nivel C) ⚠ | B | 50 | No | Escrito pormenorizado y sistemático sobre contenidos del Programa de Estudio (introducción, desarrollo, metodología, análisis, conclusiones y fuentes APA). Nivel B = 50 pts; Nivel C = 150 pts con evaluación satisfactoria de Comité de Pares. | Monografía exhaustiva sobre métodos de muestreo estadístico o modelación matemática. | Secretaría Académica / Comité de Pares. |
| gl-090 | Organización de Actividades Académicas (Local A / General B / Nacional-Internacional C) ⚠ | B | 50 | No | Planeación, difusión y realización de coloquios, congresos, ferias, encuentros, muestras o torneos (máximo 4 organizadores). Nivel A (25 pts) = locales; Nivel B (50 pts) = generales en el Colegio; Nivel C (150 pts) = nacionales o internacionales. | Comité organizador de Jornada Académica General del Colegio (50 pts) o Congreso Nacional/Internacional (150 pts). | Dirección del Plantel / Dirección General del CCH. |
| gl-096 | Participación en la Elaboración y Publicación de una Revista (Nivel B / Con 2 Artículos Propios Nivel C) ⚠ | B | 50 | Sí | Actividades durante un año en Comité Editorial de revista impresa o digital del Colegio (mínimo 2 números publicados). Nivel B = 50 pts; Nivel C = 150 pts si además colabora con al menos 2 artículos o ensayos de su autoría. | Integrante del Comité Editorial de revista académica digital del CCH con 2 números publicados en el año. | Comité Editorial de Revista Institucional / Plantel. |
| gl-098 | Prácticas de Campo | B | 50 | No | Conjunto de actividades teórico-prácticas para realizar prácticas de campo no obligatorias sobre temas del Programa de Estudio, apegadas al Reglamento de Prácticas de Campo del CCH, con presentación de resultados. | Práctica de campo interdisciplinaria en reserva ecológica o centro industrial con reporte de resultados estudiantiles. | Secretaría Académica / Comisión Local de Prácticas de Campo. |
| gl-102 | Programa Operativo (Individual Nivel B / Colegiado Anual Nivel C) ⚠ | B | 50 | No | Propuesta didáctica individual o colegiada (máximo 6 integrantes) que articula aprendizajes, contenidos, estrategias, materiales, evaluación y fuentes. Nivel B = 50 pts; Nivel C = 150 pts si es colegiado, incluye los 2 semestres de un ciclo y evidencias de aplicación. | Programa operativo colegiado anual (Semestres Non y Par) de Matemáticas I-II con evidencias de aplicación en aula (Nivel C: 150 pts). | Secretaría Académica del Plantel / Academia Local. |
| gl-107 | Sinodal de Examen de Grado / Traducción de Artículo o Libro / Tutoría para Alumnos (PIT) / Video Educativo / Visitas Guiadas ⚠ | B | 50 | Sí | Sinodal examen de grado (V-A: 25 pts); Visitas guiadas (I-A: 25 pts); Traducción artículo/ensayo (V-B: 50 pts); Traducción de libro (I/III/V-C: 150 pts con Pares); Video educativo digital original con guion ≥5 min (I-B: 50 pts); Tutoría para alumnos PIT (I-B: 50 pts por 1 grupo anual; I-C: 150 pts por 2 grupos curriculares). | Tutoría grupal anual dentro del PIT (50 pts 1 grupo / 150 pts 2 grupos) o Video Educativo digital guionizado (50 pts). | Programa Institucional de Tutorías (PIT) / Mediateca / Facultades UNAM. |
| gl-003 | Actividades Experimentales para Reforzar Aprendizajes Curriculares en el SILADIN | C | 150 | No | Conjunto de actividades experimentales diseñadas y adaptadas por uno hasta cuatro profesores. Cada actividad se presenta al menos a 12 grupos curriculares en el SILADIN. Se diseñan al menos 6 actividades por año (3 por semestre). Informe: a) diseño de 6 actividades; b) recursos; c) calendario; d) evaluación conjunta. | Diseño y presentación de 6 actividades experimentales de análisis químico instrumental en el SILADIN para 14 grupos de Química III. | Secretaría Técnica del SILADIN del Plantel y SSAA. |
| gl-007 | Apoyo a la Instrumentación de los Programas de Estudio | C | 150 | No | Grupo de trabajo convocado por instancia central de Dirección (profesores de distintos planteles) para apoyar instrumentación de Programas de Estudio de un ciclo escolar. Informe: a) diagnóstico; b) valoración de programas; c) inventario de materiales; d) cursos propuestos; e) eventos académicos. | Comisión institucional interplanteles convocada por DGCCH para la instrumentación didáctica de Cibernética y Computación I y II. | Secretaría Académica de la Dirección General del CCH. |
| gl-015 | Asesoría para Alumnos Orientada a Mejorar la Calidad del Aprendizaje y el Egreso (Nivel C) | C | 150 | No | Asesoría sistemática (mínimo 4 horas semanales) realizada durante los dos semestres de un ciclo escolar completo, brindando apoyo a un mínimo de 15 alumnos por semestre con evidencias de seguimiento, mejora y acreditación en el PSI. | Asesoría anual continua (2 semestres) a 18 alumnos por semestre de Química I y II con índice comprobado de acreditación. | Programa Institucional de Asesorías (PIA) / SSAA / Sistema PSI. |
| gl-034 | Coordinador de Libro | C | 150 | No | Profesor(es) (máximo 2) a cargo de: a) organización; b) planeación; c) dirección; d) supervisión de la elaboración de un libro y e) autoría de una de las partes que componen la obra. | Coordinación general y autoría de capítulo en libro colectivo del Seminario Institucional de Matemáticas. | Comité Editorial del CCH / Dirección General. |
| gl-036 | Cuaderno de Trabajo (Curso Semestral — Nivel C) | C | 150 | No | Cuaderno de trabajo completo con actividades teórico-prácticas dosificadas, estrategias, instrumentos de evaluación y valoración de resultados que atiende un curso semestral completo. | Cuaderno de trabajo integral para todo el semestre de Matemáticas I con evaluación diagnóstica y sumativa. | Secretaría Académica / Comité Editorial del Plantel o DGCCH. |
| gl-037 | Curso Curricular o No Curricular en Línea | C | 150 | Sí | Diseño e impartición de un curso en línea sobre plataforma LMS (máximo 6 profesores) que promueve trabajo individual/colaborativo e investigación. Incluye estructura, actividades interactivas, hipervínculos multimedia, diseño instruccional y URL, con evaluación satisfactoria de Comité de Pares con experto en LMS. | Curso curricular completo en línea de Estadística y Probabilidad I alojado en Aulas Virtuales CCH con dictamen de Comité de Pares. | Aulas Virtuales CCH / SSAA / Comité de Pares. |
| gl-050 | Diseño y Elaboración de Materiales Didácticos Interactivos para el Portal Académico | C | 150 | Sí | Diseño y elaboración de Objetos de Aprendizaje interactivos basados en Programa de Estudio, enfocados en aprendizajes de difícil comprensión. Cumplen criterios de usabilidad DGTIC y son desarrollados por equipo interdisciplinario coordinado por Departamento de Medios Digitales. | Objeto de Aprendizaje interactivo publicado en el Portal Académico del CCH sobre Funciones Cuadráticas o Probabilidad Condicional. | Departamento de Medios Digitales (DGCCH) / Portal Académico CCH / DGTIC. |
| gl-051 | Diseño y Seguimiento de Actividades Experimentales o Virtuales Aplicables en los Laboratorios ⚠ | C | 150 | Sí | Diseñar y presentar en grupos curriculares actividades experimentales o apoyadas en TIC (sensores, simuladores virtuales, modelos moleculares/computacionales, animaciones). Nivel B (50 pts) = 4 actividades/año (2/semestre); Nivel C (150 pts) = al menos 6 actividades y evaluación satisfactoria de Comité de Pares. | Diseño y aplicación curricular de 6 prácticas con simuladores virtuales y sensores digitales en laboratorios de Física/Química (Nivel C: 150 pts). | Laboratorios Curriculares / SILADIN / Comité de Pares. |
| gl-060 | Examen Diagnóstico Académico (EDA) | C | 150 | Sí | Instrumento de evaluación elaborado por grupo convocado centralmente: tabla de especificaciones; análisis psicométrico estadístico (Iteman: dificultad, discriminación, confiabilidad); examen y aval de Secretaría de Planeación del CCH. | Diseño, validación psicométrica con Iteman y análisis estadístico del Examen Diagnóstico Académico (EDA) de Matemáticas. | Secretaría de Planeación del CCH. |
| gl-063 | Formación Personalizada de Profesores | C | 150 | No | Trabajo realizado durante un año escolar con dos o más profesores de asignatura, incluyendo aspectos disciplinarios/didácticos y observación mutua de clases con informe reflexivo. | Acompañamiento anual con observación recíproca de clases a tres profesores de asignatura de nuevo ingreso en Matemáticas. | Secretaría Docente / Jefatura de Área del Plantel. |
| gl-067 | Formador de Tutores | C | 150 | No | Profesor con al menos 3 años de experiencia en el Programa Institucional de Tutorías (PIT) que capacita durante un año al menos a 3 profesores de nuevo ingreso al PIT. | Capacitación anual, seguimiento y curso de inducción impartido a cuatro tutores de nuevo ingreso en el PIT. | Coordinación Central y Local del Programa Institucional de Tutorías (PIT). |
| gl-081 | Libro ⚠ | C | 150 | No | Obra original coherente e integrada con rigor conceptual y metodológico vinculada al Modelo Educativo y Plan de Estudios, revisada por Comité Editorial y publicada impresa o digital. Nivel C (150 pts) hasta 6 autores; más de 6 autores = Nivel B (50 pts), salvo dictamen de alta calidad. | Libro publicado por el CCH sobre historia, epistemología y enseñanza de las matemáticas en el nivel medio superior. | Comité Editorial del CCH / Dirección General. |
| gl-082 | Libro de Texto | C | 150 | No | Obra original dirigida a alumnos para facilitar enseñanza-aprendizaje de una asignatura del Plan de Estudios del Colegio, con actividades, problemas, equilibrio teórico-práctico y aval de Comité Editorial. | Libro de texto oficial para los cursos curriculares de Matemáticas I a IV o Estadística y Probabilidad. | Comité Editorial del CCH / Programa Editorial UNAM. |
| gl-084 | Manual de Prácticas de Laboratorio | C | 150 | No | Conjunto estructurado de técnicas y procedimientos (máximo 6 integrantes) para actividades experimentales o de campo sobre todas las unidades del Programa de Estudio, con análisis de datos y fuentes APA. | Manual integral de prácticas experimentales y computacionales para todas las unidades de Física II. | Jefatura de Área de Ciencias Experimentales / SILADIN / Comité Editorial. |
| gl-087 | Material Didáctico con Uso de Software (Curso Completo — Nivel C) | C | 150 | Sí | Material didáctico interactivo con software o aplicaciones de uso libre que cubre el curso completo de una asignatura y cuenta con evaluación satisfactoria de un Comité de Pares. | Suite interactiva en software libre con secuencias didácticas para todo el curso de Cálculo I avalada por Comité de Pares. | Secretaría Académica / Comité de Pares / Portal Académico. |
| gl-091 | Paquete Didáctico (Parcial Nivel B / Curso Completo Nivel C) ⚠ | C | 150 | No | Conjunto estructurado de materiales para enseñanza-aprendizaje de una asignatura (hasta 6 profesores) que facilite trabajo de taller/experimental. Nivel B = 50 pts; Nivel C = 150 pts si cubre todas las unidades de un curso y cuenta con evaluación satisfactoria de Comité de Pares o Editorial. | Paquete didáctico completo con talleres, lecturas y evaluaciones para las 4 unidades de Estadística y Probabilidad I. | Comité de Pares / Comité Editorial / Secretaría Académica. |
| gl-092 | Paquete para la Evaluación de un Curso | C | 150 | No | Conjunto estructurado de lineamientos, criterios e instrumentos para evaluación diagnóstica, formativa y sumativa de cada unidad de un curso, con evaluación satisfactoria de Comité de Pares o Editorial. | Paquete integral de instrumentos y rúbricas de evaluación ordinaria por unidad para Matemáticas II aprobado por Comité de Pares. | Comité de Pares / Secretaría Académica. |
| gl-093 | Paquete para la Evaluación Extraordinaria de un Curso | C | 150 | No | Conjunto estructurado que incluye: a) guía para examen extraordinario; b) banco de reactivos; c) tres modelos de examen derivados del banco. Evaluado satisfactoriamente por Comité de Pares, guía publicada y exámenes aplicados. | Paquete completo (guía publicada + banco de reactivos + 3 exámenes aplicados) para Matemáticas IV. | Comité de Pares / Dirección del Plantel / Administración Escolar. |
| gl-100 | Programas de Cómputo para la Enseñanza (Unidad Nivel B / Curso Completo Nivel C) ⚠ | C | 150 | Sí | Programas de cómputo originales e interactivos con fines didácticos (presentación, manual de instalación/operación, aprendizajes, orientación didáctica, autoevaluación y fuentes APA). Nivel B = 50 pts (unidad); Nivel C = 150 pts (curso completo + evaluación Comité de Pares). | Software educativo interactivo original para todo el curso de Cibernética o Estadística aprobado por Comité de Pares. | Departamento de Medios Digitales / Comité de Pares / DGTIC. |
| gl-103 | Programa Permanente de Atención al Rezago Escolar | C | 150 | No | Diseño y desarrollo de programa institucional convocado por Dirección General o planteles para prevenir y abatir reprobación y deserción en una asignatura, con diagnóstico, acciones, resultados y reflexión. | Programa institucional de atención al rezago y abatimiento de reprobación en Matemáticas I y II. | Dirección General del CCH / Dirección del Plantel / SSAA. |
| gl-104 | Propuesta Educativa | C | 150 | No | Propuesta teórico-metodológica fundamentada e innovadora basada en estudio formal para mejorar enseñanza-aprendizaje de una asignatura o área, con marco teórico, contribución disciplinaria/pedagógica, propuestas y evaluación satisfactoria de Comité de Pares. | Propuesta teórico-metodológica innovadora para la integración de ciencia de datos en el tronco común de Matemáticas. | Comité de Pares / Secretaría Académica DGCCH. |
| gl-106 | Seguimiento, Análisis y Preparación Grupal de la Experiencia Docente / Seminarios Monitores ⚠ | C | 150 | No | Seguimiento grupal institucional de dos cursos de asignaturas impartidas durante el mismo ciclo escolar con planeación, ajustes, evaluación de aprendizajes y reflexión (Rubro I-C: 150 pts); y Seminarios/talleres extracurriculares para alumnos monitores (Rubro V-B: 50 pts / V-C: 150 pts con réplica). | Informe grupal anual de seguimiento y análisis de la experiencia docente en dos cursos curriculares del ciclo escolar. | Secretaría Académica del Plantel / Grupos Institucionales. |

Los términos con ⚠ mencionan más de un nivel en su definición; el campo Nivel es el nivel base del término y el nivel aplicable se decide por alcance/horas (ver «Cambios v2» y la definición).

## Correcciones aplicadas en este rubro (respecto al JSON del usuario)

- **Agregadas (estaban en el Cuadro y faltaban en el JSON):** I-A «Cursos especiales o extracurriculares para alumnos» e «Participación en jornadas académicas»; I-B: «Compilación de lecturas», «Compilador de libro», «Conferencias o videoconferencias», «Cuaderno de trabajo», «Curso curricular o no curricular en línea», «Guía de lectura», «Organización de actividades académicas» (nivel B, general en el Colegio) y «Participación en la elaboración y publicación de una revista»; I-C: «Formador de tutores».
- **El JSON no traía ninguna de esas 8 en el nivel B del Rubro I.** Varias (Cuaderno de trabajo, Curso curricular o no curricular en línea, Organización de actividades académicas) solo aparecían como nivel C en el Rubro I; las demás (Compilación de lecturas, Compilador de libro, Conferencias o videoconferencias, Guía de lectura) no aparecían en el Rubro I en ese nivel, aunque sí en otros rubros. En el Cuadro existen en **ambos** niveles, B y C; el nivel lo define el alcance/cobertura y el dictamen del Comité de Pares, no el nombre.
- **Corregido:** la variante I-B de «Organización de actividades académicas» (general en el Colegio) ya no falta.


## Machote 1 — Correo de envío / solicitud

> **Nota:** para un COA no se envía el expediente por correo: se registra y se cargan las pruebas en la plataforma COA (https://www.cch.unam.mx). Este correo es para consultas y aclaraciones ante la Secretaría Académica del plantel, o para el trámite que la convocatoria indique por correo.

**Para:** Secretaría Académica del Plantel [Oriente / tu plantel] — [correo publicado en el calendario de Secretarías Académicas de tu plantel]
**Asunto:** Solicitud de revisión de expediente — Rubro I (Trabajos de Apoyo a la Docencia) — [Tu nombre completo] — [Categoría a la que aspiras, p. ej. Profesor de Carrera Titular "A"]

**Cuerpo:**

Estimada Secretaría Académica:

Por medio del presente, yo, [Nombre completo], profesor(a) de [asignatura(s)] del Plantel [Oriente], con número de trabajador [___], solicito la revisión de mi expediente de producción académica correspondiente al **Rubro I — Trabajos de Apoyo a la Docencia**, conforme al Protocolo de Equivalencias para el Ingreso y la Promoción de los Profesores Ordinarios de Carrera del CCH (2020), para [ingreso / promoción] a la categoría de [Asociado "A/B/C" o Titular "A/B/C", Tiempo Completo / Medio Tiempo].

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

RUBRO I — TRABAJOS DE APOYO A LA DOCENCIA

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
*Archivo: `plantillas-rubro/rubro-I-apoyo-docencia.md` — Parte del sistema de bitácoras (`#PuntajeCch`, propuesta pendiente de autorización).*
