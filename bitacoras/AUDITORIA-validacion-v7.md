# Auditoría de validación v7 — Token de servicio Muse

**Fecha:** 2026-11-19  
**Proyecto:** `bitacoras/`  
**Resultado general:** implementación revisada estáticamente; pruebas de ejecución solicitadas pendientes por falta de Node.js y jsdom en el entorno.

## Alcance revisado

- `Codigo.gs`: generación, hash, validación, autorización y revocación del token; despacho de acciones y sincronización `guardar`.
- `index.html`: comprobación de que la interfaz no incorpora el token de servicio.
- `README.md`, `CONFIGURACION.md` y `checklist-bitacora-web.md`: documentación del token, permisos y sesión web.
- `banco-peticiones.md` y `banco-peticiones.json`: autorización explícita requerida para `#nuevaBitacora`.

No se generó ni incluyó ningún token real.

## Funciones y comportamiento

Funciones nuevas:

- `generarTokenServicioMuse()`: genera dos UUID unidos, guarda el hash con sal en `MUSE_SERVICE_TOKEN_HASH` y registra el token una sola vez en el log.
- `fijarTokenServicioMuse()`: alternativa manual temporal; exige un token de al menos 32 caracteres y recuerda borrar el valor del código después de ejecutarla.
- `revocarTokenServicioMuse()`: elimina `MUSE_SERVICE_TOKEN_HASH`.
- `fusionarValorMuseSinBorrar_(actual, recibido)`: fusiona valores recursivamente sin borrar elementos existentes.
- `guardarBitacoraServicio_(datos)`: ruta no destructiva para la acción `guardar` autenticada con token de servicio.

`verificarToken_(token)` distingue `servicio`, `sesion` o `null`. El token de servicio no usa la época ni la expiración de sesión; el token web sigue usando `CONFIG.TOKEN_HORAS: 6`. El token no está presente en `index.html`.

### Acciones permitidas para Muse

`leer`, `leerProyecto`, `guardarSesion`, `guardarPendiente`, `cerrarPendiente`, `guardarHito`, `subirEvidencia`, `crearProyecto`, `guardar`, `verEvidencia`, `registrarPuntaje`.

### Acciones prohibidas para Muse

Todas las acciones fuera de la lista permitida, entre ellas `login`, `cambiarPassword`, `crearEstructura`, `guardarConfigCiclo`, `verificarEstructura` y las acciones dedicadas para editar o borrar. Se rechazan antes del despacho con el mensaje `Acción no permitida con token de servicio`.

`guardar` agrega registros nuevos y fusiona registros existentes por `id`; conserva colecciones, registros y elementos de arreglos omitidos. Las propiedades ausentes, nulas o vacías no borran valores previos. Rechaza colecciones con tipo inválido y registros sin `id`. La sesión web conserva su flujo de guardado normal.

## Evidencia y pruebas

| Comprobación | Resultado | Evidencia / limitación |
|---|---|---|
| `node --check index.html` | **No ejecutada** | Node.js no está instalado ni disponible en `PATH`; PowerShell reportó que `node` no se reconoce. |
| `node --check Codigo.gs` | **No ejecutada** | Mismo bloqueo: Node.js no disponible. |
| Suite jsdom solicitada | **No ejecutada** | Node.js no disponible y no se encontraron archivos de pruebas `*.js` en `bitacoras/`. |
| Enrutamiento de sesión/evidencia con token de servicio | **No verificado dinámicamente** | Requiere ejecutar la suite con Apps Script simulado. |
| Rechazo de cambio de contraseña y creación de estructura | **No verificado dinámicamente** | La lista permitida y el rechazo previo al despacho fueron revisados en el código. |
| Token revocado e inventado | **No verificado dinámicamente** | Se revisó el flujo de validación y revocación en el código. |
| Sesión web de seis horas | **Revisado estáticamente** | `CONFIG.TOKEN_HORAS` permanece en `6`; `login_()` guarda el token con `CONFIG.TOKEN_HORAS * 3600`. |
| Apertura de `index.html` | **Comprobación visual parcial** | La página local abrió en el navegador integrado y mostró la vista sin sesión; no equivale a la suite jsdom ni a una prueba de consola de cero errores. |
| Carga sintáctica de `Codigo.gs` | **No verificada en la revisión final** | El navegador cargó una revisión anterior a la última función de fusión. No sustituye a `node --check` ni a las pruebas Apps Script. |
| JSON de índice, banco de peticiones y formato predeterminado | **Correctos** | Los tres archivos pasaron `ConvertFrom-Json`. |
| Token de servicio dentro de `index.html` | **No encontrado** | Búsqueda de `MUSE_SERVICE_TOKEN` y `TOKEN_DE_SERVICIO`: sin coincidencias. |
| Regresiones de suites anteriores | **No verificadas** | No se encontraron suites JS en la carpeta actual y no hay Node.js. |

No se afirma que las pruebas dinámicas requeridas hayan pasado.

## Addendum: organización de Drive

- La estructura nueva es `Bitacoras/Proyectos/Bitacoras` para el libro y `Bitacoras/Proyectos/<folio>/` para cada proyecto nuevo (por ejemplo, `20271-01`).
- `getProyectosFolder_()` busca `Proyectos/` antes de crearla. La creación del proyecto busca la carpeta del folio antes de crearla y valida que una carpeta existente no pertenezca a otro proyecto.
- `getHojaCalculo_()` busca primero el libro `Bitacoras` dentro de `Proyectos/`; si lo encuentra fuera, lo mueve y reutiliza. Solo crea el libro si no encuentra uno existente. También valida el nombre del libro guardado en `SHEET_ID`.
- Las carpetas de proyectos heredados se conservan en su ubicación actual y se siguen localizando por ID; no se movieron ni renombraron.
- `verificarEstructura_()` reporta si falta `Proyectos/`. Node.js sigue sin estar disponible, por lo que este cambio no pudo pasar `node --check` ni pruebas con Apps Script simulado.

## Versiones y archivos ZIP

No se encontraron fuentes históricas v1–v5. En este ajuste, el cambio se conserva en `bitacoras/`; no hay carpetas `programa-bitacoras-v1/` a `-v6/` ni ZIPs en el workspace. El usuario indicó que para cambios futuros ya no se generen ZIPs, por lo que no se intentará empaquetar este ajuste.

## Líneas finales de los archivos principales

- `index.html`: **1,891 líneas**. Final:
  ```html
  validarSesion().then(() => cargarDatos().then(renderTodo));
  </script>
  </body>
  </html>
  ```
- `Codigo.gs`: **2,136 líneas**. Final:
  ```js
   *    - Si falta algo, ejecutar crearEstructuraDesdeCero() de nuevo.
   * ============================================================================
   */
  ```

## Pasos para generar y entregar el token

1. Copiar el nuevo `Codigo.gs` al proyecto Apps Script del usuario y guardar.
2. Ir a **Deploy → Manage deployments → Edit**, seleccionar **New version** y desplegar; la URL `/exec` se conserva.
3. En el editor, elegir `generarTokenServicioMuse` y pulsar **Ejecutar**.
4. Copiar el token desde **View → Logs** en ese momento; no se vuelve a mostrar.
5. Entregarlo a Muse solo por el mecanismo seguro de secretos, nunca por chat ni en un archivo del repositorio.
6. Para revocarlo, ejecutar `revocarTokenServicioMuse`. Generar otro reemplaza e invalida el anterior.
7. El token de servicio no expira por tiempo ni cambia la vigencia del login web, que sigue siendo de **6 horas**.
