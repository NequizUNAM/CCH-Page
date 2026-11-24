# Dashboard CCH v7.0 · Instalación y ajustes

## Archivos

| Va en… | Archivo |
|---|---|
| GitHub (tu página) | `index.html`, `estilo.css`, `script.js` |
| GitHub (exámenes) | `examenes_cibernetica.html`, `examenes_estadistica.html` (solo el examen del alumno) |
| GitHub (paneles de examen) | `panel_examen_cibernetica.js`, `panel_examen_estadistica.js` (los usa el Dashboard) |
| Apps Script | `asistencias/apps-script/Codigo.gs`, `asistencias/apps-script/Examenes.gs` (archivo aparte) y `asistencias/apps-script/appsscript.json` |

## Exámenes en línea (mismo proyecto, misma URL)

Los dos exámenes ya no usan su hoja aparte: viven en la hoja de **Asistencias**.

1. Apps Script de Asistencias → **+ → Secuencia de comandos** → nómbrala `Examenes` → pega `Examenes.gs`. Codigo.gs se queda igual.
2. **Si quieres conservar los resultados anteriores:** en la hoja vieja de exámenes, clic derecho en cada pestaña (`Resultados Cibernética`, `Config Cibernética`, `Resultados Estadística`, `Config Estadística`) → **Copiar en → Hoja de cálculo existente** → Asistencias. En Asistencias quítales el «Copia de» del nombre. Así conservas también las contraseñas de cada parcial.
3. Si empiezas de cero, ejecuta `crearTablasExamenes` (botón ▶) y se crean esas 4 hojas.
4. Implementar → Gestionar implementaciones → ✏️ → **Nueva versión**.
5. Sube `examenes_cibernetica.html` y `examenes_estadistica.html` a GitHub (solo cambió su `CFG.ENDPOINT`). La página de inicio tiene un botón para cada examen.

**Crear todas las tablas de una vez:** en Apps Script elige la función **`instalarTodo`** → ▶ Ejecutar. Crea lo que falte (Course, Students, Attendance Log, Roles, hojas W_, carpetas y las 4 hojas de exámenes) sin tocar lo que ya existe. El registro muestra el nombre y el ID de la hoja donde quedó todo. Desde la web hace lo mismo **Mantenimiento → Verificar / crear hojas y carpetas**.

**Panel de cada examen dentro del Dashboard (v7.0):** Admin → barra superior **Examen Cibernética** o **Examen Estadística**. Ahí están Resumen, Métricas, Resultados (cerrar, liberar, CSV), Por alumno (revisión con procedimiento), Contraseñas y configuración, y Vista previa. Las páginas de examen ya **no** tienen panel: si alguien escribe ahí la contraseña de administrador, se le indica que use el Dashboard.

Cómo funciona: el Dashboard abre la página del examen en un marco oculto con `?panel=1` (sin pantallas para el alumno) y le carga `panel_examen_*.js`. Así el panel usa el motor del examen —el que reconstruye cada examen con su semilla para revisar respuestas, procedimientos y métricas— sin duplicarlo. Las 4 páginas y los 2 archivos de panel deben estar en el mismo sitio de GitHub.

**Mostrar u ocultar los exámenes en la página de inicio:** el botón de cada examen aparece solo si tiene algún parcial abierto. Se abre o cierra cada parcial en **Mantenimiento → Exámenes en línea** (o desde el panel del propio examen). Arriba del panel, la barra **Asistencias · Examen Cibernética · Examen Estadística** te lleva al panel de cada examen.

**Contraseña de administrador del examen** = la del panel (`CCH_ADMIN_PASSWORD`). Ya no está escrita en el código. Si quieres seguir usando la anterior, ponla como valor de `CCH_ADMIN_PASSWORD`.

**Enlazar el examen con el grupo:** Ponderaciones → en el componente (ej. Parcial 1) elige el tipo **Examen en línea** y luego **Examen Estadística · Parcial 1**.

- Se empata por **número de cuenta**: solo cuenta para alumnos inscritos en ese grupo y solo exámenes **Entregados**.
- Si un alumno no lo presentó en línea, vale lo que captures a mano en **Asistencia → Capturar calificaciones** (ej. examen en papel).
- La calificación llega sola a su columna del Reporte_ (ej. Parcial_1) al abrir el grupo en el panel o con **Sync**.

## Instalación nueva (otra escuela u otra cuenta)

El código ya no trae nada tuyo: ni contraseña, ni URL, ni nombres de hojas.

1. Crea una hoja de cálculo de Google en blanco → Extensiones → Apps Script.
2. Pega `Codigo.gs` y `appsscript.json` → Implementar → Nueva implementación → **Aplicación web**, ejecutar como **Yo**, acceso **Cualquier usuario** → copia la URL que termina en `/exec`.
3. En `script.js`, pega la URL del Web App en `CONFIG.API_URL`. Sube `index.html`, `estilo.css` y `script.js` a GitHub Pages; la página web usará esa URL para conectarse.
4. Entra a **Admin** con la contraseña de fábrica **123456789**. Se crean las hojas y un grupo **DEMO** con 12 alumnos (asistencia, Parcial 1 y un proyecto) para probar.
5. Cambia la contraseña: Apps Script → ⚙️ Configuración del proyecto → Propiedades de la secuencia de comandos → `CCH_ADMIN_PASSWORD`. Mientras no exista, el panel muestra un aviso amarillo.

**URL para los alumnos:** el QR de la página de inicio comparte la URL configurada, así que el alumno no configura nada. En el APK, la URL se solicita y prueba cada vez que se abre Asistencias; la última se conserva solo como sugerencia en el dispositivo.

**Login administrativo del APK:** después de configurar la URL `/exec`, usa la contraseña `CCH_ADMIN_PASSWORD` de Apps Script, igual que la página web. Apps Script conserva el token administrativo por 24 horas; cambiar la contraseña invalida las sesiones existentes. El token de alumno no se persiste en el dispositivo: al recargar o reabrir la app, el alumno vuelve a ingresar su número de cuenta.

## Restaurar a fábrica (DEMO)

**Mantenimiento → Restaurar a fábrica** (escribe RESTAURAR):

1. Guarda un ZIP con **todas** las hojas en la carpeta de la hoja de cálculo.
2. Borra las hojas `W_*` y `Reporte_*`, y deja Course, Students, Attendance Log y Roles solo con encabezados.
3. Borra las propiedades `CCH_*`: la contraseña vuelve a **123456789** y el ciclo a automático.
4. Crea otra vez el grupo DEMO. Las hojas que agregaste tú (ej. Asesorias) no se tocan.

## Celular

- **Pase de lista:** en el panel web se ve la lista por fecha. El pase simplificado del APK usa Google para el acceso administrativo, muestra faltas con alerta roja cuando superan tres y bloquea los botones después de una marca del día.
- **Proyectos:** en el celular se califica **un equipo a la vez**: ‹ › o desliza el dedo; al presionar **Calificar** pasa solo al siguiente. Los puntos verdes son los equipos ya calificados.

## Pasar asistencia desde la ficha (v7.0)

En la ficha del alumno, arriba de la tira de asistencia, está **«Pasar asistencia:»** con fecha (hoy por defecto, no acepta fechas futuras) y botones **✓ ✗ J** (y R si usas Retardo): guarda esa marca para ese alumno y, si la fecha aún no tiene columna, la crea en el Reporte_ y en Attendance Log. También puedes **tocar cualquier fecha de la tira** para cambiar su marca (✓ ✗ J, o quitarla); para justificar una falta, elige **J**. La tabla que está detrás del modal y la ficha se actualizan solas, sin volver a pedir todo el grupo.

## Instalar o actualizar

1. Apps Script: deja **solo** `Codigo.gs` (y `appsscript.json`), pega el contenido nuevo y guarda.
2. Implementar → Gestionar implementaciones → ✏️ → **Nueva versión**. La URL no cambia.
3. Sube `index.html`, `estilo.css` y `script.js` a GitHub.

La migración ya se ejecutó en tu hoja y **ya no forma parte del código**.

### Calificaciones de Estadística (una sola vez)

`apps-script-una-vez/ImportarEstadistica.gs` trae dentro las calificaciones de tu antigua hoja Calificaciones (504, 512 y 526).

1. En Apps Script: **+ → Secuencia de comandos**, nómbrala `ImportarEstadistica` y pega el archivo.
2. Elige la función `importarCalificacionesEstadistica` → **▶ Ejecutar** → revisa el registro.
3. **Borra ese archivo.** Si lo corres otra vez no pasa nada: solo llena lo vacío.

Busca los componentes por nombre (Parcial 1, 2, 3 y el que diga «Sello») y **nunca sobrescribe** lo que ya capturaste. Un valor mayor al máximo (ej. 10.2 de 10) se guarda como el máximo.

### Course y W_Grupos ahora son una sola hoja (v6.3)

Al entrar por primera vez como admin con esta versión, se hace solo:

1. Se agregan a **Course** dos columnas: **Hoja_Reporte** (la hoja Reporte_ del grupo) y **Activo** (TRUE/FALSE).
2. Se copian los datos de **W_Grupos** y esa hoja **se borra**.

En **AppSheet**: Data → Course → **Regenerate schema**. Pon `Hoja_Reporte` como **Text** y `Activo` como **Yes/No**; `Ciclo_Escolar` debe quedar como **Text**.

## ✏️ Cómo ajustar (al inicio de `Codigo.gs`, busca «AJUSTA AQUÍ»)

| Quiero… | Cambia |
|---|---|
| Columnas de una hoja **nueva** | `BASE_SHEETS` → `optional` |
| Columnas de los Reporte_ nuevos | `REPORT_COLUMNS = ["Cuenta", "Nombre"]` |
| Estatus de alumno (Acta, Reprobado…) | `STUDENT_STATUSES` (value = lo que va en la hoja, label = lo que ves) |
| Volver a usar Retardo | `USE_RETARDO = true` |

## Columnas del reporte: visibles y enlazadas

En la web, pestaña **Asistencia → botón «Columnas»**:

- **Visible:** el interruptor escribe «Visible» u «Oculto» en la fila 1 de la hoja `Reporte_`. Los alumnos solo ven lo que está como Visible. Las fechas se ocultan o muestran con un clic; **las fechas nuevas siempre se crean Visibles**. También puedes escribirlo a mano en la fila 1.
- **Orden ↑ ↓:** mueve la columna en la hoja al presionar Guardar (con sus datos).
- **Borrar 🗑:** se borra de la hoja al momento. Si está vacía se borra directo; si tiene datos aparece un aviso con cuántos tiene y el botón «Sí, borrar». No se puede deshacer (usa Archivo → Historial de versiones si te equivocas).
- **Agregar columna:** se crea al final de la hoja, como Visible; después enlázala o déjala para escribir a mano.
- **Se llena con:** enlaza la columna con un componente, un proyecto, el promedio actual o la final estricta. Desde ese momento la web **reescribe esa columna** en la hoja cada vez que capturas, calificas un equipo, aplicas puntos, pasas lista o sincronizas. Así se reemplazan las fórmulas viejas (VLOOKUP/XLOOKUP) que apuntaban a Calificaciones y Proyectos.
- Las sugerencias ya vienen marcadas y se aplican al presionar Guardar:

| Columna en tu hoja | Se llena con |
|---|---|
| Parcial_1 / Parcial_2 / Parcial_3 | Componente Parcial 1 / 2 / 3, con las calificaciones que tenías en Calificaciones |
| Sellos | Componente Sellos |
| Proyecto_Final (Estadística) | Componente Proyectos |
| Ejercicio Clase (CYC) | Proyecto «Proyecto (AppSheet)», el que se migró |
| Calificación, SIAE | **Calificación entera** |
| Puntos Adicionales | Sin enlace por defecto; si agregas el componente «Puntos Adicionales», se enlaza a ese rubro |

**Calificación entera:** los porcentajes suman 10 (100 % = 10). Se suma lo obtenido en cada componente y **se quitan los decimales, sin redondear**: 7.96 → 7. Si ya tenías Calificación o SIAE enlazadas a «Promedio actual», se cambian solas a entera al entrar como admin. En la vista **2 · Ponderaciones** de Asistencia verás la columna **Entera** junto a Final y Estricta.

- En la tabla de asistencia, al hacer clic en el encabezado de una columna (Parcial_1, Sellos, Calificación…) se abre un **modal con la ponderación** del grupo, con el componente de esa columna resaltado. Ahí cambias porcentajes y guardas sin salir de Asistencia. 🔗 = la columna está enlazada.

> En `Reporte_ESTADISTICA_512` la fórmula vieja de **Parcial_1** leía la columna de **Parcial_2** de Calificaciones. Al enlazar desde la web queda corregido.

## Plantilla Excel para calificaciones

En **Asistencia → Exportar**:

- **Plantilla Excel** descarga el grupo con Cuenta, Nombre y una columna por componente manual. Las celdas vacías salen en amarillo.
- **Importar plantilla Excel** lee el archivo, empata por **Cuenta** y por el **título** de cada columna, y muestra un resumen antes de guardar. Las celdas vacías no borran nada.
- Si el archivo tiene varias hojas, toma la que tenga el número del grupo en su nombre (ej. «Estadística 504»).

## Asistencia y captura de calificaciones

La tabla de **Asistencia** concentra la lista y la captura. El botón **Capturar calificaciones** habilita la edición de componentes manuales y **Guardar** aplica los cambios. Ya no hay un botón visible **Descartar**; al salir con calificaciones pendientes se pide confirmación antes de perderlas. Guarda antes de exportar o importar. Los botones con icono **1** muestran la tabla completa; el icono **2** muestra solo ponderaciones y calificaciones. Si había quedado guardada la pestaña antigua **Captura**, se abre automáticamente la vista integrada.

En la web HTML de escritorio, el icono de comentario muestra los comentarios del grupo al pasar el cursor. No se muestra popover en móvil ni en el APK. El botón **Leyenda** se retiró de la vista.

El botón **Exportar** abre un modal con exportación a PSI, descarga/importación de plantilla Excel y el reporte completo del grupo. El libro `Reporte_grupo` conserva el orden de columnas y alumnos de `Reporte_`, incluye grupo, materia, ciclo y fecha de exportación, y excluye comentarios e indicadores calculados de la interfaz.

## Tareas por grupo

En **Admin → Tareas**, aparecen únicamente los grupos que tienen registros, con su total en un acordeón. Al desplegarlo se ven únicamente los títulos; selecciona uno para abrir el detalle y editarlo. Cada registro conserva la materia y el nombre del grupo como instantáneas, así que sigue consultándose aunque se elimine el grupo. La **Biblioteca** filtra el historial por materia, incluye tareas de grupos eliminados y las muestra en el orden en que se registraron. Desde el detalle puedes renombrar una tarea o elegir **Reutilizar** para crear una copia independiente: se copian título y contenido, se asigna la fecha de hoy y se deja vacía la fecha de cierre; después puedes cambiar el grupo y los demás datos. **Nueva tarea** permite elegir un grupo, capturar el título, agregar contenido con formato básico y definir la fecha en que se deja (hoy por defecto) y una fecha de cierre opcional. En el editor, selecciona texto y usa **Borrar formato** para quitar sus estilos. El contenido puede quedar vacío. Las tareas son un registro independiente y no forman parte de calificaciones, proyectos ni ponderaciones.

La hoja `W_Tareas` se crea automáticamente junto con las demás hojas `W_*` al iniciar sesión como administrador o al usar **Mantenimiento → Verificar / crear hojas y carpetas**. En el siguiente inicio de sesión administrativo, la migración añade materia, grupo y orden a los registros antiguos; cuando el grupo aún existe guarda sus nombres actuales. Si el grupo ya se había eliminado, no se puede inferir su materia y el registro aparecerá con materia no identificada. En **Mantenimiento → Registro de tareas → Vaciar log de tareas** se puede vaciar toda la tabla de tareas: antes se crea un ZIP de respaldo, se pide confirmar escribiendo `W_Tareas` y se conservan los encabezados. Esto borra también el historial de la Biblioteca, pero no los grupos. No requiere migrar las hojas de calificaciones ni cambiar `Reporte_*`. La misma vista está incluida en el APK. El respaldo por ciclo incluye sus registros en el ZIP y los conserva por defecto; puedes eliminarlos usando el interruptor **Registro de tareas** al respaldar y borrar ese ciclo.

Para publicar la interfaz, actualiza el frontend web y el del APK. El botón de vaciado reutiliza la acción `clearTable` existente. Si el Web App aún no contiene `listTasks` y `saveTask`, reemplaza `Codigo.gs` en Apps Script y crea una nueva versión desde **Implementar → Gestionar implementaciones → Editar → Nueva versión → Implementar**; conserva la URL `/exec`.

## Respaldo por ciclo: qué se borra

Cada parte tiene su interruptor. Por defecto se **conserva el histórico del alumno**:

| Parte | Por defecto |
|---|---|
| Asistencias (Attendance Log) | se borra |
| Hojas Reporte_ de esos grupos | se borra |
| Calificaciones, proyectos y evidencias de la web | se borra |
| Inscripciones (Students y Roles) | **se conserva** |
| Comentarios | **se conserva** |
| Registro de tareas | **se conserva** |
| Cursos (Course) | **se conserva** |

Siempre se guarda primero el ZIP y un resumen por alumno en W_Historial.

## Lo que ve el alumno

Dos pestañas: **Mi avance** (una sola tarjeta con asistencia, calificaciones por componente y su equipo con estrellas) y **Extracurriculares**. **Nunca** ve comentarios, observaciones de equipo, notas de evidencias ni promedios calculados.

## Alumnos por tabla

Por defecto se ven **60 alumnos** antes de que la tabla haga scroll. Se cambia en ⚙️ Preferencias → «Alumnos visibles por tabla» (15, 30, 60, 100 o Todos).

## Componente ⇄ columna (siempre enlazados)

Cada componente de la ponderación tiene su columna en el Reporte_ y viceversa:

| Haces… | Pasa… |
|---|---|
| Agregas un componente en Ponderación | Se crea su columna al final del reporte (Visible) |
| Quitas un componente | Se borra su columna del reporte (antes de guardar ves un aviso) |
| Renombras un componente | Se renombra el encabezado |
| Agregas una columna en «Columnas» | Se crea su componente con 0 % (puedes desmarcarlo para columnas a mano, como Puntos Adicionales) |
| Borras una columna enlazada | Se quita también su componente; ajusta la ponderación para volver a 100 % |

La primera vez que entras como admin con esta versión se enlazan solas las columnas existentes: Parcial_1 ↔ Parcial 1, Sellos ↔ Sellos, Proyecto_Final o Ejercicio Clase ↔ Proyectos, y Calificación/SIAE ↔ Calificación entera. Con eso desaparecen los #REF!.

En Asistencia solo aparecen los grupos **activos**; los demás se activan en la pestaña Grupos.

## Ponderaciones: solo porcentaje

Los componentes base deben sumar **100 %** (= 10). Si no suman 100, el botón Guardar se bloquea y te dice cuánto sobra o falta. Se permite un único componente manual llamado **Puntos Adicionales** (o «Punto adicional»), con escala de 0 a 10; su ponderación se agrega aparte del 100 % y no se normaliza junto con los demás rubros. Cada 10 % adicional con calificación 10 aporta 1 punto al resultado; la calificación final no supera 10.

Todo se captura de 0 a 10. Si un componente viejo se capturaba en otra escala (Sellos de 0 a 15), aparece una nota y el enlace «Capturar de 0 a 10» para cambiarlo.

## Plantilla por defecto (Ponderaciones)

Los componentes que se llamen igual que en la plantilla **conservan sus calificaciones** (antes se creaban de nuevo y quedaban vacíos).

## Carga rápida del panel (caché, v7.0)

El panel guarda en este navegador lo último que viste de cada grupo. Al abrirlo, se muestra **al instante** y se actualiza en segundo plano; un pequeño indicador ↻ aparece mientras tanto. La caché se borra sola al guardar cualquier cambio y al presionar **Salir**. En una computadora compartida, desactívala en Preferencias («carga instantánea»).

- **Ficha en caché:** al abrir la ficha de un alumno se muestra lo guardado (15 min) y se actualiza en segundo plano; abrir fichas al paginar por la lista ya no pide el perfil completo cada vez.
- **Solo se invalida lo tocado:** antes, cualquier guardado borraba la caché de TODOS los grupos; ahora un guardado solo borra ese grupo (y esa ficha). Cambiar de grupo o de pestaña no vuelve a pedir los datos: se reusa lo guardado y solo se trae lo fresco en segundo plano.
- **Sin duplicados:** si una misma lectura sigue en vuelo (doble clic en Recargar, abrir dos veces la misma ficha), se comparte la misma petición.
- **Sin sorpresas de versión ni de espacio:** la caché caducada o de una versión anterior de la página se ignora, y si se llena el almacenamiento se expulsa solo lo más viejo, no toda la caché.
- **Al paginar/desplazar no se pierde el lugar:** si llega una actualización en segundo plano mientras revisas una tabla, se conserva el desplazamiento y la búsqueda que escribiste.

## Alumnos nuevos (incluye Acta complementaria)

**Asistencia → Nuevo alumno**: cuenta, nombre (vacío = se toma de Students si ya existe) y **Estatus** (Regular, Acta complementaria…). Se agrega:

- una fila en **Students** con su Course y su Status;
- una fila en su hoja **Reporte_**, con sus columnas enlazadas ya llenas;
- su registro en el reporte Excel del grupo y en la exportación a PSI.

El estatus se cambia desde la ficha del alumno. La función «Buscar alumnos duplicados» ahora escribe en su propia columna `Duplicado` y ya no en `Status`.

## Hojas: cuáles quedan

| Hoja | ¿Se queda? | Por qué |
|---|---|---|
| Course, Students, Attendance Log, Roles | **Sí** | AppSheet pasa lista ahí con el QR. |
| Reporte_* | **Sí (recomendado)** | Son la asistencia oficial del grupo y te las piden. **Asistencia → Exportar → Reporte del grupo** descarga el contenido de la hoja en Excel. |
| W_* | Sí | Todo lo de la web (ya no existe W_Grupos: está dentro de Course). |
| Calificaciones | Ya se borró | Lo de Estadística se recupera con `ImportarEstadistica.gs` (arriba). |
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

En **Asistencia → Exportar → Exportar a PSI**, se abre la vista previa de las sugerencias del grupo:

| Campo PSI | Regla |
|---|---|
| Avance académico | Promedio actual **sin redondear** (solo el entero, 5–10); NP si nunca se presentó |
| % asistencia | asistencias ÷ (asistencias + faltas) |
| Entrega tareas | El componente que elijas: ≥ 8 SI, 5–7.9 OCASIONALMENTE, < 5 NO |
| Dificultades | Psicoemocional si tus comentarios lo mencionan; Académico si promedio < 6 |
| Asistencias | Más de 3 faltas · Dejó de asistir (3 faltas seguidas al final) · Nunca se presentó |
| Derivación y motivo | Tutoría (faltas), Asesoría (promedio < 6 y rubro más bajo), Psicopedagogía (comentarios) |
| Riesgo | Suma de promedio, faltas, tareas y comentarios |
| Encabezado | Fecha, Parcial o Final, Observaciones y Acciones redactadas con las cifras del grupo (editables) |

Pasos: **Copiar JS** → abre en PSI la captura del grupo → F12 → Consola → pega → Enter. Se llena por número de cuenta y **no se guarda solo**: revisa y presiona Guardar. Las palabras que se detectan como psicoemocionales están en `Psi.KEYWORDS`, en `script.js`.

**Parcial (v7.0):** arriba del todo elige en **«Calificación a exportar (Avance)»** el parcial (Parcial 1, 2, 3…) o «Promedio actual». Antes el Avance siempre era el promedio general aunque el registro fuera Parcial: si el alumno aún no tenía promedio, su calificación quedaba vacía y PSI no recibía nada. Ahora, con un parcial elegido, el Avance, el riesgo y la derivación salen de ese parcial, y la vista previa avisa cuántos alumnos **no tienen calificación en ese parcial** (su avance quedará vacío: captúralo en Asistencia antes de exportar). Al cambiar el «Tipo de registro» a Parcial se elige solo el primer parcial con calificaciones; en Final vuelve al promedio actual. El JS generado además detecta solo el prefijo de las listas de calificación de PSI (`c_`, `p_`, `parcial_`, `cal_`, `cp_`): si la captura parcial usa otro prefijo, lo avisa en la consola en lugar de no llenar nada en silencio.

## Alumnos agregados a mano en Students

Si das de alta alumnos directamente en la hoja, escribe en la columna `Course` el `ID_Curso` exacto. En **Mantenimiento → Alumnos agregados a mano** puedes copiar cada ID con un clic, y ahí mismo ves si hay alumnos con un Course vacío o mal escrito.

## Qué se maneja desde la web

| Pestaña | Qué haces |
|---|---|
| Asistencia | Ver ✓ ✗ J, capturar calificaciones, alternar entre tabla completa y ponderaciones, **Exportar** (PSI, plantilla, importación o reporte Excel), **Nuevo alumno**, clic en un nombre para ver su **ficha** |
| Pase de lista | ✓ ✗ J por fecha (también escribe en Attendance Log) |
| Ponderaciones | Calificaciones y evaluación |
| Evidencias | Lo que suben los alumnos en **Extracurriculares**; vista Tarjetas o Tabla (Revisar abre un modal) |
| Proyectos | Vista **Tarjetas** (editas ahí mismo) o **Tabla** (Editar abre un modal) |
| Alumnos | Buscar a cualquier alumno, de cualquier ciclo |
| Grupos | Ligar hojas, **Nuevo grupo** (crea Course + Reporte_) y **Enlaces para alumnos** |
| Mantenimiento | Ciclo, respaldos ZIP, alumnos agregados a mano, vaciar tablas |

## Novedades v7.2 — asistencia integrada y exportación

**Asistencia — captura integrada.** La pestaña Captura se retiró; el botón **Capturar calificaciones** habilita los rubros manuales en la tabla. Los iconos **1** y **2** alternan entre toda la asistencia y solo las ponderaciones. Las calificaciones se guardan desde la tabla; salir con cambios pendientes solicita confirmación.

**Asistencia — Exportar.** Un solo modal ofrece PSI, plantilla Excel, importación y el libro `Reporte_grupo` con la estructura completa de `Reporte_`, grupo, materia, ciclo y fecha; no añade comentarios ni indicadores de la interfaz.

**Comentarios.** En HTML de escritorio, el icono de comentario abre un popover con los comentarios del grupo al pasar el cursor. No aplica en móvil ni APK.

## Novedades v7.1 — triaje y riesgo a la vista

**Asistencia — columna de riesgo (⚠) y % asistencia.** Cada fila muestra un punto de color: rojo si el alumno está en riesgo alto (promedio menor a 6, más de 4 faltas o 3 faltas seguidas) y ámbar si necesita atención (promedio 6–6.9, 4 faltas, 2 faltas seguidas o menos de 80% de asistencia). Al pasar el cursor sobre el punto ves el motivo. La columna % muestra asistencias ÷ (asistencias + faltas); vacía si aún no hay lista. Son los mismos umbrales que usa PSI, así que lo que ves en la tabla es lo que se exporta.

**Asistencia — filtros «Necesitan atención».** Sobre la tabla hay cuatro chips con su conteo: Todos, En riesgo, +4 faltas y Sin calificar parcial. Un clic filtra las filas en el momento, sin pedir nada al servidor, y se combina con la búsqueda. «Sin calificar parcial» busca alumnos sin calificación en algún parcial (si el grupo no tiene parciales definidos en Ponderaciones, el chip queda deshabilitado).

**Ficha — resumen de atención arriba.** Al abrir la ficha, arriba del detalle del grupo aparece una franja: «En riesgo», «Atención» o «Sin riesgo aparente», con el motivo, el promedio, el % de asistencia, las faltas y la derivación que sugeriría PSI (por ejemplo: «PSI: Dejó de asistir · riesgo alto»). Se actualiza al cambiar de grupo y al pasar asistencia.

**Ficha — secciones plegables.** Comentarios sigue abierto (ahí está el formulario para agregar), pero Evidencias, Inscripciones y Ciclos anteriores arrancan cerrados: toca el título para desplegarlos.

**Vista 2 · Ponderaciones — Final, Estricta y Entera fijas a la derecha.** Al desplazar la tabla a la derecha para ver los componentes, las tres columnas de resultado ya no se pierden: quedan fijas en el borde derecho.
