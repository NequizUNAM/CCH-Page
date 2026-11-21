# Guía de configuración — AppSheet para Bitácoras / Minutas

**Fecha:** 2026-11-18
**Objetivo:** llenar los formularios de bitácoras desde AppSheet (móvil) y desde la página web, con las mismas hojas de Drive como fuente. El acceso por AppSheet se controla desde Apps Script / la cuenta de Google; el acceso por la web usa una contraseña aparte (§25 del checklist).

**Regla de seguridad:** la contraseña web se guarda en Drive en un archivo de configuración, en forma protegida (hash), nunca en texto plano dentro del HTML publicado ni en AppSheet. Cambiar la contraseña web no cambia el acceso de AppSheet, y viceversa.

---

## 1. Qué necesitas antes de empezar

- [ ] Cuenta de Google con Drive (la misma que usa el programa)
- [ ] Estructura creada desde cero en Mantenimiento (§24 del checklist): carpeta `Bitacoras/`, hojas de Drive y `bitacoras.json`
- [ ] Apps Script Web App del programa (backend que lee/escribe Drive)
- [ ] AppSheet: https://www.appsheet.com — entrar con la misma cuenta de Google

## 2. Hojas de Drive (la misma fuente para web y AppSheet)

Crearlas desde Mantenimiento, o a mano en Drive, una hoja por tabla (5 hojas):

| Hoja (nombre exacto) | Columnas |
|---|---|
| `Bitacoras` | slug, hashtag, nombre, color, estado, drive_folder, bitacora_json |
| `Sesiones` | id, slug, fecha, titulo, tipo, texto, asistentes, acuerdos, plantilla_version |
| `Pendientes` | id, sesion_id, slug, texto, responsable, fecha_compromiso, prioridad, estado, minuta_origen |
| `Hitos` | id, slug, titulo, fecha, descripcion, estado, fecha_cierre |
| `Puntaje` | id, slug, rubro, actividad, nivel, puntos, alcance, constancia, dictamen, periodo, categoria_objetivo |

- La primera fila es el encabezado, con esos nombres exactos, sin acentos en los nombres de columna.
- No crear una base aparte en AppSheet: AppSheet lee estas hojas.

## 3. Crear la app en AppSheet (paso a paso)

1. En https://www.appsheet.com, **Create > Start with your data**, elige Google Sheets y la hoja `Bitacoras` (o la carpeta `Bitacoras/`).
2. AppSheet crea la app con la tabla `Bitacoras`. Agrega las demás tablas: **Data > Tables > + New Table**, una por cada hoja de arriba, con la misma hoja de Drive como fuente.
3. En cada tabla, revisa los tipos: `fecha` y `fecha_compromiso` como Date, `foto_url` como Image, `puntos` como Number, `estado` como Enum (Pendiente / En proceso / Hecho / Vencido).
4. **Claves:** `id` como Key en Sesiones, Pendientes, Hitos y Puntaje; `slug` como Key en Bitacoras.
5. **Referencias:** `Pendientes.sesion_id` referencia a `Sesiones.id`; `Sesiones.slug`, `Pendientes.slug`, `Hitos.slug` y `Puntaje.slug` referencian a `Bitacoras.slug`. Así, en AppSheet se ve la sesión con sus pendientes.

## 4. Formularios (vistas Form)

Crear una vista Form por cada acción, con los mismos campos que en la web:

| Formulario | Tabla | Campos principales |
|---|---|---|
| Nueva sesión | Sesiones | slug (lista de proyectos por hashtag), fecha (hoy por defecto), titulo, tipo, texto, asistentes, acuerdos |
| Nuevo pendiente | Pendientes | slug, texto, responsable, fecha_compromiso, prioridad, estado |
| Nuevo hito | Hitos | slug, titulo, fecha, descripcion, estado |
| Registrar actividad de puntaje | Puntaje | slug, rubro (I–VI), actividad (lista del glosario v2), glosario_id (gl-xxx), nivel, puntos (calculado), alcance, constancia, dictamen, periodo |

- En **Nueva sesión**, el primer campo es el proyecto por hashtag (`#Estadistica2`, etc.); sin hashtag no se guarda, igual que en la web.

## 5. Vistas para consultar

- **Bitácoras:** Deck por proyecto, con contador de pendientes.
- **Calendario:** vista Calendar sobre Sesiones por `fecha`, y sobre Hitos.
- **Pendientes:** vista Table filtrada por estado, con «solo vencidos».

## 6. Acceso y seguridad — AppSheet vs web (no mezclar)

| Vía | Cómo se controla el acceso | Contraseña |
|---|---|---|
| **AppSheet** | Desde Apps Script y la cuenta de Google: en AppSheet, **Security > Require sign-in**, solo las cuentas autorizadas; y en el Apps Script Web App, lista de remitentes/cuentas autorizadas. Quien no está autorizado no abre la app ni escribe. | La de Google / AppSheet. No hay contraseña aparte dentro de AppSheet. |
| **Página web** | Contraseña propia de la web, guardada en Drive en configuración (hash, no en el HTML). La valida el Apps Script Web App. | Contraseña web, distinta de la de Google. Cambiarla no afecta a AppSheet. |

- Nunca pongas la contraseña web en el HTML publicado, ni en una hoja que AppSheet muestre, ni en texto plano en Drive.
- Para cambiar la contraseña web: Mantenimiento → Cambio de contraseña, con la contraseña actual.

## 7. Sincronización web ↔ AppSheet

- Ambas leen y escriben las mismas hojas y el mismo `bitacoras.json` en Drive, por eso lo que se llena en AppSheet aparece en la web al recargar, y viceversa.
- AppSheet sincroniza al guardar cada formulario (botón Sync si hace falta). La web lee al abrirse.
- Si dos personas editan lo mismo a la vez, gana el último guardado; por eso el campo `id` es único por sesión/pendiente/hito.

## 8. Prueba antes de usarlo a diario

- [ ] Llenar una sesión en AppSheet y verla en la web al recargar.
- [ ] Llenar un pendiente en la web y verlo en AppSheet al sincronizar.
- [ ] Probar que sin sesión en la web no se ven Mantenimiento ni los botones de crear/editar.
- [ ] Probar que una cuenta no autorizada no abre la app de AppSheet.

## 9. Mantenimiento desde cero (resumen)

En la web, con sesión iniciada: **Mantenimiento → Crear estructura desde cero**. Crea carpeta, índice, plantillas, hojas y `Evidencias/`; si algo ya existe, lo muestra y crea solo lo que falta. Antes de recrear, usa **Respaldar** (exporta JSON completo).

## Referencias

- AppSheet (crear app): https://www.appsheet.com
- AppSheet — ayuda oficial: https://support.google.com/appsheet
- Protocolo de Equivalencias 2020 (PDF oficial): https://gaceta.cch.unam.mx/sites/default/files/2025-12/protocolo_equivalencias_ingreso_promocion_.pdf
- Instructivo de Asignación de Horarios 2023 (PDF oficial): https://gaceta.cch.unam.mx/sites/default/files/2023-03/suplemento_horario.pdf
- Lista jerarquizada: http://trayectoria.cch.unam.mx
