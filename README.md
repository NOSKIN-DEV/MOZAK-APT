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
  lib/          Lógica de negocio, repositorios, utilidades
  types/        Modelos y tipos (Event, Venue, Source, Category)
  data/         Datos mock locales
public/         Archivos estáticos
```

## Comandos disponibles

| Comando           | Descripción                          |
|-------------------|---------------------------------------|
| `npm run dev`     | Levanta el servidor de desarrollo     |
| `npm run build`   | Genera el build de producción         |
| `npm run start`   | Sirve el build de producción          |
| `npm run lint`    | Ejecuta ESLint                        |
| `npm run test`    | Ejecuta las pruebas (Vitest)          |

## Pruebas

*(Se incorporarán en la Etapa 8: búsqueda, filtros y API de eventos.)*

## Docker

*(Se incorporará en la Etapa 9.)*

## Estado del prototipo — Etapa 1 ✅

Configuración base del proyecto: Next.js + TypeScript + Tailwind CSS,
ESLint, estructura de carpetas y variables de entorno de ejemplo. Página
de inicio placeholder para verificar que el proyecto arranca.

## Próximas funcionalidades (no incluidas todavía)

- Datos mock de eventos (Etapa 2)
- API interna `/api/events`, `/api/categories`, `/api/communes` (Etapa 3)
- Interfaz principal: header, hero, buscador, listado (Etapa 4)
- Búsqueda y filtros combinables (Etapa 5)
- Página de detalle de evento (Etapa 6)
- Ajustes responsive finos (Etapa 7)
- Pruebas unitarias/integración (Etapa 8)
- Docker + docker-compose (Etapa 9)
- Documentación técnica ampliada (Etapa 10)
- Reemplazo de datos mock por PostgreSQL + PostGIS y fuentes externas
  reales, pagos, cuentas de usuario avanzadas, notificaciones, panel
  administrativo, versión Android vía Capacitor.
