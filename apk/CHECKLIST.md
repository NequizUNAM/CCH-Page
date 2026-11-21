# Checklist maestro — APK Ionic CCH

## Objetivo

Convertir los dos proyectos web existentes en una sola aplicación Android:

1. **Asistencias CCH**: dashboard, grupos, asistencia, calificaciones, equipos, CRUD administrativo y exámenes.
2. **Bitácoras CCH**: proyectos, sesiones, pendientes, hitos, evidencias, puntaje CCH y edición masiva.

La aplicación conserva los proyectos como páginas web integradas en un WebView; no copia ni reescribe sus funcionalidades.

## Proyecto actual

- [x] Carpeta `apk/` creada.
- [ ] Ionic/Capacitor inicializado.
- [x] Archivos web del proyecto Asistencias copiados a `apk/www/asistencias/`.
- [x] Archivos web del proyecto Bitácoras copiados a `apk/www/bitacoras/`.
- [x] Pantalla inicial creada en `apk/www/index.html`.
- [x] Configuración de Capacitor creada.
- [ ] Permisos Android mínimos configurados.
- [ ] Plataforma Android creada.
- [ ] Aplicación probada en navegador.
- [ ] Aplicación probada en emulador o dispositivo.
- [ ] APK de prueba generado.
- [ ] APK firmado generado para distribución.

## Archivos a crear

| Archivo | Contenido |
|---|---|
| `package.json` | Dependencias, scripts de build y Capacitor. |
| `ionic.config.json` | Identificación de la app Ionic. |
| `capacitor.config.ts` | Nombre, identificador Android y configuración WebView. |
| `www/index.html` | Selector principal con Accesos a Asistencias y Bitácoras. |
| `www/manifest.webmanifest` | Nombre, colores e iconos PWA. |
| `www/asistencias/` | Copia funcional del proyecto raíz. |
| `www/bitacoras/` | Copia funcional del proyecto `bitacoras/`. |
| `README.md` | Instalación, configuración y compilación paso a paso. |
| `PASO-A-PASO.md` | Checklist operativo para Nequiz. |
| `android/` | Proyecto Android generado por Capacitor. |

## Funcionalidades de Asistencias

- [ ] Inicio de sesión de alumnos con número de cuenta.
- [ ] Consulta de asistencia, calificaciones, equipos y extracurriculares.
- [ ] Examen de Cibernética.
- [ ] Examen de Estadística.
- [ ] Panel administrativo.
- [ ] Gestión de grupos, alumnos y roles.
- [ ] Captura móvil de asistencia.
- [ ] Proyectos y calificación de equipos.
- [ ] Colas locales de sincronización del proyecto original.
- [ ] Preferencias del dispositivo.
- [ ] Indicador de sincronización.

## Funcionalidades de Bitácoras

- [ ] Login web y mantenimiento.
- [ ] Múltiples proyectos.
- [ ] Proyectos nuevos con carpetas `CICLO-NN-NombreHashtag`.
- [ ] Colores distintos por proyecto.
- [ ] Sesiones, asistentes, acuerdos y evidencias.
- [ ] Pendientes por responsable y fecha.
- [ ] Hitos y calendario.
- [ ] Puntaje CCH por rubro y actividad.
- [ ] Recarga por proyecto con bloqueo de 60 segundos.
- [ ] Edición masiva de sesiones.
- [ ] Exportaciones disponibles en la página web.
- [ ] Cola local de sincronización y datos `sin_sync`.

## Verificaciones antes de compilar

- [ ] Actualizar el despliegue Apps Script de Asistencias.
- [ ] Publicar una nueva versión Apps Script de Bitácoras.
- [ ] Confirmar las URLs `/exec` dentro de ambos proyectos.
- [ ] Confirmar que las conexiones HTTPS funcionan desde Android.
- [ ] Confirmar permisos de cámara, fotografías y archivos.
- [ ] Eliminar del proyecto APK cualquier contraseña o token real.
- [ ] Probar cada enlace desde la pantalla inicial.
- [ ] Probar login, lectura, escritura y sincronización.
- [ ] Probar imágenes y documentos en Android.

## Fuera del alcance inicial

- Reescribir los dos programas en Angular/React.
- Compartir un login entre los proyectos.
- Mezclar las bases de datos Drive.
- Convertir sin cambios los datos locales de navegador a almacenamiento nativo.
