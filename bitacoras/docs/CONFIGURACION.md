# Configuración del Programa de Bitácoras CCH — v1

**Versión:** v1 — 2026-11-18
**Para:** Nequiz (CCH-UNAM)

Guía corta y concreta para dejar la v1 funcionando. Nequiz hace estos pasos él mismo, con su propia cuenta de Google y su propia cuenta de GitHub.

Resumen y estructura en el [README principal](../../README.md). El checklist de decisiones (27 secciones) está en [`checklist-bitacora-web.md`](checklist-bitacora-web.md) y la guía de AppSheet en [`guia-configuracion-appsheet.md`](guia-configuracion-appsheet.md).

> **Placeholders:** en esta entrega no hay URLs ni contraseñas reales. Donde veas `TU_URL_APPS_SCRIPT_AQUI`, `TU_CONTRASENA_AQUI` o `TU_REPO_AQUI`, pon tu valor real. La tabla completa está al final de esta guía.

---

## 1) En Drive: crear la carpeta `Bitacoras/` y subir los archivos

1. Abre [Google Drive](https://drive.google.com) con tu cuenta de Google.
2. Crea una carpeta llamada **`Bitacoras`** en la raíz de tu Drive si todavía no existe.
3. No crees `Proyectos/`, carpetas de proyectos ni una carpeta `Evidencias/` global a mano. Apps Script valida si ya existen y crea lo que falte.
4. Sube a `Bitacoras/` estos archivos de esta entrega:
   - `../data/INDICE-bitacoras.json` → en `Bitacoras/` (plantilla vacía; la aplicación actualiza los proyectos automáticamente)
   - `../integraciones/muse/banco-peticiones.json` → en `Bitacoras/` solo si Muse lo requiere (referencia; no lo edita la página)
   - Las seis plantillas de `docs/historico/plantillas/` son heredadas y opcionales; no es necesario crear proyectos ni carpetas para ellas.
   - `../data/formato-por-defecto.json` es opcional; consérvalo como referencia al configurar un informe sin formato propio.
5. El índice puede iniciar sin proyectos. La página crea el registro del proyecto, su `bitacora.json`, ficha, plantilla, formato y `Evidencias/` al usar **Agregar proyecto**; no crees un `bitacoras.json` global.
6. El libro **`Bitacoras`** se crea o reutiliza automáticamente en `Bitacoras/Proyectos/` al ejecutar la creación de estructura. Debe contener estas cinco hojas (la hoja `Firmas` ya no existe):
   - `Bitacoras`
   - `Sesiones`
   - `Pendientes`
   - `Hitos`
   - `Puntaje`
   
   Cada hoja lleva sus columnas según `guia-configuracion-appsheet.md` (mismas hojas para la web y para AppSheet). No hace falta llenarlas: se llenan solas al usar la página. Si ya hay un libro llamado `Bitacoras` fuera de `Proyectos/`, Apps Script lo mueve allí y lo reutiliza; no crea otro.
7. No tienes que copiar IDs de Drive en Apps Script: la raíz `Bitacoras/` y `Proyectos/` se buscan por nombre. El programa guarda automáticamente el ID del libro en Script Properties y el de cada carpeta de proyecto en `INDICE-bitacoras.json`.

> **Nota (M11):** las evidencias que se suben a Drive son **privadas del dueño** por defecto: sus enlaces `/view` solo los abre la cuenta propietaria. Los informes Word/PDF del botón Exportar se descargan en el navegador, no se suben automáticamente. Si guardas un informe por otra vía en `Informes/`, comparte esa carpeta manualmente; el programa no cambia permisos.

> **Nota (v2 — documentos como evidencia):** además de imágenes, cada sesión acepta PDF, Word (`.doc`, `.docx`) y Excel (`.xls`, `.xlsx`) como evidencia, **máx. 10 MB por archivo**. Las imágenes se comprimen a máx. 1200 px (JPG); los documentos se guardan tal cual, con su nombre original, en la carpeta `Evidencias/` del proyecto. En modo local (sin Apps Script) los documentos quedan como base64 en localStorage: un solo PDF grande puede llenar el límite de ~5 MB, así que en ese modo conviene subirlos a Drive cuanto antes.

> **Proyectos nuevos:** se crean desde Mantenimiento, no requieren editar el índice a mano y su carpeta se crea en `Bitacoras/Proyectos/` con su folio `CICLO-NN` (por ejemplo, `20271-01`). La misma carpeta contiene el libro `Bitacoras`. Los proyectos existentes conservan su ubicación y sus IDs; el índice registra el ID de cada carpeta.

## 2) En GitHub: crear el repo y activar Pages

1. Abre [GitHub](https://github.com) con tu cuenta.
2. Crea un repositorio nuevo. **Nombre a elegir; sugerencia: `bitacoras`**. Puedes ponerle el nombre que quieras; en esta guía se usa `TU_REPO_AQUI` como placeholder.
   - Visibilidad: público (necesario para GitHub Pages gratuito) o privado con Pages habilitado según tu plan.
3. En este repositorio, GitHub Pages conserva la publicación desde la raíz y Bitácoras se sirve desde `bitacoras/`; deja ahí `index.html` y `protocolo-puntaje-cch-v2.json` para mantener sus URL actuales. Si instalas Bitácoras en un repositorio aparte, publica ambos archivos juntos desde la raíz (o juntos desde `docs/`).
4. Activa GitHub Pages:
   - Ve a **Settings → Pages**.
   - En **Source**, elige la rama principal (`main`) y la carpeta donde subiste `index.html` (raíz `/` o `/docs`, según el paso anterior).
   - Guarda. GitHub te dará la URL de la página, con la forma `https://TU_USUARIO.github.io/TU_REPO_AQUI/`.
5. Espera 1–2 minutos y abre esa URL para comprobar que la página carga (aunque todavía no tenga la URL de Apps Script, debe abrir en modo local).

## 3) En Apps Script: crear el proyecto, pegar `Codigo.gs` y desplegar

1. Abre [Apps Script](https://script.google.com) con la **misma cuenta de Google** que usaste en Drive.
2. Crea un proyecto nuevo y ponle el nombre que quieras (sugerencia: `Bitacoras CCH`).
3. Borra el contenido de `Code.gs` y pega el contenido completo de **`Codigo.gs`** de esta entrega.
4. En `Codigo.gs` no hay que poner ningún ID de Drive (D4): el código busca la carpeta `Bitacoras/`, las carpetas de proyecto y el libro por su **nombre**. Solo revisa que los nombres coincidan con los del paso 1 (`Bitacoras` y libro `Bitacoras`).
5. Guarda el proyecto (icono de disquete o `Ctrl + S`).
6. Despliega como Web App:
   - Haz clic en **Deploy → New deployment**.
   - Tipo: **Web app**.
   - **Execute as: Me** (tu cuenta).
   - **Who has access:** Anyone (cualquiera con el enlace) o según lo que indique `Codigo.gs`; la página es la que llama a la app, no los usuarios directamente.
   - Haz clic en **Deploy** y autoriza los permisos de Drive y de las hojas cuando Google lo pida.
7. Copia la URL que termina en **`/exec`**. Esa es la URL del backend. Es la que vas a pegar en el paso siguiente.
8. Cada vez que modifiques `Codigo.gs`, **edita el despliegue existente** (D6): Deploy → Manage deployments → ✎ (editar el despliegue) → **New version**. NO crees un despliegue nuevo: un despliegue nuevo genera otra URL `/exec` y tendrías que volver a pegarla en `index.html`; editar el existente conserva la misma URL.

## 4) Pegar la URL en UN solo lugar: `index.html`

1. Abre `bitacoras/index.html` (el archivo de este repositorio, o edítalo en GitHub).
2. Busca el objeto `CONFIG` y pon la URL del paso 3 en **ese único lugar**:
   ```js
   const CONFIG = {
     appsScriptUrl: "TU_URL_APPS_SCRIPT_AQUI"
   };
   ```
   Es decir, sustituye `TU_URL_APPS_SCRIPT_AQUI` por tu URL `/exec` real.
3. **No pegues la URL en ningún otro archivo.** Solo aquí.
4. Sube el `index.html` actualizado al repo (commit y push, o súbelo en la web de GitHub). Espera 1–2 minutos a que Pages se actualice.
5. Sin URL (con `appsScriptUrl` vacía), la página funciona en **modo local**: guarda en el navegador sin sincronizar con Drive. Con la URL puesta, sincroniza con Drive a través de Apps Script.

## 5) Contraseña web: fijarla en Apps Script Properties (nunca en el HTML)

La página tiene login con contraseña aparte. La contraseña **nunca va en el HTML**.

1. En el proyecto de Apps Script del paso 3, abre el editor y busca en `Codigo.gs` la función indicada para fijar la contraseña (la función que guarda el hash en Script Properties).
2. Ejecuta **una sola vez** la función `fijarPasswordWebTemporal()` (D5): en el editor, en la lista de funciones, elige `fijarPasswordWebTemporal` (sin argumentos: el botón Ejecutar del editor no admite argumentos) y pulsa Ejecutar. Antes, pon tu contraseña en la línea `NUEVA_CONTRASENA = 'TU_CONTRASENA_AQUI'` dentro de esa función (mínimo 12 caracteres, auditoría v2).
   - La función guarda solo el **hash con sal** en **Script Properties**; la contraseña en texto plano no queda guardada en ningún archivo.
   - **Después de ejecutarla, BORRA la contraseña de esa función** (o borra toda la función `fijarPasswordWebTemporal`) para que no quede escrita en el código.
3. Comprueba en **Project Settings → Script Properties** que quedó guardada la propiedad del hash (verás el nombre de la propiedad y un valor hash, no tu contraseña).
4. **No escribas la contraseña en `index.html`, ni en Drive como texto, ni en el repo de GitHub.** Si la olvidas, vuelve a ejecutar la función del paso 2 con una contraseña nueva.
5. El login y el mantenimiento (§24 y §25 del checklist) quedan bloqueados sin sesión: sin haber hecho login, la página no debe dejar entrar a mantenimiento.

## 6) AppSheet: conectar a las hojas de Drive

1. Sigue [`guia-configuracion-appsheet.md`](guia-configuracion-appsheet.md) (checklist §26). Ahí están las hojas, las columnas y las vistas.
2. Abre [AppSheet](https://www.appsheet.com) con la misma cuenta de Google.
3. Crea una app nueva conectada al libro de hojas del paso 1 (las 5 hojas: `Bitacoras`, `Sesiones`, `Pendientes`, `Hitos`, `Puntaje`).
4. AppSheet lee y escribe en las **mismas hojas** que usa la página web; no crees hojas duplicadas.
5. El acceso a AppSheet se controla desde Apps Script / tu cuenta Google (D10): llena `CUENTAS_AUTORIZADAS_APPSHEET` en `Codigo.gs` con los correos autorizados; la función `verificarCuentaAppSheet_(correo)` (y la acción `verificarAppSheet`) comprueba si un correo está en esa lista. Mientras la lista esté vacía, nadie está autorizado por esa vía. No compartas el libro con cuentas que no deban ver las bitácoras.

## 7) Verificación final

Con la página publicada y la URL de Apps Script puesta:

1. Abre la página en tu navegador (la URL de GitHub Pages del paso 2).
2. Haz **login** con la contraseña del paso 5. Comprueba que sin la contraseña no entras a mantenimiento. (C5: la lectura de Drive también exige sesión; sin login la página solo muestra los datos locales.)
3. En **Mantenimiento → Agregar proyecto**, crea un proyecto de prueba. Debe aparecer seleccionado y en el selector; comprueba en Drive `Bitacoras/Proyectos/<folio>/` y el libro `Bitacoras` dentro de `Proyectos/`.
4. Crea una sesión en ese proyecto y recarga la página. Debe seguir visible; comprueba que su `bitacora.json`, la carpeta `Evidencias/` y las hojas se actualizaron.
5. Haz las pruebas de creación, sincronización y conflicto descritas en [Validación de Bitácoras](../../README.md#validación-de-bitácoras), además de comprobar calendario y exportaciones.

Si algo falla, anota en qué paso, con qué proyecto y qué mensaje apareció. Confirma que el nuevo `index.html` está publicado en GitHub Pages y que `Codigo.gs` está implementado como nueva versión; la URL `/exec` debe seguir pegada en `CONFIG.appsScriptUrl`.

---

## Tabla de placeholders

| Placeholder | Qué poner | Dónde va |
|---|---|---|
| `TU_URL_APPS_SCRIPT_AQUI` | La URL `/exec` del despliegue Web App de Apps Script (paso 3) | En `index.html`, en un solo lugar: `CONFIG.appsScriptUrl` |
| `TU_CONTRASENA_AQUI` | Tu contraseña web, al ejecutar la función indicada en `Codigo.gs` | Solo como argumento de esa función; se guarda como hash en Script Properties. **Nunca en el HTML, ni en Drive como texto, ni en GitHub** |
| `TU_REPO_AQUI` | El nombre de tu repositorio de GitHub (sugerencia: `bitacoras`) | En el nombre del repo y en la URL de GitHub Pages: `https://TU_USUARIO.github.io/TU_REPO_AQUI/` |

## Versión

**v1 — 2026-11-18.**

## 8) Ciclo y folios de proyecto (v4)

- Los proyectos llevan un folio `CICLO-NN` (p. ej. `20271-01`). El ciclo
  vigente se cambia en la página, en **Mantenimiento → Ciclo y folios**,
  con el campo «Nuevo ciclo» (solo dígitos, 4-6 caracteres). Al cambiarlo,
  el contador se reinicia en 01 automáticamente y los folios del ciclo
  anterior no cambian.
- Se guarda en Drive en `Bitacoras/config-ciclo.json` (ciclo, siguiente,
  usados e historial por ciclo) y los folios en `INDICE-bitacoras.json`
  (acción `guardarConfigCiclo_` en `Codigo.gs`). Sin Apps Script, el ciclo
  solo vive en el navegador (localStorage).

## 9) Limpiar datos de ejemplo anteriores (v4)

- La página ya no siembra ejemplos automáticamente. Si quedan registros de
  pruebas anteriores, entra a **Mantenimiento → Datos de ejemplo anteriores
  → Borrar datos de ejemplo** y confirma dos veces. Elimina solo registros
  marcados como ejemplo en este navegador y, con Apps Script, en Drive; no
  toca registros reales.

## 10) Agregar proyectos desde la página

- Inicia sesión, abre **Mantenimiento** y usa el apartado **Agregar proyecto**.
  Escribe el nombre, elige un color y pulsa **Agregar proyecto**. El hashtag
  se genera a partir del nombre y el sistema asigna el siguiente folio.
- Sin Apps Script, el proyecto se conserva en el `localStorage` de ese
  navegador; exporta un respaldo JSON para moverlo a otro navegador.
- Con Apps Script, se registra en `INDICE-bitacoras.json` y se crea en Drive
  en `Bitacoras/Proyectos/` una carpeta `CICLO-NN` (por ejemplo, `20271-01`)
  con su bitácora vacía, ficha, plantilla, formato y `Evidencias/`. El libro
  `Bitacoras` queda en esa misma carpeta; si ya existía fuera, se mueve y se
  reutiliza. Los proyectos heredados se ocultan, pero sus archivos no se
  borran. La sesión acepta el tipo `Online`, captura acuerdos
  en un cuadro de texto y permite elegir entre cuatro prellenados editables
  para el cuadro de contenido de siete filas.
  No se edita el índice manualmente. Para habilitarlo en una instalación
  existente, publica el nuevo `index.html` en GitHub Pages y actualiza
  `Codigo.gs` como una nueva versión del despliegue existente (se conserva
  la URL `/exec`). Después, recarga la página sin caché.

- Para cerrar un proyecto, selecciónalo en el filtro, abre **Mantenimiento**,
  escribe exactamente `CERRAR` y pulsa **Cerrar proyecto definitivamente**.
  El cierre es irreversible: conserva la lectura y las descargas, pero el
  servidor bloquea futuras modificaciones. El hashtag se libera; un proyecto
  nuevo recibe otro folio, carpeta y `slug`, mientras el anterior permanece
  intacto. Si hay hashtags repetidos, el selector muestra también el folio.
  Esta protección requiere Apps Script conectado.

- Los informes aplican «Información» como plantilla predeterminada; un formato
  JSON guardado por proyecto puede cambiar el orden de secciones/campos y se
  reutiliza en sus exportaciones Word y PDF. Word se descarga como `.docx`
  OOXML real, con cada foto como imagen incrustada dentro del paquete. PDF se
  genera en tamaño carta, con cuatro fotos por página (2×2). Las imágenes se
  descargan y validan antes de construir el archivo; si alguna falla, se
  cancela la exportación. Los archivos se descargan en el navegador y no se
  guardan automáticamente en Drive.

## 11) Token de servicio para Muse

Este token permite a Muse llamar al Web App sin la contraseña web. Es una
credencial de portador: quien lo tenga puede ejecutar las acciones permitidas
abajo. No lo pegues en esta guía, en un chat, ni en ningún archivo del repo.

1. Copia el `Codigo.gs` actualizado a tu proyecto de Apps Script y guarda.
2. Ve a **Deploy → Manage deployments → Edit** en la implementación existente,
   selecciona **New version** y despliega. La URL `/exec` no cambia.
3. En el editor de Apps Script, selecciona `generarTokenServicioMuse` en la
   lista de funciones y pulsa **Run / Ejecutar**. Autoriza los permisos si
   Google lo solicita.
4. Abre **View → Logs** (o los registros de ejecución) y copia el token que
   aparece en el mensaje de `generarTokenServicioMuse`. Se muestra una sola
   vez; no puede recuperarse del proyecto. Si se pierde, genera uno nuevo.
5. Entrega el token a Muse únicamente por el mecanismo seguro de secretos
   configurado para el asistente; **nunca por chat ni en una petición normal
   de WhatsApp**.
   `doPost` acepta el token en el cuerpo JSON o, para integraciones que no
   pueden enviar cuerpo/cabecera, en el parámetro de consulta `?token=...`.
   Los tokens en URL pueden quedar en registros o historiales; usa esa vía solo
   mediante un gestor seguro de secretos y evita copiar, registrar o compartir
   la URL. `doGet` no autentica acciones con ese parámetro; la web sigue
   enviando su token en el cuerpo.
6. Para revocarlo, selecciona `revocarTokenServicioMuse` en el editor y pulsa
   **Run / Ejecutar**. La revocación es inmediata. Generar otro token también
   reemplaza e invalida el anterior.
7. El token de servicio solo puede ejecutar:
   `leer`, `leerProyecto`, `guardarSesion`, `guardarPendiente`,
   `cerrarPendiente`, `guardarHito`, `subirEvidencia`, `crearProyecto`,
   `guardar`, `verEvidencia` y `registrarPuntaje`.
   No puede ejecutar `login`, `cambiarPassword`, `crearEstructura`,
   `guardarConfigCiclo`, `verificarEstructura`, ni acciones de edición o
   borrado fuera de la lista permitida. La acción `guardar` fusiona registros
   por `id`: los nuevos se agregan y los existentes se actualizan preservando
   propiedades y elementos no enviados; los valores omitidos, nulos o vacíos
   tampoco borran el valor previo. Si se omite una sesión, pendiente, hito o
   puntaje, se conserva en Drive. Para
   eliminar datos se requiere la sesión web normal; el token de Muse no puede
   hacerlo. La sincronización rechaza las colecciones que no sean arreglos o
   los registros que no incluyan `id`.

La página web no utiliza este token: su login continúa usando tokens de sesión
con vigencia de **6 horas**. El token de servicio no caduca por tiempo ni se
invalida al cambiar la contraseña web; solo se invalida al revocarlo o
reemplazarlo. Como alternativa avanzada, `fijarTokenServicioMuse()` permite
definir un token propio; después de ejecutarla, borra inmediatamente el valor
temporal del código.
