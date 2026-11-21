# Actualización — Normatividad unificada CCH (v2 del catálogo de puntaje)

**Fecha:** 2026-11-18
**Archivo nuevo:** `cch_normatividad_unificada_2020_2023.json` — "Normatividad Unificada CCH — UNAM (Protocolo de Equivalencias 2020 e Instructivo de Asignación de Horarios 2023)", fecha de generación 2026-11-18T23:57:12.420Z, 98 KB.
**Catálogo v2:** `protocolo-puntaje-cch-v2.json` (misma estructura del archivo unificado + `categorias_medio_tiempo` y `analisis_v2`). El JSON v1 (`protocolo-puntaje-cch.json`, 158 actividades) **no se tocó**.

> Nota técnica: el archivo subido traía BOM UTF-8; la copia guardada es UTF-8 sin BOM, con el mismo contenido. Validado con `python3 -m json.tool`.

## 1. Qué trae el archivo unificado (estructura)

| Clave de nivel superior | Contenido |
|---|---|
| `titulo` | Normatividad Unificada CCH — UNAM (Protocolo de Equivalencias 2020 e Instructivo de Asignación de Horarios 2023) |
| `fecha_generacion` | 2026-11-18T23:57:12.420Z |
| `protocolo_equivalencias_2020` | `publicacion` (Gaceta CCH Suplemento, 17 ene 2020, ISSN 0188-6975), `valores_nivel` (A 25 / B 50 / C 150), `total_terminos_glosario` (107), `glosario_completo` (107 términos), `categorias` (6 categorías de tiempo completo) |
| `instructivo_asignacion_horarios_2023` | `publicacion` (Gaceta CCH Suplemento, 10 mar 2023), `horas_permanentes_plantel` (5 planteles + Total 44 592), `plazos_legales` (6 plazos) |
| `directorio_institucional_completo` | 7 sedes, 62 cargos (UNAM 7, DGCCH 10, Azcapotzalco 10, Naucalpan 10, Vallejo 8, Oriente 8, Sur 9) |
| `plantillas_oficiales_tramite` | 7 plantillas oficiales con `numero`, `instancia`, `fundamento` y `texto` completo |

Cada término del glosario trae: `id` (gl-001 a gl-107), `name`, `rubros` (lista, uno o varios), `level`, `points`, `isDigital` (33 sí / 74 no), `definition`, `example`, `venue` (sede o instancia). Ningún término trae campos vacíos y no hay IDs duplicados.

## 2. Conteos nuevos

| | Glosario v2 | Cuadro oficial (PDF) | JSON v1 |
|---|---|---|---|
| Términos / actividades | 107 términos | 165 actividades | 158 actividades |
| Nivel A (25 pts) | 12 | 23 | 25 |
| Nivel B (50 pts) | 59 | 85 | 78 |
| Nivel C (150 pts) | 36 | 57 | 55 |
| Rubro I | 63 (44 solo en I) | 79 | 67 |
| Rubro II | 9 (5 solo en II) | 12 | 15 |
| Rubro III | 34 (22 solo en III) | 35 | 36 |
| Rubro IV | 7 (5 solo en IV) | 7 | 7 |
| Rubro V | 19 (6 solo en V) | 28 | 28 |
| Rubro VI | 4 (4 solo en VI) | 4 | 5 |
| Asignaciones a rubro (expandido) | 136 | 165 | 158 |

**Por qué 107 ≠ 165:** el glosario agrupa variantes en un solo término (alcance, horas, unidades, comités). Los puntos cuadran con A=25 / B=50 / C=150 en los 107 términos, sin excepciones.

### Totales por categoría (v2, en puntos, no en % engañoso)

| Categoría | Total | Mínimos |
|---|---|---|
| Asociado A | 100 | 50 en Rubro I |
| Asociado B | 200 | 100 en Rubro I |
| Asociado C | 250 | 125 en Rubro I, al menos una actividad de nivel B |
| Titular A | 300 | 150 en Rubro I o II (nivel C) + 75 en Rubro III (nivel B) |
| Titular B | 350 | 150 en Rubro I/II/III (nivel C) + 50 en Rubro IV + 50 en Rubro III |
| Titular C | 400 | 200 en Rubro I/II/III (nivel C) + 50 en Rubro IV + 50 en Rubro III |

La Adenda de Medio Tiempo (Asociado A 75, B 100, C 125; Titular A/B/C 200) **no viene** en el archivo unificado; se conserva en `categorias_medio_tiempo` del v2.

### Horarios (lo que trae el unificado)

Horas permanentes por plantel: Azcapotzalco 8 784, Naucalpan 8 452, Vallejo 8 856, Oriente 8 924, Sur 9 576; total 44 592 (igual que en el v1). Plazos legales: inicio del proceso 10 semanas antes de finalizar el año lectivo (Art. 26), revisión de representación legal 10 días hábiles (Art. 27), formalización 3 días hábiles (Art. 30), inconformidad 3 días (Art. 32), resolución Mixta Local 5 días hábiles y Mixta Central 15 días hábiles (Art. 32). **No trae los criterios I–VII de la lista jerarquizada**: siguen en el JSON v1, documento_2.

## 3. Las 5 diferencias más importantes frente al v1

1. **El glosario trae definición, ejemplo, sede e indicador digital por actividad.** Es el cambio más grande: cada actividad ahora se puede elegir sabiendo qué es, con qué ejemplo y en qué sede se acredita, y si es digital (33 de 107). Las plantillas por rubro I–VI traen ahora esa información en su sección «Actualización v2», y el formulario de puntaje de la página muestra la definición y la sede al elegir la actividad.
2. **Las variantes por alcance/horas quedan desdobladas en la definición, no en filas separadas.** Organización (gl-090, A/B/C por alcance), Paquete didáctico (gl-091, B/C), Charlas (gl-042, A/B), Estancias (gl-053/gl-054, con horas mínimas), Cargos honoríficos (gl-022/gl-023). 14 términos mencionan más de un nivel en su definición y van marcados con ⚠ en las plantillas; el campo `level` trae un solo nivel (el base) y el nivel aplicable se decide por alcance/horas.
3. **Se resolvieron las variantes que faltaban en el v1.** Jornadas académicas queda en Rubro I o III, nivel A (gl-095); Organización I-B y Revista en Rubro I (gl-090, gl-096) quedan cubiertas; Coordinación se distingue en B (gl-032) e Institucionales C (gl-033).
4. **Totales por categoría sin la etiqueta engañosa.** El v1 usaba `min_apoyo_investigacion_pct`; el v2 usa los mínimos en puntos por bloque (I o II; I/II/III; IV; III) tal como los trae el unificado.
5. **Material nuevo que el v1 no tenía: directorio institucional (7 sedes, 62 cargos) y 7 plantillas oficiales de trámite** (proyecto/informe anual, grupo de trabajo institucional, producto nivel C, tutoría PIA/PIT, SILADIN/Jóvenes, horarios, curso/diplomado CFC). Están en el v2 y resumidas en la plantilla de lista jerarquizada.

## 4. Qué se resolvió de lo pendiente

- Variantes faltantes (Organización I-B, Revista en Rubro I): **resueltas** (gl-090, gl-096).
- Contradicción Jornadas académicas (Glosario vs Cuadro): **resuelta** (gl-095: I o III, A).
- Coordinación/Dirección de grupos (niveles B/C): **resueltas** (gl-032/gl-033, gl-044/gl-045).
- Etiqueta `min_apoyo_investigacion_pct`: **sustituida** por mínimos en puntos.
- Plazos del Instructivo: **completados** con los 6 plazos del unificado (inicio, revisión, formalización, inconformidad y resoluciones).

## 5. Qué sigue sin verificarse / pendiente

1. **«Reporte de investigación» (II-B y II-C) y «Reporte de validación» (II-C) no tienen término propio en el glosario.** Lo más cercano es gl-024 (II-B) y gl-057 (II-C). No se inventó un término; si se registra un reporte, se anota con su nombre del Cuadro y se marca como «sin término gl-».
2. **Errata oficial de Titular B (Rubro II por Rubro III, p. 19 del PDF): sigue sin resolverse** — el unificado trae solo los puntos por categoría, no el texto del requisito.
3. **Directorio desactualizado en UNAM central:** trae como Rector a Enrique Graue Wiechers; el rector 2023–2027 es Leonardo Lomelí Vanegas (designado 9 de noviembre de 2023, verificado en internet el 2026-11-18). Los demás cargos del directorio no se verificaron uno por uno.
4. **Puntos de grado del criterio II de la lista jerarquizada** (¿se suman los grados o solo cuenta el mayor?) y el **supuesto criterio VIII** (el Art. 10 cita I–VIII y el Art. 29 lista I–VII): siguen pendientes, igual que en el análisis v1.
5. **Los criterios I–VII de la lista jerarquizada no vienen en el archivo unificado**: siguen solo en el JSON v1, documento_2, sin una fuente nueva que los confirme.
6. **El glosario no es el Cuadro:** para contar actividades del Cuadro (165) sigue valiendo la plantilla por rubro con su tabla del Cuadro; el glosario (107) es la referencia de definiciones, no el conteo de filas.

## 6. Archivos creados / actualizados en esta actualización

- `protocolo-puntaje-cch/cch_normatividad_unificada_2020_2023.json` (copia del archivo subido, sin BOM) y su copia en `programa-bitacoras-v1/protocolo-puntaje-cch/`
- `protocolo-puntaje-cch/protocolo-puntaje-cch-v2.json` (canónico) + copias en `programa-bitacoras-v1/protocolo-puntaje-cch/` y en `programa-bitacoras-v1/protocolo-puntaje-cch-v2.json` (esta última es la que lee la página para la ayuda del formulario de puntaje)
- `protocolo-puntaje-cch/plantillas-rubro/rubro-I..VI + lista-jerarquizada-horarios.md` (sección «Actualización v2» en cada una)
- `protocolo-puntaje-cch/protocolo-puntaje-cch-CORRECCIONES.md` §6
- `protocolo-puntaje-cch/INDICE-plantillas-rubro.md` y `ENLACE-proyectos.md` (nota v2)
- `protocolo-puntaje-cch/ACTUALIZACION-normatividad-unificada.md` (este archivo)
- `programa-bitacoras-v1/index.html` (formulario de puntaje: ayuda del glosario con definición/sede/digital y `glosario_id`) y `programa-bitacoras-v1/Codigo.gs` (columna `glosario_id` en la hoja Puntaje)
