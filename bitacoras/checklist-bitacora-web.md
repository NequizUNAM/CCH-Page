# Checklist — Página web de bitácoras / minutas

**Fecha:** 2026-11-17
**Objetivo:** una sola página para llevar las minutas de reuniones o sesiones de varios proyectos en paralelo, sin que nada se pierda entre reuniones. Conecta con el objetivo «Ordenar mis minutas y pendientes» y con la tabla maestra limpia existente.

**Regla base (no negociable):** un solo archivo HTML, fondo blanco puro `#FFFFFF`, CSS y JS puros dentro del archivo, Google Fonts como único recurso externo. Sin Tailwind, Bootstrap ni Lucide por CDN. Iconos en SVG inline.

---

## 1. Estructura general — cómo quedaría

- [ ] Una sola página, 3 vistas con pestañas arriba: **Bitácoras | Calendario | Pendientes**
- [ ] Encabezado simple: título «Bitácoras», buscador global y botón `+ Nueva entrada`
- [ ] Barra lateral izquierda (o selector arriba en móvil): lista de proyectos/bitácoras, cada uno con color propio y contador de pendientes
- [ ] Vista principal por proyecto: línea de tiempo de sesiones, de la más reciente a la más antigua
- [ ] Botón para crear, renombrar, archivar y eliminar una bitácora (eliminar con confirmación)
- [ ] Diseño responsive: en teléfono la barra lateral se vuelve selector; nada se corta ni exige zoom

**Sugerencia:** empezar con esta estructura y no con un tablero tipo Kanban. La línea de tiempo es lo que más se parece a una bitácora real.

## 2. Proyectos / bitácoras múltiples

- [ ] Crear bitácora con: nombre del proyecto, color (paleta UNAM + 6 colores suaves), descripción corta
- [ ] Cada bitácora tiene sus propias sesiones, hitos y pendientes; nada se mezcla entre proyectos
- [ ] Filtro «Todos los proyectos» para ver todo junto en la línea de tiempo
- [ ] Contador por proyecto: sesiones, pendientes abiertos, hitos próximos

## 3. Captura de una sesión / minuta

- [ ] Formulario de captura con: proyecto, título de la sesión, tipo (Reunión / Sesión / Avance / Nota)
- [ ] Campos: asistentes / participantes, temas tratados, acuerdos, notas
- [ ] Al guardar una sesión, sus acuerdos se pueden convertir en pendientes con un clic (sin reescribirlos)
- [ ] Editar y eliminar una sesión; eliminar con confirmación
- [ ] Cada sesión muestra: fecha, proyecto, título, resumen y número de evidencias y pendientes

## 4. Texto y evidencias (imágenes y documentos)

- [ ] Campo de texto libre por sesión, con saltos de línea conservados
- [ ] Adjuntar varias imágenes por sesión: botón «Adjuntar evidencia», arrastrar o elegir desde el dispositivo
- [ ] Miniaturas en la sesión; clic para ampliar la imagen a tamaño completo
- [ ] Cada imagen con pie/descripción opcional y botón para quitarla
- [ ] Compresión automática al guardar (máx. 1200 px por lado) para que la página no se vuelva pesada
- [ ] Aviso si el almacenamiento local se acerca al límite; opción de exportar respaldo antes de borrar
- [x] **v2 (2026-11-18): documentos como evidencia.** Además de imágenes, se aceptan PDF, Word (`.doc`, `.docx`) y Excel (`.xls`, `.xlsx`), máx. 10 MB por archivo. Se guardan tal cual (sin comprimir) con su nombre original y su mime real en `Evidencias/` de la carpeta del proyecto; en la tarjeta, el formulario y el informe aparecen como ficha/enlace con su nombre y tamaño, no como imagen. Modelo: `{url, pie, nombre, mime, tipo, tamano}`, `tipo` = `imagen` | `documento`; las evidencias viejas `{url, pie}` se normalizan al leer.

**Límite honesto de la v1:** las imágenes se guardan dentro del navegador (localStorage). Funciona en tu equipo sin servidor, pero no es para cientos de fotos en alta resolución. Para eso queda la exportación de respaldo (ver §9).

**Límite honesto de la v2 (documentos):** en modo local (sin Apps Script) un documento queda como base64 en localStorage y ocupa espacio (~4 MB de aviso, ~5 MB de límite); con Apps Script solo queda su URL de Drive. Un archivo de más de 10 MB se rechaza en la página antes de leerlo.

## 5. Fechas

- [ ] Fecha y hora por defecto: la actual al momento de capturar (no hay que escribirla)
- [ ] Se puede cambiar manualmente si la minuta es de una sesión pasada
- [ ] Formato visible: `17 nov 2026, 08:16` (día, mes, año y hora)
- [ ] Las sesiones se ordenan por fecha, no por orden de captura
- [ ] Fecha compromiso por pendiente, independiente de la fecha de la sesión

## 6. Calendario

- [ ] Vista de mes con navegación mes anterior / siguiente y botón «Hoy»
- [ ] Un punto de color por sesión en su día (color del proyecto); los hitos con marca distinta (rombo ◆)
- [ ] Clic en un día: lista de sesiones y hitos de ese día
- [ ] Panel «Próximos 7 días»: sesiones, hitos y pendientes con fecha compromiso cercana
- [ ] Los pendientes vencidos se marcan en rojo en el calendario y en la lista

**Sugerencia:** el calendario es vista, no agenda aparte. Todo lo que aparece en él nace de una sesión, un hito o un pendiente; no hay eventos sueltos que luego no se encuentren.

## 7. Hitos por proyecto

- [ ] Crear hito con: título, fecha, proyecto y descripción corta
- [ ] Estado: pendiente / en curso / completado
- [ ] Línea de hitos por proyecto, en orden de fecha, con barra de avance (% completados)
- [ ] Un hito completado no se borra: queda marcado y con su fecha de cierre
- [ ] Los hitos aparecen también en el calendario

## 8. Checklist de pendientes por proyecto

- [ ] Pendiente con: texto de la acción, responsable, fecha compromiso, prioridad (Alta / Media / Baja) y proyecto
- [ ] Origen: se crea a mano o desde un acuerdo de una sesión (queda ligado a esa minuta)
- [ ] Casilla para marcar hecho; al marcarlo pide o registra fecha de cierre
- [ ] Estados: Pendiente / En proceso / Hecho / Vencido (automático por fecha)
- [ ] Filtros: por proyecto, por responsable, por estado y «solo vencidos»
- [ ] Resumen por proyecto: X de Y hechos, y lista de vencidos arriba
- [ ] Esto sustituye, en la web, a la tabla maestra en Excel; el Excel sigue siendo el respaldo imprimible

## 9. Datos, guardado y exportación

- [ ] Guardado automático en el navegador (localStorage) al crear, editar o marcar algo; sin botón «Guardar»
- [ ] Exportar respaldo completo en JSON (toda la información, incluidas imágenes)
- [ ] Importar respaldo JSON para recuperar todo en otro equipo o navegador
- [ ] Exportar pendientes a CSV con las columnas de la tabla maestra: Acción | Responsable | Fecha compromiso | Estado | Minuta origen | Notas
- [ ] Exportar una sesión/minuta a texto limpio para copiar a Word o OneNote
- [ ] Borrar todos los datos solo con confirmación doble

## 10. Búsqueda y filtros

- [ ] Buscador global: busca en títulos, texto, asistentes y pendientes
- [ ] Filtro por proyecto, por tipo de sesión y por rango de fechas
- [ ] Filtro «con evidencia» (solo sesiones con imágenes)

## 11. Diseño minimalista

- [ ] Fondo blanco puro `#FFFFFF` en toda la página, sin degradados ni crema
- [ ] Azul UNAM `#002663` para títulos y botones principales; dorado `#C9A227` solo para acentos y hitos
- [ ] Gris suave `#6B7280` para fechas y texto secundario; rojo suave solo para «vencido»
- [ ] Una sola familia tipográfica (Google Fonts, p. ej. Inter), títulos en negrita, cuerpo legible
- [ ] Tarjetas blancas con borde fino y sombra mínima; nada de paneles recargados
- [ ] Color por proyecto solo como punto o borde izquierdo, no como fondo de toda la tarjeta

## 12. Captura por WhatsApp (flujo con Muse)

**Estado:** WhatsApp ya está conectado como chat directo con Muse. No es un grupo ni lectura de tus otros chats de WhatsApp: es este chat 1 a 1 contigo.

- [ ] Enviar la minuta por WhatsApp a Muse con texto, foto de evidencia o nota de voz
- [ ] Formato sugerido para que se capture sin errores:
  ```
  Proyecto: [nombre]
  Sesión: [título]
  Acuerdos:
  - Acción — Responsable — fecha compromiso
  - Acción — Responsable — fecha compromiso
  ```
- [ ] Muse extrae proyecto, fecha actual, acuerdos y los convierte en pendientes
- [ ] Muse actualiza el archivo de datos / respaldo JSON de la bitácora en el workspace
- [ ] En la página, botón «Importar respaldo JSON» para ver lo capturado por WhatsApp
- [ ] Las fotos enviadas por WhatsApp se guardan como evidencia ligada a esa sesión

**Límite honesto:** la página en sí es local y no se actualiza sola en tiempo real desde WhatsApp. El puente es Muse: tú mandas por WhatsApp, Muse actualiza los datos, y tú importas ese respaldo en la página (o abres la versión actualizada). No lee grupos de WhatsApp ni tus chats con otras personas.

## 13. Google Drive + GitHub Pages (arquitectura propuesta)

**Estado a 2026-11-17:** Google Drive no está conectado a Muse y GitHub tampoco. La conexión es un paso del usuario, con su cuenta.

- [ ] Interfaz publicada en GitHub Pages: repositorio Git, rama `main`, archivo `index.html` en la raíz (o en `docs/`)
- [ ] GitHub Pages solo sirve archivos estáticos: la página sola NO puede escribir directo en Drive; necesita un puente
- [ ] Puente recomendado (v1): **Apps Script Web App** como backend gratuito
  - [ ] Apps Script lee/escribe un `bitacoras.json` en una carpeta de Drive `Bitacoras/`
  - [ ] Las imágenes de evidencia se suben a `Bitacoras/Evidencias/` en Drive y la página guarda su enlace/ID
  - [ ] La página llama al Web App con `fetch()` (GET para leer, POST para guardar)
  - [ ] Sin claves ni tokens dentro del HTML publicado
- [ ] Alternativa simple sin backend (si no se quiere Apps Script): página en GitHub Pages + guardado local + exportar/importar JSON a Drive a mano o vía WhatsApp → Muse → Drive
- [ ] Alternativa con Sheets: una hoja por proyecto o una hoja maestra de pendientes, leída por Apps Script (útil si se quiere ver en Sheets, más lenta para imágenes)
- [ ] Privacidad: decidir si la página es pública o privada; si el Web App queda «cualquier persona con el enlace», no publicar datos sensibles sin una clave simple en Apps Script
- [ ] WhatsApp sigue como captura: Muse actualiza el JSON en Drive y la página lo lee al abrirse

**Límite honesto:** GitHub Pages no es base de datos. Sin Apps Script (o un servicio similar) no hay guardado en Drive desde la página.

## 14. Grupo de WhatsApp por comandos (alcance real)

**Respuesta corta:** con la conexión actual de Muse a WhatsApp, NO se puede. Esa conexión es solo 1 a 1 contigo; Muse no se une a grupos ni lee tus otros chats de WhatsApp.

- [ ] Opción que sí funciona hoy: alguien del grupo manda la minuta a Nequiz y Nequiz la reenvía a Muse (este chat 1 a 1)
- [ ] Opción con bot propio (proyecto aparte, v2): número de WhatsApp Business + webhook (Apps Script Web App) que reciba comandos y fotos y escriba en Drive
  - [ ] Comandos propuestos: `/bitacora <proyecto>` · `/sesion <título>` · `/acuerdo <texto> — <responsable> — <fecha>` · `/pendiente <texto>` · `/hito <título> — <fecha>` · foto con pie = evidencia
  - [ ] Solo remitentes autorizados (lista de números); los demás mensajes se ignoran
  - [ ] Requiere cuenta Meta Business, número verificado y webhook siempre activo; no es un ajuste en Muse
- [ ] Decidir: nombre del grupo, quiénes pueden mandar minutas y si las fotos van a Drive o solo como respaldo

## 15. WhatsApp Business — cómo se configura (Cloud API)

**No confundir:** la app WhatsApp Business gratis (en el teléfono) NO hace bots. Lo que hace bots es la WhatsApp Business Platform / Cloud API de Meta.

### Lo que se necesita

- [ ] Cuenta Meta Business (business.facebook.com) y verificación de la empresa — suele tardar 1–3 días hábiles
- [ ] Número dedicado para el bot, NO el personal: un número que no esté en WhatsApp personal ni en la app Business (hay modo Coexistencia desde 2025, pero para empezar es más limpio un número aparte). Debe poder recibir SMS/llamada con código
- [ ] App en Meta for Developers (developers.facebook.com) con el producto WhatsApp, y una WhatsApp Business Account (WABA)
- [ ] Token permanente: System User con permisos `whatsapp_business_messaging` y `whatsapp_business_management` (el token de prueba vence en 24 h)
- [ ] Webhook HTTPS público para recibir mensajes: debe responder al GET de verificación de Meta y a los POST con los mensajes, en menos de 5 s, verificar la firma `X-Hub-Signature-256` y no procesar el mismo mensaje dos veces
- [ ] Servidor/bot que entienda los comandos: puede ser un Apps Script Web App, un servidor Node o un proveedor (BSP) como Twilio / 360dialog / Wati
- [ ] Lógica del bot: leer texto y fotos, descargar la foto con la Graph API, guardarla en Drive (`Bitacoras/Evidencias/`) y actualizar `bitacoras.json`
- [ ] Lista de remitentes autorizados (números que pueden mandar minutas); los demás se ignoran
- [ ] Plantillas aprobadas solo si el bot escribe fuera de la ventana de 24 h desde el último mensaje del usuario
- [ ] URL de política de privacidad para activar el modo en vivo

### Costo y límites (verificar en la tabla de Meta antes de pagar)

- [ ] La Cloud API en sí no tiene licencia; Meta cobra por conversación/mensaje entregado, según país y categoría
- [ ] 1 000 mensajes de servicio gratis por número al mes; desde oct 2026, a partir del 1 001 se cobra a tarifa de utilidad del país
- [ ] Límite inicial de conversaciones iniciadas por la empresa: 250/día por portafolio, sube con verificación y uso
- [ ] Un BSP cobra mensualidad aparte; a cambio te ahorra webhook, token y servidor

### Ruta recomendada para este proyecto

1. Probar con el número de prueba que da Meta en API Setup (sin pagar ni verificar empresa)
2. Webhook de prueba en Apps Script, con 1 comando (`/bitacora`) y 1 foto
3. Pasar a número propio + verificación de empresa + token permanente
4. Conectar el webhook al mismo `bitacoras.json` de Drive que usa la página de GitHub Pages

**Límite:** el flujo normal del bot es 1 a 1 con el número del bot. Un grupo existente de WhatsApp no se «conecta» tal cual; cada persona le escribe al bot, o se usa la Groups API de la Cloud API, que es un acceso aparte y más limitado.

## 16. Apps Script vs Power Apps — decisión

**Recomendación para este proyecto: Apps Script.**

|  | Apps Script (Google) | Power Apps / Power Automate (Microsoft) |
|---|---|---|
| Costo | Gratis dentro de Google Workspace / Gmail, con cuotas | Power Apps Premium ~$15 USD/usuario/mes; Power Automate Premium ~$15 USD/usuario/mes; licencias por usuario |
| Datos | Drive, Sheets, Gmail, Calendar nativos | SharePoint, Dataverse, OneDrive, Teams, Outlook nativos |
| Webhook WhatsApp | Web App `doPost`/`doGet`, responde en 30 s, 6 min por ejecución, 20 000 UrlFetch/día (personal) o 100 000 (Workspace) | No hay conector WhatsApp publicado por Microsoft; los de terceros son Premium y también lo es el conector HTTP |
| Página pública | Sí: la página en GitHub Pages llama al Web App | No: una Power App vive dentro de Power Platform, no es una página pública en GitHub |
| Lo que ya usa Nequiz | Sí: Asistencia CCH, mosaicos SDCP, Google Sites | No consta en su trabajo actual |
| Límite | Volumen alto (miles/día) y colas largas necesitan otro servidor | Licencias, conectores Premium y que todo el equipo tenga cuenta Microsoft |

- [x] Decisión (2026-11-17, confirmada por Nequiz): Apps Script como backend único (Drive + webhook WhatsApp + API para GitHub Pages)
- [ ] Power Apps solo si la institución ya paga Microsoft 365 y quiere la bitácora solo interna en Teams/SharePoint, sin página pública — descartado por ahora

## 17. Cómo me pasas el texto y cómo lo escribo en Drive (con varias bitácoras/páginas)

**Respuesta corta:** sí, si me pasas el texto yo puedo escribirlo en Drive — pero Drive aún no está conectado a Muse (2026-11-17). Una vez conectado, yo puedo listar, leer, subir y actualizar archivos en Drive.

### La mejor forma: hashtag + CamelCase (decidido 2026-11-17)

Para no confundir bitácoras cuando tengas varias páginas, cada mensaje que me pases empieza con el hashtag del proyecto, en CamelCase, sin espacios ni acentos:

```
#Estadistica2
Sesión: Revisión Unidad 1
Acuerdos:
- Revisar ejercicios 5 y 6 — Nequiz — 20 nov
```

- [ ] Regla: primer hashtag del mensaje = proyecto al que se escribe; los demás hashtags son etiquetas/temas, no proyecto
- [ ] CamelCase sin espacios ni acentos: `#Estadistica2`, `#CchPage`, `#ControlFacturas`, `#AsistenciaCch`
- [ ] El hashtag se traduce por tabla, no por parecido: `#Estadistica2` → slug `estadistica-2` → carpeta `Bitacoras/estadistica-2/` → `bitacora.json`
- [ ] Si falta el hashtag o no está en la tabla, yo te pregunto a cuál te refieres; no adivino ni escribo en otro proyecto

### Homologar sin forzar: base común + campos propios por proyecto

Sí, cada proyecto es diferente, y sí se puede homologar. La forma es una base común para todos + una ficha por proyecto con sus campos propios.

**Base común (igual en todos):** id, fecha, título, tipo (Reunión/Sesión/Avance/Nota), texto, asistentes, acuerdos, pendientes (texto/responsable/fecha compromiso/estado), hitos, evidencias (fotos).

**Campos propios (solo en ese proyecto, definidos en su ficha):**

| Hashtag | Slug | Campos propios (ejemplo) |
|---|---|---|
| `#Estadistica1` | `estadistica-1` | unidad, tema, ejercicios |
| `#Estadistica2` | `estadistica-2` | unidad, tema, ejercicios |
| `#CchPage` | `cch-page` | grupo, parcial, versión |
| `#ControlFacturas` | `control-facturas` | folio, monto, fecha pago, SAT |
| `#AsistenciaCch` | `asistencia-cch` | turno, grupo, fecha sesión |
| `#MoodleDgtic` | `moodle-dgtic` | curso, plataforma, tipo (reporte/cuestionario) |

*Lista confirmada por Nequiz el 2026-11-17. Índice listo en `INDICE-bitacoras.json` en la misma carpeta del checklist.*

- [ ] Antes de escribir en un proyecto, yo leo su ficha (`ficha.md`) para saber su estructura, sus campos propios y dónde va cada dato
- [ ] Si me pasas un dato que no cabe en su ficha, lo guardo en Notas y te aviso, no lo invento ni lo fuerzo en otro campo
- [ ] Cuando crees un proyecto nuevo, se crea su hashtag, su slug, su carpeta y su ficha; a partir de ahí ya sé cómo escribir en él
- [ ] La tabla hashtag → slug → carpeta → repo vive en `INDICE-bitacoras.json` y es la única fuente para resolver a dónde escribir

### Estructura en Drive (una carpeta por bitácora)

```
Bitacoras/
  INDICE-bitacoras.json
  estadistica-2/
    bitacora.json
    ficha.md
    Evidencias/
  cch-page/
    bitacora.json
    ficha.md
    Evidencias/
```

- [ ] Cada bitácora tiene un **slug único** en minúsculas con guiones: `estadistica-2`, `cch-page`, `control-facturas`
- [ ] Cada bitácora tiene una **ficha** (`ficha.md`): nombre, slug, objetivo, carpeta de Drive, repo de GitHub, URL de la página, URL del Apps Script, color
- [ ] Un **índice central** (`INDICE-bitacoras.json` o Sheet): slug | nombre | carpeta Drive | repo GitHub | página | estado
- [ ] Cada sesión tiene un **ID único**: `<slug>-<fecha>-<número>`, p. ej. `estadistica-2-2026-11-17-001`
- [ ] Yo escribo en Drive usando el ID del archivo, no solo el nombre, y verifico antes de sobrescribir; guardo respaldo antes de un cambio grande
- [ ] La página de GitHub Pages lee su propio `bitacora.json` por slug; si cambia el slug, cambia la página que se alimenta

### Flujo conmigo como puente

1. Tú me pasas el texto por este chat (WhatsApp 1 a 1) con el hashtag del proyecto al inicio, p. ej. `#Estadistica2` — sin hashtag no procedo, te pregunto
2. Yo busco el slug en el índice, abro su `bitacora.json` en Drive
3. Agrego la sesión con fecha actual, acuerdos → pendientes, y fotos si las adjuntaste
4. Actualizo el archivo en Drive y te confirmo con el ID de la sesión y lo que quedó pendiente
5. La página lo muestra al abrirse / al recargar (vía Apps Script o al importar el JSON)

## 18. Plantillas en Drive que se prellenan

**Idea de Nequiz (2026-11-17):** sí, guardar plantillas en Drive para consultarlas y llenarlas, y que se actualicen si hay un campo nuevo.

- [ ] Una plantilla por proyecto en Drive: `Bitacoras/<slug>/plantilla-sesion.json` + versión en texto para copiar en WhatsApp
- [ ] La plantilla trae todos los campos ya acomodados: base común + campos propios, con ejemplo y formato (fecha `AAAA-MM-DD`, responsable, estado)
- [ ] En la página, el botón «Nueva sesión» prellena el formulario desde la plantilla de ese proyecto (vía Apps Script)
- [ ] Por WhatsApp, yo te mando la plantilla si me escribes `#Estadistica2 plantilla` (o el hashtag de tu proyecto + `plantilla`)
- [ ] Versionado: cada plantilla tiene `plantilla_version` (v1, v2…); cada sesión guarda la versión con la que se capturó
- [ ] Si se agrega un campo nuevo: se actualiza solo la plantilla y sube de versión; las sesiones viejas no se reescriben ni se pierden, y el campo nuevo queda vacío/null en ellas hasta que alguien lo llene
- [x] Plantilla aprobada por Nequiz el 2026-11-17 (vista la de `#Estadistica2`, v1)
- [ ] Archivos listos en el workspace (para subir a Drive al conectar): `files/plantillas/<slug>-plantilla-sesion.json` (6 plantillas, v1) y `files/plantillas/plantillas-mensaje.txt`

## 19. Banco de peticiones (comandos por hashtag)

- [ ] Todos los comandos en CamelCase, sin espacios y sin acentos: `#nuevaBitacora`, `#nuevaSesion`, `#verPendientes`, `#cerrarPendiente`
- [ ] **Regla de autorización:** un proyecto nuevo nunca se crea solo. `#nuevaBitacora Nombre` solo prepara la propuesta (hashtag, slug, carpeta, ficha, plantilla); Nequiz autoriza y entonces se crea
- [x] Banco aprobado por Nequiz el 2026-11-17 (16 comandos, v1)
- [ ] Banco completo en `files/banco-peticiones.md` (16 comandos, v3) y `files/banco-peticiones.json` (v3, verificado): proyectos, sesiones, pendientes/hitos y ayuda
- [ ] Comandos clave: `#nuevaBitacora`, `#listarBitacoras`, `#verBitacora`, `#plantilla`, `#nuevaSesion`, `#agregarAcuerdo`, `#agregarEvidencia`, `#nuevoPendiente`, `#verPendientes`, `#cerrarPendiente`, `#nuevoHito`, `#ayuda`

## 20. Formato de los documentos (decisión 2026-11-17)

- [x] Decisión (2026-11-17, confirmada por Nequiz): máster en texto plano (Markdown / JSON) en Drive y GitHub: checklist, índice, plantillas, banco de peticiones
- [x] Google Docs / Word solo como versión para leer, compartir o imprimir, generada desde el máster; no se editan las dos versiones a la vez
- [ ] Documentos para personas (guías, informes) sí en Docs/Word; datos para el bot y la página (JSON) siempre en texto plano

## 21. Exportar informe desde la interfaz + carga de archivos (confirmado 2026-11-17)

- [ ] Carga de archivos ya contemplada (§4): varias imágenes por sesión, miniatura, clic para ampliar, pie/descripción, compresión automática, guardado en Drive `Evidencias/`
- [x] Ampliación en v2 (2026-11-18): también PDF, Word y Excel como evidencia (en v1 solo imágenes). Audio y video siguen pendientes.
- [ ] Exportar informe desde la interfaz: botones «Exportar informe» por proyecto y por rango de fechas, disponibles en la interfaz (no solo por chat)
- [ ] Exportar a PDF (no solo a Word): genera PDF con portada, resumen (sesiones, pendientes, hitos), sesiones en orden, pendientes con responsable y fecha, hitos, y enlaces a evidencias
- [ ] Exportar a Word: si ya existe el informe `.docx` de ese proyecto en Drive, se sobrescribe con texto enriquecido (títulos, tablas, negritas, colores UNAM); no se crea un duplicado
- [ ] Exportar también a Google Docs, a texto plano / Markdown, a CSV (pendientes, columnas de la tabla maestra §9) y a JSON completo (§9)
- [ ] Todo lo anterior disponible desde la interfaz: botones PDF / Word / Docs / CSV / JSON en la vista del proyecto y en la vista general
- [ ] Cargar formato específico por proyecto: en la interfaz, botón «Cargar formato JSON» por proyecto; el usuario sube un JSON con la estructura de ese proyecto (campos, orden, títulos) y el sistema lo guarda en Drive como `formato-exportacion.json` de ese proyecto
- [ ] Cuando se pide la exportación de ese proyecto, el sistema usa el formato cargado, no el formato por defecto
- [ ] Si el JSON del proyecto está vacío o no hay formato cargado, se usa una estructura simple por defecto (archivo `formato-por-defecto.json`, v1): Sesión (fecha, título, tipo) / Detalle (texto, asistentes) / Acuerdos y pendientes / Hitos / Evidencias; sin inventar campos
- [ ] El formato cargado queda versionado y se puede descargar / exportar de nuevo desde la interfaz; si se carga uno nuevo, se guarda como versión siguiente y el anterior queda como respaldo

## 22. Otras mejoras posibles (para elegir, no en v1)

- [ ] Recordatorios de pendientes vencidos / por vencer y resumen semanal por WhatsApp
- [ ] Integración con Google Calendar: hitos y fechas compromiso como eventos
- [ ] Búsqueda avanzada y filtros por responsable, fecha y etiqueta
- [ ] Tablero/resumen por proyecto: sesiones, % pendientes hechos, próximos hitos
- [ ] Notas de voz a texto: mandar audio por WhatsApp y que se transcriba como sesión
- [ ] Compartir una bitácora en solo lectura con un enlace
- [ ] Historial de cambios: quién y cuándo editó cada sesión/pendiente
- [ ] Etiquetas y prioridades en pendientes, y vista «solo vencidos»
- [ ] Bot de WhatsApp Business (v2, §15) para que el grupo mande minutas sin pasar por Nequiz

## 23. Enlace programa → proyectos — flujo de cierre (agregado 2026-11-18)

- [ ] Los archivos del protocolo quedan guardados para el programa, listos para enlazarlos a los proyectos que se hagan: catálogo JSON, plantillas por rubro, índice y correcciones en `files/protocolo-puntaje-cch/`
- [ ] Flujo de cierre: proyecto terminado → clasificar el trabajo por rubro/actividad del protocolo → generar el reporte desde la interfaz → elegir salida
- [ ] Salidas al cerrar: por correo (machote de la plantilla de su rubro), impreso (exportar a PDF), Word (sobrescribe el existente con texto enriquecido), Docs, CSV y JSON
- [ ] Cada reporte lleva sus URLs de referencia para consultar después cómo se estructuró ese trabajo
- [ ] Enlace proyecto → rubro en `protocolo-puntaje-cch/ENLACE-proyectos.md`; se confirma por proyecto cuando Nequiz lo pide, no se asume por el nombre; un trabajo no se cuenta en dos rubros

## 24. Mantenimiento — crear tablas y hojas de Drive desde cero (agregado 2026-11-18)

- [ ] Apartado «Mantenimiento» en la interfaz, solo visible con la contraseña web
- [ ] Crear desde cero, en Drive, la estructura completa: `Bitacoras/`, `INDICE-bitacoras.json`, `Proyectos/`, y por proyecto `Proyectos/<folio>/` con `bitacora.json`, `ficha.md`, `plantilla-sesion.json`, `formato-exportacion.json` y `Evidencias/`
- [ ] Crear o reutilizar un solo libro `Bitacoras` dentro de `Bitacoras/Proyectos/`, con las cinco hojas Bitacoras, Sesiones, Pendientes, Hitos y Puntaje, sus columnas y una fila de ejemplo
- [ ] Botón «Crear estructura desde cero» con confirmación; si ya existe, no sobrescribe sin avisar: muestra qué existe y qué falta, y crea solo lo que falta
- [ ] Botón «Verificar estructura»: revisa que existan carpeta, índice, plantillas, hojas y permisos, y reporta lo que falta
- [ ] Botón «Respaldar antes de recrear»: exporta JSON completo antes de borrar o recrear cualquier tabla u hoja
- [ ] Las hojas de Drive son la misma fuente que usa AppSheet para los formularios (ver §26)

## 25. Acceso y login (agregado 2026-11-18)

- [ ] Login en la página web, con contraseña aparte de la de Google / AppSheet
- [ ] La contraseña web se guarda en Drive (archivo de configuración, no en el HTML publicado), en forma protegida (hash, no en texto plano visible); el HTML nunca lleva la contraseña
- [ ] El acceso por AppSheet se controla desde Apps Script (ver §26): AppSheet llena los formularios y escribe en las mismas hojas de Drive
- [ ] El acceso por la web se controla con su propia contraseña, distinta de la de AppSheet / Google; cambiar una no cambia la otra
- [ ] Sesión web: al entrar con la contraseña se guarda la sesión en el navegador; botón «Cerrar sesión»; tras varios intentos fallidos, bloqueo temporal
- [ ] Solo con sesión iniciada se ven Mantenimiento (§24), crear/editar/borrar y exportar; sin sesión, la página solo muestra el aviso de login
- [ ] Cambio de contraseña web desde Mantenimiento, con confirmación de la contraseña actual

## 26. AppSheet — configuración (agregado 2026-11-18)

- [ ] Guía de configuración en `files/guia-configuracion-appsheet.md`: conectar AppSheet a las hojas de Drive, crear la app, tablas, formularios y vistas
- [ ] AppSheet usa las mismas hojas de Drive del §24 (Bitacoras, Sesiones, Pendientes, Hitos, Puntaje); no crea una base aparte
- [ ] Formularios en AppSheet: Nueva sesión, Nuevo pendiente, Nuevo hito, Registrar actividad de puntaje; los mismos campos que en la web
- [ ] El acceso a la app de AppSheet se controla desde Apps Script / la cuenta de Google (quién puede abrir la app y quién puede editar); distinto de la contraseña web (§25)
- [ ] Sincronización: lo que se llena en AppSheet aparece en la página web al recargar, y viceversa, porque ambas leen/escriben las mismas hojas y el mismo `bitacoras.json`
- [ ] Probar en AppSheet: llenar una sesión y un pendiente, y verificar que se vean en la web

## 27. Verificación antes de entregar

- [ ] `node --check` / revisión de sintaxis del JS embebido
- [ ] Probar en navegador real: crear bitácora, capturar sesión con fecha actual, adjuntar imagen, crear pendiente desde un acuerdo, marcarlo hecho
- [ ] Probar calendario: que el punto aparezca en el día correcto y que al hacer clic se vea la sesión
- [ ] Probar exportar JSON y CSV, e importar el JSON en una copia
- [ ] Revisar en 360 px y en 1440 px: sin desborde, sin texto cortado, sin zoom forzado
- [ ] Confirmar que no hay referencias a Tailwind, Bootstrap ni Lucide por CDN

---

## Decisiones por confirmar (con propuesta por defecto)

| # | Pregunta | Propuesta por defecto |
|---|----------|----------------------|
| 1 | ¿La página vive solo en tu equipo (localStorage) o necesitas compartirla / verla en otro equipo? | Solo en tu equipo en v1; respaldo JSON para moverla |
| 2 | ¿Los acuerdos de una minuta se convierten en pendientes automáticamente o solo cuando tú lo pidas? | Solo cuando lo pidas, con un clic por acuerdo |
| 3 | ¿Quieres que los pendientes de la web reemplacen al Excel, o que el Excel siga siendo la tabla oficial? | La web es la captura diaria; el Excel sigue como respaldo imprimible vía CSV |
| 4 | ¿Nombres de tus proyectos/bitácoras para precargarlos, o los creas tú al estrenarla? | Los creas tú; se entrega vacía con 1 bitácora de ejemplo que se puede borrar |
| 5 | ¿Las imágenes se guardan dentro de la página (límite de espacio) o prefieres guardar solo el nombre/archivo y enlazar a tu carpeta? | Dentro, comprimidas, en v1 |
| 6 | ¿Captura por WhatsApp con Muse como puente? | Sí: mandas minuta por WhatsApp, Muse actualiza el JSON, tú lo importas en la página |
| 7 | ¿Drive + GitHub Pages? | Sí: interfaz en GitHub Pages, datos en Drive vía Apps Script Web App (§13) |
| 8 | ¿Repositorio de GitHub y carpeta de Drive? | Por confirmar: nombre del repo y carpeta `Bitacoras/` en Drive |
| 9 | ¿Grupo de WhatsApp manda minutas por comandos? | No directo con Muse; opción hoy = reenvío a Muse; bot propio = proyecto v2 (§14) |
| 10 | ¿Cómo se identifica cada bitácora/página al pasarme texto? | Hashtag + CamelCase, p. ej. `#Estadistica2`; primer hashtag = proyecto; tabla hashtag → slug → carpeta en índice central (§17) |
| 11 | ¿Cada proyecto tiene estructura diferente? | Sí; se homologa con base común + campos propios por proyecto definidos en su ficha (§17) |

**Alcance v1 (lo que se construye primero):** §1–§6, §8, §9, §12, §13 y §21 (carga de archivos + exportar informe), con diseño §11, más §23 (enlace programa → proyectos), §24 (mantenimiento), §25 (login web) y §26 (AppSheet).
**Alcance v2 (después, si lo pides):** mejoras de §22 (recordatorios, Calendar, resumen semanal, voz a texto, compartir en lectura, PDF directo, bot WhatsApp Business).

---

*Fuente de estructura: guía y tabla maestra de control de minutas en `workspace/goals/meeting-minutes-control/files/control-minutas-nex/`.*

## Auditoría v2 (2026-11-18, segunda auditoría estática + pasos 0–10 aplicados)

- **Paso 1:** fallos de guardado ya no son silenciosos: `llamar()` revisa `r.ok`, cierra la sesión si el token venció, y el registro queda marcado «Sin sincronizar» (etiqueta roja en la tarjeta) hasta reenviarlo editándolo.
- **Paso 2:** editar/borrar sesión por id (`editarSesion`/`eliminarSesion` en el backend); no se pisa toda la bitácora. Al editar no se puede cambiar de proyecto (para moverla: crear en el otro y borrar la vieja).
- **Paso 3:** miniaturas por `verEvidencia` (base64 con token, solo dentro de `Bitacoras/`).
- **Paso 4:** fechas con espacio (`AAAA-MM-DD HH:MM`) se normalizan a `T` al leer; editar ya no vacía la fecha.
- **Paso 5:** IDs de sesión con `uid()` (únicos); el backend rechaza duplicados.
- **Paso 6:** «Importar respaldo» sube cada proyecto a Drive; «Borrar todo» es ahora «Borrar copia local» (Drive no se toca); el puntaje se guarda en `bitacora.json` y se lee al recargar.
- **Paso 7:** contraseña mínima 12 caracteres; sal con `Utilities.getUuid()`; freno global 100 fallos/hora + 2 s por intento fallido (`limpiarBloqueos()` lo libera desde el editor); época de sesión: cambiar la contraseña invalida todos los tokens; «Cerrar sesión» revoca el token; lecturas por POST, token web en el body y nada de token en GET; sin sesión no se muestran los datos locales; en GitHub Pages solo suben `index.html` y `protocolo-puntaje-cch-v2.json`.
- **Paso 8:** acuerdos con fecha `AAAA-MM-DD` o `DD/MM/AAAA` (inválida se rechaza); separador ` | ` (se sigue leyendo el ` — ` viejo); en «Todos» no se adivina proyecto (nueva sesión exige elegirlo; el Word de todos se descarga, no se sube a estadistica-2); `leerTodo_` lee solo `bitacora.json`; `SHEET_ID` cacheado; hoja Pendientes con `fecha_cierre` y `notas`; estado «En proceso» elegible en la tabla; PDF/Docs con ventana bloqueada avisada y `print()` a los 600 ms; HEIC avisa «Usa JPG o PNG».
- **Paso 9:** modal con `role="dialog"` y Escape; tabs con ARIA; días del calendario como `<button>`; filtro de proyectos reconstruido; hitos con hashtag + nombre.
- **Glosario v2 duplicado:** la página lee `protocolo-puntaje-cch-v2.json` de la **raíz** (canónica); la copia en `protocolo-puntaje-cch/` es idéntica (mismo SHA-256) y se conserva como respaldo de esa carpeta, no se borró.
- **No aplicado / anotado:** CONFIGURACION ya decía «27 secciones», no 28 (punto de la auditoría desactualizado). La auditoría v1 queda archivada en `AUDITORIA-validacion-v1.md`; esta v2 se documenta en `AUDITORIA-validacion-v2.md`.

## Auditoría v3 (2026-11-18, tercera auditoría: Pasos 10 y 11 nuevos)

- **Discrepancia de la auditoría:** se hizo sobre un ZIP viejo (1159/1541 líneas, `programa-bitacoras-v1_1.zip`) y afirmó que «ninguna corrección está aplicada». Falso para el ZIP vigente: 1231/1667 líneas, 39 archivos, md5 `index.html` 9237c35d3d5b9844085d5129aab23144, `Codigo.gs` b64cc9b4e34753ef6ad8606f9675de99, con `llamar()`, `editarSesion_`, `verEvidencia_` presentes. Los Pasos 1–9 se verificaron uno por uno y siguen presentes (ver `AUDITORIA-validacion-v3.md`); no se rehicieron.
- **Paso 10 (M9 modo local):** sin URL de Apps Script, `sesionAutenticada()` es siempre true: se puede crear, editar, convertir acuerdos en pendientes y exportar en localStorage sin login; el botón Login se oculta y el indicador del header dice «● Local».
- **Paso 10 (M10 filtro global):** un solo filtro de proyecto (`enAlcance`): el panel lateral se sustituyó por chips; se quitó el select duplicado `filtroPendProyecto` de Pendientes; Bitácoras, Pendientes y Calendario (cuadrícula, detalle del día y Próximos 7 días) filtran por el mismo proyecto; el resumen «X de Y hechos» se calcula sobre los pendientes filtrados.
- **Paso 11 U1:** fila de resumen con 4 KPIs (vencidos, vencen en 7 días, próximo hito, última sesión); cada KPI salta a su vista.
- **Paso 11 U2:** columna «Atención» (vencidos, próximos 7 días, hitos abiertos) junto a la línea de tiempo, en `.dos-col` (div, no aside).
- **Paso 11 U3:** proyectos como chips (`#chips`: Todos + 6, con contador rojo si hay vencidos) en lugar del panel lateral; el aside y sus reglas CSS se eliminaron.
- **Paso 11 U4:** en el modal de Mantenimiento están «Cargar formato JSON», «Importar respaldo JSON» y «Borrar copia local» (función `borrarLocal()`); el header lleva el indicador `#estadoModo` (Local / Sin sesión / Sincronizado / N sin sincronizar).
- **Paso 11 U5:** el título de cada vista muestra el contexto («Pendientes · #Estadistica2») y hay botón «✕ Quitar filtro» a «Todos».
- **Paso 11 U6:** hitos compactos (una línea «Sin hitos · + Hito» si no hay); pestaña nueva **Puntaje** con totales por rubro I–VI; la lista plana de puntaje salió de Bitácoras.
- **Paso 11 U7:** tarjetas de sesión colapsadas (`<details>`) y agrupadas por semana («Semana del …»); Editar/Eliminar en menú «⋯», Eliminar en rojo con confirmación.
- **Paso 11 U8:** formulario de sesión con acuerdos en filas (texto, responsable, selector de fecha `type=date`) — reemplaza el parche 8a/8b de fecha libre y separador; formulario en secciones (Datos básicos, Contenido, Acuerdos, Detalles del proyecto, Evidencias).
- **Paso 11 U9:** pendientes agrupados (Vencidos, Esta semana, Después, Sin fecha, Cerrados en `<details>` cerrado) con conteo por grupo y enlace a la sesión en «Minuta origen»; calendario con puntos de color por proyecto y vista «Agenda» del mes en móvil; en móvil encabezado de una línea, botón flotante «+ Sesión» y pestañas en barra inferior.
- **Verificación:** `node --check` OK en ambos archivos; pruebas jsdom en modo local 30/30 (`prueba-auditoria-v3.js`), 0 errores de ventana. Chromium headless no pudo arrancar en este entorno (error del lanzador «Hatch WebGL domain policy is required», ajeno a la página): queda pendiente la prueba visual a 1440 y 390 px en un navegador real.
- **Pendiente contra Apps Script real:** todo lo de red/Drive/Sheets reales sigue sin probarse (igual que en v2), más el nuevo flujo local→Drive al desplegar.

## Documentos como evidencia (v2, 2026-11-18)

- **Qué cambió:** la sección Evidencias acepta además de imágenes, PDF, Word (`.doc`, `.docx`) y Excel (`.xls`, `.xlsx`), máx. 10 MB por archivo (ver §4).
- **Modelo:** `{url, pie, nombre, mime, tipo, tamano}`, `tipo` = `imagen` | `documento`; las evidencias viejas `{url, pie}` se normalizan al leer (`normalizarEvidencia`).
- **Imágenes:** igual que antes (compresión a máx. 1200 px, JPG; HEIC sigue avisando «Usa JPG o PNG»).
- **Documentos:** se leen con FileReader (dataURL) sin comprimir; al subir a Drive conservan su nombre original (sanitizado, con prefijo `slug-fecha-evN-`) y su mime real; en la tarjeta, el formulario y el informe aparecen como ficha/enlace con su nombre, no como imagen.
- **Backend:** `subirEvidencia_`/`subirArchivoADrive_` ya eran genéricos (sin suposición de `.jpg`); solo se documentó. La API `{slug, nombre, base64, mime}` no cambió. `verEvidencia_` sigue siendo solo para imágenes.
- **Verificación:** `node --check` OK en ambos archivos; pruebas jsdom `prueba-evidencias-documentos.js` (ver archivo), 0 errores de ventana. Pendiente: prueba contra Apps Script/Drive real (subida de PDF/Word/Excel y apertura del enlace).

## Vistas Tarjeta y Tabla (v2, 2026-11-18)

- **Interruptor Tarjeta / Tabla en Bitácoras y en Pendientes:** botones con iconos (SVG en línea) y `aria-pressed`, junto al título de cada vista. Cambia la vista sin perder el filtro de proyecto (selector con buscador desde la v3), la búsqueda ni el agrupamiento (por semana en Bitácoras, por grupo en Pendientes).
- **Persistencia:** la vista elegida se guarda en `localStorage` (`bitacoras_vista_bitacoras`, `bitacoras_vista_pendientes`) y se restaura al abrir; un valor guardado inválido cae al defecto (Bitácoras: Tarjeta; Pendientes: Tabla).
- **Tabla de Bitácoras:** una tabla por semana con columnas Fecha, Proyecto, Título, Tipo, Acuerdos, Pendientes, Evidencias y Acciones (Editar/Eliminar, con la misma lógica que las tarjetas, incluido `borrarSesion` por id). Es resumen: el texto y los acuerdos se leen en Tarjeta o en el informe.
- **Tarjeta de Pendientes:** tarjetas con texto, responsable, fecha compromiso, estado, prioridad, proyecto y minuta origen; el selector de estado (Pendiente/En proceso/Cerrado) y el checkbox Hecho funcionan igual que en la tabla.
- **Móvil:** las tablas van dentro de `.tabla-scroll` con desplazamiento horizontal propio, sin desbordar la página (la regla móvil que rompía las tablas en bloques queda anulada dentro de `.tabla-scroll`).
- **Sin cambios de fondo:** blanco #FFFFFF, azul UNAM #002663, dorado #C9A227 solo acentos, CSS/JS puros, sin firmas diarias; el filtro global (`enAlcance`), el modo local y las evidencias con documentos (imagen como miniatura, PDF/Word/Excel como ficha con enlace) siguen intactos.
- **Verificación:** `node --check` OK; `prueba-auditoria-v4.js` 53/53, 0 errores de ventana. Pendiente: prueba visual en navegador real a 390/1440 px.

## Selector de proyecto con buscador (v3, 2026-11-18)

- **Reemplaza la fila de chips:** un botón compacto muestra el proyecto activo (punto de color, hashtag + nombre y contador de pendientes abiertos, en rojo si hay vencidos) y, al abrirlo, un campo de búsqueda y la lista de proyectos. Crece lineal, no exponencial: un proyecto más es una opción más en la lista, sin hacer crecer la página.
- **Búsqueda en vivo:** filtra por nombre y por hashtag, sin acentos y sin distinguir mayúsculas; «Todos los proyectos» siempre queda arriba. Con la búsqueda vacía aparecen todos.
- **Teclado y accesibilidad:** flechas arriba/abajo para moverse, Enter para elegir, Escape para cerrar (y devolver el foco al botón), clic fuera para cerrar; roles `listbox`/`option`, `aria-expanded` en el botón y `aria-selected` en la opción.
- **Sin cambios de fondo:** el filtro global (`enAlcance`), el modo local, las vistas Tarjeta/Tabla y las evidencias con documentos siguen intactos; el botón «✕ Quitar filtro» se conserva. En móvil el selector ocupa el ancho completo y la lista no desborda la página.
- **Verificación:** `node --check` OK; `prueba-selector-proyectos.js` 24/24, 0 errores de ventana. Pendiente: prueba visual en navegador real a 390/1440 px.

## Auditoría v4 (2026-11-18, auditoría completa final)

- **Alcance:** lectura completa de `index.html` (1564 líneas) y `Codigo.gs` (1685 líneas), `node --check` OK en ambos, pruebas jsdom `prueba-auditoria-v4.js` 53/53 (modo local, Apps Script simulado y persistencia), 0 errores de ventana; además se re-corrieron `prueba-auditoria-v3.js` (30/30) y `prueba-evidencias-documentos.js` (23/23) sin regresiones.
- **Resultado: 0 hallazgos Alta.** 2 Media (M2 corregida, M1 pendiente con motivo), 4 Baja y 2 UX. Informe completo en `AUDITORIA-validacion-v4.md`.
- **M2 corregida:** `escribirJSON_` guarda una copia `<base>-corrupto-AAAA-MM-DD-HHmm.json` antes de sobrescribir un archivo cuyo JSON está corrupto (antes `leerJSON_` devolvía null y el guardado lo borraba). Solo verificada con `node --check`; pendiente probarla contra Apps Script real con un `bitacora.json` dañado.
- **M1 pendiente (por diseño v2):** tras expirar el token, `llamar()` borra el token pero los datos siguen visibles hasta recargar o cerrar sesión; vaciar el estado ahí ocultaría también los registros `sin_sync`, que deben seguir visibles para reenviarse. Si Nequiz prefiere priorizar el ocultamiento, la corrección es vaciar `estado` en `llamar()` sin tocar `localStorage`.
- **Baja/UX:** `nuevoId_` usa `Math.random` (freno: rechazo de duplicados en el servidor); `subirInforme_` sobrescribe con `setContent(getDataAsString())`, válido solo para el .doc de texto que genera la página; `prueba-auditoria-v2.js` obsoleta (la sustituyen v3 y v4); `AUDITORIA-validacion.md` (v1) se conserva como histórico; la Tabla de Bitácoras es resumen por diseño; en móvil el interruptor puede bajar a segunda línea.
- **Pendiente contra Apps Script real:** todo lo de red/Drive/Sheets reales, la copia `-corrupto-` de M2, cambiar la contraseña vigente a mínimo 12 caracteres al desplegar, y la prueba visual en Chromium real (390/1440 px, interruptor y scroll de tablas).

## Borrar datos de ejemplo (v4, 2026-11-18)

- **Qué es dato de ejemplo heredado:** los registros guardados con `ejemplo:true` y las simulaciones antiguas (ids `estadistica-2-2026-11-17-001` y `estadistica-1-2026-11-17-001`). La precarga automática y los JSON de simulación se retiraron; los ids se conservan solo para poder identificar datos viejos.
- **Botón en Mantenimiento:** «Borrar datos de ejemplo». Pide dos confirmaciones con advertencia explícita («borra SOLO los datos de ejemplo; tus datos reales NO se tocan») y muestra aviso verde con el conteo borrado.
- **Alcance:** elimina sesiones, pendientes, hitos y puntaje de ejemplo en local y, si hay Apps Script, también en Drive (`eliminarSesion_`/`eliminarHito_` + sincronización por proyecto). Si un registro de ejemplo no existe en Drive, no falla.
- **Sin re-siembra:** la página ya no genera registros de demostración al abrirse. «Borrar copia local» borra la copia de este navegador, no los datos de Drive.
- **Verificación:** `prueba-auditoria-v5.js` (33/33 + A23), 0 errores de ventana. Pendiente: prueba contra Apps Script/Drive real.

## Folio consecutivo por proyecto: CICLO-NN (v4, 2026-11-18)

- **Formato:** `CICLO-NN`, p. ej. `20271-01`. Ciclo por defecto `20271`. Folios iniciales en orden del índice: Estadística 1 = 20271-01, Estadística 2 = 20271-02, CCH-Page = 20271-03, Control de Facturas = 20271-04, Asistencia CCH = 20271-05, Moodle DGTIC = 20271-06.
- **Reglas:** el consecutivo es global por ciclo (no por proyecto); se asigna en orden de registro; un número asignado nunca se reutiliza aunque se borre el proyecto (queda en `usados`); al cambiar el ciclo manualmente el contador se reinicia en 01 automáticamente y los folios del ciclo anterior NO cambian; al volver a un ciclo anterior se recuperan sus números usados (`historial`), para no reutilizarlos.
- **Configuración:** en Mantenimiento, sección «Ciclo y folios»: muestra el ciclo vigente, el siguiente folio y la lista de folios por proyecto; campo «Nuevo ciclo» (solo dígitos, 4-6 caracteres) con confirmación y advertencia. Se guarda en `localStorage` y en Drive (`Bitacoras/config-ciclo.json` + folios en `INDICE-bitacoras.json`, acción `guardarConfigCiclo_`); sin Apps Script, solo local (limitación documentada).
- **Dónde se muestra:** selector de proyecto, título de Bitácoras y de Pendientes filtrados, etiqueta de la tarjeta de sesión, columna Proyecto de la tabla de bitácoras, tarjeta de pendiente e informe exportado (título y cabecera, con el ciclo vigente).
- **Verificación:** `prueba-auditoria-v5.js` 35/35, 0 errores de ventana. Pendiente: prueba contra Apps Script/Drive real.

## Auditoría v5 (2026-11-18, borrar ejemplo + folios)

- **Alcance:** lectura completa de los cambios en `index.html` (1782 líneas) y `Codigo.gs` (1769 líneas), `node --check` OK en ambos, pruebas jsdom `prueba-auditoria-v5.js` 35/35 (modo local, Apps Script simulado, persistencia), 0 errores de ventana; suites anteriores sin regresiones (v4 53/53, v3 30/30, documentos, selector 24/24).
- **Resultado: 0 hallazgos Alta.** 1 Media (V5-1, corregida: historial de usados por ciclo), 4 Baja (V5-2 a V5-5, pendientes con motivo). Informe completo en `AUDITORIA-validacion-v5.md`.
- **Pendiente contra Apps Script real:** escritura/lectura de `config-ciclo.json` y folios en el índice, borrado real de la sesión de ejemplo en Drive, y prueba visual en Chromium real (390/1440 px).

## Token de servicio para Muse (v7, 2026-11-19)

- `MUSE_SERVICE_TOKEN_HASH` guarda solo `hashConSal_()` del token; el token generado se muestra una sola vez en el log y nunca se incorpora al HTML, JSON o documentación.
- `generarTokenServicioMuse()` emite dos UUID unidos; generar otro reemplaza al anterior. `fijarTokenServicioMuse()` es alternativa temporal y su valor debe borrarse del código después de ejecutarla. `revocarTokenServicioMuse()` elimina la propiedad inmediatamente.
- `verificarToken_()` distingue `sesion` y `servicio`. El token de sesión mantiene vigencia de 6 horas y época; el de servicio no caduca por tiempo ni depende de la época.
- Alcance permitido: `leer`, `leerProyecto`, `guardarSesion`, `guardarPendiente`, `cerrarPendiente`, `guardarHito`, `subirEvidencia`, `crearProyecto`, `guardar`, `verEvidencia`, `registrarPuntaje`.
- Todo lo demás se rechaza para el token de servicio antes de ejecutar la acción, incluyendo login/cambio de contraseña, `crearEstructura`, `guardarConfigCiclo`, `verificarEstructura` y las acciones dedicadas para editar o borrar. La sesión web normal no usa el token de servicio.
- `doPost` acepta el token del body JSON o de `e.parameter.token` como alternativa de integración. El query string puede filtrarse en registros/historiales: no compartas ni registres URLs con el token. `doGet` no valida acciones con este token; la web sigue enviándolo en el body.
- En `guardar`, Muse sincroniza sin borrar: agrega o fusiona por ID, conserva registros/elementos omitidos y no reemplaza valores anteriores con propiedades ausentes, nulas o vacías. Los registros sin ID o colecciones con tipo inválido se rechazan.
- `#nuevaBitacora` por WhatsApp solo propone: requiere autorización explícita del usuario aunque Muse tenga el token.
