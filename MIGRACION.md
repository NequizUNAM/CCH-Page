# Dashboard CCH v5 · Guía de migración

## ¿Hay que migrar la base de datos?

**No.** Todo sigue en tu Google Sheet y en Apps Script:

| Qué | Dónde vive | ¿Cambia? |
|---|---|---|
| Pase de lista (QR/AppSheet) | `Attendance Log` | No. AppSheet sigue escribiendo igual. |
| Alumnos e inscripciones | `Students`, `Course` | No (solo lectura). |
| Sincronización de asistencias | `Reporte_*` + `10_Asistencia.gs` | Misma lógica v4; ahora se dispara desde la web o el menú. |
| Calificaciones y comentarios viejos | `Calificaciones` | Solo lectura; se pueden importar a la web. |
| **Lo nuevo** (ponderaciones, captura, proyectos, equipos, evidencias, comentarios web) | Hojas `W_*` | Se crean solas. |

Apps Script alcanza de sobra para ~500 alumnos y unos 10 grupos. Solo valdría la pena moverse a una base de datos real (Supabase o Firebase) si llegas a miles de alumnos, si quieres respuestas de menos de 1 segundo o si necesitas que muchas personas escriban al mismo tiempo.

## Números de cuenta repetidos

El **número de cuenta identifica a la persona**, y cada fila de `Students` es una **inscripción** (`Cuenta + ID_Curso`). El `ID_Curso` ya incluye el ciclo (por ejemplo `Estadistica[2025][603]` o `54526c57` con `Ciclo_Escolar = 2026`), así que:

- Una cuenta repetida **no es un error**: puede ser el mismo alumno en otro ciclo o en dos materias del mismo ciclo (Estadística y Cibernética, por ejemplo).
- Las calificaciones y los equipos se guardan por **Cuenta + ID_Curso**, nunca solo por cuenta.
- Los comentarios se guardan por cuenta (con grupo opcional). En **Alumnos → ficha** ves todas sus inscripciones y todos sus comentarios juntos, tanto los de AppSheet como los de la web.
- En las tablas del panel, un alumno con la etiqueta «2 grupos» está inscrito en más de un curso.

**Recomendación:** al iniciar cada ciclo, crea un `ID_Curso` nuevo en `Course` (no reutilices el del ciclo pasado) y marca como inactivos los grupos viejos en la pestaña **Grupos**. Así los alumnos solo ven lo del ciclo actual, y tú conservas el historial.

## Ciclos (2 por año)

- En **Mantenimiento → Ciclo actual**, escribe el ciclo vigente en formato `2027-1` o `2027-2`.
- En tu hoja `Course`, los cursos actuales tienen `Ciclo_Escolar = 2026`, sin semestre. Cámbialos a `2027-1` en `Course` o en la pestaña **Grupos**; la pestaña Mantenimiento te avisa cuando falta el semestre.
- El ciclo actual no se puede respaldar ni borrar.

## Respaldo por ciclo (Mantenimiento)

1. Marca los ciclos anteriores y presiona **Vista previa** para ver cuántos registros de cada tabla se respaldarán.
2. Presiona **Respaldar**:
   - Se crea **un Excel por ciclo** dentro de un **ZIP** en la **misma carpeta de Drive que tu hoja de cálculo**. Cada Excel incluye Course, Students, Attendance Log, Calificaciones, Roles, las hojas `W_*` de esos grupos y sus hojas `Reporte_` completas.
   - Si el interruptor «Borrar» está activo, se pide escribir `BORRAR`. **Solo si el ZIP quedó guardado** se borran esas filas y las hojas `Reporte_` ligadas. Antes se guarda en `W_Historial` un resumen por alumno: curso, ciclo, asistencias, faltas, calificación final y comentarios.
3. El ZIP aparece en **Respaldos guardados** con sus botones Drive y Descargar.

Gracias a `W_Historial`, después de borrar sigues sabiendo quién fue tu alumno antes. Aparece en la ficha y en el popover violeta de las listas. Las fotos de evidencias **no** se borran de Drive.

## Vaciar tablas (Zona de peligro)

- Cada tabla tiene su botón **Vaciar**, que pide escribir el nombre exacto de la tabla. **Vaciar TODAS** pide escribir `BORRAR TODO`.
- Siempre se genera primero un ZIP `Limpieza_CCH_…` con lo que se va a borrar. Se conservan los encabezados.
- Las hojas `Reporte_` no se tocan aquí: se borran con el respaldo por ciclo.

## Hoja nueva en blanco

Con **Verificar / crear hojas y carpetas** (o desde el menú 🌐) se crea lo que falte:

- las hojas de la plantilla Attendance Log: Course, Students, Attendance Log, Calificaciones y Roles, con sus columnas;
- las hojas `W_*`;
- las carpetas de la plantilla junto a la hoja: Course_Files_, Course_Images, eventos_CCH, Eventos_Images, Horarios Profesor, Logos, Material_Archivos, Material_Images, notas_alumnos, programas_estudio, Students_Images y Evidencias_Alumnos.

Lo que ya existe **no se modifica**. Si a una hoja de AppSheet le falta una columna, solo se avisa.

## Pase de lista desde la web

- En **Pase de lista** eliges la fecha (hoy o una anterior) y marcas A, R, F o J. El botón «Sin marcar → Asistencia» llena a todos los que no tengan marca.
- Si no existe la columna de esa fecha en `Reporte_`, se inserta en orden.
- También se escribe en `Attendance Log` (Asistencia y Retardo), con id `web_…`, para que la sincronización y AppSheet coincidan. Si después cambias a un alumno a Falta, ese registro web se elimina.
- Si el alumno escaneó su QR ese día, su registro real se conserva y la sincronización lo respeta.

## Indicadores en las listas

En el nombre de cada alumno pueden aparecer estas marcas; pasa el cursor o toca para ver el detalle:

- 🔵 **Azul**: también está contigo en otro grupo **este ciclo** (por ejemplo, Estadística y Cibernética).
- 🟣 **Violeta**: lo tuviste en un **ciclo anterior**, incluidos los ciclos ya archivados (con su calificación final y sus faltas).
- 🟠 **Ámbar**: tiene comentarios.

La celda también lleva una franja de color a la izquierda.

## Permisos

- **Admin** (con contraseña): todo lo anterior.
- **Alumno**: ver **solo** su asistencia y sus calificaciones, registrar su equipo **solo** en proyectos que tú habilitaste (sin repetir integrantes ni nombre de equipo en ese proyecto) y subir evidencias.

## Pasos

1. **Respaldo:** Archivo → Hacer una copia de la hoja.
2. **Apps Script** (Extensiones → Apps Script):
   - Borra el `Código.gs` actual y crea los archivos de `apps-script/` con los mismos nombres. El orden no importa porque todos comparten el mismo ámbito.
   - Activa «Mostrar el archivo de manifiesto `appsscript.json`» en Configuración del proyecto y pega el que viene aquí.
   - Verifica que exista la propiedad de script `CCH_ADMIN_PASSWORD` (Configuración del proyecto → Propiedades de la secuencia de comandos).
3. **Autoriza:** recarga la hoja de cálculo y usa el menú **⚙️ Sistema CCH → 🌐 Preparar hojas de la web**. La primera vez te pedirá permisos de Hojas, Drive (evidencias, carpetas y respaldos) y «conectarse a un servicio externo» (sirve para convertir el respaldo a Excel). Se crean las hojas y carpetas que falten y se ligan solos los 5 reportes con su curso; revisa el resultado en `W_Grupos`.
4. **Publica:** Implementar → Gestionar implementaciones → ✏️ en la implementación actual → Versión: **Nueva versión** → Implementar. Así **la URL no cambia** y `CONFIG.API_URL` en `script.js` sigue sirviendo.
5. **GitHub:** sube `index.html`, `estilo.css` y `script.js` (reemplazan los actuales).
6. **En la web**, entra como Admin y, en cada grupo:
   - Ve a **Ponderaciones**, aplica la *Plantilla por defecto* (o arma la tuya) y guarda.
   - Usa *Importar de «Calificaciones»* para traer los Parcial_1/2/3, Sellos y Proyecto_Final que ya tenías. Si algún valor no se importa por pasar el máximo (por ejemplo, sellos mayores a 15), ajusta el «Máximo» de ese componente y vuelve a importar.

## Cómo funciona cada parte

- **Ponderaciones por grupo.** Cada componente tiene nombre, tipo, porcentaje y escala:
  - *manual*: lo capturas tú (Teams /100, sellos /15, examen /10…) y se convierte a escala 10;
  - *asistencia*: (asistencias + retardos) / días con lista × 10;
  - *proyectos*: el promedio de los proyectos ligados.
- **Calificación final.** El alumno ve dos cifras:
  - *Promedio actual*: solo sobre lo ya evaluado;
  - *Si hoy cerrara el curso*: lo pendiente cuenta 0.
- **Proyectos.** Defines los rubros por proyecto y por grupo, cada uno de 1 a 5 ★. La calificación del equipo (★ / (5 × rubros) × 10) se aplica sola a todos los integrantes. Quien no tiene equipo recibe 0 **solo cuando cierras el registro**.
- **Registro de equipos.** El alumno escribe el nombre del equipo y las cuentas de sus compañeros. Se valida que estén inscritos en el grupo y que nadie esté en dos equipos del mismo proyecto. Solo tú puedes editar un equipo ya registrado.
- **Evidencias.** El alumno sube una foto o PDF, que se guarda **privado** en la carpeta `Evidencias_Alumnos`, junto a tu hoja de cálculo. Tú eliges los puntos y a qué componente manual se suman (con tope en su máximo). El alumno ve la etiqueta `+0.5` sobre esa calificación, con un popover que dice qué evidencia fue y cuándo se aplicó.
- **Faltas.** Con más de 4 faltas, el número de cuenta se pinta de rojo pastel, más intenso con cada falta, hasta 12. Se configura en `CONFIG.FALTAS_UMBRAL`.

## Seguridad y privacidad

- Antes, `getData` enviaba la hoja completa a cualquiera, incluidas las columnas «Oculto». Ahora el alumno **solo recibe su propia fila** y solo las columnas visibles. Los comentarios nunca salen del panel de admin.
- El alumno entra **solo con su número de cuenta**, que debe existir en `Students`. Cualquiera que conozca una cuenta puede ver la asistencia y las calificaciones de ese alumno; por eso la página de inicio pide no compartirla. Los comentarios y los datos de otros alumnos nunca se envían.
- La contraseña de admin viaja por POST, nunca en la URL. La sesión dura 6 h, y tras 5 intentos fallidos el acceso se bloquea 10 minutos.
- En el navegador se guardan las preferencias (tema, tablas compactas, recordar cuenta) en `localStorage`, y la sesión en `sessionStorage`, que se borra al cerrar la pestaña.

## Ya no se usa

- Los botones de Google Forms «Forms Eventos» y «Form Equipos»: ahora son las pestañas *Evidencias* y *Equipos*. Si quieres conservarlos un tiempo, vuelve a pegar sus `<a>` en la barra de `index.html`.
- La columna `Proyectos!` con `VLOOKUP` en los reportes CYC: ahora la calificación del proyecto sale de la web.
