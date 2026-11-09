# Dashboard CCH v6 · Instalación y ajustes

## Archivos

| Va en… | Archivo |
|---|---|
| GitHub (tu página) | `index.html`, `estilo.css`, `script.js` |
| Apps Script | `apps-script/Codigo.gs` (**un solo archivo**) y `appsscript.json` |

## Instalar (una vez)

1. **Respaldo:** en Google Sheets, Archivo → Hacer una copia.
2. **Apps Script:** abre Extensiones → Apps Script. **Borra todos los `.gs`** que tengas y crea uno llamado `Codigo`. Pega dentro el contenido completo de `Codigo.gs` y guarda.
3. **Contraseña:** en ⚙️ Configuración del proyecto → Propiedades de la secuencia de comandos, crea `CCH_ADMIN_PASSWORD` con tu contraseña.
4. **Migrar:** en el editor, arriba, elige la función **`migrarTodo`** y presiona **▶ Ejecutar**. Acepta los permisos que te pida: Hojas, Drive y «servicio externo», que sirve para generar el Excel.
5. **Publicar:** Implementar → Gestionar implementaciones → ✏️ → Versión: **Nueva versión** → Implementar. La URL no cambia.
6. **GitHub:** sube los 3 archivos de la página.

### Qué hace `migrarTodo`

Se puede repetir sin duplicar nada:

1. Guarda un respaldo ZIP de **toda** la hoja, en la misma carpeta de Drive.
2. Crea las hojas y carpetas que falten.
3. Convierte los ciclos a formato `2027-1`. Los que dicen `2026` pasan a `2027-1`.
4. En los reportes cambia Retardo → Asistencia, Justificada → Justificante y «First Name» → «Nombre».
5. Copia las calificaciones y los comentarios de `Calificaciones` a las hojas de la web.
6. Pasa la hoja `Proyectos` a la web: 11 equipos con sus estrellas. El Equipo 1 queda con 8, igual que antes.
7. Aplica el mismo diseño a todas las hojas: encabezado oscuro, filas alternas, colores de estado y lista desplegable ✓ ✗ J.
8. Borra la hoja `Proyectos`, porque ya está en la web.

## ✏️ Cómo ajustar (al inicio de `Codigo.gs`, busca «AJUSTA AQUÍ»)

| Quiero… | Cambia |
|---|---|
| Columnas de una hoja **nueva** | `BASE_SHEETS` → `optional`: quita las que no uses. `required` no se toca. |
| Columnas de los Reporte_ nuevos | `REPORT_COLUMNS = ["Cuenta", "Nombre"]`: agrega, por ejemplo, `"Observaciones"`. |
| Quitar de los Reporte_ viejos Parcial_1, Sellos, SIAE… | `MIGRATION.CLEAN_REPORT_COLUMNS: true` y vuelve a correr `migrarTodo` |
| Borrar otras hojas | `MIGRATION.DELETE_SHEETS: ["Proyectos", "Calificaciones", "Asesorias"]` |
| Volver a usar Retardo | `USE_RETARDO = true` |
| Corregir otro ciclo sin semestre | `MIGRATION.CICLO_MAP: { "2026": "2027-1", "2025": "2026-1" }` |

En las hojas que ya existen nunca se agregan ni se borran columnas por su cuenta. Solo se avisa si falta alguna de las obligatorias.

## Hojas: cuáles quedan

| Hoja | ¿Se queda? | Por qué |
|---|---|---|
| Course, Students, Attendance Log, Roles | **Sí** | AppSheet pasa lista ahí con el QR. |
| Reporte_* | **Sí (recomendado)** | Son la asistencia oficial del grupo y te las piden. El botón **Exportar** de la web genera además un reporte con calificaciones. |
| W_* | Sí | Todo lo de la web. |
| Calificaciones | Opcional | Después de migrar ya no se usa. Bórrala desde `DELETE_SHEETS` **y** quítala de AppSheet. |
| Proyectos | Se borra | Ya está en la web. |
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

## AppSheet después de migrar

- Sigue pasando lista con el QR igual que siempre; la web lee `Attendance Log`.
- Quita la opción **Retardo** de cualquier lista de AppSheet; usa Asistencia, Falta o Justificante.
- Si borras `Calificaciones` o `Proyectos`, quita esas tablas en AppSheet (Data → Tables) para que no marque error.

## Qué se maneja desde la web

| Pestaña | Qué haces |
|---|---|
| Asistencia | Ver ✓ ✗ J, **Exportar** el reporte, **+ Alumno**, clic en un nombre para ver su **ficha completa** |
| Pase de lista | ✓ ✗ J por fecha (también escribe en Attendance Log) |
| Captura / Ponderaciones / Proyectos / Evidencias | Calificaciones y evaluación |
| Alumnos | Buscar a cualquier alumno, de cualquier ciclo |
| Grupos | Ligar hojas, **Nuevo grupo** (crea Course + Reporte_) y **Enlaces para alumnos** |
| Mantenimiento | Migrar, ciclo, respaldos ZIP, vaciar tablas |
