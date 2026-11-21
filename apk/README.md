# CCH Proyectos — APK con Ionic y Capacitor

Este proyecto convierte en una aplicación Android las dos páginas existentes:

- `www/asistencias/`: Dashboard CCH, asistencia, calificaciones, equipos y exámenes.
- `www/bitacoras/`: Bitácoras, proyectos, pendientes, hitos, evidencias y puntaje CCH.

No reemplaza la interfaz web ni reescribe sus programas. Capacitor carga ambos proyectos dentro de Android; sus scripts, hojas y Apps Script siguen funcionando mediante HTTPS.

## Qué contiene la carpeta

```text
apk/
├── CHECKLIST.md
├── PASO-A-PASO.md
├── README.md
├── package.json
├── ionic.config.json
├── capacitor.config.ts
├── vite.config.ts
└── www/
    ├── index.html
    ├── manifest.webmanifest
    ├── asistencias/
    └── bitacoras/
```

## Requisitos en Windows

1. Node.js LTS 20 o 22.
2. Android Studio actualizado.
3. Android SDK Platform 35 o superior.
4. Android SDK Build-Tools.
5. Android SDK Command-line Tools.
6. Java 21 si Android Studio lo requiere; usa el JDK incluido por Android Studio.
7. Un dispositivo Android o un emulador configurado.

Durante la instalación de Android Studio activa al menos:

- Android SDK Platform
- Android SDK Build-Tools
- Android SDK Command-line Tools
- Android Emulator
- Android SDK Platform-Tools

## 1. Instalar dependencias

Abre PowerShell dentro de esta carpeta:

```powershell
cd C:\xampp\htdocs\CCH-Page\apk
npm install
```

## 2. Revisar las conexiones

Antes de compilar:

- Verifica la URL `/exec` de Apps Script del proyecto de Asistencias.
- Verifica la URL `/exec` de Apps Script de Bitácoras.
- Publica una nueva versión de Apps Script si cambiaron sus archivos.
- Usa siempre URLs `https://`; no uses `http://` para la aplicación.

No guardes contraseñas ni tokens reales dentro de los HTML. Las propiedades administrativas deben permanecer en Apps Script.

## 3. Crear Android

```powershell
npm run build
npx cap add android
npm run android:sync
npm run android:open
```

La última orden abre el proyecto en Android Studio.

## 4. Configurar el nombre del paquete

El identificador configurado es:

```text
mx.unam.cch.proyectos
```

Si ya usaste ese identificador o necesitas uno distinto, cambia `appId` en `capacitor.config.ts` antes de ejecutar `cap add android`:

```text
appId: 'mx.unam.cch.otroNombre'
```

No cambies el identificador después de publicar la aplicación.

## 5. Probar en el navegador

```powershell
npm run dev
```

Abre la dirección que muestre Vite, normalmente `http://localhost:5173/`.

Prueba:

- Pantalla inicial.
- Entrada a Asistencias.
- Entrada a Bitácoras.
- Inicio de sesión.
- Lectura y guardado.
- Exámenes.
- Evidencias, archivos y imágenes.

## 6. Probar en Android

Desde Android Studio:

1. Conecta un teléfono por USB y activa Depuración USB.
2. Selecciona el teléfono o crea un emulador.
3. Pulsa el botón Run.

También puedes ejecutar:

```powershell
npm run android:debug
```

## 7. Crear el APK de prueba

Desde esta carpeta:

```powershell
npm run android:apk
```

La ruta habitual será:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

Ese APK sirve para pruebas. Android puede pedir permiso para instalar una aplicación desconocida.

## 8. Crear un APK firmado

En Android Studio:

1. Abre `android/`.
2. Selecciona **Build → Generate Signed Bundle / APK**.
3. Elige **APK**.
4. Crea o selecciona una llave de firma.
5. Conserva el archivo `.jks` y su contraseña en secreto.
6. Selecciona **release**.
7. Genera el APK.

Si ya tienes una llave publicada, usa siempre esa misma llave.

## 9. Actualizar el contenido web

Después de modificar uno de los proyectos originales, ejecuta:

```powershell
npm run android:sync
```

Para cambiar archivos:

- Copia la versión nueva de Asistencias a `www/asistencias/`.
- Copia la versión nueva de Bitácoras a `www/bitacoras/`.
- Ejecuta `npm run build`.
- Ejecuta `npx cap sync android`.

No copies manualmente carpetas dentro de `dist/`; es un resultado generado.

## Permisos Android

El proyecto base usa conexiones HTTPS, cámara o archivos solo a través de las páginas cargadas en WebView. Si Android solicita más permisos, añádelos solo después de probar el módulo correspondiente.

Para compartir fotos o documentos:

- Comprueba permisos de almacenamiento/fotos en Android.
- Comprueba que las URLs de Drive sean abiertas o descargadas desde HTTPS.
- Comprueba el límite de archivos de cada proyecto.

## Limitaciones honestas

- Esta primera versión empaqueta las páginas existentes como WebView.
- Las cuentas y datos siguen guardándose en Apps Script, Google Sheets y localStorage/IndexedDB.
- IndexedDB/localStorage dentro de Android no se mezcla con el navegador de Windows.
- Si cambias el identificador Android, podrás instalar una segunda aplicación separada.
- El APK no reemplaza la publicación de las páginas web.
