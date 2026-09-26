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
- PostgreSQL 17.x + PostGIS 3.5.x + Prisma 6.x *(etapas futuras)*
- Docker *(etapa futura)*
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

En el prototipo, `DATA_SOURCE=mock` es suficiente: no se requiere base de
datos todavía.

## Estructura del proyecto

```
src/
  app/
    api/             API interna (Etapa 3): events, events/[id], categories, communes
    page.tsx           Página principal (Etapa 4/5): header, hero, filtros y listado
    eventos/[id]/      Página de detalle de evento (Etapa 6)
  components/    Header, Hero, SearchBar, FiltersBar, EventCard, EventGrid, EventLocationMap, ThemeToggle
  lib/
    schemas.ts        Esquemas Zod (validan Category/Venue/Source/Event y filtros)
    repositories/      Abstracción EventRepository + MockEventRepository
    api/               Serialización de eventos y parseo de query params para la API
    format.ts          Formato de precio (CLP) y fechas en español
  types/         Modelos e interfaces (Event, Venue, Source, Category)
  data/          Datos mock locales (24 eventos, 12 venues, 3 sources, 9 categorías)
public/         Archivos estáticos
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

Ejemplos (pégalos en el navegador con el servidor corriendo):

```
http://localhost:3000/api/events
http://localhost:3000/api/events?search=teatro
http://localhost:3000/api/events?category=cat-ferias&commune=Recoleta&isFree=true
http://localhost:3000/api/events/event-001
http://localhost:3000/api/categories
http://localhost:3000/api/communes
```

Un query param inválido (ej. `isFree=si` o una fecha mal formada) responde
`400` con el detalle del error; un id inexistente en `/api/events/[id]`
responde `404`.

## Página de detalle de evento

`GET /eventos/[id]` (ej. `http://localhost:3000/eventos/event-001`) muestra
el detalle completo de un evento: imagen, categoría, título, descripción,
fecha, horario, lugar, dirección, comuna, precio, un mapa de ubicación
(OpenStreetMap embebido, no requiere API key) y un botón "Ver sitio
oficial" que abre `sourceUrl` en una pestaña nueva. Si el id no existe,
muestra un mensaje claro de "Evento no encontrado" con un botón para
volver al listado.

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
| `npm run test`      | Ejecuta las pruebas (Vitest)                    |
| `npm run check:data`| Valida los datos mock y prueba filtros combinados |

## Pruebas

*(Se incorporarán en la Etapa 8: búsqueda, filtros y API de eventos.)*

## Docker

*(Se incorporará en la Etapa 9.)*

## Estado del prototipo

- ✅ **Etapa 1** — Configuración base: Next.js + TypeScript + Tailwind CSS, ESLint, estructura de carpetas y variables de entorno de ejemplo.
- ✅ **Etapa 2** — Estructura de datos mock: modelo conceptual (Event, Venue, Source, Category) tipado en TypeScript y validado con Zod; 24 eventos ficticios en 12 comunas de Santiago; abstracción `EventRepository`/`MockEventRepository` para no acoplar el resto de la app a los datos mock; script `check:data` que valida todo y prueba filtros combinados.
- ✅ **Etapa 3** — API interna: `GET /api/events` (con filtros combinables), `GET /api/events/[id]`, `GET /api/categories`, `GET /api/communes`. Valida los query params con Zod (400 si son inválidos) y responde 404 si el evento no existe.
- ✅ **Etapa 4** — Interfaz principal: header con navegación y buscador, hero con buscador principal, barra de filtros (categoría, comuna, fecha, gratis/pagado) y listado de tarjetas de eventos. La página consume `/api/events`, `/api/categories` y `/api/communes` (no importa los datos mock directamente).
- ✅ **Etapa 5** — Búsqueda y filtros: la búsqueda (con debounce de 300ms) y los filtros (categoría, comuna, fecha, gratis/pagado) ya se combinan con AND contra `/api/events`. Contador de resultados, mensaje claro de "sin resultados" y botón "Limpiar filtros" funcionando. Además, se agregó **modo oscuro** (toggle en el header, se recuerda en `localStorage`, respeta la preferencia del sistema si el usuario no eligió antes) para no tener que reintegrarlo más adelante en cada componente.
- ✅ **Etapa 6** — Página de detalle de evento (`/eventos/[id]`): imagen, título, descripción, categoría, fecha, horario, lugar, dirección, comuna, precio, mapa de ubicación (OpenStreetMap embebido, sin API key), fuente original y botón "Ver sitio oficial". Estados de carga, error y "evento no encontrado". Botón para volver al listado. También se puede volver al listado con una búsqueda aplicada desde el buscador del header.
- ✅ **Etapa 7** — Ajustes responsive: los filtros ahora ocupan todo el ancho disponible en móvil (antes se veían angostos e irregulares) y se ajustan a su contenido en pantallas más anchas; el listado pasa de 1 columna (móvil) a 2 (tablet) a 3 (notebook) a 4 (escritorio grande); los botones de la página de detalle son de ancho completo en móvil para un mejor "tap target"; y se agregó una regla global (`overflow-x: hidden`) como resguardo contra scroll horizontal accidental. Ver la sección "Responsive" más abajo para cómo probarlo.

## Documentación de la evaluación

Además de este README, el proyecto cuenta con dos documentos vivos (Claude Docs) que se mantienen actualizados clase a clase:

- **Sprint Backlog — MOZAK (APT)**: planificación Scrum (Product Backlog y Sprint Backlog), correlacionada con el plan de pruebas oficial del curso (32 casos MTC).
- **Documentación Técnica — MOZAK (APT)**: Plan de Pruebas (estrategia y metodología de testing), Especificaciones Técnicas (requisitos funcionales/no funcionales, stack, historias de usuario), Modelo de Datos (diagrama entidad-relación, modelo lógico y físico PostgreSQL+PostGIS) y Arquitectura del Sistema (diagrama de componentes, diagrama de casos de uso, diagrama de proceso BPM y plan de dockerización).

## Próximas funcionalidades (no incluidas todavía)

- Pruebas unitarias/integración (Etapa 8)
- Docker + docker-compose (Etapa 9)
- Documentación técnica ampliada (Etapa 10)
- Reemplazo de datos mock por PostgreSQL + PostGIS y fuentes externas
  reales, pagos, cuentas de usuario avanzadas, notificaciones, panel
  administrativo, versión Android vía Capacitor.
