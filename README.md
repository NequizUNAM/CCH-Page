# CCH-Page

Dashboard dedicado a reportes y listas CCH.

En los paneles de Cibernética y Estadística, la pestaña **Editar preguntas** permite cambiar enunciados, opciones y la respuesta correcta de reactivos de opción múltiple. Los cambios se guardan por materia y parcial, recalculan la calificación en los intentos nuevos y no modifican exámenes que ya están en curso. Después de actualizar Apps Script, publica una nueva versión de la implementación para habilitar estas funciones.

## Organización del repositorio

| Ruta | Proyecto / función |
| --- | --- |
| `index.html`, `estilo.css`, `script.js`, `examenes_*.html`, `panel_examen_*.js` | Web de Asistencias y exámenes publicada desde la raíz de GitHub Pages. Se conservan ahí para no cambiar las URL actuales. |
| `asistencias/apps-script/` | Backend y manifiesto de Apps Script para Asistencias y exámenes. |
| `asistencias/docs/MIGRACION.md` | Guía operativa de Asistencias. |
| `bitacoras/index.html`, `bitacoras/Codigo.gs` | Interfaz publicada en `/bitacoras/` y backend de Bitácoras. |
| `bitacoras/data/` | JSON de referencia/semilla; no son los datos de Drive en producción. |
| `bitacoras/docs/` | Configuración, checklist, guías y análisis; `historico/` conserva material anterior. |
| `bitacoras/integraciones/muse/` | Banco de comandos y documentación de Muse. |
| `bitacoras/protocolo-puntaje-cch/` | Referencias y plantillas del protocolo de puntaje. |
| `apk/` | Aplicación Android y su copia independiente de los sitios web. Se mantiene separada. |

Se mantiene un solo README fuera de `apk/`: este documento reúne el mapa de ambos proyectos y el historial general de cambios. Las guías detalladas están dentro de `asistencias/docs/` y `bitacoras/docs/`.

### Proyectos web y Apps Script

- **Asistencias:** la página de GitHub Pages está en la raíz y el backend está en [`asistencias/apps-script/`](asistencias/apps-script/). Consulta la [guía de Asistencias](asistencias/docs/MIGRACION.md).
- **Bitácoras:** la interfaz y backend están en [`bitacoras/`](bitacoras/); la ayuda del puntaje carga `protocolo-puntaje-cch-v2.json` desde esa misma ruta pública. Consulta la [guía de configuración](bitacoras/docs/CONFIGURACION.md), el [checklist](bitacoras/docs/checklist-bitacora-web.md), la [guía de AppSheet](bitacoras/docs/guia-configuracion-appsheet.md) y el [banco de comandos de Muse](bitacoras/integraciones/muse/banco-peticiones.md).

La carpeta `apk/` no se sincroniza automáticamente con estas fuentes web. Para compilarla, usa `npm run android:apk` desde `apk/`; las instrucciones específicas siguen en su README.

### Bitácoras: datos, seguridad y operación

- La interfaz de Bitácoras es una página independiente con su propio Apps Script. Los datos de producción viven en Google Drive y Sheets; `bitacoras/data/` contiene plantillas de referencia, no una copia viva de los datos.
- Cada proyecto tiene su `bitacora.json`; la carpeta de Drive contiene también evidencias y formato de exportación. La página puede crear proyectos desde **Mantenimiento** y mantiene sesiones, pendientes, hitos y puntajes separados por proyecto.
- Las revisiones de concurrencia son por documento: las operaciones offline se guardan en IndexedDB, se procesan en orden y ante una revisión obsoleta quedan detenidas para comparación manual. No se debe reintentar un guardado completo sin reconciliarlo.
- Las evidencias de Drive son privadas de forma predeterminada. Word/PDF se generan localmente; el programa no cambia permisos de Drive ni comparte informes.
- El login web y los tokens se administran en Apps Script. No guardes contraseñas ni tokens reales en este repositorio. El token de Muse tiene una lista de acciones permitidas; las integraciones que escriben deben enviar la revisión obtenida al leer el proyecto.

Para una instalación o actualización, sigue [la configuración de Bitácoras](bitacoras/docs/CONFIGURACION.md); para revisar las hojas y columnas de AppSheet, usa su [guía](bitacoras/docs/guia-configuracion-appsheet.md).

## Indicadores de carga y recargas

En Asistencias, las lecturas se mantienen en paralelo y las solicitudes de lectura repetidas se comparten. En el APK, el panel y las fichas muestran primero la última información guardada localmente cuando está disponible, incluso si ya venció su tiempo de frescura, y la actualizan al recuperar conexión. Los loaders indican las cargas que no tienen una copia local.

Los guardados y eliminaciones se muestran en el indicador de sincronización de la barra superior mientras esperan o se procesan. Si una solicitud permanece pendiente más de cinco minutos, se muestra un aviso; no se confirma como guardada hasta recibir respuesta del servidor.

## Cola de sincronización

En el APK de Asistencias, las escrituras se procesan en orden FIFO, una a la vez. La cola se conserva en IndexedDB para sobrevivir a una recarga o cierre de la página. Las solicitudes con errores de conexión se reintentan con espera incremental y se mantienen al inicio de la cola para conservar el orden; las consultas de datos no esperan a la cola.

Cada escritura de Asistencias lleva un identificador idempotente que Apps Script conserva temporalmente para reconocer reintentos. La cola de un alumno solo se reanuda con la misma cuenta. La sesión debe seguir activa para que la cola envíe solicitudes protegidas; por eso no se permite cerrar sesión mientras haya escrituras pendientes.

## Alcance offline verificado

El soporte offline no significa que las páginas o los datos remotos estén disponibles sin una primera conexión. En Android los HTML, scripts e imágenes empacados están dentro del APK, pero Bootstrap y algunos iconos se solicitan a CDN y las APIs siguen en Apps Script.

| Vista | Comportamiento offline actual |
| --- | --- |
| Lanzador del APK (`apk/www/index.html`) | Es una pantalla estática local; puede abrir los módulos empaquetados. |
| Asistencias del APK (`apk/www/asistencias/`) | Muestra caché previa de alumno/panel y conserva escrituras en IndexedDB para reintento al reconectar. No todas las escrituras tienen proyección optimista completa: algunas pantallas pueden seguir esperando respuesta del servidor. |
| Bitácoras del APK (`apk/www/bitacoras/`) | Abre datos locales y proyecta operaciones guardadas en la outbox de IndexedDB; las envía al recuperar conexión. Los errores quedan visibles para reintento o descarte. |
| Exámenes (`examenes_*.html`) | Conservan respuestas del examen en el dispositivo y encolan el envío de resultados. El login, la descarga de preguntas y el inicio de un examen nuevo requieren conexión. |

Las páginas web de la raíz (`index.html`, `script.js` y `bitacoras/index.html`) son fuentes separadas y no se actualizan automáticamente al editar `apk/www/`. La caché extendida de Asistencias corresponde al APK; Bitácoras tiene una cola independiente en las versiones web y APK, y ambas envían la revisión esperada. Las páginas de exámenes de raíz y APK ya incluyen almacenamiento local de respuestas y una cola IndexedDB de resultados.

### Revisión manual de conflictos en Bitácoras

`bitacoras/Codigo.gs` valida una revisión entera por documento `bitacora.json` dentro del `LockService`. Las lecturas `leer`/`leerProyecto` devuelven esa revisión y los clientes web y APK envían `revisionEsperada` en cada operación que modifica sesiones, pendientes, hitos o puntajes. Las escrituras completas (`guardar`) también se validan. Al detectar una versión obsoleta, el servidor devuelve `code: "CONFLICT"`, `conflictTipo: "revision"`, `revisionActual` y el documento actual sin modificarlo.

La cola conserva el conflicto para revisión manual. El indicador de sincronización permite consultar el registro remoto y, solo después de revisarlo, rebasar la operación y las operaciones posteriores del mismo proyecto. Las colisiones de ID y registros eliminados no se reintentan como conflictos de revisión; las escrituras completas requieren reconciliación manual. Una revisión es por proyecto completo, por lo que un cambio en cualquier registro del proyecto puede detener conservadoramente otra operación pendiente del mismo proyecto.

Para activar la protección en producción, abre el proyecto de Apps Script que usa Bitácoras, reemplaza su `Codigo.gs` con el contenido completo de [bitacoras/Codigo.gs](bitacoras/Codigo.gs), guarda y crea una nueva versión desde **Implementar → Administrar implementaciones → Editar → Nueva versión → Implementar**. Mantén el mismo URL del Web App. Si una integración usa el token de servicio para mutar datos, también debe enviar `revisionEsperada` obtenida de `leer`/`leerProyecto`. No se aplica al servicio separado de Asistencias ([`asistencias/apps-script/Codigo.gs`](asistencias/apps-script/Codigo.gs)), donde `requestId` solo deduplica reintentos y no sustituye un control de concurrencia.

---

## Aplicación Móvil (APK Android) — `apk/`

La carpeta `apk/` contiene la versión empaquetada como aplicación nativa Android mediante Capacitor, unificando los dos proyectos web (Asistencias y Bitácoras) bajo un solo lanzador institucional.

* **Identificador de paquete:** `mx.unam.cch.proyectos`
* **Identificador de compilación:** `CCH-MOB-002` (Versión `1.2.0`, Build `2`)
* **Fecha de corte:** Noviembre 2026

### Historial de cambios móviles (Build CCH-MOB-002):

1. **Ajuste de SafeArea y barra de notificaciones:**
   * Se aplicó compensación superior dinámica con `calc(40px + env(safe-area-inset-top, 0px))` en el lanzador principal, Bitácoras, Asistencias y en las cabeceras de exámenes para que la barra de estado de Android no tape títulos ni botones.
2. **Pase de lista optimizado para celular:**
   * Reestructuración en fila única compacta: a la izquierda el nombre del alumno y a la derecha los iconos táctiles de estado (✓ Asistencia, ✗ Falta, J Justificante).
   * Debajo se conserva el número de cuenta y las alertas de faltas acumuladas, reduciendo la altura a la mitad y duplicando los alumnos visibles por pantalla.
3. **Persistencia de sesión en el dispositivo (Arraigo de login):**
   * Migración de autenticación volátil a almacenamiento persistente (`localStorage`).
   * Casilla *"Guardar sesión en este celular"* activada por defecto. Al abrir la app, la sesión arranca activa y valida en segundo plano sin pedir contraseñas nuevamente.
4. **Auditoría responsiva integral de vistas:**
   * **Bitácoras:** Botones de encabezado agrupados y simétricos, panel de exportación en cuadrícula de 2 columnas, controles de calendario ordenados y protección de pestañas inferiores contra la barra de gestos con `safe-area-inset-bottom`.
   * **Asistencias:** Barra de navegación protegida contra saltos de línea, selector de grupo adaptativo (`1fr auto auto`), toolbar administrativo en 2 columnas y pestañas con desplazamiento táctil fluido.
   * **Exámenes:** Encabezado con margen seguro para temporizador y entrega.
5. **Nuevo icono institucional CCH:**
   * Generación de iconos adaptativos en todas las densidades de Android (`mdpi` a `xxxhdpi`) y PWA (512×512, 192×192) con los colores azul marino y oro de la UNAM/CCH, las siglas CCH destacadas y el laurel/libro abierto institucional.
6. **Soporte offline parcial:**
   * Los archivos propios de la app se empaquetan localmente y algunos datos/respuestas se guardan en localStorage o IndexedDB. Las APIs y recursos de CDN siguen requiriendo internet; las limitaciones y el estado por vista se detallan en «Alcance offline verificado».

## Validación de Bitácoras

Con el Web App desplegado y sesión activa, valida en este orden:

1. Crea o edita una sesión y confirma que se conserva al recargar.
2. Prueba pendientes, hitos y puntajes; confirma que cambian en Drive y Sheets.
3. En dos sesiones de navegador, modifica el mismo proyecto y guarda desde ambas. La segunda escritura obsoleta debe quedar en conflicto sin reemplazar los datos del servidor.
4. Abre el indicador de sincronización, compara la versión remota con el cambio local y reintenta solo después de revisarlo. Las escrituras completas requieren reconciliación manual.
5. Si pruebas modo offline, confirma que la cola de Bitácoras se conserva y se procesa en orden al reconectar.

La revisión es por documento completo, no por registro; cambios independientes dentro del mismo proyecto también pueden requerir revisión.
