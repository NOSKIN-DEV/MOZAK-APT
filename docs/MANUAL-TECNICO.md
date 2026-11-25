# Manual técnico — MOZAK (APT)

> Guía para instalar, configurar, ejecutar, probar y mantener la aplicación. Es un **resumen operativo**: para el detalle de cada tema se enlaza el documento correspondiente. Los comandos son los de `package.json` de `master`. Los perfiles de creador y administrador (Etapa 15) están en la rama `feature/roles-moderacion` y **no se describen aquí** hasta que se integren, porque no están verificados.

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

Recomendación para Windows: **no** trabajar dentro de una carpeta sincronizada (OneDrive, Dropbox, Google Drive); usar una ruta simple como `C:\dev\mozak-apt`. Los scripts `dev` y `build` usan `--webpack` por un error de Turbopack documentado en el README.

## 3. Modos de ejecución

| Modo | Comando | Datos | Requiere |
|---|---|---|---|
| Desarrollo con datos de demostración | `npm run dev` | En memoria (`DATA_SOURCE=mock`) | Node |
| Producción local | `npm run build` y luego `npm run start` | En memoria | Node |
| Docker con datos de demostración | `npm run docker:mock` | En memoria | Docker |
| Docker con PostgreSQL + PostGIS | `npm run docker:postgres` | Base de datos (migra y carga la semilla) | Docker |
| Desarrollo sobre PostgreSQL | Levantar el servicio `db`, definir `DATABASE_URL` y `DATA_SOURCE=postgres`, `npm run db:migrate`, `npm run db:seed`, `npm run dev` | Base de datos | Node y Docker |

La aplicación queda en `http://localhost:3000`.

## 4. Configuración

Copiar `.env.example` a `.env.local` (Next.js) y, para la CLI de Prisma, definir también `DATABASE_URL` en `.env`. **Ningún secreto se versiona.**

| Variable | Valor | Uso |
|---|---|---|
| `DATA_SOURCE` | `mock` (por defecto) o `postgres` | Elige el repositorio de datos |
| `DATABASE_URL` | `postgresql://usuario:clave@host:5432/mozak?schema=public` | Obligatoria con `postgres` |
| `POSTGRES_PASSWORD`, `DB_PORT` | `mozak_dev`, `5432` | Base de Docker (solo desarrollo local; el puerto se publica en 127.0.0.1) |

## 5. Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` / `build` / `start` | Desarrollo, compilación y servidor de producción |
| `npm run lint` | ESLint |
| `npm run test` | Pruebas (Vitest), sin base de datos |
| `npm run test:db` | Pruebas contra PostgreSQL real (base levantada, migrada y con semilla) |
| `npm run check:data` | Valida los datos de demostración y los filtros |
| `npm run db:migrate` | Aplica las migraciones (`prisma migrate deploy`) |
| `npm run db:seed` | Carga los 24 eventos de demostración (idempotente) |
| `npm run docker:mock` / `docker:postgres` | Docker sin y con base de datos |

## 6. Estructura del repositorio

```
src/
  app/
    page.tsx, eventos/[id]/   Pantalla principal y detalle público
    api/                      events, events/[id], categories, communes
  components/                 Interfaz pública (EventCard, FiltersBar, EventLocationMap, …)
  lib/
    api/                      Parseo y serialización de la API
    schemas.ts, sanitize.ts   Validación Zod y sanitización de entradas
    format.ts, maps.ts        Formato de precio y fechas; enlaces de Google Maps
    repositories/             Interfaz EventRepository con sus implementaciones mock y PostgreSQL, y la batería de contrato
    db/                       Cliente de Prisma (solo con DATA_SOURCE=postgres)
  data/                       Datos de demostración (24 eventos, 12 recintos, 3 fuentes, 9 categorías)
  types/                      Modelos de dominio
prisma/                       schema.prisma, migración 0001_init y seed.ts
public/media/                 Afiches y videos de demostración
scripts/                      check-mock-data.ts
docs/                         Documentación (índice en docs/README.md)
```

La arquitectura y las decisiones de diseño están en [`DOCUMENTACION-TECNICA.md`](DOCUMENTACION-TECNICA.md) y los diagramas en [`DIAGRAMAS-UML.md`](DIAGRAMAS-UML.md).

## 7. Base de datos

- Modelo y migraciones: [`MODELO-DE-DATOS.md`](MODELO-DE-DATOS.md).
- Las migraciones se aplican con `npm run db:migrate`; la semilla es idempotente.
- La búsqueda y el filtro por comuna usan consultas parametrizadas; el texto del usuario nunca se concatena al SQL.
- Las claves de la base en Docker son de desarrollo local y no deben usarse en un servidor accesible desde Internet.

## 8. Cuentas y seguridad

En `master` el visitante consulta sin cuenta y no hay inicio de sesión. Los perfiles de creador y administrador (Etapa 15) están en la rama `feature/roles-moderacion`, con su propia documentación, y se agregan a este manual al integrarse. Las entradas de la API se sanitizan y validan, y las consultas a la base son parametrizadas (ver el plan de pruebas, §5).

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

Más casos en la sección 8 de [`DOCUMENTACION-TECNICA.md`](DOCUMENTACION-TECNICA.md).

## 13. Limitaciones conocidas

Datos de demostración por defecto, sin fuentes reales todavía; sin mediciones de rendimiento. Ver `DOCUMENTACION-TECNICA.md` (sección 9).
