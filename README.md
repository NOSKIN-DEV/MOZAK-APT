# MOZAK — Plataforma de descubrimiento de entretenimiento y actividades

> Proyecto de Título (APT) de Ingeniería en Informática. "APT" es el
> nombre académico del proyecto de título; "MOZAK" es el nombre de
> marca mostrado en la interfaz.
> **Estado actual: prototipo/MVP en desarrollo.**

## Descripción del proyecto

Plataforma web responsive para descubrir eventos y actividades de
entretenimiento, cultura y recreación disponibles en el entorno del usuario.

## Problemática

La información sobre eventos está dispersa entre municipalidades, centros
culturales, teatros, museos y otras organizaciones, lo que dificulta
encontrar actividades según ubicación, fecha, categoría y costo.

## Objetivo

Centralizar y normalizar información de eventos proveniente de fuentes
públicas (APIs REST, JSON, CSV, GeoJSON), comenzando por un prototipo
funcional con datos de prueba locales.

## Tecnologías

- Node.js 22 LTS
- Next.js 16.x + React 19.x + TypeScript 5.9.x
- Tailwind CSS 4.x
- Zod 4.x (validación de datos)
- PostgreSQL 17.x + PostGIS 3.5.x + Prisma 6.x *(persistencia opcional desde la Etapa 11; el modo por defecto sigue siendo mock)*
- Docker
- Capacitor 8.x + Android Studio *(versión móvil futura)*

## Requisitos

- Node.js 22.x
- npm 10.x o superior

## Instalación

```bash
npm install
```

## Ejecución local

```bash
npm run dev
```

La aplicación quedará disponible en `http://localhost:3000`.

> **Nota técnica:** el script `dev` usa el flag `--webpack` para desactivar
> Turbopack (el bundler nuevo y por defecto en Next.js 16). Al momento de
> crear este proyecto, Turbopack 16.0.1 presenta un bug conocido
> (`inner_of_uppers_lost_follower`, reportado en el repositorio oficial de
> Next.js) que provoca un panic en Windows, especialmente si el proyecto
> vive dentro de una carpeta sincronizada por OneDrive/Dropbox/Google
> Drive. Recomendaciones:
> 1. **No desarrollar dentro de una carpeta sincronizada** (OneDrive,
>    Dropbox, Google Drive). Mueve el proyecto a una ruta local simple,
>    por ejemplo `C:\dev\apt-project`.
> 2. Si en el futuro se actualiza Next.js y el bug ya está resuelto, se
>    puede quitar `--webpack` de los scripts para volver a Turbopack.

## Variables de entorno

Copiar `.env.example` a `.env.local` y ajustar según corresponda:

```bash
cp .env.example .env.local
```

Con `DATA_SOURCE=mock` (valor por defecto) no se requiere base de datos.
Para usar PostgreSQL (`DATA_SOURCE=postgres`) hace falta además
`DATABASE_URL`; ver la sección «PostgreSQL (Etapa 11)».

## Estructura del proyecto

```
src/
  app/
    api/             API interna (Etapa 3): events, events/[id], categories, communes
    page.tsx           Página principal (Etapa 4/5): header, hero, filtros y listado
    eventos/[id]/      Página de detalle de evento (Etapa 6)
  components/    Header, Hero, SearchBar, FiltersBar, EventCard, EventGrid, EventLocationMap, EventMedia, ThemeToggle
  lib/
    schemas.ts        Esquemas Zod (validan Category/Venue/Source/Event y filtros)
    repositories/      Abstracción EventRepository + MockEventRepository + PostgresEventRepository + fábrica por DATA_SOURCE
    db/                Cliente de Prisma compartido (solo se carga con DATA_SOURCE=postgres)
    api/               Serialización de eventos y parseo de query params para la API
    format.ts          Formato de precio (CLP) y fechas en español
  types/         Modelos e interfaces (Event, Venue, Source, Category)
  data/          Datos mock locales (24 eventos, 12 venues, 3 sources, 9 categorías)
prisma/
  schema.prisma        Modelos de la base (Category, Venue, Source, Event)
  migrations/          Migración SQL inicial (extensiones, tablas, restricciones CHECK, índices)
  seed.ts              Carga los 24 eventos de demostración en PostgreSQL (npm run db:seed)
public/
  media/           Afiches (posters/) y videos (videos/) de los eventos (Etapa 10)
docs/            Documentación técnica ampliada (Etapa 10)
scripts/
  check-mock-data.ts   Valida los datos mock y prueba el repositorio (npm run check:data)
```

## API interna

Con el servidor corriendo (`npm run dev`), la API queda disponible en:

| Endpoint                | Descripción                                                   |
|--------------------------|----------------------------------------------------------------|
| `GET /api/events`        | Lista de eventos. Acepta filtros combinables (ver abajo).       |
| `GET /api/events/[id]`   | Detalle de un evento. 404 si no existe.                         |
| `GET /api/categories`    | Lista de categorías disponibles.                                |
| `GET /api/communes`      | Lista de comunas disponibles (derivadas de los venues).         |

Filtros de `GET /api/events` (todos opcionales, se combinan con AND):

- `search` — texto libre (busca en título, descripción, lugar y comuna)
- `category` — id de categoría (ver `GET /api/categories`)
- `commune` — nombre de comuna (ver `GET /api/communes`)
- `isFree` — `true` o `false`
- `dateFrom`, `dateTo` — fechas ISO (`YYYY-MM-DD`)

Orden y paginación de `GET /api/events` (Etapa 13, todos opcionales):

- `sort` — `date_asc` (por defecto, del evento más próximo al más lejano) o
  `date_desc`. Ordena por fecha de inicio, luego hora de inicio y luego id.
- `page` — número de página, desde 1 (por defecto 1).
- `limit` — eventos por página, de 1 a 100 (por defecto 20).

La respuesta es `{ data, meta }`, con `meta = { total, page, limit, totalPages, sort }`.
`meta.total` cuenta todos los resultados de los filtros, no solo los de la
página. Una página fuera de rango responde `200` con `data: []`.

Sanitización de parámetros (Etapa 13): el texto se normaliza (Unicode NFC,
espacios colapsados y recortados); se rechazan con `400` los caracteres de
control (incluido el byte nulo `%00`), los textos de más de 100 caracteres, las
comunas y categorías con símbolos de código y los parámetros repetidos. Las
comillas, `%`, `_` y `<` en la búsqueda se tratan como texto literal: las
consultas a la base de datos van parametrizadas.

Ejemplos (pégalos en el navegador con el servidor corriendo):

```
http://localhost:3000/api/events
http://localhost:3000/api/events?sort=date_desc&limit=5
http://localhost:3000/api/events?limit=5&page=5
http://localhost:3000/api/events?search=teatro
http://localhost:3000/api/events?category=cat-ferias&commune=Recoleta&isFree=true
http://localhost:3000/api/events/event-001
http://localhost:3000/api/categories
http://localhost:3000/api/communes
```

Un query param inválido (ej. `isFree=si`, `limit=0` o una fecha mal formada)
responde `400` con el detalle del error (sin repetir el valor recibido); un id inexistente en `/api/events/[id]`
responde `404`.

## Página de detalle de evento

`GET /eventos/[id]` (ej. `http://localhost:3000/eventos/event-002`) muestra
el detalle completo de un evento: categoría, título, descripción, fecha,
horario, lugar, dirección, comuna, precio, un mapa de ubicación
(OpenStreetMap embebido, no requiere API key), un botón "Abrir en Google
Maps" (Etapa 14; enlace oficial sin API key, usa las coordenadas o, si no
sirven, la dirección) y un botón "Ver sitio oficial" que abre `sourceUrl` en
una pestaña nueva. Si el id no existe,
muestra un mensaje claro de "Evento no encontrado" con un botón para
volver al listado.

### Afiche de fondo y video del evento (Etapa 10)

Al seleccionar un evento, **el afiche del evento queda de fondo** (en toda
la página, desenfocado y atenuado para no restar legibilidad) y, **sobre el
afiche, se reproduce el video promocional** del evento (con controles; no
arranca solo). Si el evento no tiene video, se muestra su foto enmarcada
sobre el afiche; si no tiene afiche, la cabecera se ve como antes.

- Nuevos campos del modelo `Event` (opcionales, `null` si no hay):
  `posterImageUrl` y `videoUrl`. Aceptan una ruta local bajo `public/`
  (ej. `/media/posters/event-002.svg`) o una URL `http(s)://`, y también
  salen en `GET /api/events` y `GET /api/events/[id]`.
- Los 24 eventos de demostración tienen afiche (`public/media/posters/`) y 9
  de ellos tienen video (`public/media/videos/`); son material original de
  demostración, no publicidad real.
- Cómo agregar afiche y video a un evento: ver
  [`docs/DOCUMENTACION-TECNICA.md`](docs/DOCUMENTACION-TECNICA.md), sección 4.

## Responsive

La interfaz está construida mobile-first con los breakpoints estándar de
Tailwind. Para revisarla, abre las herramientas de desarrollador del
navegador (F12), activa el modo de dispositivo (ícono de móvil/tablet, o
Ctrl+Shift+M en Chrome/Edge) y prueba estos anchos:

| Ancho aproximado | Dispositivo   | Qué revisar                                                        |
|-------------------|----------------|---------------------------------------------------------------------|
| 375px              | Móvil          | Filtros apilados a ancho completo, sin scroll horizontal            |
| 768px              | Tablet         | Listado en 2 columnas, filtros en una fila                          |
| 1024px             | Notebook       | Listado en 3 columnas, header en una sola fila                      |
| 1440px+            | Escritorio     | Listado en 4 columnas                                                |

No debería aparecer una barra de scroll horizontal en ningún ancho.

## Modo oscuro

El botón 🌙/☀️ en el header alterna entre modo claro y oscuro. La
preferencia se guarda en `localStorage` (clave `mozak-theme`); si el
usuario nunca la cambió, se usa `prefers-color-scheme` del sistema
operativo. Un script inline en `layout.tsx` aplica la clase `dark` en
`<html>` antes de la primera pintura, para evitar el parpadeo del tema
incorrecto al cargar la página.

## Comandos disponibles

| Comando            | Descripción                                    |
|---------------------|------------------------------------------------|
| `npm run dev`       | Levanta el servidor de desarrollo               |
| `npm run build`     | Genera el build de producción                   |
| `npm run start`     | Sirve el build de producción                    |
| `npm run lint`      | Ejecuta ESLint                                  |
| `npm run test`      | Ejecuta las pruebas (Vitest); no requiere base de datos |
| `npm run test:db`   | Pruebas contra PostgreSQL real (requiere base levantada y con semilla) |
| `npm run db:migrate`| Aplica las migraciones de `prisma/` a la base de `DATABASE_URL` |
| `npm run db:seed`   | Carga los datos de demostración en PostgreSQL (idempotente) |
| `npm run docker:mock` | Docker en modo mock (igual que `docker compose up --build`) |
| `npm run docker:postgres` | Docker con PostgreSQL + PostGIS (ver sección «Docker») |
| `npm run check:data`| Valida los datos mock y prueba filtros combinados |

## Pruebas

Las pruebas unitarias y de integración (Vitest) cubren la Épica APT-8 del
Sprint 2, trazada contra el plan de pruebas oficial del curso (32 casos MTC):

```bash
npm run test       # corre toda la suite una vez
npm run test:watch # modo watch, útil mientras se desarrolla
```

| Archivo | Qué cubre |
|---|---|
| `src/lib/format.test.ts` | `formatPrice` (gratis/pagado, formato CLP) y `formatEventDate` (fecha única vs. rango) |
| `src/lib/api/parse-event-query.test.ts` | Parseo, sanitización y validación de los query params de `GET /api/events` (filtros, `sort`, `page`, `limit`) |
| `src/lib/repositories/event-repository.contract.ts` | Batería de **contrato** de `EventRepository` (búsqueda por texto, categoría, comuna, fecha incluyendo eventos multi-día, gratis/pagado, combinación con AND, `findById`). La ejecutan `MockEventRepository` y `PostgresEventRepository` (Etapa 11) |
| `src/lib/repositories/mock-event-repository.test.ts` | Ejecuta el contrato contra `MockEventRepository` |
| `src/lib/repositories/factory.test.ts` | Selección de la fuente de datos con `DATA_SOURCE` (Etapa 11) |
| `src/lib/repositories/postgres-mapping.test.ts` | Conversión fila de base de datos ↔ dominio; las 24 filas de demostración dan el mismo resultado que el mock (Etapa 11) |
| `src/lib/repositories/postgres-text-filters.test.ts` | Consulta SQL parametrizada de búsqueda y comuna (Etapa 11) |
| `src/lib/repositories/postgres-event-repository.db.test.ts` | **Solo con `npm run test:db`**: el mismo contrato contra PostgreSQL real, más PostGIS y restricciones CHECK/claves foráneas (Etapa 11) |
| `src/app/api/events/route.test.ts` | `GET /api/events`: 200 con JSON válido, filtros combinados, 400 ante parámetros inválidos; orden `sort` (MTC_00110), `page`/`limit` (MTC_00190) y entradas con caracteres especiales (MTC_00270) |
| `src/lib/sanitize.test.ts` | Limpieza de texto: NFC, espacios, caracteres de control (byte nulo), largo máximo (Etapa 13) |
| `src/lib/repositories/event-order.test.ts` | Orden cronológico y desempates (fecha → hora → id); `date_desc` es el inverso exacto (Etapa 13) |
| `src/lib/repositories/pagination.test.ts` | Valores por defecto (página 1, 20 por página) y cálculo de `totalPages` (Etapa 13) |
| `src/lib/api/build-events-query.test.ts` | Query string que arma la pantalla principal, con caracteres especiales (Etapa 13) |
| `src/lib/maps.test.ts` | Enlace a Google Maps: coordenadas válidas/inválidas, respaldo por dirección, tildes, ñ y símbolos reservados codificados, sin inyección de parámetros, `null` sin datos (Etapa 14) |
| `src/app/api/events/[id]/route.test.ts` | `GET /api/events/[id]`: 200 con el evento (incluye `posterImageUrl`/`videoUrl`), 404 si no existe |
| `src/app/api/categories/route.test.ts` | `GET /api/categories`: 200 con las 9 categorías |
| `src/app/api/communes/route.test.ts` | `GET /api/communes`: 200 con las 12 comunas, sin duplicados y ordenadas |
| `src/data/media-assets.test.ts` | Afiche y video (Etapa 10): datos mock válidos, cada archivo local referenciado existe en `public/`, y el esquema rechaza rutas peligrosas (`javascript:`, `//host`, sin `/` inicial) |

Todos los casos usan los datos mock reales de `src/data` (no fixtures
inventados), así que también detectan si un cambio futuro en esos datos
rompe un escenario ya cubierto por el plan de pruebas oficial.

## Docker

El proyecto se puede levantar completo con un solo comando, sin instalar
Node ni dependencias en la máquina host:

```bash
docker compose up --build
```

La aplicación queda disponible en `http://localhost:3000`. Para detenerla:

```bash
docker compose down
```

**Cómo está armado:**

- `Dockerfile` — build multi-stage de 3 etapas (`deps` → `build` → `runner`).
  La imagen final solo contiene el servidor standalone que genera Next.js
  (`next.config.ts` tiene `output: "standalone"`), no todo `node_modules`,
  así que queda liviana. Corre como usuario sin privilegios (`nextjs`, no
  `root`).
- `docker-compose.yml` — un único servicio, `app`, expuesto en el puerto
  `3000`, con `healthcheck` y reinicio automático (`restart: unless-stopped`).
- `.dockerignore` — evita copiar `node_modules`, `.next`, `.git` y archivos
  locales al contexto de build.

**Modo mock y modo PostgreSQL:** `docker-compose.yml` es el modo mock (un
solo servicio, sin base de datos). El modo PostgreSQL vive en
`docker-compose.postgres.yml` y se superpone al anterior (ver «Docker con
PostgreSQL» más abajo), de modo que el flujo ya verificado
(`docker compose up --build`) no cambia.

> **Nota:** construir la imagen requiere acceso a internet (para traer la
> imagen base `node:22-slim` y para `npm install` dentro del build). La
> primera construcción demora unos 2 minutos; las siguientes reutilizan
> las capas en caché. Verificado con `docker compose up --build` en
> Docker Desktop sobre Windows.

### Docker con PostgreSQL

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build
# equivalente: npm run docker:postgres
```

Levanta tres servicios: `db` (imagen `postgis/postgis:17-3.5`, volumen
persistente `mozak-db-data`, healthcheck con `pg_isready`), `migrate` (tarea de
una sola vez que aplica las migraciones y carga la semilla; termina y sale) y
`app` (con `DATA_SOURCE=postgres`). Cuando `migrate` termina bien, arranca la
app en `http://localhost:3000`, mostrando los mismos 24 eventos pero leídos
desde PostgreSQL.

- Credenciales de **desarrollo local**: usuario `mozak`, base `mozak`,
  contraseña `mozak_dev` (cámbiala con la variable `POSTGRES_PASSWORD`). El
  puerto 5432 solo se publica en `127.0.0.1`; si lo tienes ocupado, define
  `DB_PORT` (por ejemplo `5433`).
- Detener: `docker compose -f docker-compose.yml -f docker-compose.postgres.yml down`
  (agrega `-v` para borrar también los datos de la base).

## PostgreSQL (Etapa 11)

La aplicación puede leer los eventos desde PostgreSQL + PostGIS en lugar de los
datos mock, **sin cambiar la API ni el frontend**: `DATA_SOURCE` decide qué
implementación de `EventRepository` se usa (`mock` por defecto, `postgres`).

**Ejecución local con la base en Docker** (la app corre con `npm run dev`):

```bash
# 1) Solo la base de datos
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d db

# 2) Variables: crea un archivo ".env" (lo leen Prisma y Next.js) con:
#    DATA_SOURCE=postgres
#    DATABASE_URL="postgresql://mozak:mozak_dev@localhost:5432/mozak?schema=public"

# 3) Instalar dependencias (genera el cliente de Prisma), migrar y cargar datos
npm install
npm run db:migrate
npm run db:seed

# 4) Levantar la app y probar
npm run dev
npm run test:db
```

Qué hace cada pieza:

- `prisma/schema.prisma` — modelos `Category`, `Venue`, `Source`, `Event`.
- `prisma/migrations/0001_init/migration.sql` — escrita a mano a partir del
  «Modelo de Datos»: habilita las extensiones `postgis` y `unaccent`, crea las
  tablas, las claves foráneas, los índices y las restricciones `CHECK` (precio
  ↔ gratuidad, `end_date ≥ start_date`, formato de afiche/video, rangos de
  latitud/longitud), las mismas reglas que valida Zod.
- `prisma/seed.ts` — carga los datos de `src/data/*` (valida con Zod; usa
  `upsert`, así que se puede repetir sin duplicar).
- `PostgresEventRepository` — traduce cada filtro a SQL. La búsqueda y la
  comuna usan `unaccent` para ignorar tildes y mayúsculas igual que el mock; el
  resto de los filtros usa consultas tipadas de Prisma. Todo con parámetros, sin
  concatenar texto del usuario.
- Orden: por id (igual que el mock). Orden por fecha y paginación son otra
  historia (Sprint 4).

**Alcance de esta etapa:** la extensión PostGIS queda habilitada, pero la
columna geográfica de `venue` (para la búsqueda por proximidad, HU-25) se agrega
en esa historia. Esta etapa **no** cambia el mapa de la página de detalle ni incluye inicio de
sesión de usuarios (el enlace a Google Maps llegó en la Etapa 14).

## Estado del prototipo

- ✅ **Etapa 1** — Configuración base: Next.js + TypeScript + Tailwind CSS, ESLint, estructura de carpetas y variables de entorno de ejemplo.
- ✅ **Etapa 2** — Estructura de datos mock: modelo conceptual (Event, Venue, Source, Category) tipado en TypeScript y validado con Zod; 24 eventos ficticios en 12 comunas de Santiago; abstracción `EventRepository`/`MockEventRepository` para no acoplar el resto de la app a los datos mock; script `check:data` que valida todo y prueba filtros combinados.
- ✅ **Etapa 3** — API interna: `GET /api/events` (con filtros combinables), `GET /api/events/[id]`, `GET /api/categories`, `GET /api/communes`. Valida los query params con Zod (400 si son inválidos) y responde 404 si el evento no existe.
- ✅ **Etapa 4** — Interfaz principal: header con navegación y buscador, hero con buscador principal, barra de filtros (categoría, comuna, fecha, gratis/pagado) y listado de tarjetas de eventos. La página consume `/api/events`, `/api/categories` y `/api/communes` (no importa los datos mock directamente).
- ✅ **Etapa 5** — Búsqueda y filtros: la búsqueda (con debounce de 300ms) y los filtros (categoría, comuna, fecha, gratis/pagado) ya se combinan con AND contra `/api/events`. Contador de resultados, mensaje claro de "sin resultados" y botón "Limpiar filtros" funcionando. Además, se agregó **modo oscuro** (toggle en el header, se recuerda en `localStorage`, respeta la preferencia del sistema si el usuario no eligió antes) para no tener que reintegrarlo más adelante en cada componente.
- ✅ **Etapa 6** — Página de detalle de evento (`/eventos/[id]`): imagen, título, descripción, categoría, fecha, horario, lugar, dirección, comuna, precio, mapa de ubicación (OpenStreetMap embebido, sin API key), fuente original y botón "Ver sitio oficial". Estados de carga, error y "evento no encontrado". Botón para volver al listado. También se puede volver al listado con una búsqueda aplicada desde el buscador del header.
- ✅ **Etapa 7** — Ajustes responsive: los filtros ahora ocupan todo el ancho disponible en móvil (antes se veían angostos e irregulares) y se ajustan a su contenido en pantallas más anchas; el listado pasa de 1 columna (móvil) a 2 (tablet) a 3 (notebook) a 4 (escritorio grande); los botones de la página de detalle son de ancho completo en móvil para un mejor "tap target"; y se agregó una regla global (`overflow-x: hidden`) como resguardo contra scroll horizontal accidental. Ver la sección "Responsive" más abajo para cómo probarlo.
- ✅ **Etapa 8** — Pruebas automatizadas (Épica APT-8, Sprint 2): suite de Vitest (7 archivos, 41 pruebas — ver sección «Pruebas»), con pruebas unitarias del repositorio/utilidades y pruebas de integración de la API interna, usando los datos mock reales. **Verificado**: `npm run test` ejecutado en un entorno con npm — 7/7 archivos y 41/41 pruebas en verde.
- ✅ **Etapa 9** — Docker (Sprint 3): `Dockerfile` multi-stage (`deps` → `build` → `runner`, imagen final liviana con el build standalone de Next.js) y `docker-compose.yml` (servicio `app`, puerto 3000, healthcheck). Ver sección «Docker» más abajo. **Verificado**: `docker compose up --build` ejecutado en Docker Desktop (Windows); la imagen se construyó (~107 s la primera vez) y Next.js 16.0.1 quedó "Ready" en el puerto 3000.
- ✅ **Etapa 10** — Afiche y video del evento + documentación técnica ampliada (Sprint 3): el detalle de evento muestra el afiche de fondo y el video sobre él (nuevos campos `posterImageUrl`/`videoUrl`, validación, API, 24 afiches y 3 videos de demostración); nuevo `docs/DOCUMENTACION-TECNICA.md` (arquitectura, modelo, API, guía multimedia, solución de problemas). Se agregaron 18 pruebas. **Verificado:** `npm run test` pasa en verde (8 archivos, 59 pruebas) en el entorno del usuario; la revisión visual en el navegador queda a cargo del usuario.

- ✅ **Etapa 11** — Persistencia PostgreSQL + PostGIS + Prisma (Sprint 4, HU-20): esquema Prisma, migración SQL inicial, semilla con los 24 eventos, `PostgresEventRepository` (misma batería de contrato que el mock), selección por `DATA_SOURCE` (mock por defecto), servicio `db` (`postgis/postgis:17-3.5`) y tarea `migrate` en `docker-compose.postgres.yml`. **Verificado (26-10-2026) en el entorno del usuario (Windows, Docker Desktop):** `npm install` genera el cliente de Prisma 6.19.3; `npm run test` 11 archivos / 77 pruebas en verde; `npm run build` compila con los tipos reales de Prisma; `docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build` aplica la migración, carga 24 eventos y deja la app en "Ready"; la base tiene 24 eventos y PostGIS 3.5; `npm run test:db` 33/33 en verde; revisión visual en el navegador correcta (24 eventos, 2 de Ñuñoa con `commune=nunoa`, afiche y video en el detalle). Corrección encontrada en la verificación: el healthcheck de `db` ahora usa TCP (`-h 127.0.0.1`), porque en el primer arranque la tarea `migrate` corría antes de que la base aceptara conexiones (P1001).
- ✅ **Etapa 12** — Actualización de seguridad de Next.js (26-10-2026; verificada el 30-10-2026): `next` y `eslint-config-next` pasan de 16.0.1 a **16.4.1**, la versión corregida de la rama 16 según el aviso oficial de Next.js del 14-10-2026 (<https://nextjs.org/blog/nextjs-security-update-october-14-2026>); la 16.0.1 además mostraba el aviso de CVE-2025-66478 al ejecutar `npm run dev`. Se conservan React 19.0.0 y el flag `--webpack`. Se migró `eslint.config.mjs` al formato nativo de `eslint-config-next` 16 (el modo de compatibilidad `FlatCompat` fallaba con «Converting circular structure to JSON»); `npm run lint` queda en 0 errores y 3 avisos de `react-hooks/set-state-in-effect` (`page.tsx`, `eventos/[id]/page.tsx`, `ThemeToggle.tsx`), anotados como deuda técnica. Verificada el 30-10-2026 en el entorno del usuario (Windows, Docker Desktop, Node 22.11.0), sobre la rama integrada con la Etapa 13: `npm install`, `npm ls next` (16.4.1), `npm run lint` (0 errores, 3 avisos), `npm run test` (15 archivos / 181 pruebas), `npm run build` y Docker con PostgreSQL (24 eventos sembrados, Next.js 16.4.1 «Ready») en verde. `npm audit --omit=dev` informa 4 vulnerabilidades altas que no afectan a la app en ejecución: `deepmerge-ts` llega por la herramienta de línea de comandos de Prisma (solo el contenedor de migración; la imagen de la app no la incluye) y `zod` (aviso sobre esquemas de arreglos sin límite de largo; el código no usa arreglos). Queda pendiente actualizar `zod` a 4.6.7 o superior con sus pruebas; no se usa `npm audit fix --force`, que bajaría Prisma a 6.12.0.
- ✅ **Etapa 13** — Orden, paginación y sanitización (Sprint 4, HU-21/HU-22/HU-23; verificada el 30-10-2026): `GET /api/events` acepta `sort` (`date_asc`/`date_desc`), `page` y `limit` (por defecto 20, máximo 100) y responde `meta = { total, page, limit, totalPages, sort }`; la pantalla principal muestra el selector «Ordenar por» y la navegación Anterior/Siguiente (12 por página). Nuevo método `findPage` en `EventRepository`, probado con la misma batería de contrato en el mock y en PostgreSQL (orden y paginación se resuelven en la base con `ORDER BY`/`OFFSET`/`LIMIT`). Sanitización de entradas (NFC, espacios, caracteres de control, largo, formato de comuna y categoría, parámetros repetidos). Cierra las brechas MTC_00110 y MTC_00190 y cubre MTC_00270. **Verificada el 30-10-2026 en el entorno del usuario:** `npm run test` 15 archivos / 181 pruebas, `npm run test:db` 60/60 contra PostgreSQL real, y revisión en el navegador (selector «Ordenar por», paginación, filtros, detalle y respuestas 200/400 de `/api/events`). Cambio de contrato: sin parámetros, la API ahora devuelve la primera página de 20 (antes devolvía los 24).
- 🔄 **Etapa 14** — Botón «Abrir en Google Maps» (Sprint 4, HU-28 / MA-47; **pendiente de verificación** en el equipo del usuario): en el detalle del evento se agrega un enlace oficial de Maps URLs (`https://www.google.com/maps/search/?api=1&query=...`, sin API key ni facturación) que se abre en una pestaña nueva. Usa las coordenadas del lugar; si no son utilizables (fuera de rango, no numéricas o el punto 0,0) usa «dirección, comuna, Chile» codificada; si no hay ninguna, el botón no se muestra. El mapa embebido de OpenStreetMap se **conserva** (un mapa de Google incrustado exige clave de API y cuenta de facturación). Lógica pura y probada en `src/lib/maps.ts`.

## Documentación de la evaluación

Además de este README, el proyecto cuenta con un documento maestro vivo (Claude Docs) que se mantiene actualizado clase a clase: **Documentación del Proyecto — MOZAK (APT)**, con las pestañas:

- **Resumen** — índice del documento.
- **Planificación (Scrum)** — Product Backlog y Sprint Backlog, correlacionados con el plan de pruebas oficial del curso (32 casos MTC).
- **Plan de Pruebas** — estrategia, tipos de prueba, metodología y herramientas de testing.
- **Especificaciones Técnicas** — requisitos funcionales/no funcionales, stack tecnológico, historias de usuario.
- **Modelo de Datos** — diagrama entidad-relación, modelo lógico y modelo físico (PostgreSQL + PostGIS).
- **Arquitectura del Sistema** — diagrama de componentes, diagrama de casos de uso (UML), diagrama de proceso (BPM) y plan de dockerización.

(El antiguo documento separado "Sprint Backlog — MOZAK (APT)" quedó reemplazado por la pestaña "Planificación (Scrum)" de este documento único.)

## Próximas funcionalidades (no incluidas todavía)

- Fuentes externas reales (ETL), fin del uso de datos mock en producción,
  búsqueda por proximidad con PostGIS, pagos, cuentas de usuario avanzadas, notificaciones, panel
  administrativo, versión Android vía Capacitor.
