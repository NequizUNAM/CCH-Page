# Índice — Plantillas por rubro

**Actualización v2 (2026-11-18):** glosario unificado en `cch_normatividad_unificada_2020_2023.json`, catálogo v2 en `protocolo-puntaje-cch-v2.json`, cambios en `protocolo-puntaje-cch-CORRECCIONES.md` §6 y en `ACTUALIZACION-normatividad-unificada.md`. Las plantillas por rubro traen ahora definición, ejemplo, sede e indicador digital por actividad.

**Enlace programa → proyectos:** ver `ENLACE-proyectos.md` — flujo de cierre: proyecto terminado → generar reporte → mandar por correo o exportar a PDF para imprimir, con URLs de referencia en cada reporte. del Protocolo de puntaje CCH

**Fecha:** 2026-11-18
**Fuentes:** PDFs subidos por Nequiz el 2026-11-18 — Protocolo de Equivalencias 2020 (60 págs.) e Instructivo de Asignación de Horarios 2023 (22 págs.) — validados contra el Cuadro pp. 53-57 (revisión visual de las 5 páginas) y contra las fuentes oficiales de internet (ver URLs abajo).
**Archivo original sin modificar:** `../docs/historico/protocolo-puntaje-cch-v1.json` (JSON del usuario, 158 actividades). Las listas de estas plantillas siguen el **Cuadro del PDF (165 actividades)**, no el JSON; las diferencias están en `protocolo-puntaje-cch-CORRECCIONES.md`.

## Tabla rubro → archivo → actividades → a quién va dirigido

| Rubro | Archivo | Actividades (Cuadro) | A / B / C | A quién va dirigido |
|---|---|---|---|---|
| I — Trabajos de Apoyo a la Docencia | [rubro-I-apoyo-docencia.md](plantillas-rubro/rubro-I-apoyo-docencia.md) | 79 | 10 / 40 / 29 | COA: plataforma COA en https://www.cch.unam.mx (no por correo). Promoción: Comisión Dictaminadora vía Secretaría Académica del plantel. |
| II — Trabajos de Investigación | [rubro-II-investigacion.md](plantillas-rubro/rubro-II-investigacion.md) | 12 | 0 / 6 / 6 | Igual que Rubro I (mismo trámite, mismo destinatario). |
| III — Trabajos en la Formación de Profesores | [rubro-III-formacion-profesores.md](plantillas-rubro/rubro-III-formacion-profesores.md) | 35 | 3 / 20 / 12 | Igual que Rubro I. |
| IV — Trabajos de Dirección de Grupos Académicos | [rubro-IV-direccion-grupos.md](plantillas-rubro/rubro-IV-direccion-grupos.md) | 7 | 0 / 4 / 3 | Igual que Rubro I. Sin actividades de nivel A. |
| V — Trabajos de Difusión y Extensión Cultural | [rubro-V-difusion-extension.md](plantillas-rubro/rubro-V-difusion-extension.md) | 28 | 9 / 13 / 6 | Igual que Rubro I. |
| VI — Trabajos de Participación Universitaria Honoraria | [rubro-VI-participacion-honoraria.md](plantillas-rubro/rubro-VI-participacion-honoraria.md) | 4 | 1 / 2 / 1 | Igual que Rubro I. |
| Lista jerarquizada / Horarios | [lista-jerarquizada-horarios.md](plantillas-rubro/lista-jerarquizada-horarios.md) | 7 criterios (I-VII) | — | Carga de documentos en PDF: http://trayectoria.cch.unam.mx. Aclaraciones por correo según plantel/área (ver plantilla). |
| **Total Protocolo** | | **165** | **23 / 85 / 57** | |

## Qué se verificó contra los PDFs subidos

- ✅ **Cuadro completo, línea por línea (visual, pp. 53-57):** conteo por rubro y nivel — A: I 10, II 0, III 3, IV 0, V 9, VI 1 (23); B: I 40, II 6, III 20, IV 4, V 13, VI 2 (85); C: I 29, II 6, III 12, IV 3, V 6, VI 1 (57). Total 165, contra 158 del JSON.
- ✅ **Totales por categoría (Tiempo Completo, pp. 14-20):** Asociado A 100, B 200, C 250; Titular A 300, B 350, C 400. Mínimos y condiciones de nivel, verificados en el texto del PDF subido.
- ✅ **Titular B, p. 19:** el PDF impreso dice literalmente «o en formación de profesores (Rubro II)» donde debe decir **Rubro III**. Es una **errata del propio Protocolo oficial** (en Titular C, p. 20, sí dice Rubro III). No es error de extracción.
- ✅ **Glosario (pp. 21-52):** «Organización de actividades académicas» (A local, B general en el Colegio, C nacional/internacional, hasta 4 organizadores); «Participación en jornadas académicas» (RUBRO I o III-A, mín. 20 h, 90% asistencia); «Participación en la elaboración y publicación de una revista» (RUBRO I, III y V-B o C; C si ≥2 artículos propios); «Estancias» (cortas III-B ≥40 h, continuas III-C ≥160 h); «Cursos especiales» (RUBRO I y V-A o B; B si ≥40 h).
- ✅ **Instructivo (PDF subido):** horas por plantel (Art. 4, total 44 592), 5 etapas (Art. 7), comisiones mixtas (Art. 8), desempate Art. 29 (criterios en orden; II+III+IV se suman para el primer desempate si hay título superior a bachiller; luego la Dictaminadora por CV, fallo inapelable), plazos (Art. 30: 3 días hábiles para formalizar; Art. 32: 3 días para inconformarse, 5 días para resolver la Local/Intermedia, 15 días la Central).
- ✅ **Adenda de Medio Tiempo (internet, PDF oficial):** totales Asociado A 75, B 100, C 125; Titular A/B/C 200. **No estaba en el JSON del usuario**; se incorpora en las plantillas.

## Qué cambió respecto al análisis previo (2026-11-18)

1. **Resuelto — «Participación en jornadas académicas»:** la contradicción aparente Glosario vs Cuadro **no existe**. Ambos dicen I o III-A. El JSON estaba mal (II-A y VI-A). Corregido: II-A queda vacío y VI-A queda con un solo ítem.
2. **Resuelto — variante I-B de «Organización de actividades académicas»:** confirmada en el Cuadro, I-B núm. 32 (general en el Colegio). Ya no falta.
3. **Resuelto — variante Rubro I de «Participación en la elaboración y publicación de una revista»:** existe en I-B (núm. 34) e I-C (núm. 22). El JSON no la traía en ningún nivel del Rubro I. Agregada.
4. **Nuevo hallazgo — el JSON subcuenta el nivel B:** el Cuadro tiene 85 actividades B y el JSON 78. La diferencia son 8 actividades del Rubro I que el JSON trae **solo** como nivel C (Compilación, Compilador, Conferencias, Cuaderno de trabajo, Curso en línea, Guía de lectura, Organización, Participación en revista): en el Cuadro existen en **ambos** niveles, B y C.
5. **Nuevo hallazgo — el JSON sobrecuenta el nivel A:** el Cuadro tiene 23 actividades A y el JSON 25 (las 3 de II-A son en realidad III-A, y la de VI-A es en realidad I-A/III-A).
6. **Nuevo hallazgo — errata oficial en Titular B, p. 19:** «(Rubro II)» por «(Rubro III)».
7. **Nuevo hallazgo — numeración errónea en el Cuadro, p. 55:** los tres últimos ítems del Rubro III-B vienen numerados «18.» los tres; son 18, 19 y 20.
8. **Completado — Medio Tiempo:** la Adenda (totales y mínimos) no estaba en el JSON; ahora está en todas las plantillas.

## Qué sigue pendiente (sin verificar)

- Si los puntos de grado del criterio II de la lista jerarquizada se suman o solo cuenta el grado mayor (el Instructivo no lo aclara).
- El Art. 10 del Instructivo cita criterios «I al VIII», pero el Art. 29 lista I-VII: confirmar si existe un criterio VIII o es errata del Instructivo.
- Los topes del Glosario actividad por actividad (p. ej. hasta 6 profesores en paquete didáctico, hasta 4 en video educativo) no se extrajeron todos: solo los de las actividades con nota en las plantillas.
- Correo de aclaraciones de lista jerarquizada para Azcapotzalco y Naucalpan: no se encontró publicado en las fuentes consultadas.
- No hay correo genérico publicado para enviar el expediente de un COA: el canal oficial es la plataforma COA. El correo de la Secretaría Académica de cada plantel debe tomarse del calendario vigente de ese plantel.

## URLs oficiales verificadas (para consultar más tarde)

- Protocolo de Equivalencias 2020 (PDF oficial, Gaceta CCH): https://gaceta.cch.unam.mx/sites/default/files/2025-12/protocolo_equivalencias_ingreso_promocion_.pdf
- Adenda de Medio Tiempo, 1 de junio de 2020 (PDF oficial): https://cch.unam.mx/sites/default/files/suplementoadendo.pdf
- Instructivos y Protocolos vigentes (página oficial): http://www.cch.unam.mx/instructivos — también https://www.cch.unam.mx/academica/instructivos
- Instructivo de Asignación de Horarios 2023 (PDF oficial, Gaceta CCH 10-mar-2023): https://gaceta.cch.unam.mx/sites/default/files/2023-03/suplemento_horario.pdf
- Plataforma COA (concursos de oposición abierto): https://www.cch.unam.mx
- Convocatoria COA de ejemplo (9-oct-2025, PDF): https://www.cch.unam.mx/sites/default/files/ConvocatoriaCOA_091025.pdf
- Plataforma Trayectoria CCH (lista jerarquizada): http://trayectoria.cch.unam.mx
- Listas jerarquizadas publicadas: http://www.cch.unam.mx/listasjerarquizadas
- Cuadernillo de Orientaciones 2026-2027 (PDF): https://gaceta.cch.unam.mx/sites/default/files/2026-07/cuadernillo-orientacion-2026-2027_2_julio_2026_ok.pdf

## Destinatarios — resumen (sin inventar correos)

| Trámite | Presencial | Por correo / en línea |
|---|---|---|
| Ingreso / promoción a Profesor de Carrera (COA) | Secretaría Académica del plantel; Comisión Dictaminadora (vía convocatoria) | Plataforma COA en https://www.cch.unam.mx (registro 15 días hábiles; pruebas 15-30 días hábiles; acuse). Notificaciones al correo personal dado en la plataforma. **Sin correo genérico publicado.** |
| Promoción (concurso cerrado) | Secretaría Académica del plantel; Dirección General | El que indique la convocatoria de ese concurso. **Sin correo único publicado.** |
| Lista jerarquizada / horarios | Secretaría Académica y Dirección del plantel; Comisión Mixta Local de Horarios | http://trayectoria.cch.unam.mx (PDF + comprobante digital). Aclaraciones por correo según plantel/área (Oriente: documentosacademicos.oriente@cch.unam.mx; Vallejo: comisionmixta.vallejo@cch.unam.mx; Sur: jerarquizadas.<area>.sur@cch.unam.mx). |
