# Análisis — Protocolo de puntaje CCH (Equivalencias 2020 + Asignación de Horarios 2023)

**Fecha del análisis:** 2026-11-18
**Fuente del usuario:** JSON pegado por Nequiz en el chat de bitácoras (2026-11-18 12:04 CST), con `documento_1` (Protocolo de Equivalencias 2020) y `documento_2` (Instructivo de Asignación de Horarios 2023).
**Archivo guardado (verbatim, sin reescribir valores):** `workspace/goals/ordenar-mis-minutas-y-pendientes/files/protocolo-puntaje-cch.json`
- Tamaño: 38 856 bytes. SHA-256: `d2f04f019a667b89589d665e600c3795241345c9b315a9d45d45160e5e0e9366`
- Validación: `python3 -m json.tool` OK, sin errores de sintaxis. **No hizo falta ninguna corrección al guardar.**
- Extracción: JSON exacto del mensaje del usuario (chat `cbe4b775-093a-4a31-b312-cfc37d126b7f`, leído con `chat.read_messages`); solo se recortó el texto introductorio previo al `{`.

**Fuentes oficiales consultadas (browser.open, 2026-11-18):**
- Protocolo: <https://gaceta.cch.unam.mx/sites/default/files/2025-12/protocolo_equivalencias_ingreso_promocion_.pdf> — Gaceta CCH, Suplemento, 17 de enero de 2020; aprobado por H. Consejo Técnico el 29 de mayo de 2020, publicado en Gaceta CCH el 1 de junio de 2020. Texto extraído: 5 221 líneas, leído en varias secciones.
- Instructivo: <https://gaceta.cch.unam.mx/sites/default/files/2023-03/suplemento_horario.pdf> — Gaceta CCH, 10 de marzo de 2023; aprobado por H. Consejo Técnico en sesión extraordinaria del 7 de marzo de 2023. Texto extraído: 1 431 líneas.

---

## 1. Resumen

- El JSON del usuario es **usable tal cual como catálogo de referencia**, con 2 correcciones de etiqueta y varios vacíos que completar (ver §5 y §6). No hay errores de sintaxis ni valores de puntos inconsistentes en el nivel (A siempre 25, B siempre 50, C siempre 150: verificado con Python).
- **Lo más importante que el JSON no trae y el PDF sí exige:** (1) las condiciones de nivel mínimo por categoría —«al menos una actividad de nivel B/C»— y la condición de Asociados de que los puntos del Rubro I «no sean de una misma actividad»; (2) la etiqueta `min_apoyo_investigacion_pct` es engañosa: el mínimo de 150/200 puntos de Titular A/B/C es en Rubro I **o** II (A) / I **o** II **o** III (B/C), no solo investigación; (3) el mismo trabajo no se puede contar en dos rubros ni dos veces: «las constancias de una misma actividad se ubicarán en un solo rubro» (Instructivo, Art. 29, nota 2) y el Protocolo no valora por separado las partes de un trabajo integral.
- El documento_2 (horarios) está **bien capturado en lo numérico**: horas por plantel y desgloses de los criterios II, III, IV y V coinciden con el PDF en los puntos revisados. Lo que le falta es el proceso: 5 etapas, comisiones mixtas, plazos (3 días hábiles para formalizar) y qué pasa con las horas no asignadas.
- Propuesta de enlace con la página de bitácoras: un catálogo de puntos ya guardado (`protocolo-puntaje-cch.json`) + campos nuevos por sesión/evidencia (rubro, actividad, nivel, puntos, alcance, constancia/dictamen) + una bitácora-hub propuesta `#PuntajeCch` (requiere autorización de Nequiz; no se crea sola). Ver §8.

---

## 2. Conteos verificados con Python

Script: lectura del JSON guardado, conteo por rubro y nivel, normalización de nombres (sin acentos, sin sufijo `(Nivel C)`, minúsculas). Totales:

### 2.1 Actividades por rubro y nivel (documento_1)

| Rubro | Nombre | Total | A (25 pts) | B (50 pts) | C (150 pts) | Suma si se contaran todas* |
|---|---|---|---|---|---|---|
| I | Trabajos de Apoyo a la Docencia | 67 | 8 | 32 | 27 | 5 850 |
| II | Trabajos de Investigación | 15 | 3 | 6 | 6 | 1 275 |
| III | Trabajos en la Formación de Profesores | 36 | 3 | 21 | 12 | 2 925 |
| IV | Trabajos de Dirección de Grupos Académicos | 7 | 0 | 4 | 3 | 650 |
| V | Trabajos de Difusión y Extensión Cultural | 28 | 9 | 13 | 6 | 1 775 |
| VI | Trabajos de Participación Universitaria Honoraria | 5 | 2 | 2 | 1 | 300 |
| **Total** | | **158** | **25** | **78** | **55** | **12 775** |

\* La columna «suma si se contaran todas» es solo aritmética (25×25 + 78×50 + 55×150 = 625 + 3 900 + 8 250 = 12 775). **No es un total alcanzable ni un tope**: el mismo trabajo no se puede contar en dos rubros y las actividades repetidas no suman dos veces (ver §4).

- Consistencia nivel → puntos: `A=25` en 25/25 casos, `B=50` en 78/78, `C=150` en 55/55. **Sin excepciones.**
- Nombres distintos (exactos): 131. Nombres distintos normalizados (sin acentos ni sufijo `(Nivel C)`): 120. Es decir, 158 entradas describen 120 actividades base; el resto son la misma actividad en otro rubro o en otro nivel.
- Rubro IV no tiene actividades de nivel A (0) — coincide con el Cuadro del PDF, donde la columna Rubro IV del nivel A viene vacía.
- Estructura del JSON: solo el Rubro I trae el campo `perfil_asociado`; los rubros II–VI no lo traen. Inconsistencia de estructura, no de contenido.

### 2.2 Documento_2 — conteos

| Criterio | Ítems con desglose en el JSON |
|---|---|
| I. Categoría y nivel | 3 valores (Asignatura B Definitivo, A Definitivo, A Interino) — sin puntos, es ordinal |
| II. Trayectoria profesional | 15 ítems con puntos |
| III. Actividades de apoyo/formación/grupos/honoraria | 20 ítems (algunos con tope anual o semestral) |
| IV. Antigüedad en la UNAM | 1 punto por año de labores |
| V. Actividades complementarias | Nivel A = 1 punto, B = 2, C = 3 |
| VI. Egresados de la UNAM | Sin puntos (criterio de orden) |
| VII. Perfiles profesiográficos | Sin puntos (criterio de orden) |

- Suma nominal del desglose del criterio II: 259 puntos (24+12+15+30+36+20+40+46+8+6+5+6+1+8+2). **No es acumulable tal cual**: varios ítems son alternativos (p. ej. Licenciatura / Maestría / Doctorado, o Maestría / Maestría PNPC). A verificar si los grados se suman o solo cuenta el mayor (ver §6).

---

## 3. Tabla de validación contra los PDFs oficiales

Leyenda: ✅ Correcto (verificado en el texto extraído) · ⚠️ Dudoso (coincide en número pero la etiqueta o el alcance no cuadran, o hay contradicción aparente) · ❌ Faltante (está en el PDF y no en el JSON) · 🔍 No verificado (el texto extraído no permite comprobarlo línea por línea).

### 3.1 Documento_1 — Protocolo de Equivalencias 2020

| Dato del JSON | Estado | Fuente / evidencia |
|---|---|---|
| Título y fecha (Protocolo 2020, aprobado 29-may-2020, Gaceta 1-jun-2020) | ✅ | PDF, Presentación e Introducción (líneas 23–41, 293–296 del texto extraído) |
| 6 rubros I–VI con esos nombres | ✅ | PDF, Cuadro de Rubros (p. 52–57) y Glosario |
| Nivel A = 25, B = 50, C = 150 | ✅ | PDF, encabezados del Cuadro: «25 puntos c/u», «50 puntos c/u», «150 puntos c/u» |
| Asociado A: total 100, mín. 50 (50%) Rubro I | ✅ | PDF p. 14–15: «Puntaje total mínimo… 100 puntos. Es necesario cubrir un mínimo de: 50 puntos (50%), en trabajos de apoyo a la docencia (Rubro I)» |
| Asociado B: total 200, mín. 100 (50%) Rubro I | ✅ | PDF p. 16: «200 puntos… mínimo de: 100 puntos (50%), en trabajos de apoyo a la docencia (Rubro I)» |
| Asociado C: total 250, mín. 125 (50%) Rubro I | ✅ | PDF p. 17: «250 puntos… mínimo de: 125 puntos (50%), en trabajos de apoyo a la docencia (Rubro I)» |
| Titular A: total 300 | ✅ | PDF p. 18: «300 puntos» |
| Titular A: mín. 150 (50%) en Rubro I o II | ⚠️ | PDF p. 18: «150 puntos (50%), en trabajos de apoyo a la docencia (Rubro I), **o** en trabajos de investigación (Rubro II)». El JSON lo etiqueta `min_apoyo_investigacion_pct` (50), como si fuera solo investigación. El número es correcto; la etiqueta, no. |
| Titular A: mín. 75 (25%) Rubro III | ✅ | PDF p. 18: «En trabajos de formación de profesores (Rubro III). Es necesario un mínimo de 75 puntos (25%)» |
| Titular B: total 350 | ✅ | PDF p. 19: «350 puntos» |
| Titular B: mín. 150 (42.85%) | ✅ número / ⚠️ alcance | PDF p. 19: «150 puntos (42.85%), en trabajos de apoyo a la docencia (Rubro I), o en trabajos de Investigación (Rubro II), o en formación de profesores (Rubro III)». El porcentaje es redondeo de 150/350 = 42.857…%. Además, en el texto extraído la tercera opción dice literalmente «(Rubro II)» donde debería decir Rubro III: probable error de extracción del PDF; a verificar en la página impresa. La etiqueta del JSON (`min_apoyo_investigacion_pct`) vuelve a ser engañosa. |
| Titular B: mín. 50 (14.28%) Rubro IV y mín. 50 (14.28%) Rubro III | ✅ | PDF p. 19: «En dirección de grupos (Rubro IV): … 50 puntos (14.28%)» y «En trabajos de formación de profesores (Rubro III): … 50 puntos (14.28%)». 14.28% es redondeo de 50/350 = 14.2857…%. |
| Titular C: total 400 | ✅ | PDF p. 20: «400 puntos» |
| Titular C: mín. 200 (50%) en Rubro I o II o III | ⚠️ | PDF p. 20: «mínimo de 200 puntos (50%), en trabajos de apoyo a la docencia (Rubro I), o en trabajos de investigación (Rubro II), o en formación de profesores (Rubro III)». Número correcto; etiqueta del JSON (`min_apoyo_investigacion_pct`) engañosa, igual que en Titular A/B. |
| Titular C: mín. 50 (12.5%) Rubro IV y mín. 50 (12.5%) Rubro III | ✅ | PDF p. 20: «En dirección de grupos (Rubro IV): … 50 puntos (12.5%)» y «En trabajos de formación de profesores (Rubro III): … 50 puntos (12.5%)» |
| Condición «al menos una actividad de nivel C» (Titular A/B/C) y «al menos una de nivel B» (Asociado C, Titular A Rubro III, Titular B/C Rubros III y IV) | ❌ Faltante | Está en el PDF en cada ficha de categoría (pp. 14–20) y **no está en el JSON**. Sin esta condición el cálculo de puntos es incompleto: cumplir el total no basta. |
| Condición Asociados: puntos del Rubro I «con trabajos que no sean de una misma actividad» | ❌ Faltante | PDF pp. 15–17, en las tres fichas de Asociado. No está en el JSON. |
| Criterio de aplicación 2: al menos una actividad del nivel de la categoría; un nivel superior del mismo rubro sí vale; cantidad de nivel inferior no sustituye | ❌ Faltante | PDF p. 11, «Criterios de aplicación», punto 2. No está en el JSON. |
| Criterio 5: la dictaminadora puede subir o bajar el nivel de un trabajo, argumentando por escrito | ❌ Faltante | PDF p. 11–12, punto 5. |
| Criterio 10: todas las actividades deben acompañarse de documentos probatorios o constancia oficial | ❌ Faltante | PDF p. 12, punto 10. Es el campo «constancia/dictamen» que se propone en §8. |
| Criterio 9: arbitraje positivo y evaluación de Comité de Pares son equivalentes para nivel C que lo requiera | ❌ Faltante | PDF p. 12, punto 9. |
| Criterios de valoración Pertinencia / Calidad / Trascendencia (definiciones) | ❌ Faltante | PDF p. 10. El JSON no trae definiciones de nivel ni de valoración. |
| Requisitos EPA por categoría (estudios, años de labores) | ❌ Faltante | PDF pp. 14–20, fichas por categoría (arts. 39–44 del EPA). Resumidos en §7 de este informe. |
| Topes/máximos por actividad en el Protocolo | 🔍 Parcial | En el Cuadro no hay un tope global por actividad. Los topes están en el Glosario, por actividad (p. ej. «hasta cuatro organizadores», «hasta seis profesores», duración mínima de 40 horas, mínimo 12 grupos en SILADIN). No se extrajeron todos; a completar revisando el Glosario término por término. |
| Recuento línea por línea de las 158 actividades contra el Cuadro (pp. 52–57) | 🔍 No verificado | El texto extraído del Cuadro viene con las columnas mezcladas (la extracción aplana 6 columnas en un solo flujo de texto), así que no permite un recuento fiable actividad por actividad. Verificado por muestreo (ver §3.3). Se recomienda revisión visual del PDF impreso, pp. 52–57. |

### 3.2 Documento_2 — Instructivo de Asignación de Horarios 2023

| Dato del JSON | Estado | Fuente / evidencia |
|---|---|---|
| Horas permanentes por plantel (Azcapotzalco 8 784, Naucalpan 8 452, Vallejo 8 856, Oriente 8 924, Sur 9 576) | ✅ | PDF, Art. 4, texto extraído líneas 209–221. Total verificado: 44 592 horas (ver §5.2). |
| Criterio I: Asignatura B Definitivo, A Definitivo, A Interino | ✅ | PDF, Art. 29, criterio I y desglose (líneas 805, 859–863). Sin puntos: es ordinal. |
| Criterio II: Licenciatura 24, Especialidad 12, Maestrante 15, Maestría 30, Maestría PNPC 36, Doctorante 20, Doctorado 40, Doctorado PNPC 46, Diplomado 8, CISE 6, PROFORED 5, PAAS 6, Cursos 1 pt/20 h (máx. 80 h/año), Idiomas 8, Ponencia 2 | ✅ | PDF, desglose Art. 29, criterio II (líneas 875–938). Nota: el PDF 2023 dice «padrón del Programa Nacional de Posgrados de Calidad del CONACYT»; el JSON dice «PNPC/CONAHCYT». Es el mismo padrón con el nombre actualizado; no es un error, solo cambio de nombre. |
| Criterio III: 20 ítems (asesoría 2/semestre máx. 2/año, examen extraordinario 0.25 máx. 6/año, cursos a profesores 4 pts/20 h máx. 40 h/año, grupos de trabajo 4/año, guía/libro/paquete avalados 6, programa operativo 2/semestre, tutoría PIT 2/grupo máx. 2/año, cargos honoríficos 6/año con 85% asistencia, jurado 6 o 4, SILADIN 2 máx. 1/semestre, Jóvenes hacia la Investigación 3/año, concursos 2/evento máx. 2/año, artículo académico 2 máx. 2/año, artículos ISSN/ISBN/NIP 4 máx. 2/año, coordinación INFOCAB/PAPIME 4/año, participación 2/año) | ✅ | PDF, desglose Art. 29, criterio III (líneas 950–1090). Revisado punto por punto contra el JSON; coinciden. |
| Criterio IV: 1 punto por año de antigüedad | ✅ | PDF, líneas 1093–1105 («Antigüedad 1 punto por cada año de labores»). |
| Criterio V: Nivel A = 1, B = 2, C = 3 | ✅ | PDF, líneas 1120–1126. |
| Criterios VI (Egresados UNAM) y VII (Perfiles profesiográficos) sin puntos | ✅ | PDF, Art. 29: son criterios de orden, se aplican en secuencia hasta desempatar; no llevan puntaje. Que el JSON no les ponga puntos es correcto, no un faltante. |
| Regla de desempate: se aplican los criterios en orden; II+III+IV se suman para el primer desempate (si el docente tiene título superior a bachiller); si persiste el empate, decide la Comisión Dictaminadora por CV (fallo inapelable) | ❌ Faltante | PDF, Art. 29 (líneas 764–780 y 839–850). No está en el JSON. |
| «Las constancias de una misma actividad académica se ubicarán en un solo rubro de evaluación» | ❌ Faltante | PDF, Art. 29, nota 2 (línea 944). Clave contra el doble conteo. |
| 5 etapas del proceso anual (Art. 7) | ❌ Faltante | PDF, líneas 319–339: 1) Actualización de la Lista Jerarquizada antes de cada semestre; 2) Asignación de horas temporales con fines de definitividad; 3) Aumento de horas permanentes; 4) Cobertura interina de horasgrupo vacantes; 5) Prórroga de horas antes del semestre par (Art. 28). |
| Horas no asignadas se señalan como tales en la Propuesta Global; horas temporales pasan a permanentes tras 3 años consecutivos; horasgrupo vacantes se cubren por boletín | ❌ Faltante | PDF, Art. 4 (líneas 224–277) y Art. 9 (líneas 363–374). |
| Plazo: 3 días hábiles para formalizar la asignación; si no, se revoca. Falsedad de documentos: anulación + sanción | ❌ Faltante | PDF, Art. 30 (líneas 1145–1167) y Art. 31 (líneas 1170–1173). |
| Comisiones Mixtas de Horarios (Central, Intermedia, Local por plantel) | ❌ Faltante | PDF, Art. 8 (líneas 348–354). |
| Art. 6: aumento de horas permanentes sujeto a boletines; grupos a docentes con más de 3 años de antigüedad para concursar definitividad (Art. 48 EPA) | ❌ Faltante | PDF, líneas 295–316. |

### 3.3 Muestreo del Cuadro y del Glosario (lo que sí se pudo comprobar actividad por actividad)

Verificado en el texto extraído del Glosario y del Cuadro:

- ✅ «Paquete didáctico», «Programa operativo», «Material didáctico con uso de software», «Monografía», «Tutoría para alumnos», «Dirección de obra de teatro», «Diseño y seguimiento de actividades experimentales»: el Glosario les asigna «RUBRO I-B o C» (el nivel C exige cubrir todas las unidades / curso completo y evaluación satisfactoria de Comité de Pares). El JSON los trae como dos entradas (B y C con sufijo «(Nivel C)»). Correcto.
- ✅ «Compilación de lecturas» en Rubro III nivel B: aparece en el Cuadro de nivel B, Rubro III (ítem 7). El JSON la trae. Correcto, aunque el nombre repetido en el mismo rubro con dos niveles (A y B) es ambiguo (ver §4).
- ✅ «Organización de actividades académicas»: Glosario «RUBRO I y V-A, B o C» — nivel A si son locales, B si son generales en el Colegio, C si son nacionales o internacionales; hasta cuatro organizadores. El JSON trae I-A, I-C «(Nacional/Internacional)», V-A «(locales)», V-B «(generales)», V-C «(nacionales/internacionales)». **Falta la variante I-B (general en el Colegio)** — ver §4.
- ✅ «Participación en la elaboración y publicación de una revista»: Glosario «RUBRO I, III y V-B o C» (nivel C si además colabora con al menos dos artículos propios). El JSON trae III-B, III-C «(Nivel C)» y V-B, pero **no trae ninguna variante del Rubro I** (ni I-B ni I-C). Faltante — ver §4.
- ✅ «Artículo académico»: Glosario «RUBRO I o II-B», mínimo cinco cuartillas, hasta dos profesores. El JSON trae I-B y II-B. Correcto.
- ⚠️ «Participación en jornadas académicas»: el Glosario dice «RUBRO I o III-A» (mínimo 20 horas, 90% de asistencia), pero el Cuadro de nivel A la lista en la columna del Rubro II y el JSON la trae en II-A, III-A y VI-A (y no en I-A). Contradicción aparente entre Glosario y Cuadro, o artefacto de la extracción con columnas mezcladas. **A verificar en el PDF impreso, pp. 21–54.**
- ⚠️ «Cursos especiales o extracurriculares para alumnos»: el JSON la trae en I-B, V-A y V-B «(40 hrs o más)». En el Cuadro de nivel A aparece como ítem del Rubro I y/o III según la lectura de la extracción mezclada. **A verificar visualmente**; el calificador «(40 hrs o más)» del JSON no se confirmó en el texto extraído del Cuadro.

---

## 4. Duplicados encontrados

### 4.1 Duplicados exactos (mismo rubro, mismo nombre, mismo nivel)

**Ninguno.** Verificado con Python: 0 casos.

### 4.2 Mismo nombre exacto en distintos rubros (18 nombres)

Estos no son errores en sí: el Protocolo permite que una misma actividad valga en varios rubros (el Glosario lo indica, p. ej. «RUBRO I o II-B»). Pero **obligan a elegir un solo rubro al registrar**: una misma constancia no se puede contar en dos rubros (Instructivo, Art. 29, nota 2). La bitácora debe exigir el rubro al capturar.

| Nombre | Ocurrencias (rubro-nivel-puntos) |
|---|---|
| Compilación de lecturas | I-A-25, II-A-25, III-A-25, III-B-50 |
| Colaborador de libro | I-B-50, III-B-50, V-B-50 |
| Coordinador de libro | I-C-150, III-C-150, V-C-150 |
| Libro | I-C-150, III-C-150, V-C-150 |
| Traducción de libro | I-C-150, III-C-150, V-C-150 |
| Ensayo | I-B-50, III-B-50, V-B-50 |
| Conferencias o videoconferencias | II-B-50, III-B-50, V-B-50 |
| Artículo académico | I-B-50, II-B-50 |
| Apoyos bibliográficos… para un curso | I-B-50, III-B-50 |
| Compilador de libro | III-B-50, V-B-50 |
| Desarrollo de un tema con fines didácticos | I-B-50, III-B-50 |
| Glosario de términos por asignatura o área | I-B-50, III-B-50 |
| Participación en la elaboración y publicación de una revista | III-B-50, V-B-50 (y III-C-150 con sufijo, ver §4.3) |
| Participación en jornadas académicas | II-A-25, III-A-25, VI-A-25 |
| Propuesta educativa | I-C-150, II-C-150 |
| Cursos recibidos | II-A-25, III-A-25 |
| Lectura con fines didácticos | I-A-25, V-A-25 |
| Cursos especiales o extracurriculares para alumnos | I-B-50, V-A-25 |

### 4.3 Casi-duplicados: mismo nombre base, distinto nivel (con sufijo «(Nivel C)»)

28 nombres normalizados tienen más de una entrada. Los 10 casos dentro del **mismo rubro** (el sufijo es la única diferencia) son los más delicados, porque el nombre solo no distingue el nivel:

| Nombre base | Entradas |
|---|---|
| Asesoría para alumnos orientada a mejorar la calidad del aprendizaje y el egreso | I-B-50, I-C-150 «(Nivel C)» |
| Coordinación de grupos de trabajo | IV-B-50, IV-C-150 «(Nivel C)» |
| Dirección de grupos de trabajo con alumnos | IV-B-50, IV-C-150 «(Nivel C)» |
| Dirección de obra de teatro de carácter didáctico | I-B-50, I-C-150 «(Nivel C)» |
| Diseño y seguimiento de actividades experimentales o virtuales aplicables en los laboratorios | I-B-50, I-C-150 «(Nivel C)» |
| Material didáctico con uso de software | I-B-50, I-C-150 «(Nivel C)» |
| Monografía | I-B-50, I-C-150 «(Nivel C)» |
| Paquete didáctico | I-B-50, I-C-150 «(Nivel C)» |
| Participación en la elaboración y publicación de una revista | III-B-50, III-C-150 «(Nivel C)», V-B-50 |
| Programa operativo | I-B-50, I-C-150 «(Nivel C)» |
| Tutoría para alumnos | I-B-50, I-C-150 «(Nivel C)» |

### 4.4 Casos ambiguos que necesitan desambiguación (a completar / a verificar)

1. **«Compilación de lecturas» en Rubro III con dos niveles (A-25 y B-50).** Es el único nombre repetido dentro del mismo rubro con distinto nivel sin sufijo que lo distinga. A verificar en el Cuadro: ¿la de nivel B es otra variante (p. ej. con otro alcance) o es un error de captura del JSON?
2. **«Dirección de grupo de trabajo con alumnos» (II-B-50, singular) vs «Dirección de grupos de trabajo de alumnos» (II-C-150, plural).** El cambio singular/plural parece marcar el nivel, pero no es explícito. Además en Rubro IV la variante C lleva el sufijo «(Nivel C)» y la de Rubro II no. Homologar: usar siempre el sufijo o un campo `nivel` separado (ver §8).
3. **«Reporte de investigación (incluyendo avances)» (II-B-50) vs «Reporte de investigación» (II-C-150).** El paréntesis distingue, pero el criterio que separa B de C (evaluación de Comité de Pares) no está en el nombre. El campo `nivel` debe ser obligatorio al registrar.
4. **«Organización de actividades académicas» en 5 variantes sin una I-B.** Ver §3.3. El nivel depende del alcance (local / general / nacional-internacional): el campo `alcance` debe ser obligatorio para esta actividad.
5. **«Cursos especiales o extracurriculares para alumnos» con niveles A (V) y B (I), y V-B con «(40 hrs o más)».** El calificador de horas no se confirmó en el Cuadro extraído. A verificar en el Glosario.
6. **«Charlas de divulgación» (V-A-25) vs «Charlas de divulgación (conjunto)» (V-B-50).** El paréntesis «(conjunto)» es el único distintivo; documentar qué significa «conjunto» (serie de charlas) en la ficha de la actividad.
7. **Nombres con sufijo «(Nivel C)» mezclados con nombres sin sufijo.** 11 entradas usan el sufijo y el resto no. Recomendación: quitar el sufijo del nombre y dejar el nivel solo en el campo `nivel` (ver §8). No se cambió en el archivo guardado (verbatim), solo se propone para la versión de trabajo de la página.

---

## 5. Cálculo de mínimos por categoría

Verificado con Python (porcentajes del JSON × total). Los porcentajes de Titular B son redondeos: 150/350 = 42.857…% (el JSON dice 42.85%) y 50/350 = 14.2857…% (el JSON dice 14.28%). Los puntos en enteros son los que valen: **150 y 50**.

| Categoría | Total | Mínimos (puntos) | Suma de mínimos | Resto libre |
|---|---|---|---|---|
| Asociado A | 100 | Rubro I: 50 (50%), trabajos que no sean de una misma actividad, cualquier nivel | 50 | 50 |
| Asociado B | 200 | Rubro I: 100 (50%), no misma actividad | 100 | 100 |
| Asociado C | 250 | Rubro I: 125 (50%), al menos una actividad de nivel B; el resto también con al menos una de nivel B | 125 | 125 |
| Titular A | 300 | Rubro I **o** II: 150 (50%), al menos una actividad de nivel C; Rubro III: 75 (25%), al menos una actividad de formación de nivel B | 225 | 75 |
| Titular B | 350 | Rubro I **o** II **o** III: 150 (42.85%), al menos una de nivel C; Rubro IV: 50 (14.28%), actividad de nivel B; Rubro III: 50 (14.28%), actividad de nivel B | 250 | 100 |
| Titular C | 400 | Rubro I **o** II **o** III: 200 (50%), al menos una de nivel C; Rubro IV: 50 (12.5%), actividad de nivel B; Rubro III: 50 (12.5%), actividad de nivel B | 300 | 100 |

**Advertencias para el cálculo (a precisar con la Comisión Dictaminadora):**
- Los mínimos de Titular A/B/C dicen «o» entre rubros: el PDF no aclara si los 150/200 puntos pueden ser la **suma** de I+II (+III) o deben estar **todos en un solo** rubro. La lectura más natural es que pueden sumarse entre los rubros listados, pero no está explícito. La calculadora de la página debe mostrar ambas lecturas o tomar la conservadora (suma entre rubros permitida, con aviso) hasta confirmarlo.
- Los 50 puntos de Rubro III (Titular B/C) y los 150/200 del bloque principal pueden solaparse si el bloque principal se cubre en parte con Rubro III. El PDF no dice si se pueden contar los mismos puntos para los dos mínimos. Diseño conservador propuesto: **los bloques de mínimos no se solapan** (cada punto cuenta para un solo mínimo); el resto libre sí se cubre con cualquier rubro.
- Asociado A: 1 sola actividad de nivel C (150 pts) supera el total, pero la condición «no sean de una misma actividad» sugiere que el mínimo del Rubro I debe venir de **al menos 2 actividades distintas**. A precisar; la página debe avisar si el mínimo se cubre con una sola actividad.

### Ejemplos de combinaciones que cumplen (aritmética verificada)

- **Asociado A (100):** 2 actividades B distintas del Rubro I: 50 + 50 = 100. O 1 B (50) + 2 A (25 + 25) = 100, con 3 actividades distintas del Rubro I.
- **Asociado B (200):** 2 C del Rubro I: 150 + 150 = 300 (supera el total; el mínimo de Rubro I es 100, el resto libre se cubre con lo que sea). Combinación exacta: 1 C (150) + 1 B (50) = 200, con el Rubro I en 200 ≥ 100.
- **Asociado C (250):** 1 C (150) + 1 B (50) + 1 B (50) = 250; Rubro I = 200 ≥ 125 y con al menos una B. ✓
- **Titular A (300):** 1 C en Rubro I (150) + 1 B en Rubro III (50) + 1 A en Rubro III (25) + 1 B (50) + 1 A (25) = 300; bloque I/II = 150 ✓ (con C), bloque III = 75 ✓ (con B). ✓
- **Titular B (350):** 1 C en Rubro I (150) + 1 B en Rubro IV (50) + 1 B en Rubro III (50) + 2 B (50 + 50) = 350. ✓
- **Titular C (400):** 1 C en Rubro I (150) + 1 B en Rubro III (50) + 1 B en Rubro IV (50) + 1 B en Rubro III (50) + 2 B (50 + 50) = 400; bloque I/II/III = 150 + 50 = 200 ✓ (con C), Rubro IV = 50 ✓, Rubro III = 100 ≥ 50 ✓. ✓

### 5.2 Horas permanentes por plantel (documento_2)

Verificado en el PDF, Art. 4. Suma con Python:

| Plantel | Horas permanentes |
|---|---|
| Azcapotzalco | 8 784 |
| Naucalpan | 8 452 |
| Vallejo | 8 856 |
| Oriente | 8 924 |
| Sur | 9 576 |
| **Total CCH** | **44 592** |
| Promedio por plantel | 8 918.4 |
| Mayor – menor | 9 576 − 8 452 = 1 124 (Sur, la mayor; Naucalpan, la menor) |

Sur concentra el 21.5% del total (9 576 / 44 592) y Naucalpan el 19.0% (8 452 / 44 592).

---

## 6. Lo que falta completar (marcado como a completar / a verificar)

### 6.1 En el documento_1 (Protocolo)

1. **A completar — Requisitos EPA por categoría (estudios, antigüedad, labores docentes).** El JSON solo trae puntos. Lo verificado en el PDF (pp. 14–20, arts. 39–44 del EPA) se resume aquí para incorporarlo al archivo de trabajo (no se modificó el JSON guardado):
   - **Asociado A (art. 39):** licenciatura o grado equivalente; ≥ 1 año en labores docentes o de investigación; 1 trabajo que acredite competencia. Labores: informe del Director del Plantel sobre cumplimiento del art. 56 del EPA (impartición de clases, comisiones y exámenes, reuniones de trabajo, entrega de programas el primer día de clases, informes anuales, labores académico-administrativas).
   - **Asociado B (art. 40):** grado de maestro o estudios similares (opciones: 100% de créditos de maestría; diplomado de actualización docente; segunda licenciatura + 4 cursos de formación docente; especialización en docencia + 4 cursos de actualización; especialización en su área + 4 cursos de formación docente; o criterios de promoción de Asignatura A a B); ≥ 2 años; además, si es el caso, arts. 60 y 61 del EPA (proyecto anual e informe de resultados).
   - **Asociado C (art. 41):** grado de maestro o equivalentes (concurso abierto: lo mismo que B; concurso cerrado: siendo Asociado B se consideran cubiertos); ≥ 3 años.
   - **Titular A (art. 42):** título de doctor o equivalentes (100% de créditos de doctorado + 40 horas de formación docente; o grado de maestro + 1 actividad de nivel C; o criterios de Asignatura A→B + 2 actividades de nivel C); ≥ 4 años; publicaciones originales; capacidad para formar personal especializado.
   - **Titular B (art. 43):** además de lo de Titular A; doctor o equivalentes (abierto: lo mismo que A; cerrado: siendo Titular A se consideran cubiertos); ≥ 5 años; capacidad para dirigir grupos de docencia o de investigación.
   - **Titular C (art. 44):** además de lo de Titular B; ≥ 6 años; haber publicado trabajos de trascendencia y alta calidad; haber formado profesores que laboren de manera autónoma (lo evalúan las dictaminadoras, con jurados especializados si hace falta).
2. **A verificar — Qué es cada nivel A/B/C.** No se encontró una definición general de los niveles en las secciones leídas del PDF. Lo que sí está verificado: los valores (A 25, B 50, C 150), los criterios de valoración (Pertinencia, Calidad, Trascendencia, PDF p. 10), que el nivel C suele exigir evaluación satisfactoria de un Comité de Pares o arbitraje positivo, y que en varias actividades el nivel depende del alcance (local/general/nacional-internacional) o de la cobertura (p. ej. paquete didáctico: C solo si cubre todas las unidades del curso). A completar: revisar si el PDF define los niveles en otra sección y, si no, documentar la regla «nivel por actividad, según Glosario».
3. **A completar — Topes del Protocolo.** No hay tope global por actividad en el Cuadro. Los topes están en el Glosario, actividad por actividad (p. ej. hasta 4 organizadores, hasta 6 profesores por paquete didáctico, mínimo 40 horas en Actividades Creativas, mínimo 12 grupos en SILADIN, mínimo 5 cuartillas en artículo académico y ponencia, mínimo 2 números de revista al año). Falta extraerlos todos del Glosario a una tabla `topes` por actividad.
4. **A completar — Condiciones de nivel por categoría y «no misma actividad».** Ver §3.1 (❌). Son reglas de cálculo, no solo texto: hay que guardarlas como campos (`minimo_rubro`, `minimo_puntos`, `requiere_nivel`, `no_misma_actividad`) por categoría.
5. **A verificar — Variantes faltantes del Cuadro:** «Organización de actividades académicas» I-B; «Participación en la elaboración y publicación de una revista» I-B e I-C; «Participación en jornadas académicas» I-A vs II-A; «Cursos especiales» I-A y el calificador «(40 hrs o más)»; «Compilación de lecturas» III-B. Revisión visual del PDF, pp. 52–57.
6. **A verificar — Texto de Titular B:** en el texto extraído, la tercera opción del mínimo dice «(Rubro II)» donde debe decir Rubro III. Probable error de extracción; confirmar en la página impresa (p. 19 del PDF).

### 6.2 En el documento_2 (Instructivo)

1. **A completar — El proceso completo:** 5 etapas (Art. 7), comisiones mixtas (Art. 8), Propuesta Global de Horarios y listas jerarquizadas semestrales publicadas en la web del Colegio (Arts. 9–11), plazos (Art. 30), sanciones por falsedad (Art. 31), Art. 6 (aumento de horas y grupos para definitividad).
2. **A verificar — Grados en el criterio II:** si los puntos de grado se suman (Licenciatura + Maestría + Doctorado) o solo cuenta el grado mayor. El PDF no lo aclara en el texto extraído. Es la pregunta que más cambia el puntaje de la lista jerarquizada.
3. **A completar — Fechas del proceso:** el Instructivo no trae fechas fijas en el texto extraído (las etapas se definen «antes del inicio de cada semestre»); las fechas concretas salen en los boletines de cada plantel. Anotar como «según boletín del plantel».
4. **A completar — Qué pasa con las horas no asignadas:** se señalan como tales en la Propuesta Global (Art. 4 y Art. 9); las horas temporales pasan a permanentes tras 3 años consecutivos (excepto segunda inscripción, que nunca pasa); las horasgrupo vacantes se cubren por boletín, con carácter interino.

---

## 7. Qué es cada nivel A/B/C (profundización)

- **Valores (verificado):** A = 25 puntos, B = 50, C = 150. Son los únicos valores en todo el Cuadro (78 B, 55 C, 25 A; sin excepciones).
- **Cómo se asigna el nivel (verificado en el Glosario):** no es una escala abstracta; cada actividad trae su rubro y nivel en su definición. Ejemplos leídos: «Actividades Creativas — RUBRO I-B, mínimo 40 horas»; «Paquete didáctico — RUBRO I-B o C» (C: cubre todas las unidades + evaluación de Comité de Pares); «Organización de actividades académicas — RUBRO I y V-A, B o C» (A local, B general, C nacional/internacional); «Programas de cómputo — RUBRO I-B o C» (C: curso completo + Comité de Pares); «Propuesta educativa — RUBRO I o II-C» (con evaluación de Comité de Pares).
- **Reglas que cambian el nivel (verificado, Criterios de aplicación):** la Comisión Dictaminadora puede ubicar un trabajo en un nivel superior o inferior al del Cuadro, argumentando por escrito (punto 5); al menos una actividad debe ser del nivel de la categoría a la que se aspira (punto 2); el arbitraje positivo equivale a la evaluación de Comité de Pares para el nivel C (punto 9).
- **A completar:** una definición general de los niveles no se encontró en las secciones leídas; si existe, está fuera de las pp. 10–12 y 14–20. Se deja como «a verificar» y no se inventa.

---

## 8. Propuesta de enlace con la página de bitácoras

Referencia: `workspace/goals/ordenar-mis-minutas-y-pendientes/files/checklist-bitacora-web.md` (24 secciones; arquitectura: GitHub Pages + Apps Script + Drive; hashtags `#Estadistica1`, `#Estadistica2`, `#CchPage`, `#ControlFacturas`, `#AsistenciaCch`, `#MoodleDgtic`; plantillas versionadas; banco de peticiones v2 con 17 comandos). **No se construyó la página; solo se propone.**

### 8.1 Dónde vive el protocolo en el sistema

- El archivo guardado (`protocolo-puntaje-cch.json`) es el **catálogo de referencia** del sistema: se sube a Drive en `Bitacoras/protocolo-puntaje-cch.json` y la página lo lee como tabla de consulta (no se edita desde la página; solo se actualiza si cambia el Protocolo oficial).
- Se propone una **bitácora-hub nueva, `#PuntajeCch`** (slug `puntaje-cch`), solo para el seguimiento de la promoción: ahí viven el avance por categoría, las actividades registradas y el cálculo de puntos. **No se crea sola: requiere autorización de Nequiz** (regla del banco de peticiones: `#nuevaBitacora` solo prepara la propuesta).

### 8.2 Tabla de enlace categoría → rubro → hashtag de proyecto

La columna «proyecto sugerido» usa los hashtags ya confirmados; «sin proyecto» significa que ese rubro no tiene todavía un proyecto con hashtag y habría que crear uno (con autorización) o registrarlo en `#PuntajeCch`.

| Categoría objetivo | Rubro que suma al mínimo | Proyecto sugerido (hashtag) | Ejemplos de actividades de Nequiz que ya existen |
|---|---|---|---|
| Asociado A/B/C | I (mín. 50%) + resto libre | `#Estadistica1`, `#Estadistica2` | Paquete didáctico, Cuaderno de Estadística 1 y 2, guías, banco de reactivos |
| Asociado A/B/C | I | `#CchPage` | Material didáctico con uso de software, programas de cómputo para la enseñanza |
| Asociado A/B/C | I | `#MoodleDgtic` | Cursos en línea para alumnos, curso curricular/no curricular en línea |
| Titular A | I o II (150) + III (75) | `#Estadistica2` | Reporte de investigación (Rubro II), paquete didáctico (Rubro I) |
| Titular A | III (75) | `#MoodleDgtic` | Cursos para profesores, diseño de un curso para profesores |
| Titular B/C | I o II o III (150/200) + IV (50) + III (50) | `#AsistenciaCch` | (Parcial: participación en grupos de trabajo institucionales; la dirección de grupos como tal no tiene proyecto aún) |
| Titular B/C | IV (50) | Sin proyecto — registrar en `#PuntajeCch` o crear uno con autorización | Coordinación de grupos de trabajo, PROFOCE |
| Titular A/B/C | V (resto libre) | `#Estadistica1`, `#Estadistica2` | Infografía/ponencia (la ponencia para adolescentes y su informe de 5 días: Rubro V-B «Ponencia», 50 pts) |
| Titular A/B/C | VI (resto libre) | Sin proyecto — registrar en `#PuntajeCch` | Cargos honoríficos, jurado calificador |
| Lista jerarquizada (Doc. 2) | Criterios II–V | `#MoodleDgtic`, `#Estadistica2` | Diplomados, cursos acreditados, asesorías, tutorías, artículos (criterio III del Instructivo, con topes anuales) |

Nota: el mapeo por rubro no es 1 a 1 con un proyecto: una misma actividad (p. ej. un paquete didáctico) puede vivir en `#Estadistica2` y contar en el Rubro I. Por eso el enlace se hace **por actividad registrada**, no por proyecto entero.

### 8.3 Campos nuevos por sesión / evidencia (para registrar puntos)

Se agregan a la base común de la bitácora (checklist §17) y a la plantilla de sesión (§18). Ninguno sustituye los campos actuales; son un bloque `puntaje` opcional:

| Campo | Tipo | Regla |
|---|---|---|
| `puntaje.rubro` | I–VI | Obligatorio si la sesión cuenta para promoción |
| `puntaje.actividad_id` | texto (clave del catálogo) | Se elige de la lista del Protocolo; el nombre solo no basta (ver duplicados, §4). Propuesta de clave: `I-B-paquete-didactico` |
| `puntaje.actividad` | texto | Nombre tal cual en el catálogo |
| `puntaje.nivel` | A / B / C | Obligatorio; los puntos se calculan solos (A 25, B 50, C 150) |
| `puntaje.puntos` | número | Calculado, no escrito a mano |
| `puntaje.alcance` | local / general / nacional-internacional | Obligatorio para actividades cuyo nivel depende del alcance (p. ej. Organización de actividades académicas) |
| `puntaje.constancia` | sí / no + archivo | Obligatorio: sin documento probatorio o constancia oficial no se puede dictaminar (Criterio 10 del Protocolo) |
| `puntaje.dictamen` | pendiente / favorable / no favorable | Estado de la evaluación; lo pone la dictaminadora, no el profesor |
| `puntaje.periodo` | año lectivo (p. ej. 2026-2027) | Para concursos cerrados solo cuentan las actividades desde el último nombramiento |
| `puntaje.categoria_objetivo` | Asociado A/B/C, Titular A/B/C | La categoría a la que se aspira; la calculadora usa sus mínimos |
| `puntaje.evidencia_foto` | enlace a `Evidencias/` | Reutiliza la carga de archivos ya contemplada (checklist §4 y §21) |

### 8.4 Calculadora de avance (propuesta, en la página)

- Por categoría objetivo: total acumulado, subtotal por rubro, % de cada mínimo, faltante en puntos y **advertencias**: «te falta 1 actividad de nivel C», «el mínimo del Rubro I viene de una sola actividad», «esta actividad ya está registrada en otro rubro».
- Reglas de cálculo propuestas (conservadoras, hasta confirmar lo de §5): los bloques de mínimos no se solapan; una misma actividad no suma en dos rubros; el nivel lo fija la dictaminadora, no el registro.
- En el informe exportado (PDF/Word, checklist §21): anexo «Puntaje para promoción» con la tabla por rubro y el avance por categoría.

### 8.5 Comandos propuestos para el banco (v3, no se agregan sin aprobación)

- `#puntaje` — muestra el avance por categoría objetivo.
- `#verPuntaje #Proyecto` — puntos acumulados de ese proyecto por rubro.
- `#registrarActividad #Proyecto` + rubro, actividad, nivel y constancia — registra una actividad del catálogo.
- `#verCategoria Titular A` — muestra los mínimos y requisitos EPA de esa categoría.
- El catálogo del Protocolo se consulta con `#ayudaProyecto #PuntajeCch`.

### 8.6 Qué cambia en el checklist (propuesta, no aplicado)

- Nueva sección «25. Puntaje para promoción (Protocolo CCH 2020 + Instructivo 2023)» con: catálogo guardado, campos `puntaje`, calculadora, bitácora-hub `#PuntajeCch` (pendiente de autorización) y comandos v3.
- En §18 (plantillas): agregar el bloque `puntaje` a la plantilla de sesión, con `rubro`, `actividad_id`, `nivel`, `alcance` y `constancia` como campos opcionales.
- En §21 (exportar informe): agregar el anexo de puntaje al PDF/Word.

---

## 9. Veredicto: ¿el JSON es usable tal cual?

**Sí, como catálogo de referencia, con 2 correcciones y 3 completados pendientes:**

1. **Corregir (etiqueta):** renombrar `min_apoyo_investigacion_pct` → `min_bloque_principal_pct` (o `min_rubros_I_II_pct` / `min_rubros_I_II_III_pct` según la categoría), porque el mínimo no es solo investigación. Los porcentajes y puntos están bien.
2. **Corregir (alcance de Titular B):** confirmar en el PDF impreso si la tercera opción del mínimo es Rubro III (lo más probable) y no Rubro II como dice el texto extraído.
3. **Completar:** agregar por categoría los campos `minimo_rubro`, `minimo_puntos`, `requiere_nivel` («al menos una de nivel B/C»), `no_misma_actividad` (Asociados) y los requisitos EPA (estudios, años, labores) de §6.1.
4. **Completar:** resolver las variantes faltantes/dudosas del Cuadro (§4.4) con revisión visual del PDF, pp. 52–57.
5. **Completar (documento_2):** agregar las 5 etapas, comisiones, plazos y la regla de desempate del Art. 29 (§3.2).

El archivo guardado **no se modificó** para preservar el original del usuario; las correcciones se aplican a la versión de trabajo de la página, no al archivo guardado.

---

## 10. Archivos entregados

- `workspace/goals/ordenar-mis-minutas-y-pendientes/files/protocolo-puntaje-cch.json` — JSON exacto del usuario, verbatim, validado con `python3 -m json.tool` (38 856 bytes, SHA-256 `d2f04f019a667b89589d665e600c3795241345c9b315a9d45d45160e5e0e9366`).
- `workspace/goals/ordenar-mis-minutas-y-pendientes/files/analisis-protocolo-puntaje-cch.md` — este informe.

## Addendum 2026-11-18 — Normatividad unificada (v2)

Nequiz subió `cch_normatividad_unificada_2020_2023.json`. El catálogo v2 está en `protocolo-puntaje-cch/protocolo-puntaje-cch-v2.json` y el detalle completo en `protocolo-puntaje-cch/ACTUALIZACION-normatividad-unificada.md`. Resumen: glosario de 107 términos con definición/ejemplo/sede/digital; se resolvieron las variantes faltantes (Organización I-B, Revista en Rubro I) y la contradicción de Jornadas (I o III, A); siguen pendientes los reportes de investigación/validación (sin término propio en el glosario), la errata de Titular B y el directorio desactualizado (Graue por Lomelí).
