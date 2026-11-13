# CCH-Page v7.0 — Cambios

Fecha: 2026-11-13. Archivos tocados: `script.js`, `estilo.css`, `MIGRACION.md`.
Sin cambios en Apps Script (`Codigo.gs`, `Examenes.gs`): no hay que republicar el Web App.
Solo hay que subir `index.html`, `estilo.css` y `script.js` a GitHub (los demás archivos van igual).

## 1. UX (solo presentación, misma lógica y mismos colores)
- En las tablas anchas (Asistencia, Captura, Pase de lista y la vista previa de PSI) la columna **Nombre queda fija** al desplazar a la derecha, junto a Cuenta. Antes solo Cuenta era fija y se perdía el nombre entre tantas fechas.
- La búsqueda de la barra de herramientas crece y los botones ya no se amontonan en celular.
- En la ficha, las 4 cifras (promedio, asistencia, faltas, justif.) pasan a 2 columnas en celular.
- Modales con más respiro; el hover de las filas ya se ve también en las columnas fijas.
- No se cambió el fondo ni la paleta (sigue el azul marino + violeta del Dashboard).

## 2. Pasar asistencia desde la ficha
- Arriba de la tira de asistencia: **«Pasar asistencia:»** con fecha (hoy por defecto, sin fechas futuras) y botones ✓ ✗ J (y R si usas Retardo). Guarda esa marca para ese alumno; si la fecha aún no tiene columna, la crea en el Reporte_ y en Attendance Log.
- **Tocar cualquier fecha de la tira** abre un editor para cambiar su marca (✓ ✗ J, o quitarla). Para justificar una falta, elige J. La tabla detrás del modal y la ficha se actualizan solas, sin volver a pedir todo el grupo.
- Antes solo se podía justificar una ✗ tocándola.

## 3. Exportar a PSI cuando es parcial (bug corregido)
- Causa: el Avance siempre salía del promedio general (`s.final`), aunque el registro fuera Parcial, porque el selector de Tipo nunca llegaba al cálculo. Comprobado en v6.9: alumno con Parcial 1 = 8 y Parcial 2 = 6 exportaba 7; alumno con solo Parcial 1 = 9 y sin promedio exportaba vacío (PSI no recibía nada).
- Ahora hay un selector **«Calificación a exportar (Avance)»**: elige el parcial (Parcial 1, 2, 3…) o «Promedio actual». Con un parcial elegido, Avance, riesgo y derivación salen de ese parcial. Al cambiar el Tipo a Parcial se elige solo el primer parcial con calificaciones; en Final vuelve al promedio.
- La vista previa avisa cuántos alumnos **no tienen calificación en ese parcial** (su avance quedará vacío) y el JS generado lo repite en la consola de PSI.
- El JS generado detecta solo el prefijo de las listas de calificación de PSI (`c_`, `p_`, `parcial_`, `cal_`, `cp_`): si la captura parcial usa otro prefijo, lo avisa en la consola en lugar de no llenar nada en silencio.
- El texto de reglas ya no dice «promedio actual redondeado»: es entero sin redondear, 5–10.

## 4. Caché y paginación (menos peticiones, sin perder el lugar)
- Ya existía caché de boot/grupo (12 h, muestra lo guardado y actualiza en segundo plano). Fallos corregidos:
  - Cualquier guardado borraba la caché de TODOS los grupos → ahora solo se invalida el grupo tocado (y la ficha del alumno marcado).
  - La ficha se pedía completa cada vez que se abría → ahora queda en caché 15 min (se muestra al instante y se refresca en segundo plano).
  - Si se llenaba el almacenamiento, se borraba toda la caché → ahora se expulsa solo lo más viejo.
  - La caché de una versión anterior se seguía mostrando → ahora se ignora (versión 7.0).
  - Lecturas repetidas en vuelo (doble clic en Recargar) hacían dos peticiones → ahora comparten una sola.
  - `examAdmin` y `examLinks` no estaban marcados como lectura y el primero borraba la caché de grupos al abrir el panel de exámenes → ya están marcados.
- Al revisar una tabla larga, si llega una actualización en segundo plano ya **no se pierde el desplazamiento ni la búsqueda** escrita (Asistencia y Captura conservan su búsqueda al re-renderizar).
- Las pestañas y los grupos se siguen sirviendo de lo guardado; el refresco de fondo es una sola petición por grupo.

## Pruebas
- `node --check` OK; CSS con llaves balanceadas.
- 34 comprobaciones automáticas en jsdom con servidor simulado (sin tocar tu hoja real): PSI parcial (8 y no 7; 9 sin promedio; aviso de sin calificación), detección de prefijo `p_`, caché (versión, caducidad, invalidación selectiva, dedup), ficha (caché, editor ✓ sobre ✗, barra de hoy).
- Página abierta en navegador real (vista de inicio, sin entrar al panel): por confirmar en el reporte del navegador.
- Pendiente de tu prueba en vivo: abrir un grupo real, exportar un PSI parcial y pasar asistencia desde una ficha.
