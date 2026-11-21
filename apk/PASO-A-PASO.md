# Paso a paso — compilar el APK CCH

## Antes de compilar

- [ ] Abre [CHECKLIST.md](./CHECKLIST.md).
- [ ] Instala Node.js.
- [ ] Instala Android Studio.
- [ ] Instala Android SDK y Build-Tools.
- [ ] Instala Java desde Android Studio si aparece el aviso.
- [ ] Publica el Apps Script de Asistencias.
- [ ] Publica el Apps Script de Bitácoras.

## Paso 1 — Abrir la carpeta

```powershell
cd C:\xampp\htdocs\CCH-Page\apk
```

## Paso 2 — Instalar dependencias

```powershell
npm install
```

Si el comando pide una versión de Node nueva, instala Node.js LTS y vuelve a abrir PowerShell.

## Paso 3 — Instalar Android

```powershell
npx cap add android
```

Hazlo una sola vez. Si Android Studio ya creó la carpeta `android/`, no repitas este paso.

## Paso 4 — Construir la web

```powershell
npm run build
```

Debes obtener una carpeta `dist/` sin errores.

## Paso 5 — Sincronizar con Android

```powershell
npx cap sync android
```

## Paso 6 — Abrir Android Studio

```powershell
npx cap open android
```

Cuando termine el Gradle Sync:

1. Selecciona el módulo `app`.
2. Conecta el teléfono o inicia un emulador.
3. Pulsa Run.

## Paso 7 — Probar Asistencias

- [ ] Abre el módulo.
- [ ] Consulta con número de cuenta.
- [ ] Inicia el panel Admin.
- [ ] Crea o consulta asistencia.
- [ ] Revisa calificaciones y equipos.
- [ ] Abre Cibernética y Estadística.
- [ ] Confirma que el Sync funciona.

## Paso 8 — Probar Bitácoras

- [ ] Inicia sesión.
- [ ] Selecciona o crea un proyecto.
- [ ] Crea una sesión.
- [ ] Agrega pendientes e hitos.
- [ ] Sube una imagen.
- [ ] Sube un documento.
- [ ] Registra puntaje.
- [ ] Prueba recarga por proyecto.
- [ ] Prueba edición masiva.
- [ ] Confirma que los datos aparecen en Drive.

## Paso 9 — Crear APK debug

```powershell
npm run android:apk
```

Resultado:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

Instala ese archivo en el teléfono para pruebas.

## Paso 10 — Firmar para distribución

En Android Studio:

1. Build.
2. Generate Signed Bundle / APK.
3. APK.
4. Create new key store o usa el existente.
5. Build variant **release**.
6. Finaliza.

Guarda la llave fuera del repositorio y nunca la subas a GitHub.

## Actualizar una versión

```powershell
npm run build
npx cap sync android
npx cap open android
```

Después ejecuta una nueva compilación desde Android Studio.
