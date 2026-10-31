# Despliegue en un servidor de prueba sin costo (Etapa 14)

**Estado: pendiente de verificación.** Esta guía está escrita según la
documentación oficial de Neon, Vercel y Prisma, pero todavía no se ha ejecutado:
el primer despliegue real lo hace el usuario y puede requerir ajustes.

**Qué se obtiene:** una dirección pública `https://<proyecto>.vercel.app` con la
aplicación funcionando contra una base PostgreSQL + PostGIS en la nube, sin pagar
nada y sin dejar el computador encendido. Es la dirección que después abrirá la
aplicación Android (APK).

| Pieza | Servicio | Plan gratuito (octubre 2026) |
|-------|----------|------------------------------|
| Aplicación Next.js | [Vercel](https://vercel.com) | Hobby: gratis, uso personal/no comercial |
| Base de datos | [Neon](https://neon.com) | 100 CU-horas al mes y 1 GB por proyecto; se apaga a los 5 minutos sin uso |

Neon admite PostGIS (3.5 en PostgreSQL 17) y `unaccent`, las dos extensiones que
usa la migración inicial.

> **Seguridad.** Las cadenas de conexión de Neon contienen la contraseña de la
> base. Se copian solo a las variables de entorno de Vercel y a la consola del
> computador. No se suben al repositorio (`.env` está en `.gitignore`) ni se
> pegan en chats o documentos. Si una se filtra, se cambia la contraseña desde
> el panel de Neon.

## Parte A — Base de datos en Neon

1. Crear una cuenta en <https://neon.com> (se puede entrar con GitHub).
2. Crear un proyecto: nombre `mozak-apt`, **PostgreSQL 17** y región
   **AWS US East 1 (N. Virginia)**, que coincide con la región por defecto de
   las funciones de Vercel y reduce la latencia entre ambas.
3. En el panel del proyecto, botón **Connect**. Neon entrega la misma conexión de
   dos formas; hay que guardar **las dos** en un bloc de notas:
   - **Directa**: el nombre del servidor **no** tiene `-pooler`. Sirve para
     aplicar el esquema (Prisma necesita una conexión directa para migrar).
   - **Con pool (pooled)**: el nombre del servidor tiene `-pooler`. Es la que usa
     la aplicación en Vercel, porque cada función abre sus propias conexiones.
4. Cargar el esquema y los 24 eventos **desde el computador** (consola de
   Windows). La comilla doble evita que `&` rompa el comando:

   ```
   cd C:\dev\apt-project-etapa11
   git switch etapa-14-google-maps
   set "DATABASE_URL=<cadena DIRECTA, sin -pooler>"
   npm run db:migrate
   npm run db:seed
   ```

   Resultado esperado: `All migrations have been successfully applied` y
   `✅ Semilla aplicada: 9 categorías, 3 fuentes, 12 recintos y 24 eventos.`
   La variable solo vive en esa ventana; al cerrarla desaparece. Una variable
   definida así tiene prioridad sobre el `.env` del proyecto.
5. Comprobar en el **SQL Editor** de Neon: `select count(*) from event;` → `24`.

## Parte B — Aplicación en Vercel

1. Crear una cuenta en <https://vercel.com> (plan **Hobby**, entrando con GitHub).
2. **Add New… → Project** e importar el repositorio `NOSKIN-DEV/MOZAK-APT`. Si
   Vercel no deja importarlo porque pertenece a un grupo, hay que darle permiso
   desde GitHub o usar la alternativa de la sección «Si la importación falla».
3. En la pantalla de configuración:
   - **Framework Preset:** Next.js (se detecta solo).
   - **Build Command:** activar *Override* y escribir `npm run build`.
   - **Production Branch:** `master` (la rama por defecto).
4. **Environment Variables** (marcar Production, Preview y Development):

   | Nombre | Valor |
   |--------|-------|
   | `DATA_SOURCE` | `postgres` |
   | `DATABASE_URL` | la cadena **con pool** (`-pooler`), con `&connect_timeout=15` al final y **sin** `&channel_binding=require` si Neon la incluyó |

   `connect_timeout` da margen a que Neon despierte tras estar apagada. Si la
   cadena no trae `?` (parámetros), el separador es `?` en lugar de `&`.
5. **Deploy**. Cuando termine, Vercel muestra la dirección pública del proyecto.
6. En *Settings → Build and Deployment → Node.js Version* elegir **22.x** (es la
   versión con la que se probó el proyecto) y volver a desplegar si se cambió.

> **Qué rama se publica.** Vercel publica `master` como dirección pública. Las
> demás ramas (por ejemplo `etapa-14-google-maps`) generan direcciones de
> *preview* que piden iniciar sesión en Vercel; sirven para revisar, no para la
> aplicación Android. Por eso la Etapa 14 se fusiona a `master` una vez
> verificada, y entonces la dirección pública incluye el botón de Google Maps.

## Verificación (Parte C)

Con la dirección pública (`https://<proyecto>.vercel.app`):

1. `/api/events?limit=3` responde JSON con `"meta":{"total":24,...}`.
2. La página principal muestra eventos (12 por página), los filtros y la paginación funcionan.
3. El detalle de un evento (`/eventos/event-002`) muestra el mapa y el botón «Abrir en Google Maps».
4. Abierta desde el teléfono (Chrome), todo se ve y se puede usar.

La primera visita tras un rato sin uso puede tardar unos segundos extra: Neon
apaga la base a los 5 minutos y la despierta con la primera consulta.

## Red de seguridad: modo mock

Si la base falla justo antes de una demostración, en Vercel (*Settings →
Environment Variables*) se cambia `DATA_SOURCE` a `mock` y se vuelve a desplegar
(*Deployments → Redeploy*). La aplicación muestra los mismos 24 eventos sin
usar la base de datos.

## Si la importación falla

Desde el computador, sin conectar GitHub: `npx vercel` (pide iniciar sesión,
vincula la carpeta del proyecto y sube una copia) y `npx vercel --prod` para la
dirección pública. Las variables de entorno se cargan igual desde el panel.

## Problemas frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| `npm run db:migrate` falla con `P1001` / no alcanza el servidor | Se usó la cadena con `-pooler` en lugar de la directa, o la base estaba dormida: reintentar |
| `db:migrate` falla al crear la extensión `postgis` o `unaccent` | Es el único punto no comprobado con Neon; avisar con el mensaje exacto |
| La aplicación responde 500 en `/api/events` | Falta `DATABASE_URL` o `DATA_SOURCE` en Vercel, o la cadena quedó mal copiada: revisar *Logs* del despliegue |
| `Environment variable not found: DATABASE_URL` al migrar | La variable no se definió en esa ventana de la consola (se pierde al cerrarla) |
| Los cambios en Vercel no se notan | Las variables nuevas solo aplican a despliegues nuevos: *Redeploy* |
