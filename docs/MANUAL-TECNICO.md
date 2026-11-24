# Manual técnico — MOZAK (APT)

> Guía para instalar, configurar, ejecutar, probar y mantener la aplicación. Es un **resumen operativo**: para el detalle de cada tema se enlaza el documento correspondiente. Los comandos son los de `package.json`; lo que corresponde a la Etapa 15 está **pendiente de verificación en el equipo del proyecto**.

## 1. Requisitos

| Componente | Versión | Para qué |
|---|---|---|
| Node.js | 22.x (`engines`: `>=22.0.0 <23.0.0`) | Ejecutar y probar la aplicación |
| npm | 10 o superior | Dependencias |
| Docker Desktop | Reciente (Windows) | Modo Docker y PostgreSQL local |
| Git | — | Clonar el repositorio |

PostgreSQL 17.5 + PostGIS 3.5 se usa mediante el contenedor del proyecto; no hace falta instalarlos aparte.

## 2. Instalación

```bash
git clone https://github.com/NOSKIN-DEV/mozak-apt.git
cd mozak-apt
npm install        # también ejecuta "prisma generate"
```

La Etapa 15 (perfiles y moderación) está en la rama `feature/roles-moderacion` (pull request #1, en borrador) hasta que se verifique e integre a `master`.

Recomendación para Windows: **no** trabajar dentro de una carpeta sincronizada (OneDrive, Dropbox, Google Drive); usar una ruta simple como `C:\dev\mozak-apt`. Los scripts `dev` y `build` usan `--webpack` por un error de Turbopack documentado en el README.

## 3. Modos de ejecución

| Modo | Comando | Datos | Requiere |
|---|---|---|---|
| Desarrollo con datos de demostración | `npm run dev` | En memoria (`DATA_SOURCE=mock`) | Node |
| Producción local | `npm run build` y luego `npm run start` | En memoria | Node |
| Docker con datos de demostración | `npm run docker:mock` | En memoria | Docker |
| Docker con PostgreSQL + PostGIS | `npm run docker:postgres` | Base de datos (migra y carga la semilla) | Docker |
| Desarrollo sobre PostgreSQL | Levantar el servicio `db`, definir `DATABASE_URL` y `DATA_SOURCE=postgres`, `npm run db:migrate`, `npm run db:seed`, `npm run dev` | Base de datos | Node y Docker |

La aplicación queda en `http://localhost:3000`. Con `DATA_SOURCE=mock`, los eventos creados desde los paneles **se pierden al reiniciar**.

## 4. Configuración

Copiar `.env.example` a `.env.local` (Next.js) y, para la CLI de Prisma, definir también `DATABASE_URL` en `.env`. **Ningún secreto se versiona.**

| Variable | Valor | Uso |
|---|---|---|
| `DATA_SOURCE` | `mock` (por defecto) o `postgres` | Elige el repositorio de datos |
| `DATABASE_URL` | `postgresql://usuario:clave@host:5432/mozak?schema=public` | Obligatoria con `postgres` |
| `POSTGRES_PASSWORD`, `DB_PORT` | `mozak_dev`, `5432` | Base de Docker (solo desarrollo local; el puerto se publica en 127.0.0.1) |
| `SESSION_SECRET` | Texto aleatorio de 32 caracteres o más | Firma de sesiones (Etapa 15). Obligatoria con varias instancias o en Vercel |
| `ENABLE_DEMO_USERS`, `DEMO_USERS_PASSWORD` | `true`, texto | Cuentas de demostración en modo mock. **No activarlas en un servidor público** |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | Texto (contraseña de 10 caracteres o más) | `npm run db:seed` crea el administrador real |
| `SEED_DEMO_USERS` | `true` | Cuentas de demostración en la base (solo local) |

## 5. Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` / `build` / `start` | Desarrollo, compilación y servidor de producción |
| `npm run lint` | ESLint |
| `npm run test` | Pruebas (Vitest), sin base de datos |
| `npm run test:db` | Pruebas contra PostgreSQL real (base levantada, migrada y con semilla) |
| `npm run check:data` | Valida los datos de demostración y los filtros |
| `npm run db:migrate` | Aplica las migraciones (`prisma migrate deploy`) |
| `npm run db:seed` | Carga los 24 eventos de demostración y, según variables, las cuentas (idempotente) |
| `npm run docker:mock` / `docker:postgres` | Docker sin y con base de datos |

## 6. Estructura del repositorio

```
src/
  app/
    page.tsx, eventos/[id]/   Pantalla principal y detalle público
    ingresar/, creador/, admin/   Inicio de sesión y paneles (Etapa 15)
    api/                      events, categories, communes (públicas); auth, creator, admin (Etapa 15)
  components/                 Interfaz pública (EventCard, FiltersBar, …) y components/panel/ (paneles)
  lib/
    schemas.ts, sanitize.ts   Validación Zod y sanitización de entradas
    format.ts, maps.ts        Formato de precio y fechas; enlaces de Google Maps
    repositories/             Interfaces EventRepository, EventManagementRepository y UserRepository con sus implementaciones mock y PostgreSQL
    moderation/               Ciclo de vida del evento, política de contenido y errores
    auth/                     Hash de contraseñas, sesión firmada y bloqueo de intentos
    server/                   Manejadores de las rutas y composición de servicios
    db/                       Cliente de Prisma (solo con DATA_SOURCE=postgres)
  data/                       Datos de demostración (24 eventos, 12 recintos, 3 fuentes, 9 categorías)
  types/                      Modelos de dominio
prisma/                       schema.prisma, migraciones (0001_init, 0002_roles_moderacion) y seed.ts
public/media/                 Afiches y videos de demostración
scripts/                      check-mock-data.ts
docs/                         Documentación (índice en docs/README.md)
```

La arquitectura y las decisiones de diseño están en [`DOCUMENTACION-TECNICA.md`](DOCUMENTACION-TECNICA.md) y los diagramas en [`DIAGRAMAS-UML.md`](DIAGRAMAS-UML.md).

## 7. Base de datos

- Modelo y migraciones: [`MODELO-DE-DATOS.md`](MODELO-DE-DATOS.md). La migración `0002_roles_moderacion` **debe aplicarse antes de desplegar la Etapa 15** (ver [`DESPLIEGUE.md`](DESPLIEGUE.md)).
- Las migraciones se aplican con `npm run db:migrate`; la semilla es idempotente.
- La búsqueda y el filtro por comuna usan consultas parametrizadas; el texto del usuario nunca se concatena al SQL.
- Las claves de la base en Docker son de desarrollo local y no deben usarse en un servidor accesible desde Internet.

## 8. Cuentas y seguridad

- El visitante no tiene cuenta. Creador y administrador inician sesión en `/ingresar`; solo un administrador crea cuentas de creador (no hay registro abierto).
- Contraseñas con scrypt; sesión firmada con HMAC, de 8 horas, en cookie `HttpOnly` y `SameSite=Lax`; bloqueo tras 5 intentos fallidos en 15 minutos por IP y correo.
- Las cuentas de demostración existen solo con `ENABLE_DEMO_USERS` o `SEED_DEMO_USERS`.
- Detalle: [`ROLES-Y-MODERACION.md`](ROLES-Y-MODERACION.md).

## 9. Pruebas y calidad

Estrategia, tipos de prueba y cobertura en [`PLAN-DE-PRUEBAS.md`](PLAN-DE-PRUEBAS.md). Antes de entregar: `npm run lint`, `npm run test`, `npm run build` y, si se tocó la base, `npm run test:db`.

## 10. Despliegue

Servidor de prueba sin costo con Neon (base) y Vercel (aplicación): [`DESPLIEGUE.md`](DESPLIEGUE.md), **escrito pero aún sin ejecutar**. Las cadenas de conexión son contraseñas: se pegan en las variables del servidor, nunca en un archivo versionado ni en un chat.

## 11. Mantenimiento

| Tarea | Cómo |
|---|---|
| Agregar afiche o video a un evento | Copiar el archivo a `public/media/posters/` o `public/media/videos/` y referenciarlo (ver `DOCUMENTACION-TECNICA.md`, sección 4) |
| Cambiar de fuente de datos | Cambiar `DATA_SOURCE`; la API y la interfaz no cambian |
| Actualizar dependencias | `npm install`, y luego `npm run lint`, `npm run test`, `npm run build`; evaluar `npm audit --omit=dev` y **no** usar `--force` |
| Ver la política de contenido | `src/lib/moderation/content-policy.ts` (versión `2026-11-v1`) |

## 12. Solución de problemas

| Síntoma | Causa probable y solución |
|---|---|
| Panic de Turbopack en Windows | Usar los scripts del proyecto (ya traen `--webpack`) y evitar carpetas sincronizadas |
| `DATA_SOURCE inválido` o «requiere definir DATABASE_URL» | `DATA_SOURCE` solo acepta `mock` o `postgres`; con `postgres` definir `DATABASE_URL` |
| `Environment variable not found: DATABASE_URL` en Prisma | La CLI de Prisma lee `.env`, no `.env.local` |
| `Can't reach database server` | Levantar el servicio `db` y revisar host y puerto (`localhost` fuera de Docker, `db` dentro) |
| `P1001` al migrar en el primer arranque | El healthcheck de `db` usa TCP (`-h 127.0.0.1`); reconstruir con `npm run docker:postgres` |
| `npm run test:db` falla o encuentra 0 eventos | Falta `npm run db:migrate` y `npm run db:seed` |
| «port is already allocated» | Detener `npm run dev` u otro proceso en el puerto 3000 (o `DB_PORT=5433` para la base) |
| `docker compose` no conecta | Abrir Docker Desktop y esperar «Engine running» |
| Las sesiones se pierden al reiniciar | Definir `SESSION_SECRET` (sin él, el secreto es temporal y solo sirve en una instancia) |

Más casos en la sección 8 de [`DOCUMENTACION-TECNICA.md`](DOCUMENTACION-TECNICA.md).

## 13. Limitaciones conocidas

Datos de demostración por defecto, sin fuentes reales todavía; bloqueo de intentos de ingreso en memoria (por instancia); sin cambio ni recuperación de contraseña; sin mediciones de rendimiento. Ver `DOCUMENTACION-TECNICA.md` (sección 9) y `ROLES-Y-MODERACION.md` (sección 8).
