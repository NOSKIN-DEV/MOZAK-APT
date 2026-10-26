# Documentación técnica — MOZAK (APT)

Documento de referencia para quien vaya a mantener o ampliar el proyecto
(Etapa 10, actualizado en la Etapa 11 con la persistencia en PostgreSQL).
Complementa al `README.md`, que cubre instalación y uso básico.

## 1. Arquitectura

```
┌───────────────────────────── Navegador ─────────────────────────────┐
│  src/app/page.tsx            listado, búsqueda y filtros            │
│  src/app/eventos/[id]/       detalle (afiche de fondo + video)      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ fetch (JSON)
┌───────────────────────────────▼─────────────────────────────────────┐
│  API interna — src/app/api/*/route.ts                               │
│  valida query params con Zod → llama al repositorio → serializa     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ interfaz EventRepository
┌───────────────────────────────▼─────────────────────────────────────┐
│  DATA_SOURCE=mock (defecto)   |    DATA_SOURCE=postgres            │
│  MockEventRepository               PostgresEventRepository          │
│  lee src/data/*                    lee PostgreSQL + PostGIS (Prisma)│
└─────────────────────────────────────────────────────────────────────┘
```

Reglas que sostienen la arquitectura:

- **La interfaz nunca importa `src/data` directamente.** Siempre consume la
  API interna; así reemplazar los datos mock por PostgreSQL no obliga a
  tocar el frontend.
- **Todo acceso a datos pasa por `EventRepository`**
  (`src/lib/repositories/event-repository.ts`). Qué implementación hay detrás
  lo decide `DATA_SOURCE` (`src/lib/repositories/factory.ts`); la API y el
  frontend no cambian entre `mock` y `postgres`.
- **Toda entrada se valida con Zod** (`src/lib/schemas.ts`) antes de llegar al
  repositorio: un parámetro inválido responde `400`, no falla más adentro.
- **Los datos mock son ficticios** y están marcados como datos de
  demostración.

### Estructura de carpetas

| Ruta | Contenido |
|---|---|
| `src/app/` | Páginas (App Router) y rutas de la API interna |
| `src/components/` | Componentes de interfaz (`EventCard`, `EventMedia`, `FiltersBar`, …) |
| `src/lib/schemas.ts` | Esquemas Zod de Category / Venue / Source / Event y filtros |
| `src/lib/repositories/` | Interfaz `EventRepository`, `MockEventRepository`, `PostgresEventRepository`, fábrica por `DATA_SOURCE` y batería de contrato compartida |
| `src/lib/db/` | Cliente de Prisma (singleton), solo se carga con `DATA_SOURCE=postgres` |
| `prisma/` | `schema.prisma`, migración SQL inicial y semilla (`seed.ts`) |
| `src/lib/api/` | Serialización (`toApiEvent`) y parseo de query params |
| `src/data/` | Datos mock: 24 eventos, 12 venues, 3 fuentes, 9 categorías |
| `src/types/` | Modelos TypeScript |
| `public/media/` | Afiches (`posters/`) y videos (`videos/`) de demostración |
| `scripts/` | `check-mock-data.ts` (valida los datos mock) |
| `docs/` | Esta documentación |

## 2. Modelo `Event`

Definido en `src/types/event.ts` y validado en `src/lib/schemas.ts`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | `event-001` … |
| `externalId` | string \| null | id en la fuente original |
| `title`, `description` | string | obligatorios |
| `category` | string | referencia a `Category.id` |
| `startDate`, `endDate` | `YYYY-MM-DD` | `endDate ≥ startDate` |
| `startTime`, `endTime` | `HH:mm` | 24 h |
| `price`, `isFree` | number, boolean | `isFree` ⇔ `price = 0` |
| `imageUrl` | URL \| null | foto principal (tarjetas del listado) |
| **`posterImageUrl`** | ruta/URL \| null | **afiche de fondo del detalle (Etapa 10)** |
| **`videoUrl`** | ruta/URL \| null | **video que se reproduce sobre el afiche (Etapa 10)** |
| `sourceUrl` | URL | publicación original |
| `sourceId`, `venueId` | string | referencias a `Source` y `Venue` |

## 3. API interna

| Endpoint | Respuesta |
|---|---|
| `GET /api/events` | `200 { data: ApiEvent[], meta: { total } }` |
| `GET /api/events/[id]` | `200 { data: ApiEvent }` · `404 { error }` |
| `GET /api/categories` | `200 { data: Category[] }` |
| `GET /api/communes` | `200 { data: string[] }` (sin duplicados, orden alfabético) |

Filtros de `GET /api/events` (opcionales, combinables con AND): `search`,
`category`, `commune`, `isFree` (`true`/`false`), `dateFrom`, `dateTo`
(`YYYY-MM-DD`). Un valor inválido responde `400` con
`{ error, issues: [{ path, message }] }`.

Ejemplo de `GET /api/events/event-002`:

```json
{
  "data": {
    "id": "event-002",
    "externalId": null,
    "title": "Concierto de jazz en el parque",
    "description": "Trío de jazz instrumental en formato al aire libre, entrada liberada por orden de llegada.",
    "category": { "id": "cat-conciertos", "name": "Conciertos" },
    "venue": {
      "id": "venue-02",
      "name": "Parque Demo Providencia",
      "address": "Av. Providencia 1200",
      "commune": "Providencia",
      "city": "Santiago",
      "latitude": -33.4264,
      "longitude": -70.6152
    },
    "source": {
      "name": "Portal Cultural Demo",
      "organization": "Red de Espacios Culturales (datos ficticios)",
      "url": "https://demo-portal-cultural.example.com"
    },
    "startDate": "2026-10-05",
    "endDate": "2026-10-05",
    "startTime": "19:30",
    "endTime": "22:00",
    "price": 8000,
    "isFree": false,
    "imageUrl": "https://picsum.photos/seed/apt-event-002/800/450",
    "posterImageUrl": "/media/posters/event-002.svg",
    "videoUrl": "/media/videos/promo-a.mp4",
    "sourceUrl": "https://demo-portal-cultural.example.com/eventos/event-002"
  }
}
```

## 4. Afiche y video del evento (Etapa 10)

Al abrir un evento (`/eventos/[id]`) la página muestra:

1. **Afiche como fondo de la página**: el afiche del evento, fijo, desenfocado
   y atenuado (para no restar legibilidad al contenido). Componente
   `EventPosterBackdrop`.
2. **Cabecera de la tarjeta (`EventMediaHero`)**: el afiche nítido ocupa el
   fondo y **encima se reproduce el video** del evento (con controles; no
   arranca solo). Si el evento no tiene video, se muestra su foto
   (`imageUrl`) enmarcada sobre el afiche.

Todo es opcional y degrada sin romperse:

| El evento tiene… | Resultado |
|---|---|
| afiche + video | afiche de fondo, video encima |
| afiche + foto, sin video | afiche de fondo, foto enmarcada encima |
| solo afiche | afiche como cabecera |
| solo foto (`imageUrl`) | comportamiento anterior a la Etapa 10 |
| nada | ícono 🗓️ |
| el afiche o el video fallan al cargar | se descarta ese elemento y se muestra lo que quede |

### Cómo agregar afiche y video a un evento

1. Copia los archivos a `public/media/posters/` y `public/media/videos/`.
   Recomendado: afiche 16:9 (p. ej. 1280×720; SVG, JPG, PNG o WebP) y video
   MP4 H.264 (`yuv420p`, con `+faststart`), idealmente de pocos MB.
2. En `src/data/events.ts`, en el evento correspondiente:
   ```ts
   posterImageUrl: "/media/posters/mi-evento.jpg",
   videoUrl: "/media/videos/mi-evento.mp4",
   ```
   Usa `null` si no hay. También se aceptan URLs absolutas `http(s)://…`.
3. Ejecuta `npm run check:data` (valida el formato de las rutas) y
   `npm run test` (además comprueba que cada archivo local referenciado
   exista en `public/`).

**Validación** (`mediaUrl` en `src/lib/schemas.ts`): solo se aceptan rutas
locales que empiecen con `/` (pero no `//`) o URLs `http(s)://`, sin
espacios. Se rechazan `javascript:`, `ftp:`, `//host/…` y rutas sin `/`
inicial, porque el valor termina en un atributo `src`.

> **Recursos de demostración.** Los 24 afiches (`public/media/posters/*.svg`)
> y los 3 videos (`promo-a/b/c.mp4`) son material original generado para el
> prototipo, no publicidad real de ningún evento. 9 de los 24 eventos tienen
> video; los otros 15 sirven para probar el caso sin video.

## 5. Pruebas

`npm run test` ejecuta Vitest (sin servidor ni base de datos): pruebas
unitarias del repositorio y utilidades, e integración de las rutas de la API
invocando directamente sus handlers. Usan los datos mock reales. Detalle por
archivo en la sección «Pruebas» del README. Pendiente a futuro: pruebas E2E
con Playwright (MTC_00280/00290) y pruebas de rendimiento.

**Batería de contrato (Etapa 11).** Las pruebas del repositorio viven en
`src/lib/repositories/event-repository.contract.ts` y se ejecutan contra
cada implementación de `EventRepository`: `MockEventRepository` en
`npm run test`, y `PostgresEventRepository` en `npm run test:db` (archivos
`*.db.test.ts`, requieren la base levantada con migración y semilla). Si
ambas implementaciones pasan la misma batería, cambiar `DATA_SOURCE` no altera
el comportamiento visible.

## 5.1 Persistencia en PostgreSQL (Etapa 11)

**Estado: verificada (26-10-2026)** en el entorno del usuario: `npm run test` (77 pruebas), `npm run build`, Docker con PostgreSQL + PostGIS 3.5 y `npm run test:db` (33 pruebas) en verde.

- **Esquema:** `prisma/schema.prisma` (modelos `Category`, `Venue`, `Source`,
  `Event`; tablas y columnas en snake_case). La migración inicial
  (`prisma/migrations/0001_init/migration.sql`) está escrita a mano y agrega lo
  que Prisma no modela: extensiones `postgis` y `unaccent`, y restricciones
  `CHECK` (gratuidad ↔ precio, fechas, formato de afiche/video, rangos de
  coordenadas).
- **Diferencias con el documento «Modelo de Datos» original:** `price` es
  `integer` (CLP no tiene decimales) y `latitude`/`longitude` son
  `double precision` (más simple de mapear en Prisma); `category.sort_order`
  conserva el orden de presentación del filtro; la columna
  `venue.location geography(Point, 4326)` y su índice GiST **se agregan con la
  historia de proximidad (HU-25)**, no en esta etapa (una columna generada que
  Prisma no conoce provocaría diferencias en `migrate dev`). PostGIS ya queda
  habilitado.
- **Filtros:** búsqueda y comuna se resuelven con SQL parametrizado y
  `unaccent` (igual semántica que `normalize()` del mock: sin mayúsculas ni
  tildes); categoría, gratis y fechas, con consultas tipadas de Prisma.
  Los eventos que solapan la ventana `[dateFrom, dateTo]` se incluyen igual
  que en el mock. Orden: por id.
- **Fechas y horas:** Prisma entrega `DATE`/`TIME` como `Date` en UTC;
  `postgres-mapping.ts` los convierte a `YYYY-MM-DD` / `HH:mm`.
- **Comandos:** `npm run db:migrate`, `npm run db:seed`, `npm run test:db`
  (ver «PostgreSQL» en el README).

## 6. Docker

`docker compose up --build` construye una imagen multi-stage
(`base → deps → build → runner`, más una etapa `tools` para migraciones) con el
servidor *standalone* de Next.js y la expone en `http://localhost:3000`
(modo mock). `public/` (incluido `public/media/`) se copia a la imagen final.

Modo PostgreSQL: `docker compose -f docker-compose.yml -f
docker-compose.postgres.yml up --build` (o `npm run docker:postgres`) agrega
el servicio `db` (`postgis/postgis:17-3.5`, volumen y healthcheck), la tarea
`migrate` (aplica migraciones y semilla) y arranca la app con
`DATA_SOURCE=postgres`. La imagen incluye OpenSSL porque el motor de Prisma lo
necesita. Más detalle en la sección «Docker» del README.

## 7. Convenciones

- TypeScript estricto, incluido `noUncheckedIndexedAccess` (indexar un
  arreglo devuelve `T | undefined`).
- Commits en inglés con prefijo convencional (`feat:`, `fix:`, `docs:`,
  `test:`).
- Los scripts `dev` y `build` usan `--webpack` (ver nota sobre Turbopack en
  el README).

## 8. Solución de problemas

| Síntoma | Causa probable / solución |
|---|---|
| `npm run test` dice «No test files found» | La carpeta no tiene los archivos de prueba; extrae el zip completo del proyecto |
| Panic de Turbopack en Windows | Usa los scripts del proyecto (ya traen `--webpack`) y evita carpetas sincronizadas con OneDrive |
| `docker compose up` falla con «port is already allocated» | Detén `npm run dev` u otro proceso en el puerto 3000 |
| `docker compose` no conecta | Abre Docker Desktop y espera a «Engine running» |
| El video no se reproduce | Verifica que sea MP4 H.264 y que la ruta exista bajo `public/`; el navegador lo descarta solo y muestra el afiche |
| Los cambios de datos no aparecen en Docker | Reconstruye con `docker compose up --build` |
| `DATA_SOURCE inválido` / `requiere definir DATABASE_URL` | `DATA_SOURCE` solo acepta `mock` o `postgres`; con `postgres` hay que definir `DATABASE_URL` (ver `.env.example`) |
| `Environment variable not found: DATABASE_URL` en `prisma migrate` | La CLI de Prisma lee `.env` (no `.env.local`): crea `.env` con `DATABASE_URL` |
| `Can't reach database server` | Levanta el servicio `db` (`docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d db`) y revisa host/puerto de `DATABASE_URL` (`localhost` fuera de Docker, `db` dentro) |
| `npm run test:db` falla al conectar o con 0 eventos | Falta aplicar `npm run db:migrate` y `npm run db:seed` |
| `migrate` falla con `P1001: Can't reach database server at db:5432` en el primer arranque | En el primer arranque la imagen de PostgreSQL usa un servidor temporal solo por socket. El healthcheck de `db` usa `-h 127.0.0.1` (TCP) para no darlo por listo antes de tiempo; si ocurre igual, vuelve a ejecutar el mismo `docker compose ... up` (la base ya queda inicializada) |
| Puerto 5432 ocupado | Define `DB_PORT=5433` y ajusta el puerto en `DATABASE_URL` |

## 9. Limitaciones conocidas y trabajo futuro

- El modo por defecto sigue siendo `mock`; dejar de usar datos mock en la
  aplicación real (HU-29) y cargar eventos reales (ETL) son historias
  posteriores. La columna geográfica de `venue` y la búsqueda por
  proximidad quedan para HU-25.
- No hay `package-lock.json` versionado; las dependencias están fijadas a
  versiones exactas en `package.json`, salvo `prisma` y `@prisma/client`
  (`^6.16.0`, rango 6.x; conviene fijarlos al versionar el lockfile).
- Brechas detectadas por el plan de pruebas: ordenamiento por fecha
  (MTC_00110) y paginación (MTC_00190).
- Los afiches y videos son de demostración; en producción deberían servirse
  desde almacenamiento/CDN (el esquema ya acepta URLs absolutas).
