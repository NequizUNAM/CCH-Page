# Dashboard CCH v6.2 · Instalación y ajustes

## Archivos

| Va en… | Archivo |
|---|---|
| GitHub (tu página) | `index.html`, `estilo.css`, `script.js` |
| Apps Script | `apps-script/Codigo.gs` (**un solo archivo**) y `appsscript.json` |

## Instalar o actualizar

1. Apps Script: deja **solo** `Codigo.gs` (y `appsscript.json`), pega el contenido nuevo y guarda.
2. Implementar → Gestionar implementaciones → ✏️ → **Nueva versión**. La URL no cambia.
3. Sube `index.html`, `estilo.css` y `script.js` a GitHub.

La migración ya se ejecutó en tu hoja y **ya no forma parte del código**.

## ✏️ Cómo ajustar (al inicio de `Codigo.gs`, busca «AJUSTA AQUÍ»)

| Quiero… | Cambia |
|---|---|
| Columnas de una hoja **nueva** | `BASE_SHEETS` → `optional` |
| Columnas de los Reporte_ nuevos | `REPORT_COLUMNS = ["Cuenta", "Nombre"]` |
| Estatus de alumno (Acta, Reprobado…) | `STUDENT_STATUSES` (value = lo que va en la hoja, label = lo que ves) |
| Volver a usar Retardo | `USE_RETARDO = true` |

## Columnas del reporte: visibles y enlazadas

En la web, pestaña **Asistencia → botón «Columnas»**:

- **Visible:** el interruptor escribe «Visible» u «Oculto» en la fila 1 de la hoja `Reporte_`. Los alumnos solo ven lo que está como Visible. Las fechas se ocultan o muestran con un clic. También puedes escribirlo a mano en la fila 1.
- **Se llena con:** enlaza la columna con un componente, un proyecto, el promedio actual o la final estricta. Desde ese momento la web **reescribe esa columna** en la hoja cada vez que capturas, calificas un equipo, aplicas puntos, pasas lista o sincronizas. Así se reemplazan las fórmulas viejas (VLOOKUP/XLOOKUP) que apuntaban a Calificaciones y Proyectos.
- Las sugerencias ya vienen marcadas y se aplican al presionar Guardar:

| Columna en tu hoja | Se llena con |
|---|---|
| Parcial_1 / Parcial_2 / Parcial_3 | Componente Parcial 1 / 2 / 3, con las calificaciones que tenías en Calificaciones |
| Sellos | Componente Sellos |
| Proyecto_Final (Estadística) | Componente Proyectos |
| Ejercicio Clase (CYC) | Proyecto «Proyecto (AppSheet)», el que se migró |
| Calificación | Promedio actual |
| Puntos Adicionales, SIAE | Sin enlace: se quedan como están |

- En la tabla de asistencia, los encabezados enlazados tienen 🔗. Al hacer clic te llevan a Captura (componente) o a ese proyecto, resaltado.

> En `Reporte_ESTADISTICA_512` la fórmula vieja de **Parcial_1** leía la columna de **Parcial_2** de Calificaciones. Al enlazar desde la web queda corregido.

## Alumnos nuevos (incluye Acta complementaria)

**Asistencia → + Alumno**: cuenta, nombre (vacío = se toma de Students si ya existe) y **Estatus** (Regular, Acta complementaria…). Se agrega:

- una fila en **Students** con su Course y su Status;
- una fila en su hoja **Reporte_**, con sus columnas enlazadas ya llenas;
- su registro en **Exportar** (CSV) y en **Exportar a PSI**.

El estatus se cambia desde la ficha del alumno. La función «Buscar alumnos duplicados» ahora escribe en su propia columna `Duplicado` y ya no en `Status`.

## Hojas: cuáles quedan

| Hoja | ¿Se queda? | Por qué |
|---|---|---|
| Course, Students, Attendance Log, Roles | **Sí** | AppSheet pasa lista ahí con el QR. |
| Reporte_* | **Sí (recomendado)** | Son la asistencia oficial del grupo y te las piden. El botón **Exportar** de la web genera además un reporte con calificaciones. |
| W_* | Sí | Todo lo de la web. |
| Calificaciones | Opcional | Primero enlaza las columnas del reporte (botón «Columnas») para que ya no dependan de ella. Después bórrala a mano y quítala de AppSheet. El botón «Importar de Calificaciones» de Ponderaciones solo funciona mientras exista. |
| Proyectos | Ya se borró | Está en la web. |
| Asesorias | Tú decides | El sistema no la usa. |

## Ciclos (antes TODAY)

Ya no hace falta escribir el ciclo a mano. El sistema lo calcula por fecha:

- agosto–enero → **año siguiente-1** (nov 2026 → `2027-1`)
- febrero–julio → **año-2** (mar 2027 → `2027-2`)

En **AppSheet**, en la columna `Ciclo_Escolar` de Course:

1. Tipo: **Text**. Si queda como Number, «2027-1» no se puede guardar.
2. Valor inicial:
   ```
   IF(MONTH(TODAY())>=8, (YEAR(TODAY())+1)&"-1", IF(MONTH(TODAY())=1, YEAR(TODAY())&"-1", YEAR(TODAY())&"-2"))
   ```
3. Regenera la estructura de la tabla (Data → Course → Regenerate schema).

Si en algún momento quieres fijar el ciclo a mano: **Mantenimiento → Ciclo actual**. Vacío = automático.

## AppSheet

- Sigue pasando lista con el QR igual que siempre; la web lee `Attendance Log`.
- Quita la opción **Retardo** de cualquier lista de AppSheet; usa Asistencia, Falta o Justificante.
- Si borras `Calificaciones` o `Proyectos`, quita esas tablas en AppSheet (Data → Tables) para que no marque error.

## Exportar a PSI

En **Asistencia**, el botón verde **Exportar a PSI** abre la vista previa de las sugerencias del grupo:

| Campo PSI | Regla |
|---|---|
| Avance académico | Promedio actual redondeado (5–10); NP si nunca se presentó |
| % asistencia | asistencias ÷ (asistencias + faltas) |
| Entrega tareas | El componente que elijas: ≥ 8 SI, 5–7.9 OCASIONALMENTE, < 5 NO |
| Dificultades | Psicoemocional si tus comentarios lo mencionan; Académico si promedio < 6 |
| Asistencias | Más de 3 faltas · Dejó de asistir (3 faltas seguidas al final) · Nunca se presentó |
| Derivación y motivo | Tutoría (faltas), Asesoría (promedio < 6 y rubro más bajo), Psicopedagogía (comentarios) |
| Riesgo | Suma de promedio, faltas, tareas y comentarios |
| Encabezado | Fecha, Parcial o Final, Observaciones y Acciones redactadas con las cifras del grupo (editables) |

Pasos: **Copiar JS** → abre en PSI la captura del grupo → F12 → Consola → pega → Enter. Se llena por número de cuenta y **no se guarda solo**: revisa y presiona Guardar. Las palabras que se detectan como psicoemocionales están en `Psi.KEYWORDS`, en `script.js`.

## Alumnos agregados a mano en Students

Si das de alta alumnos directamente en la hoja, escribe en la columna `Course` el `ID_Curso` exacto. En **Mantenimiento → Alumnos agregados a mano** puedes copiar cada ID con un clic, y ahí mismo ves si hay alumnos con un Course vacío o mal escrito.

## Qué se maneja desde la web

| Pestaña | Qué haces |
|---|---|
| Asistencia | Ver ✓ ✗ J, **Exportar** el reporte, **Exportar a PSI**, **+ Alumno**, clic en un nombre para ver su **ficha** (una sola vista con una card por grupo) |
| Pase de lista | ✓ ✗ J por fecha (también escribe en Attendance Log) |
| Captura / Ponderaciones | Calificaciones y evaluación |
| Evidencias | Lo que suben los alumnos en **Extracurriculares**; vista Tarjetas o Tabla (Revisar abre un modal) |
| Proyectos | Vista **Tarjetas** (editas ahí mismo) o **Tabla** (Editar abre un modal) |
| Alumnos | Buscar a cualquier alumno, de cualquier ciclo |
| Grupos | Ligar hojas, **Nuevo grupo** (crea Course + Reporte_) y **Enlaces para alumnos** |
| Mantenimiento | Ciclo, respaldos ZIP, alumnos agregados a mano, vaciar tablas |
