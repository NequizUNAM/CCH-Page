# CCH-Page

Dashboard dedicado a reportes y listas CCH.

En los paneles de Cibernética y Estadística, la pestaña **Editar preguntas** permite cambiar enunciados, opciones y la respuesta correcta de reactivos de opción múltiple. Los cambios se guardan por materia y parcial, recalculan la calificación en los intentos nuevos y no modifican exámenes que ya están en curso. Después de actualizar Apps Script, publica una nueva versión de la implementación para habilitar estas funciones.

## Indicadores de carga y recargas

Las lecturas se mantienen en paralelo y las solicitudes de lectura repetidas se comparten. El panel y las fichas muestran primero la última información guardada localmente cuando está disponible, mientras actualizan los datos en segundo plano. Los loaders indican las cargas que no tienen una copia local.

Los guardados y eliminaciones se muestran en el indicador de sincronización de la barra superior mientras esperan o se procesan. Si una solicitud permanece pendiente más de cinco minutos, se muestra un aviso; no se confirma como guardada hasta recibir respuesta del servidor.

## Cola de sincronización

Las escrituras se procesan en orden FIFO, una a la vez. La cola se conserva en IndexedDB para sobrevivir a una recarga o cierre de la página. Las solicitudes con errores de conexión se reintentan con espera incremental y se mantienen al inicio de la cola para conservar el orden; las consultas de datos no esperan a la cola.

Cada escritura lleva un identificador idempotente que Apps Script conserva temporalmente para reconocer reintentos. La cola de un alumno solo se reanuda con la misma cuenta. La sesión debe seguir activa para que la cola envíe solicitudes protegidas; por eso no se permite cerrar sesión mientras haya escrituras pendientes.
