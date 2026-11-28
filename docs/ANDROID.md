# Versión Android con Capacitor (HU-27 / MA-33)

**Estado: preparada, sin compilar ni probar.** Esta rama deja la configuración de Capacitor y esta guía, al día con las Etapas 15 (perfiles) y 16 (mapa). Nadie ha generado todavía el APK ni lo ha instalado en un teléfono, así que todo lo que sigue puede requerir ajustes. La historia HU-27 sigue en «Por hacer» hasta que el usuario la ejecute y la confirme (ver [`DEFINITION-OF-DONE.md`](DEFINITION-OF-DONE.md)).

## Qué se construye

Un APK que **abre la dirección de la aplicación web** dentro de una pantalla web de Android. La aplicación necesita su servidor (rutas de la API, sesiones, base de datos), así que no se puede empaquetar dentro del APK. Consecuencias:

- **Siempre hay un servidor detrás**: tu PC en la red local (modo A) o la web publicada (modo B).
- **Se necesita conexión.** Sin conexión, el APK no muestra eventos.
- **Los cambios en la web se ven sin volver a compilar el APK.**

## Los dos modos

| | A. Prueba en la red local | B. Publicada (https) |
|---|---|---|
| Para qué | Ver la app en el teléfono hoy, sin publicar nada | Demostración real y uso fuera de tu casa |
| Servidor | Tu PC, en la misma red Wi-Fi que el teléfono | Vercel + Neon ([`DESPLIEGUE.md`](DESPLIEGUE.md)) |
| `server.url` en `capacitor.config.json` | `http://IP-DE-TU-PC:3000` (en el emulador: `http://10.0.2.2:3000`) | `https://tu-proyecto.vercel.app` |
| `server.cleartext` | `true` (permite `http`) | `false` |
| Ubicación del usuario en el mapa | **No funciona**: el navegador solo la entrega con https | Debería funcionar (por probar) |
| Limitaciones | El PC debe estar encendido con la app corriendo; la IP del PC puede cambiar | Requiere completar el despliegue |

### Modo A: cómo dejar la app accesible desde el teléfono

1. Averigua la IP de tu PC con `ipconfig` (línea «Dirección IPv4», por ejemplo `192.168.1.126`).
2. Levanta la app **en modo producción**, no con `npm run dev`. En desarrollo, Next.js 16 bloquea por defecto los recursos internos pedidos desde un nombre de host distinto de `localhost`, y la página podría quedar a medio cargar. Cualquiera de estas dos opciones sirve:
   - Docker: `docker compose up --build` (datos de demostración) o con PostgreSQL como en el README.
   - Node: `npm run build` y luego `npm start`.
3. La primera vez, Windows puede preguntar si permite a Node o a Docker usar la red: acepta **solo para redes privadas**.
4. Desde el navegador del teléfono abre `http://IP-DE-TU-PC:3000`. Si carga ahí, cargará en el APK.

En modo producción las cuentas de demostración no existen (solo en `npm run dev` o con `ENABLE_DEMO_USERS=true`). Para probar la consulta pública y el mapa no hacen falta.

## Requisitos

- [Android Studio](https://developer.android.com/studio). La documentación de Capacitor indica que Capacitor 8 requiere como mínimo Android Studio 2025.2.1; Android Studio instala el JDK adecuado.
- Un teléfono Android con la depuración USB activada (Ajustes → Acerca del teléfono → tocar 7 veces «Número de compilación» → Opciones de desarrollador → Depuración USB), o el emulador de Android Studio.

## Pasos

1. **Elige el modo y escribe la dirección** en `capacitor.config.json` (`server.url` y `server.cleartext`, según la tabla).
2. **Instala Capacitor** (cambia `package.json`):
   ```
   npm install @capacitor/core@8 @capacitor/android@8
   npm install --save-dev @capacitor/cli@8
   ```
3. **Crea el proyecto Android** (genera la carpeta `android/`):
   ```
   npx cap add android
   ```
4. **Agrega los permisos de ubicación** para el mapa. En `android/app/src/main/AndroidManifest.xml`, junto al permiso `INTERNET` que ya trae, agrega:
   ```xml
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-feature android:name="android.hardware.location.gps" android:required="false" />
   ```
5. **Sincroniza y abre Android Studio:**
   ```
   npx cap sync android
   npx cap open android
   ```
   Espera a que termine la sincronización de Gradle (la primera vez descarga bastante).
6. **Pruébalo.** Con el teléfono conectado por USB (o el emulador encendido), presiona *Run* (▶) en Android Studio: instala la app y la abre. Para obtener el archivo, usa *Build → Build Bundle(s) / APK(s) → Build APK(s)*; queda normalmente en `android/app/build/outputs/apk/debug/app-debug.apk`.
7. **Comprueba que la web no cambió:** `npm run lint` y `npm run build` deben dar lo mismo que antes (la carpeta `android/` está excluida de ambos).
8. **Guarda el resultado en git** (la carpeta `android/` trae su propio `.gitignore`): `git add android capacitor.config.json package.json`.

Cada vez que cambies `capacitor.config.json`, vuelve a ejecutar `npx cap sync android`.

## Prueba de aceptación (MTC_00330)

Con el APK instalado, marca OK o NOK cada punto y anota la fecha y el modo (A o B):

- [ ] Se abre sin errores y muestra la lista de eventos (la misma que la web).
- [ ] La búsqueda, los filtros, el orden y la paginación funcionan.
- [ ] El detalle de un evento muestra afiche, horario, lugar y precio.
- [ ] «Abrir en Google Maps» y «Cómo llegar» abren Google Maps (o el navegador) y se puede volver a la app.
- [ ] El botón «Atrás» del teléfono vuelve a la pantalla anterior.
- [ ] `/mapa` (enlace «Mapa») muestra los puntos y la ficha al tocar uno.
- [ ] Solo en modo B: la app pide permiso de ubicación; al aceptar aparece el punto azul y funcionan «Mi ubicación» y «Lo más cercano».
- [ ] Inicio de sesión de administrador o creador y navegación por el panel sin perder la sesión.
- [ ] Con el teléfono en modo avión, la app no se cierra de forma abrupta.
- [ ] Rotar la pantalla no rompe el diseño.

## Costos

| Concepto | Costo |
|---|---|
| Android Studio, compilar el APK e instalarlo en tu propio teléfono | Gratis |
| Publicarlo en Google Play | US$25, pago único (cuenta de desarrollador). Las cuentas personales creadas desde el 13-11-2023 deben, además, hacer una prueba cerrada con al menos 12 testers durante 14 días antes de pedir acceso a producción |

Las cifras de Google Play se consultaron en la ayuda oficial de Play Console el 27-11-2026; pueden cambiar.

## Limitaciones y riesgos

- **La ubicación dentro del APK no está probada.** Los permisos del paso 4 son necesarios, pero no se ha confirmado que la pantalla web de Capacitor muestre por sí sola el diálogo de permiso de Android cuando el mapa pide la ubicación. Si en el modo B se acepta el permiso y aun así no aparece el punto azul, la alternativa es agregar el complemento `@capacitor/geolocation` y pedir el permiso al abrir la app (no implementado).
- **`server.url` no está verificado para uso en producción.** Capacitor lo documenta sobre todo para desarrollo con recarga en vivo. Cargar un sitio remoto funciona técnicamente, pero no se ha probado aquí.
- **Google Play podría rechazar una app que solo muestra un sitio web.** No se ha verificado la política vigente. Si pasa, hay que evaluar alternativas (por ejemplo, una Trusted Web Activity), que no se han investigado.
- **El APK de depuración no sirve para Play.** La tienda pide un paquete firmado (AAB) con una clave propia; guardar esa clave es responsabilidad del usuario y no se sube al repositorio.
- **`appId` (`com.mozak.apt`)** identifica la aplicación para siempre en Play: cámbialo antes de publicar si quieres otro.
- **Modo A**: `cleartext: true` permite tráfico sin cifrar. Úsalo solo para pruebas en tu red y vuelve a `false` en el modo B.
- No hay notificaciones, cuentas de consumidor ni modo sin conexión; quedan fuera del alcance.
