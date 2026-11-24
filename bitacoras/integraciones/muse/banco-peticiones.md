# Banco de peticiones — comandos por hashtag

**Reglas generales (2026-11-17)**
- Todos los hashtags van en CamelCase, sin espacios y **sin acentos**: `#nuevaBitacora`, no `#nuevaBitácora`.
- El primer hashtag del mensaje manda: si es un proyecto (`#Estadistica2`), se escribe ahí; si es un comando (`#nuevaBitacora`), se hace lo que dice el comando.
- **Un proyecto nuevo NUNCA se crea solo.** `#nuevaBitacora` prepara la propuesta; Nequiz debe autorizarla explícitamente. Tener token de servicio no cuenta como autorización.
- Si falta el hashtag de proyecto o no está en el índice, Muse pregunta; no adivina.
- Cada comando devuelve una confirmación con lo que se guardó y su ID.

## 1. Proyectos — requieren autorización de Nequiz

| Comando | Qué hace | Sintaxis | Ejemplo |
|---|---|---|---|
| `#nuevaBitacora` | Prepara un proyecto nuevo: propone hashtag, slug, carpeta en Drive, ficha y plantilla. Aunque Muse use token de servicio, **no crea nada hasta que Nequiz lo autorice explícitamente**. | `#nuevaBitacora NombreEnCamelCase` | `#nuevaBitacora ControlDeCalidad` |
| `#listarBitacoras` | Lista todos los proyectos con su hashtag, slug y pendientes abiertos. | `#listarBitacoras` | `#listarBitacoras` |
| `#verBitacora` | Muestra el resumen de un proyecto: sesiones, pendientes abiertos y próximos hitos. | `#verBitacora #Proyecto` | `#verBitacora #Estadistica2` |
| `#archivarBitacora` | Pide archivar un proyecto. Solo se archiva con confirmación de Nequiz. | `#archivarBitacora #Proyecto` | `#archivarBitacora #MoodleDgtic` |
| `#plantilla` | Devuelve la plantilla para copiar y llenar de ese proyecto. | `#plantilla #Proyecto` | `#plantilla #Estadistica2` |

## 2. Sesiones y minutas

| Comando | Qué hace | Sintaxis | Ejemplo |
|---|---|---|---|
| `#nuevaSesion` | Crea una sesión/minuta en ese proyecto, con fecha actual por defecto. | `#Proyecto` + `#nuevaSesion` + título y texto | `#Estadistica2 #nuevaSesion Revision Unidad 1` |
| `#agregarAcuerdo` | Agrega un acuerdo a la última sesión (o a la sesión indicada) y lo convierte en pendiente si trae responsable y fecha. | `#Proyecto #agregarAcuerdo texto — responsable — fecha` | `#Estadistica2 #agregarAcuerdo Revisar ejercicios 5 y 6 — Nequiz — 2026-11-20` |
| `#agregarEvidencia` | Adjunta una foto o archivo como evidencia a la sesión indicada. La foto va a `Evidencias/` en Drive. | `#Proyecto #agregarEvidencia` + foto con pie | `#CchPage #agregarEvidencia` + foto |
| `#verSesiones` | Lista las últimas sesiones de ese proyecto. | `#verSesiones #Proyecto` | `#verSesiones #CchPage` |

## 3. Pendientes y hitos

| Comando | Qué hace | Sintaxis | Ejemplo |
|---|---|---|---|
| `#nuevoPendiente` | Crea un pendiente con responsable y fecha compromiso. | `#Proyecto #nuevoPendiente texto — responsable — fecha` | `#ControlFacturas #nuevoPendiente Pagar folio F-001 — Nequiz — 2026-11-20` |
| `#verPendientes` | Lista pendientes abiertos de ese proyecto (o de todos, si no se indica proyecto). | `#verPendientes #Proyecto` | `#verPendientes #Estadistica2` |
| `#cerrarPendiente` | Marca un pendiente como hecho, con fecha de cierre. Necesita el ID o el texto exacto del pendiente. | `#Proyecto #cerrarPendiente ID` | `#Estadistica2 #cerrarPendiente estadistica-2-2026-11-17-001` |
| `#nuevoHito` | Crea un hito con fecha en ese proyecto. | `#Proyecto #nuevoHito titulo — fecha` | `#CchPage #nuevoHito Entrega v7.2 — 2026-11-25` |
| `#verHitos` | Lista los hitos de ese proyecto y su avance. | `#verHitos #Proyecto` | `#verHitos #CchPage` |

## 4. Ayuda y consulta

| Comando | Qué hace | Sintaxis | Ejemplo |
|---|---|---|---|
| `#ayuda` | Devuelve este banco de peticiones, resumido. | `#ayuda` | `#ayuda` |
| `#ayudaProyecto` | Devuelve la ficha y los campos propios de ese proyecto. | `#ayudaProyecto #Proyecto` | `#ayudaProyecto #ControlFacturas` |

## Flujo de autorización para un proyecto nuevo

1. Tú mandas: `#nuevaBitacora ControlDeCalidad`
2. Muse responde con la propuesta (hashtag `#ControlDeCalidad`, slug `control-de-calidad`, carpeta, campos propios sugeridos) y **no crea nada**.
3. Tú confirmas (o corriges el nombre / los campos).
4. Muse crea: carpeta en Drive, `bitacora.json`, `ficha.md`, `plantilla-sesion.json` y lo agrega al índice.
5. Muse confirma con el hashtag ya activo para usarlo.

---
Versión: 3 (2026-11-18, 16 comandos, se quitó #firma). Archivo JSON con la misma lista en `banco-peticiones.json`, en esta misma carpeta.
