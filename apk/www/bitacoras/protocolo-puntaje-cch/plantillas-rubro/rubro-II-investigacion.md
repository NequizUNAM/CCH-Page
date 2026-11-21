# Plantilla — Rubro II: Trabajos de Investigación

**Fuente:** Protocolo de Equivalencias para el Ingreso y la Promoción de los Profesores Ordinarios de Carrera del CCH (2020), Cuadro de Rubros, Niveles y Actividades, pp. 53-57 del PDF subido por Nequiz el 2026-11-18. Lista **corregida contra el Cuadro**; el JSON guardado (`protocolo-puntaje-cch.json`, 158 actividades) trae errores en este rubro, detallados abajo. No se modificó el JSON original.
**Fecha de la plantilla:** 2026-11-18
**Actualización v2:** 2026-11-18 — glosario unificado (107 términos); ver sección «Actualización v2» en esta plantilla.
**Actualización v2:** 2026-11-18 — glosario unificado (107 términos); ver sección «Actualización v2» en esta plantilla.
**Total de actividades en este rubro (Cuadro):** 12

## Descripción

Estudios e investigaciones sobre enseñanza-aprendizaje, ciencias, humanidades o formación.

## Mínimos por categoría en este rubro

El Rubro II no tiene mínimo propio: cuenta dentro del bloque principal de Titulares (I **o** II en Titular A, 150 pts; I **o** II **o** III en Titular B, 150 pts, y en Titular C, 200 pts). Para Asociados suma al resto libre.

| Categoría | Bloque principal que incluye al Rubro II |
|---|---|
| Titular A (TC, 300) | I o II: 150 (50%), al menos una actividad de nivel C |
| Titular B (TC, 350) | I o II o III: 150 (42.85%), al menos una de nivel C |
| Titular C (TC, 400) | I o II o III: 200 (50%), al menos una de nivel C |

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
| 1 | Artículo académico | B | 50 | Glosario: RUBRO I o II-B; mínimo 5 cuartillas; hasta 2 profesores. |
| 2 | Colaboración en el desarrollo de estudios e investigaciones | B | 50 |  |
| 3 | Conferencias o videoconferencias | B | 50 |  |
| 4 | Dirección de grupo de trabajo con alumnos | B | 50 |  |
| 5 | Estudio sobre la docencia | B | 50 |  |
| 6 | Reporte de investigación | B | 50 |  |
| 7 | Dirección de grupos de trabajo de alumnos | C | 150 |  |
| 8 | Evaluación de un programa de estudios | C | 150 |  |
| 9 | Evaluación del plan de estudios | C | 150 |  |
| 10 | Propuesta educativa | C | 150 |  |
| 11 | Reporte de investigación | C | 150 |  |
| 12 | Reporte de validación | C | 150 |  |

> Valores: Nivel A = 25 puntos, B = 50 puntos, C = 150 puntos. Son los únicos valores del Cuadro, sin excepciones.


## Actualización v2 — Glosario unificado (2026-11-18)

Fuente: `cch_normatividad_unificada_2020_2023.json` (fecha de generación 2026-11-18), glosario completo de 107 términos. Catálogo v2: `protocolo-puntaje-cch-v2.json` (el JSON v1 de 158 actividades no se tocó).

**Términos del glosario que tocan este rubro: 9** (5 solo en este rubro; el resto se comparte con otros rubros). Por nivel en este rubro: A: 0, B: 5, C: 4. Digitales (isDigital): 1 de 9.

**Ojo:** el glosario tiene 107 términos y el Cuadro 165 actividades. El glosario agrupa variantes (alcance, horas, unidades) en un solo término, así que un término puede cubrir varios niveles: cuando la definición menciona más de un nivel, el nivel real se elige por alcance/horas según la definición, no por el campo `level` solo. Esos casos están marcados con ⚠ en la tabla.

### Cambios v2 en este rubro

- El Rubro II queda con 9 términos de glosario (5 solo en II). La columna II-A del Cuadro está vacía: se confirma que «Compilación de lecturas», «Cursos recibidos» y «Participación en jornadas» no son II-A.
- «Reporte de investigación» (II-B y II-C) y «Reporte de validación» (II-C) **no tienen término propio en el glosario unificado**. Lo más cercano es gl-024 «Colaboración en el Desarrollo de Estudios e Investigaciones» (II-B) y gl-057 «Evaluación de un Programa de Estudio» (II-C). No se inventó un término: si se registra un reporte, se anota con su nombre del Cuadro y se marca como «sin término gl-».
- «Dirección de grupos de trabajo con alumnos» (gl-044 B y gl-045 C, Rubros II y IV): el nivel C es solo con Comité de Pares.
- «Artículo académico» (gl-011, II-B) y «Conferencia o videoconferencia» (gl-031, I/II/V-B) se comparten con otros rubros: una misma constancia va en un solo rubro.

### Términos del glosario unificado en este rubro

| ID | Actividad | Nivel | Pts | Digital | Definición | Ejemplo | Sede |
|---|---|---|---|---|---|---|---|
| gl-011 | Artículo Académico (Rubro II) | B | 50 | No | Escrito original elaborado hasta por dos profesores, publicado en revista especializada, relacionado con el área de conocimiento o investigación educativa del profesor (extensión mínima de 5 cuartillas). | Artículo de investigación disciplinaria o educativa de 8 cuartillas publicado en revista indexada de la UNAM. | Revistas especializadas arbitradas con ISSN. |
| gl-024 | Colaboración en el Desarrollo de Estudios e Investigaciones | B | 50 | No | Conjunto de actividades formales y sistemáticas que contribuyen al desarrollo, revisión, instrumentación o validación de una investigación, avaladas por el investigador o instancia institucional con informe. | Colaboración en el procesamiento estadístico y validación de instrumentos de un proyecto INFOCAB o PAPIME. | Instancias de Investigación UNAM / DGCCH. |
| gl-031 | Conferencia o Videoconferencia | B | 50 | Sí | Exposición de un tema relacionado con la especialidad o interés del Colegio en jornada académica interna o externa. Debe entregarse por escrito en un mínimo de 10 cuartillas. | Videoconferencia magistral sobre Inteligencia Artificial y Educación Matemática con texto entregado de 12 cuartillas. | Jornadas Académicas / Coloquios / Auditorios del CCH. |
| gl-044 | Dirección de Grupos de Trabajo con Alumnos (Nivel B) | B | 50 | No | Orientación a un conjunto de alumnos fuera de horario de clases (mínimo 1 semestre) para realizar investigación, diseño de prototipos o estudio prospectivo en SILADIN, Feria de las Ciencias o Jóvenes hacia la Investigación. | Dirección semestral de equipo de alumnos en proyecto de investigación documental o experimental en el plantel. | SILADIN / Programa Jóvenes hacia la Investigación / Feria de las Ciencias. |
| gl-056 | Estudio sobre la Docencia | B | 50 | No | Trabajo sistemático exploratorio (documental o de campo) sobre práctica docente en aula/laboratorio, problemas de aprendizaje o perfil estudiantil. Incluye marco conceptual, información procesada, conclusiones y fuentes APA. | Estudio diagnóstico sobre dificultades conceptuales en álgebra y estadística en alumnos de primer ingreso al CCH. | Secretaría Académica / Planeación Local del Plantel. |
| gl-045 | Dirección de Grupos de Trabajo con Alumnos (Comité de Pares — Nivel C) | C | 150 | No | Dirección semestral de investigación o prototipos con alumnos fuera de clase que cuenta con reporte científico completo (APA) y arbitraje positivo o evaluación satisfactoria de un Comité de Pares. | Dirección de grupo estudiantil en Jóvenes hacia la Investigación con reporte metodológico avalado por Comité de Pares. | SILADIN / Comité de Pares / Dirección General CCH. |
| gl-057 | Evaluación de un Programa de Estudio | C | 150 | No | Investigación educativa colegiada (profesores de distintos planteles convocados por Dirección General y coordinados centralmente) para valorar pertinencia, vigencia y coherencia del Programa de Estudio de una asignatura. | Informe colegiado interplanteles de evaluación diagnóstica del Programa de Estudio de Estadística y Probabilidad I y II. | Dirección General del CCH / Secretaría Académica Central. |
| gl-058 | Evaluación del Plan de Estudios | C | 150 | No | Estudio sistemático colegiado de los cinco planteles, convocado y dirigido por Dirección General con aprobación del Consejo Técnico, para fundamentar modificaciones curriculares conforme al Reglamento General de Planes de Estudio. | Participación en comisión institucional de evaluación integral del Plan de Estudios del Colegio de Ciencias y Humanidades. | Dirección General del CCH y H. Consejo Técnico. |
| gl-104 | Propuesta Educativa | C | 150 | No | Propuesta teórico-metodológica fundamentada e innovadora basada en estudio formal para mejorar enseñanza-aprendizaje de una asignatura o área, con marco teórico, contribución disciplinaria/pedagógica, propuestas y evaluación satisfactoria de Comité de Pares. | Propuesta teórico-metodológica innovadora para la integración de ciencia de datos en el tronco común de Matemáticas. | Comité de Pares / Secretaría Académica DGCCH. |

Los términos con ⚠ mencionan más de un nivel en su definición; el campo Nivel es el nivel base del término y el nivel aplicable se decide por alcance/horas (ver «Cambios v2» y la definición).

## Correcciones aplicadas en este rubro (respecto al JSON del usuario)

- **Eliminadas de este rubro (error del JSON, resuelto con el PDF subido):** II-A «Compilación de lecturas», «Cursos recibidos» y «Participación en jornadas académicas». En el Cuadro p. 53 la columna del **Rubro II, Nivel A, está vacía**; esas 3 actividades son del **Rubro III-A** (el Glosario dice de «Participación en jornadas académicas»: «RUBRO I o III-A»). El JSON las había copiado en el Rubro II por la extracción con columnas mezcladas.
- **Corregido:** la contradicción aparente Glosario vs Cuadro queda resuelta: ambos coinciden en I o III, nunca II.
- **Nombre:** «Reporte de investigación (incluyendo avances)» (II-B en el JSON) en el Cuadro es simplemente «Reporte de investigación» (II-B, núm. 6); el paréntesis del JSON no está en el Cuadro. La variante de nivel C es «Reporte de investigación» (II-C, núm. 5) sin paréntesis: el nivel lo distingue el dictamen, no el nombre.


## Machote 1 — Correo de envío / solicitud

> **Nota:** para un COA no se envía el expediente por correo: se registra y se cargan las pruebas en la plataforma COA (https://www.cch.unam.mx). Este correo es para consultas y aclaraciones ante la Secretaría Académica del plantel, o para el trámite que la convocatoria indique por correo.

**Para:** Secretaría Académica del Plantel [Oriente / tu plantel] — [correo publicado en el calendario de Secretarías Académicas de tu plantel]
**Asunto:** Solicitud de revisión de expediente — Rubro II (Trabajos de Investigación) — [Tu nombre completo] — [Categoría a la que aspiras, p. ej. Profesor de Carrera Titular "A"]

**Cuerpo:**

Estimada Secretaría Académica:

Por medio del presente, yo, [Nombre completo], profesor(a) de [asignatura(s)] del Plantel [Oriente], con número de trabajador [___], solicito la revisión de mi expediente de producción académica correspondiente al **Rubro II — Trabajos de Investigación**, conforme al Protocolo de Equivalencias para el Ingreso y la Promoción de los Profesores Ordinarios de Carrera del CCH (2020), para [ingreso / promoción] a la categoría de [Asociado "A/B/C" o Titular "A/B/C", Tiempo Completo / Medio Tiempo].

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

RUBRO II — TRABAJOS DE INVESTIGACIÓN

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
*Archivo: `plantillas-rubro/rubro-II-investigacion.md` — Parte del sistema de bitácoras (`#PuntajeCch`, propuesta pendiente de autorización).*
