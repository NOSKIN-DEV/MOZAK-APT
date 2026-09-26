# APT — Plataforma de descubrimiento de entretenimiento y actividades

> Proyecto de Título (APT) — Ingeniería en Informática.
> **Estado actual: prototipo/MVP en desarrollo (Etapa 1 de 10).**

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
  app/          Rutas y páginas (Next.js App Router)
  components/   Componentes de interfaz reutilizables
  lib/
    schemas.ts        Esquemas Zod (validan Category/Venue/Source/Event y filtros)
    repositories/      Abstracción EventRepository + MockEventRepository
  types/         Modelos e interfaces (Event, Venue, Source, Category)
  data/          Datos mock locales (24 eventos, 12 venues, 3 sources, 9 categorías)
public/         Archivos estáticos
scripts/
  check-mock-data.ts   Valida los datos mock y prueba el repositorio (npm run check:data)
```

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

## Próximas funcionalidades (no incluidas todavía)

- API interna `/api/events`, `/api/categories`, `/api/communes` (Etapa 3)
- Interfaz principal: header, hero, buscador, listado (Etapa 4)
- Búsqueda y filtros combinables en la UI (Etapa 5)
- Página de detalle de evento (Etapa 6)
- Ajustes responsive finos (Etapa 7)
- Pruebas unitarias/integración (Etapa 8)
- Docker + docker-compose (Etapa 9)
- Documentación técnica ampliada (Etapa 10)
- Reemplazo de datos mock por PostgreSQL + PostGIS y fuentes externas
  reales, pagos, cuentas de usuario avanzadas, notificaciones, panel
  administrativo, versión Android vía Capacitor.
