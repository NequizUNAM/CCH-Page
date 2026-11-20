# Plantilla — Rubro VI: Trabajos de Participación Universitaria Honoraria

**Fuente:** Protocolo de Equivalencias para el Ingreso y la Promoción de los Profesores Ordinarios de Carrera del CCH (2020), Cuadro de Rubros, Niveles y Actividades, pp. 53-57 del PDF subido por Nequiz el 2026-11-18. Lista **corregida contra el Cuadro**; el JSON guardado (`protocolo-puntaje-cch.json`, 158 actividades) trae errores en este rubro, detallados abajo. No se modificó el JSON original.
**Fecha de la plantilla:** 2026-11-18
**Actualización v2:** 2026-11-18 — glosario unificado (107 términos); ver sección «Actualización v2» en esta plantilla.
**Actualización v2:** 2026-11-18 — glosario unificado (107 términos); ver sección «Actualización v2» en esta plantilla.
**Total de actividades en este rubro (Cuadro):** 4

## Descripción

Cargos de representación y jurados en comisiones universitarias.

## Mínimos por categoría en este rubro

El Rubro VI no tiene mínimo propio: suma al resto libre. Ojo en Medio Tiempo, Asociado C: el resto libre debe incluir **no más de un trabajo de los rubros V y VI** (Adenda, Asociado C).

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
| 1 | Funcionario o integrante de la comisión organizadora de elecciones | A | 25 |  |
| 2 | Cargos honoríficos | B | 50 |  |
| 3 | Jurado calificador | B | 50 |  |
| 4 | Cargos honoríficos | C | 150 |  |

> Valores: Nivel A = 25 puntos, B = 50 puntos, C = 150 puntos. Son los únicos valores del Cuadro, sin excepciones.


## Actualización v2 — Glosario unificado (2026-11-18)

Fuente: `cch_normatividad_unificada_2020_2023.json` (fecha de generación 2026-11-18), glosario completo de 107 términos. Catálogo v2: `protocolo-puntaje-cch-v2.json` (el JSON v1 de 158 actividades no se tocó).

**Términos del glosario que tocan este rubro: 4** (4 solo en este rubro; el resto se comparte con otros rubros). Por nivel en este rubro: A: 1, B: 2, C: 1. Digitales (isDigital): 1 de 4.

**Ojo:** el glosario tiene 107 términos y el Cuadro 165 actividades. El glosario agrupa variantes (alcance, horas, unidades) en un solo término, así que un término puede cubrir varios niveles: cuando la definición menciona más de un nivel, el nivel real se elige por alcance/horas según la definición, no por el campo `level` solo. Esos casos están marcados con ⚠ en la tabla.

### Cambios v2 en este rubro

- «Cargos honoríficos» se desdobla: gl-022 anual Nivel B (50) y gl-023 Comisión Dictaminadora 2 años Nivel C (150).
- «Jurado calificador» (gl-078, VI-B) incluye los incisos a–k y el Comité de Revisión de Software Educativo.
- «Funcionario o integrante de la comisión organizadora de elecciones» (gl-068, VI-A, 25 pts) se mantiene.
- Total de glosario en este rubro: 4 términos, igual que el Cuadro (4). «Participación en jornadas académicas» ya no está aquí: es I o III (gl-095).

### Términos del glosario unificado en este rubro

| ID | Actividad | Nivel | Pts | Digital | Definición | Ejemplo | Sede |
|---|---|---|---|---|---|---|---|
| gl-068 | Funcionario o Integrante de la Comisión Organizadora de Elecciones | A | 25 | No | Participación honoraria como funcionario de casilla o en comisión de vigilancia/apoyo logístico en elecciones de Consejeros Universitarios, Técnicos, Académicos o Internos. | Participación como presidente o secretario de casilla en elección de Consejeros Técnicos del CCH. | Comisión Local de Vigilancia de Elecciones / Dirección del Plantel. |
| gl-022 | Cargos Honoríficos (Anual — Nivel B) | B | 50 | No | Cumplimiento de responsabilidades durante un año con mínimo 85% de asistencia: Consejero Universitario, Académico del Bachillerato, Técnico, Académico por Área, Interno, integrante de Comisión Dictaminadora o Comité Académico CFC. | Participación anual como Consejero Técnico o Consejero Académico de Área del CCH con >85% de asistencia. | Secretaría General UNAM / H. Consejo Técnico CCH / CAB. |
| gl-078 | Jurado Calificador (Incisos a – k, incluye Comité de Revisión de Software Educativo) | B | 50 | Sí | Evaluador en: a) Programa Editorial; b) Estímulos; c) Arbitraje; d) Comités evaluación; e) Comités DGAPA/DGTIC/CAB (incluye revisión de software educativo); f) Comité de Pares; g) Premios UNAM/Jóvenes Académicos/Bernardo Quintana; h) Concursos oposición definitividad; i) Ingreso carrera; j) Comité Académico CFC-CCH; k) Evaluación examen conocimientos disciplinarios. | Integrante de Comité de Pares, Jurado de Concurso de Oposición o Comité de Revisión de Software Educativo DGTIC/CCH. | Consejo Académico del Bachillerato / DGCCH / DGAPA / DGTIC. |
| gl-023 | Cargos Honoríficos (Comisión Dictaminadora 2 años — Nivel C) | C | 150 | No | Integrantes de las Comisiones Dictaminadoras que concluyen satisfactoriamente un periodo de dos años conforme a lo estipulado por el Consejo Académico del Bachillerato (valorado con Nivel C = 150 puntos). | Conclusión satisfactoria del bienio reglamentario como miembro propietario de la Comisión Dictaminadora del CCH. | Consejo Académico del Bachillerato (CAB) / H. Consejo Técnico. |

Los términos con ⚠ mencionan más de un nivel en su definición; el campo Nivel es el nivel base del término y el nivel aplicable se decide por alcance/horas (ver «Cambios v2» y la definición).

## Correcciones aplicadas en este rubro (respecto al JSON del usuario)

- **Eliminada de este rubro:** VI-A «Participación en jornadas académicas». En el Cuadro p. 53 el Rubro VI-A tiene **un solo** ítem: «Funcionario o integrante de la comisión organizadora de elecciones». «Participación en jornadas» es I-A y III-A (Glosario: «RUBRO I o III-A»).
- **Calificativos del Glosario:** «Cargos honoríficos (Consejos, Comisiones Dictaminadoras)» (VI-B) y «Cargos honoríficos (Comisión Dictaminadora periodo completo)» (VI-C) en el Cuadro son simplemente «Cargos honoríficos» en ambos niveles; el paréntesis del JSON es la condición que distingue el nivel y se conserva como nota.


## Machote 1 — Correo de envío / solicitud

> **Nota:** para un COA no se envía el expediente por correo: se registra y se cargan las pruebas en la plataforma COA (https://www.cch.unam.mx). Este correo es para consultas y aclaraciones ante la Secretaría Académica del plantel, o para el trámite que la convocatoria indique por correo.

**Para:** Secretaría Académica del Plantel [Oriente / tu plantel] — [correo publicado en el calendario de Secretarías Académicas de tu plantel]
**Asunto:** Solicitud de revisión de expediente — Rubro VI (Trabajos de Participación Universitaria Honoraria) — [Tu nombre completo] — [Categoría a la que aspiras, p. ej. Profesor de Carrera Titular "A"]

**Cuerpo:**

Estimada Secretaría Académica:

Por medio del presente, yo, [Nombre completo], profesor(a) de [asignatura(s)] del Plantel [Oriente], con número de trabajador [___], solicito la revisión de mi expediente de producción académica correspondiente al **Rubro VI — Trabajos de Participación Universitaria Honoraria**, conforme al Protocolo de Equivalencias para el Ingreso y la Promoción de los Profesores Ordinarios de Carrera del CCH (2020), para [ingreso / promoción] a la categoría de [Asociado "A/B/C" o Titular "A/B/C", Tiempo Completo / Medio Tiempo].

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

RUBRO VI — TRABAJOS DE PARTICIPACIÓN UNIVERSITARIA HONORARIA

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
*Archivo: `plantillas-rubro/rubro-VI-participacion-honoraria.md` — Parte del sistema de bitácoras (`#PuntajeCch`, propuesta pendiente de autorización).*
