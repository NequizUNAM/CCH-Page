# Correcciones al protocolo de puntaje CCH (JSON del usuario vs Cuadro del PDF)

**Fecha:** 2026-11-18
**Archivo original (SIN modificar):** `../protocolo-puntaje-cch.json` — JSON pegado por Nequiz el 2026-11-18 12:04, 158 actividades, SHA-256 `d2f04f019a667b89589d665e600c3795241345c9b315a9d45d45160e5e0e9366`.
**Fuente de corrección:** PDFs subidos por Nequiz el 2026-11-18 12:13 — Protocolo de Equivalencias 2020 (60 págs.) e Instructivo de Asignación de Horarios 2023 (22 págs.). Cuadro pp. 53-57 revisado visualmente página por página.
**Regla:** el JSON original no se toca. Estas correcciones se aplican solo a las plantillas por rubro (`plantillas-rubro/`) y a la versión de trabajo de la página.

## 1. Resumen del conteo

| Nivel | Cuadro (PDF) | JSON del usuario | Diferencia |
|---|---|---|---|
| A (25 pts) | 23 | 25 | JSON +2 (mal ubicadas) |
| B (50 pts) | 85 | 78 | JSON −7 |
| C (150 pts) | 57 | 55 | JSON −2 |
| **Total** | **165** | **158** | **JSON −7** |

Por rubro (Cuadro vs JSON): I 79 vs 67 (+12), II 12 vs 15 (−3), III 35 vs 36 (−1), IV 7 vs 7 (0), V 28 vs 28 (0), VI 4 vs 5 (−1).

## 2. Correcciones por rubro y nivel

### Rubro I — Apoyo a la Docencia (Cuadro 79; JSON 67)
- **Faltan en el JSON (agregar):**
  - I-A: «Cursos especiales o extracurriculares para alumnos», «Participación en jornadas académicas».
  - I-B (8): «Compilación de lecturas», «Compilador de libro», «Conferencias o videoconferencias», «Cuaderno de trabajo», «Curso curricular o no curricular en línea», «Guía de lectura», «Organización de actividades académicas», «Participación en la elaboración y publicación de una revista». El JSON no trae ninguna en el nivel B del Rubro I: varias solo aparecen como nivel C en ese rubro y las demás no aparecen en ese rubro en ese nivel. En el Cuadro existen en B **y** en C.
  - I-C: «Formador de tutores».
- **Calificativos que son condición del Glosario, no parte del nombre:** «Organización de actividades académicas (Nacional/Internacional)» → nombre del Cuadro sin paréntesis; el alcance (local/general/nacional-internacional) define el nivel A/B/C.

### Rubro II — Investigación (Cuadro 12; JSON 15)
- **Quitar del Rubro II (error del JSON):** II-A «Compilación de lecturas», «Cursos recibidos», «Participación en jornadas académicas». La columna Rubro II, Nivel A, está **vacía** en el Cuadro (p. 53). Esas 3 actividades son del **Rubro III-A**.
- **Nombre:** «Reporte de investigación (incluyendo avances)» (II-B, JSON) → «Reporte de investigación» (Cuadro). La variante C es «Reporte de investigación» (II-C) sin paréntesis.

### Rubro III — Formación de Profesores (Cuadro 35; JSON 36)
- **Quitar:** III-B «Conferencias o videoconferencias» (está en I-B, II-B y V-B, no en III-B).
- **Nombres:** «Estancias (cortas)» → «Estancias» (III-B; cortas ≥40 h, según Glosario); «Estancias (continuas)» → «Estancias» (III-C; continuas ≥160 h). «Guía de estudios para el examen de conocimientos y habilidades disciplinarias» → «…disciplinarias **para la docencia**» (nombre completo del Cuadro).
- **Errata del PDF (no del JSON):** en la p. 55 los tres últimos ítems del Rubro III-B vienen numerados «18.» los tres (Glosario, Guía de estudios, Participación en revista); son 18, 19 y 20.

### Rubro IV — Dirección de Grupos (Cuadro 7; JSON 7)
- Sin cambios de contenido. Solo homologación: el nivel va en el campo `nivel`, no en el sufijo «(Nivel C)» del nombre.

### Rubro V — Difusión y Extensión Cultural (Cuadro 28; JSON 28)
- Sin cambios de conteo. Los paréntesis del JSON («(locales)», «(generales)», «(nacionales/internacionales)», «(40 hrs o más)», «(conjunto)», «(con artículos propios)», «(con réplica)») son condiciones del Glosario, no parte del nombre del Cuadro; se conservan como nota.
- Nombre: «Seminarios o talleres extracurriculares para alumnos monitores o formadores» → «…monitores o formadores **de alumnos**».

### Rubro VI — Participación Universitaria Honoraria (Cuadro 4; JSON 5)
- **Quitar:** VI-A «Participación en jornadas académicas» (es I-A y III-A). El Rubro VI-A tiene un solo ítem en el Cuadro.
- Los paréntesis del JSON en «Cargos honoríficos» («(Consejos, Comisiones Dictaminadoras)» en B, «(Comisión Dictaminadora periodo completo)» en C) son la condición que distingue el nivel; el nombre del Cuadro es «Cargos honoríficos» en ambos niveles.

## 3. Correcciones de etiquetas y de totales (del análisis previo, confirmadas)

1. **`min_apoyo_investigacion_pct` es engañosa.** El mínimo de Titular A/B/C no es solo investigación: es Rubro I **o** II (A, 150 pts) / I **o** II **o** III (B, 150 pts; C, 200 pts). Renombrar a `min_bloque_principal_pct` en la versión de trabajo. Los números y porcentajes están bien (42.85% y 14.28% son redondeos de 150/350 y 50/350).
2. **Errata oficial en Titular B, p. 19:** el PDF dice «o en formación de profesores (Rubro II)»; debe decir **Rubro III** (en Titular C, p. 20, sí dice Rubro III). No es error de extracción: está así en el PDF subido.
3. **Falta la Adenda de Medio Tiempo (no estaba en el JSON):** Asociado A 75 (mín. I: 25, 33.33%), B 100 (mín. I: 50, 50%), C 125 (mín. I: 75, 60%, al menos una B; resto con no más de un trabajo de los rubros V y VI); Titular A/B/C 200 (mín. 150, 75%, con una actividad de nivel C + 50 de nivel B en Rubro III o IV). Fuente: Adenda, 1 de junio de 2020, https://cch.unam.mx/sites/default/files/suplementoadendo.pdf
4. **Condiciones de nivel que el JSON no trae (confirmadas en el PDF subido, pp. 14-20):** al menos una actividad de nivel B (Asociado C, Titular A Rubro III, Titular B/C Rubros III y IV) o de nivel C (Titulares, bloque principal); en Asociados, los puntos del Rubro I «con trabajos que no sean de una misma actividad».

## 4. Correcciones del documento 2 (Instructivo de Horarios)

El JSON numérico estaba bien (horas por plantel y desgloses de criterios II-V verificados). Lo que faltaba y se completó en la plantilla `lista-jerarquizada-horarios.md`:
- Las 5 etapas (Art. 7), comisiones mixtas (Art. 8), regla de desempate (Art. 29: criterios en orden; II+III+IV se suman para el primer desempate si hay título superior a bachiller; luego la Dictaminadora por CV, fallo inapelable), plazos (Art. 30: 3 días hábiles para formalizar; Art. 32: 3 días para inconformarse, 5 días Local/Intermedia, 15 días Central), y la nota 2 del Art. 29 (una misma actividad, un solo rubro).

## 5. Pendiente de verificar (no resuelto con los PDFs)

- Si los puntos de grado del criterio II se suman o solo cuenta el grado mayor.
- El Art. 10 cita criterios «I al VIII» y el Art. 29 lista I-VII: ¿existe un criterio VIII o es errata?
- Topes del Glosario actividad por actividad (solo se anotaron los de las actividades con nota en las plantillas).
- Correos de aclaraciones de lista jerarquizada para Azcapotzalco y Naucalpan (no publicados en las fuentes consultadas).
- No hay correo genérico publicado para el expediente de un COA; el canal oficial es la plataforma COA.

## 6. Actualización v2 — Normatividad unificada (2026-11-18)

**Archivo nuevo:** `cch_normatividad_unificada_2020_2023.json` (fecha de generación 2026-11-18, 98 KB, sin BOM en la copia guardada; el original traía BOM UTF-8). **Catálogo v2:** `protocolo-puntaje-cch-v2.json` (misma estructura del unificado + `categorias_medio_tiempo` y `analisis_v2`). El JSON v1 (158 actividades) no se tocó.

### 6.1 Qué trae el archivo unificado (estructura)

| Clave de nivel superior | Contenido |
|---|---|
| `titulo` | Normatividad Unificada CCH — UNAM (Protocolo 2020 e Instructivo 2023) |
| `protocolo_equivalencias_2020` | `publicacion`, `valores_nivel` (A 25 / B 50 / C 150), `total_terminos_glosario` (107), `glosario_completo` (107 términos), `categorias` (6 categorías TC) |
| `instructivo_asignacion_horarios_2023` | `publicacion`, `horas_permanentes_plantel` (5 planteles + Total 44 592), `plazos_legales` (6 plazos) |
| `directorio_institucional_completo` | 7 sedes, 62 cargos (UNAM 7, DGCCH 10, Azcapotzalco 10, Naucalpan 10, Vallejo 8, Oriente 8, Sur 9) |
| `plantillas_oficiales_tramite` | 7 plantillas oficiales con instancia, fundamento y texto completo |

Cada término del glosario trae: `id` (gl-001 a gl-107), `name`, `rubros` (lista, uno o varios), `level`, `points`, `isDigital` (33 sí / 74 no), `definition`, `example`, `venue` (sede/instancia). Ningún término trae campos vacíos.

### 6.2 Conteos del glosario unificado vs Cuadro vs JSON v1

| | Glosario v2 | Cuadro (PDF) | JSON v1 |
|---|---|---|---|
| Términos / actividades | 107 términos | 165 actividades | 158 actividades |
| Nivel A (25) | 12 | 23 | 25 |
| Nivel B (50) | 59 | 85 | 78 |
| Nivel C (150) | 36 | 57 | 55 |
| Rubro I | 63 (44 solo en I) | 79 | 67 |
| Rubro II | 9 (5 solo en II) | 12 | 15 |
| Rubro III | 34 (22 solo en III) | 35 | 36 |
| Rubro IV | 7 (5 solo en IV) | 7 | 7 |
| Rubro V | 19 (6 solo en V) | 28 | 28 |
| Rubro VI | 4 (4 solo en VI) | 4 | 5 |
| Asignaciones rubro (expandido) | 136 | 165 | 158 |

**Por qué 107 ≠ 165:** el glosario agrupa variantes en un solo término (alcance, horas, unidades, comités). 14 términos mencionan más de un nivel en su definición (ver `analisis_v2.terminos_multi_nivel_en_definicion` en el v2); el campo `level` trae un solo nivel y no se corrigió: el nivel aplicable se decide por alcance/horas según la definición. Los casos más grandes: gl-105 agrupa 4 actividades y gl-107 agrupa 5.

### 6.3 Qué se resolvió con el glosario unificado

- **Jornadas académicas:** gl-095 la deja en Rubro I o III, nivel A (20 h, 90% asistencia). Se resuelve la contradicción Glosario vs Cuadro del análisis v1.
- **Organización de actividades académicas:** gl-090 confirma el nivel por alcance (A local / B general / C nacional-internacional) y añade el Rubro V. La variante I-B que faltaba queda cubierta.
- **Revista:** gl-096 confirma Rubros I, III y V, B, y C con al menos 2 artículos propios. La variante del Rubro I que faltaba queda cubierta.
- **Coordinación de grupos:** gl-032 (B) vs gl-033 «Institucionales» (C) distingue lo que el JSON viejo ponía solo como «(Nivel C)».
- **Dirección de grupos con alumnos:** gl-044 (B) y gl-045 (C, Comité de Pares), Rubros II y IV.
- **Estancias:** gl-053 (cortas, ≥40 h, B) y gl-054 (continuas, ≥160 h, C) con sus horas mínimas.
- **Cargos honoríficos:** gl-022 (anual, B) y gl-023 (Comisión Dictaminadora 2 años, C).
- **Totales por categoría:** el unificado trae los 6 totales TC con mínimos en puntos (no en % engañoso): Titular A 300 (150 en I o II + 75 en III), Titular B 350 (150 en I/II/III + 50 en IV + 50 en III), Titular C 400 (200 en I/II/III + 50 en IV + 50 en III). La etiqueta `min_apoyo_investigacion_pct` del v1 queda sustituida por estos campos. La Adenda de Medio Tiempo sigue sin venir en el unificado; se conserva en `categorias_medio_tiempo` del v2.

### 6.4 Inconsistencias del archivo unificado (no copiadas como correctas)

1. **Términos multi-nivel con un solo `level`:** 14 términos (gl-038, gl-042, gl-046, gl-051, gl-081, gl-089, gl-090, gl-091, gl-096, gl-100, gl-102, gl-105, gl-106, gl-107; ver `analisis_v2.terminos_multi_nivel_en_definicion` en el v2). El campo `level`/`points` es el nivel base; la definición dice los demás niveles. En las plantillas van marcados con ⚠.
2. **«Reporte de investigación» (II-B y II-C) y «Reporte de validación» (II-C) no tienen término propio en el glosario.** Lo más cercano: gl-024 (II-B) y gl-057 (II-C). No se inventó un término.
3. **Directorio desactualizado:** trae como Rector a Enrique Graue Wiechers; el rector 2023–2027 es Leonardo Lomelí Vanegas (designado 9 nov 2023). No usarlo como fuente de autoridades vigentes.
4. **El instructivo unificado no trae los criterios I–VII de la lista jerarquizada** (solo horas y plazos). Siguen en el JSON v1, documento_2.
5. **Errata oficial de Titular B (Rubro II por Rubro III) sigue sin resolverse** en el unificado: sus categorías no traen el texto del requisito, solo los puntos, así que la errata se mantiene como nota del §3.
6. **Puntos de grado del criterio II (¿se suman o solo cuenta el mayor?) y el supuesto criterio VIII siguen pendientes**, igual que en el análisis v1.
