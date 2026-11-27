# Versión Android con Capacitor (HU-27 / MA-33)

**Estado: preparada, sin compilar ni probar.** Esta rama solo deja la configuración y esta guía. Nadie ha generado todavía el APK ni lo ha instalado en un teléfono, así que todo lo que sigue puede requerir ajustes. La historia HU-27 sigue en «Por hacer» hasta que el usuario la ejecute y la confirme (ver [`DEFINITION-OF-DONE.md`](DEFINITION-OF-DONE.md)).

## Qué se construye

Un APK que **abre la dirección pública de la aplicación** (la de Vercel, ver [`DESPLIEGUE.md`](DESPLIEGUE.md)) dentro de una pantalla web de Android. La aplicación necesita servidor por sus rutas de API, así que no se puede empaquetar dentro del APK. Consecuencias:

- **Primero va la web.** Sin la dirección pública no hay nada que abrir.
- **Se necesita conexión a internet.** Sin conexión, el APK no muestra eventos.
- **Los cambios en la web se ven sin volver a compilar el APK.**

## Requisitos

- La aplicación desplegada en una dirección `https://…` (Parte A y B de `DESPLIEGUE.md`).
- [Android Studio](https://developer.android.com/studio). La documentación de Capacitor indica que Capacitor 8 requiere como mínimo Android Studio 2025.2.1 y que Android Studio instala el JDK adecuado.
- Un teléfono Android (con depuración USB o con permiso para instalar aplicaciones fuera de la tienda) o el emulador de Android Studio.

## Pasos

1. **Escribe la dirección pública.** En `capacitor.config.json` reemplaza `https://REEMPLAZAR-por-tu-proyecto.vercel.app` por la dirección real de Vercel. Debe ser `https`: la configuración tiene `cleartext` en `false`.
2. **Instala Capacitor** (cambia `package.json`):
   ```
   npm install --save-dev @capacitor/cli@8 @capacitor/core@8 @capacitor/android@8
   ```
3. **Crea el proyecto Android** (genera la carpeta `android/`):
   ```
   npx cap add android
   npx cap sync android
   ```
4. **Abre Android Studio y compila:**
   ```
   npx cap open android
   ```
   Espera a que termine la sincronización de Gradle y usa *Build → Build Bundle(s) / APK(s) → Build APK(s)*. El APK de depuración queda normalmente en `android/app/build/outputs/apk/debug/app-debug.apk`.
5. **Instálalo en el teléfono:** copia el APK y ábrelo (Android pedirá permiso para instalar desde esa fuente), o conéctalo por USB y ejecuta `adb install app-debug.apk`.
6. **Guarda el resultado en git** (la carpeta `android/` trae su propio `.gitignore`): `git add android capacitor.config.json package.json package-lock.json`.
7. **Comprueba que el lint y la compilación de la web siguen igual:** `npm run lint` y `npm run build`.

## Prueba de aceptación (MTC_00330)

Con el APK instalado, marca OK o NOK cada punto y anota la fecha:

- [ ] Se abre sin errores y muestra la lista de eventos (la misma que la web).
- [ ] La búsqueda, los filtros, el orden y la paginación funcionan.
- [ ] El detalle de un evento muestra afiche, horario, lugar y precio.
- [ ] El botón «Abrir en Google Maps» abre Google Maps (o el navegador) y no deja la aplicación atrapada sin poder volver.
- [ ] El botón «Atrás» del teléfono vuelve a la pantalla anterior.
- [ ] Con el teléfono en modo avión, la aplicación no se cierra de forma abrupta.
- [ ] Rotar la pantalla no rompe el diseño.

## Costos

| Concepto | Costo |
|---|---|
| Compilar el APK con Android Studio | Gratis |
| Instalarlo en tu propio teléfono | Gratis |
| Publicarlo en Google Play | US$25, pago único (cuenta de desarrollador). Las cuentas personales creadas desde el 13-11-2023 deben, además, hacer una prueba cerrada con al menos 12 testers durante 14 días antes de pedir acceso a producción |

Las cifras de Google Play se consultaron en la ayuda oficial de Play Console el 27-11-2026; pueden cambiar.

## Limitaciones y riesgos

- **`server.url` no está verificado para este uso.** Capacitor lo documenta sobre todo para desarrollo con recarga en vivo. Cargar un sitio remoto en producción funciona técnicamente, pero no se ha probado aquí.
- **Google Play podría rechazar una aplicación que solo muestra un sitio web.** No se ha verificado la política vigente. Si pasa, hay que evaluar alternativas (por ejemplo, una Trusted Web Activity con PWABuilder o Bubblewrap), que no se han investigado.
- **El APK de depuración no sirve para Play.** La tienda pide un paquete firmado (AAB) con una clave propia; guardar esa clave es responsabilidad del usuario y no se sube al repositorio.
- **`appId` (`com.mozak.apt`)** identifica la aplicación para siempre en Play: cámbialo antes de publicar si quieres otro.
- **No hay notificaciones, cuentas de consumidor ni modo sin conexión**; quedan fuera del alcance.
- Si la Etapa 15 (perfiles y moderación) se despliega, los paneles `/creador` y `/admin` también se abrirían dentro de la aplicación; no se ha probado ese flujo en Android.
