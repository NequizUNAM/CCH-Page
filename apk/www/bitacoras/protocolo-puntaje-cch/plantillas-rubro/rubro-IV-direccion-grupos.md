# Plantilla — Rubro IV: Trabajos de Dirección de Grupos Académicos

**Fuente:** Protocolo de Equivalencias para el Ingreso y la Promoción de los Profesores Ordinarios de Carrera del CCH (2020), Cuadro de Rubros, Niveles y Actividades, pp. 53-57 del PDF subido por Nequiz el 2026-11-18. Lista **corregida contra el Cuadro**; el JSON guardado (`protocolo-puntaje-cch.json`, 158 actividades) trae errores en este rubro, detallados abajo. No se modificó el JSON original.
**Fecha de la plantilla:** 2026-11-18
**Actualización v2:** 2026-11-18 — glosario unificado (107 términos); ver sección «Actualización v2» en esta plantilla.
**Actualización v2:** 2026-11-18 — glosario unificado (107 términos); ver sección «Actualización v2» en esta plantilla.
**Total de actividades en este rubro (Cuadro):** 7

## Descripción

Planeación, organización, coordinación y supervisión de proyectos institucionales y grupos.

## Mínimos por categoría en este rubro

| Categoría | Mínimo en Rubro IV | Condición de nivel |
|---|---|---|
| Titular B (TC, 350) | 50 (14.28%) | Actividad de nivel B |
| Titular C (TC, 400) | 50 (12.5%) | Actividad de nivel B |
| Titular A/B/C Medio Tiempo (200) | 50 de nivel B en Rubro III **o** IV | — |

El Rubro IV **no tiene actividades de nivel A** en el Cuadro (la columna A está vacía). Solo B (50 pts) y C (150 pts).

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
| 1 | Comisiones académicas | B | 50 |  |
| 2 | Coordinación de grupos de trabajo | B | 50 |  |
| 3 | Dirección de grupos de trabajo con alumnos | B | 50 |  |
| 4 | Participación en grupos de trabajo | B | 50 |  |
| 5 | Coordinación de grupos de trabajo | C | 150 |  |
| 6 | Dirección de grupos de trabajo con alumnos | C | 150 |  |
| 7 | Programa de fortalecimiento a la calidad del egreso (PROFOCE) | C | 150 |  |

> Valores: Nivel A = 25 puntos, B = 50 puntos, C = 150 puntos. Son los únicos valores del Cuadro, sin excepciones.


## Actualización v2 — Glosario unificado (2026-11-18)

Fuente: `cch_normatividad_unificada_2020_2023.json` (fecha de generación 2026-11-18), glosario completo de 107 términos. Catálogo v2: `protocolo-puntaje-cch-v2.json` (el JSON v1 de 158 actividades no se tocó).

**Términos del glosario que tocan este rubro: 7** (5 solo en este rubro; el resto se comparte con otros rubros). Por nivel en este rubro: A: 0, B: 4, C: 3. Digitales (isDigital): 0 de 7.

**Ojo:** el glosario tiene 107 términos y el Cuadro 165 actividades. El glosario agrupa variantes (alcance, horas, unidades) en un solo término, así que un término puede cubrir varios niveles: cuando la definición menciona más de un nivel, el nivel real se elige por alcance/horas según la definición, no por el campo `level` solo. Esos casos están marcados con ⚠ en la tabla.

### Cambios v2 en este rubro

- «Coordinación de grupos de trabajo» se desdobla con precisión: gl-032 Nivel B (semestral o anual, convocado por Dirección) y gl-033 «Institucionales» Nivel C (anual, campos aprobados por Consejo Técnico, informe evaluado). El JSON viejo ponía «(Nivel C)» sin distinguir; el glosario sí distingue.
- «Dirección de grupos de trabajo con alumnos» (gl-044 B y gl-045 C con Comité de Pares) es Rubro II y IV a la vez: una constancia, un solo rubro.
- «Programa de fortalecimiento a la calidad del egreso (PROFOCE)» (gl-101, IV-C) se mantiene.
- Total de glosario en este rubro: 7 términos (5 solo en IV), igual que el Cuadro (7). Sin cambios de conteo.

### Términos del glosario unificado en este rubro

| ID | Actividad | Nivel | Pts | Digital | Definición | Ejemplo | Sede |
|---|---|---|---|---|---|---|---|
| gl-026 | Comisiones Académicas | B | 50 | No | Cumplimiento de responsabilidades inherentes al nombramiento otorgado por el Director General o Consejo Técnico durante uno o dos semestres, evaluado según informe y contribuciones institucionales. | Comisión especial designada por el H. Consejo Técnico para revisión de criterios académicos o equivalencias. | Dirección General del CCH / H. Consejo Técnico. |
| gl-032 | Coordinación de Grupos de Trabajo (Nivel B) | B | 50 | No | Planear, organizar, coordinar, asesorar y supervisar en un semestre (convocado por Dirección) o durante un año las actividades académicas de un grupo de profesores con proyecto explícito y formal. | Coordinación semestral de grupo local de trabajo docente para diseño de materiales de Matemáticas. | Dirección del Plantel / Secretaría Académica. |
| gl-044 | Dirección de Grupos de Trabajo con Alumnos (Nivel B) | B | 50 | No | Orientación a un conjunto de alumnos fuera de horario de clases (mínimo 1 semestre) para realizar investigación, diseño de prototipos o estudio prospectivo en SILADIN, Feria de las Ciencias o Jóvenes hacia la Investigación. | Dirección semestral de equipo de alumnos en proyecto de investigación documental o experimental en el plantel. | SILADIN / Programa Jóvenes hacia la Investigación / Feria de las Ciencias. |
| gl-094 | Participación en Grupos de Trabajo | B | 50 | No | Cumplimiento de requisitos de un grupo de trabajo reconocido oficialmente (lecturas, borradores, material didáctico, exposiciones y asistencia mínima del 85% de sesiones) con informe y producto. | Integrante activo con >85% de asistencia en Seminario Institucional de Área reconocido por el Consejo Académico. | Consejo Académico de Área / Dirección del Plantel. |
| gl-033 | Coordinación de Grupos de Trabajo Institucionales (Nivel C) | C | 150 | No | Coordinación anual de grupo de trabajo enmarcado en los campos aprobados por el Consejo Técnico, con proyecto e informe anual evaluados favorablemente por el Consejo Académico de Área/Depto. y ratificados por el Consejo Técnico. | Coordinación anual de Seminario Institucional de Formación y Materiales aprobado por el Consejo Técnico. | Consejo Académico de Área / H. Consejo Técnico del CCH. |
| gl-045 | Dirección de Grupos de Trabajo con Alumnos (Comité de Pares — Nivel C) | C | 150 | No | Dirección semestral de investigación o prototipos con alumnos fuera de clase que cuenta con reporte científico completo (APA) y arbitraje positivo o evaluación satisfactoria de un Comité de Pares. | Dirección de grupo estudiantil en Jóvenes hacia la Investigación con reporte metodológico avalado por Comité de Pares. | SILADIN / Comité de Pares / Dirección General CCH. |
| gl-101 | Programa de Fortalecimiento a la Calidad del Egreso (PROFOCE) | C | 150 | No | Grupo de trabajo institucional convocado por Dirección General para planear, organizar, coordinar, asesorar y supervisar actividades del PROFOCE, apoyando a alumnos del último ciclo hacia la licenciatura. | Coordinación institucional del programa PROFOCE en el plantel para fortalecer el egreso hacia carreras de área físico-matemática. | Dirección General del CCH / Secretaría de Programas Institucionales. |

Los términos con ⚠ mencionan más de un nivel en su definición; el campo Nivel es el nivel base del término y el nivel aplicable se decide por alcance/horas (ver «Cambios v2» y la definición).

## Correcciones aplicadas en este rubro (respecto al JSON del usuario)

- **Sin cambios de contenido:** las 7 actividades del JSON coinciden con el Cuadro (B: 4, C: 3). Solo se homologa el nombre: «Dirección de grupos de trabajo con alumnos» (IV-B) vs «Dirección de grupos de trabajo con alumnos» (IV-C, con sufijo «(Nivel C)» en el JSON): el nivel va en el campo `nivel`, no en el nombre.


## Machote 1 — Correo de envío / solicitud

> **Nota:** para un COA no se envía el expediente por correo: se registra y se cargan las pruebas en la plataforma COA (https://www.cch.unam.mx). Este correo es para consultas y aclaraciones ante la Secretaría Académica del plantel, o para el trámite que la convocatoria indique por correo.

**Para:** Secretaría Académica del Plantel [Oriente / tu plantel] — [correo publicado en el calendario de Secretarías Académicas de tu plantel]
**Asunto:** Solicitud de revisión de expediente — Rubro IV (Trabajos de Dirección de Grupos Académicos) — [Tu nombre completo] — [Categoría a la que aspiras, p. ej. Profesor de Carrera Titular "A"]

**Cuerpo:**

Estimada Secretaría Académica:

Por medio del presente, yo, [Nombre completo], profesor(a) de [asignatura(s)] del Plantel [Oriente], con número de trabajador [___], solicito la revisión de mi expediente de producción académica correspondiente al **Rubro IV — Trabajos de Dirección de Grupos Académicos**, conforme al Protocolo de Equivalencias para el Ingreso y la Promoción de los Profesores Ordinarios de Carrera del CCH (2020), para [ingreso / promoción] a la categoría de [Asociado "A/B/C" o Titular "A/B/C", Tiempo Completo / Medio Tiempo].

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

RUBRO IV — TRABAJOS DE DIRECCIÓN DE GRUPOS ACADÉMICOS

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
*Archivo: `plantillas-rubro/rubro-IV-direccion-grupos.md` — Parte del sistema de bitácoras (`#PuntajeCch`, propuesta pendiente de autorización).*
