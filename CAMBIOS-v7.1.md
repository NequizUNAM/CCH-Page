# CCH-Page v7.1 — Cambios

Fecha: 2026-11-13. Archivos tocados: `script.js`, `estilo.css`, `MIGRACION.md`.
Sin cambios en Apps Script (`Codigo.gs`, `Examenes.gs`): no hay que republicar el Web App.
Solo hay que subir `index.html`, `estilo.css` y `script.js` a GitHub (los demás archivos van igual).
Todo lo de la v7.0 sigue: asistencia desde la ficha, PSI parcial, caché y Nombre fijo.

## A. Columna de riesgo (⚠) + % asistencia en Asistencia
- Nueva columna ⚠ después de Nombre con un punto por fila: **rojo** = riesgo alto (promedio menor a 6, más de 4 faltas o 3 faltas seguidas), **ámbar** = atención (promedio 6–6.9, 4 faltas, 2 faltas seguidas o menos de 80% de asistencia). El tooltip del punto dice el motivo.
- Nueva columna **%** después de J: asistencias ÷ (asistencias + faltas). Vacía si aún no hay lista.
- Son los mismos umbrales que usa PSI para el riesgo, así que lo que ves en la tabla es lo que se exporta. No se toca el backend: todo se calcula con los datos del grupo ya cargado.

## B. Filtros de triaje «Necesitan atención»
- Sobre la tabla, cuatro chips con su conteo: **Todos**, **En riesgo**, **+4 faltas**, **Sin calificar parcial**. Filtran las filas en el cliente, sin pedir nada al servidor, y se combinan con la búsqueda.
- «Sin calificar parcial» busca alumnos sin calificación en algún parcial; si el grupo no tiene parciales definidos en Ponderaciones, el chip queda deshabilitado y su conteo en 0.
- El filtro elegido se conserva al cambiar de pestaña y volver (como la búsqueda); al cambiar de grupo se aplica al grupo nuevo.

## C. Leyenda colapsable
- Las dos leyendas (estados y enlaces) ya no ocupan dos filas fijas junto a la barra: están detrás del botón **«Leyenda»**, colapsadas por defecto. La tabla sube unos 60 px y hay más filas visibles.

## D. Ficha: resumen de atención + secciones plegables. Captura: resultado fijo
- Al abrir la ficha, arriba del detalle del grupo aparece una franja de atención: **En riesgo / Atención / Sin riesgo aparente**, con el motivo, promedio, % de asistencia, faltas y la derivación que sugeriría PSI (ej.: «PSI: Dejó de asistir · riesgo alto»). Se actualiza al cambiar de grupo y al pasar asistencia.
- **Comentarios** sigue abierto (ahí está el formulario). **Evidencias**, **Inscripciones** y **Ciclos anteriores** arrancan cerrados: se despliegan tocando el título.
- En **Captura**, las columnas **Final, Estricta y Entera** quedan fijas a la derecha al desplazar: el resultado ya no se pierde entre los componentes.

## Pruebas
- `node --check` OK; CSS con llaves balanceadas (260/260).
- 64 comprobaciones automáticas en jsdom con servidor simulado (sin tocar tu hoja real): las 34 de la v7.0 (PSI parcial, caché, ficha y pasar asistencia) más 30 nuevas — puntos de riesgo (rojo/ámbar/sin punto), % (89% y 40%), chips y sus conteos, cada filtro (2, 1, 1 y 5 filas), leyenda colapsada y su toggle, chip deshabilitado sin parciales, Final/Entera fijas en Captura, y la franja de atención de la ficha (dice «Atención» con 2 faltas seguidas, incluye la derivación PSI) con las 4 secciones plegables (Comentarios abierto, las demás cerradas).
- Pendiente de tu prueba en vivo: abrir un grupo real y probar un chip de triaje, abrir una ficha en riesgo y desplazar Captura hasta el final.
