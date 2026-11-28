# Sprint Backlog — MOZAK (APT)

> **Fuente y vigencia.** Copia versionada del detalle de sprints del documento de Drive «Planificación del Proyecto (Scrum) - MOZAK» (19-11-2026) y de Jira (MA, 23-11-2026). Si hay diferencias, **manda Jira**. «Verificado» = el equipo ejecutó el cambio en su propio equipo (Windows, Docker Desktop) y lo confirmó. El Product Backlog completo está en [`PRODUCT-BACKLOG.md`](PRODUCT-BACKLOG.md).

## Resumen

| Sprint | Épica | Sprint Goal | SP | Estado |
|--------|-------|--------------------|---:|--------|
| 1 | MA-1 | Prototipo navegable de descubrimiento de eventos con datos mock, API interna, búsqueda/filtros, detalle y diseño responsive | 33 | Completado (Etapas 1–7) |
| 2 | MA-2 | Suite de pruebas unitarias y de integración con Vitest | 28 | Completado y verificado (41 pruebas, 7 archivos) |
| 3 | MA-3 | Despliegue con un comando, multimedia en el detalle del evento y documentación técnica ampliada | 16 | Completado y verificado (Etapas 9–10) |
| 4 | MA-4 | PostgreSQL/PostGIS, brechas del plan de pruebas (orden, paginación, sanitización) y ubicación en Google Maps, sin ampliar el alcance con inicio de sesión ni roles | 22 | Completado y verificado (hasta el 19-11-2026) |
| 5 | MA-5 | Alimentar la cartelera desde fuentes externas y buscar por cercanía | 21 (+13 HU-30) | En curso; HU-30 lista (verificada 28-11-2026) |
| 6 | MA-6 | Calidad final (E2E, rendimiento) y versión Android | 13 | Planificado |

Los objetivos de los Sprints 1, 2, 3, 5 y 6 son los de la descripción de su épica en Jira; el del Sprint 4 es el del documento de planificación de Drive. Los Sprints 1 a 4 corresponden a la entrega de la defensa del 20-11-2026 (Etapas 1–14). Los Sprints 5 y 6 son la hoja de ruta posterior y pueden ajustarse.

## Sprint 1 — Prototipo con datos mock (Etapas 1–7)

| Jira | HU | Historia | SP | Estado |
|------|----|----------|---:|--------|
| MA-7 | HU-01 | Configuración base del proyecto | 2 | Listo |
| MA-8 | HU-02 | Datos mock y repositorio de eventos | 5 | Listo |
| MA-9 | HU-03 | API interna REST | 5 | Listo |
| MA-10 | HU-04 | Listado de eventos (interfaz principal) | 5 | Listo |
| MA-11 | HU-05 | Búsqueda y filtros combinables | 8 | Listo |
| MA-12 | HU-06 | Detalle de evento con mapa y fuente oficial | 5 | Listo |
| MA-13 | HU-07 | Diseño responsive (360 px a escritorio) | 3 | Listo |

**Total: 33 SP.**

## Sprint 2 — Pruebas automatizadas (Etapa 8, épica APT-8)

**Sprint Goal:** contar con una suite de pruebas automatizadas, ejecutable con un solo comando (`npm run test`), que cubra los ocho escenarios mínimos exigidos por el documento de requisitos (búsqueda, los cuatro filtros individuales, la combinación de filtros, el detalle de evento y la API interna), dejando evidencia reproducible para la evaluación.

| ID | Tipo | Historia / tarea | SP | Prioridad | Criterio de aceptación | MTC | Estado |
|----|------|------------------|---:|-----------|------------------------|-----|--------|
| APT-81 | Task | Configurar entorno de pruebas (Vitest) y estructura `*.test.ts` | 2 | Highest | `npm run test` ejecuta un archivo de prueba de ejemplo sin errores | — | Hecho |
| APT-82 | Story | Pruebas de búsqueda por texto (título, descripción, lugar, comuna) | 3 | High | Buscar «teatro» retorna solo eventos que lo contienen en esos 4 campos | 0030, 00120 | Hecho |
| APT-83 | Story | Pruebas del filtro por categoría | 2 | High | Filtrar por una categoría retorna solo eventos de esa categoría | 0040 | Hecho |
| APT-84 | Story | Pruebas del filtro por comuna | 2 | High | Filtrar por una comuna retorna solo eventos de esa comuna | 0050 | Hecho |
| APT-85 | Story | Pruebas del filtro por fecha (incluye eventos multi-día) | 3 | High | Un evento de varios días aparece si la fecha filtrada cae dentro de su rango | 0060 | Hecho |
| APT-86 | Story | Pruebas del filtro gratis/pagado | 2 | Medium | `isFree=true` retorna solo eventos con `price=0` | 0070 | Hecho |
| APT-87 | Story | Pruebas de combinación de filtros (categoría + comuna + fecha + gratis) | 5 | High | Los 4 filtros aplicados juntos se combinan con AND, igual que lo validado en la Etapa 2 (`check:data`) | 0080 | Hecho |
| APT-88 | Story | Pruebas de consulta de detalle de evento (`findById`) | 3 | Medium | Un id existente retorna el evento; uno inexistente retorna `null` | 0090, 00100, 00130 | Hecho |
| APT-89 | Story | Pruebas de integración de la API interna | 5 | High | Cada endpoint responde 200 con JSON válido; parámetros inválidos 400; id inexistente 404 | 00200, 00270 (parcial) | Hecho |
| APT-90 | Task | Documentar en el README cómo ejecutar las pruebas | 1 | Medium | El README explica el comando y qué cubre cada archivo de prueba | — | Hecho |

**Total: 28 SP.** Estado: **verificado** — `npm run test` se ejecutó en un entorno con npm: 7 de 7 archivos y 41 de 41 pruebas en verde (commit de código 501fe07; confirmación e21b77e).

## Sprint 3 — Docker, afiche y video, documentación (Etapas 9–10)

| Jira | HU | Historia | SP | Estado |
|------|----|----------|---:|--------|
| MA-23 | HU-17 | Dockerización con docker compose | 5 | Listo |
| MA-24 | HU-18 | Afiche y video del evento | 8 | Listo |
| MA-25 | HU-19 | Documentación técnica ampliada | 3 | Listo |

**Total: 16 SP.** Verificación: Etapa 9 con `docker compose up --build` en Docker Desktop (Windows); Etapa 10 con `npm run test` (8 archivos, 59 pruebas en verde, 09-10-2026) y revisión visual del detalle de tres eventos.

## Sprint 4 — Persistencia, orden, paginación, sanitización y Google Maps (Etapas 11–14)

**Sprint Goal:** dejar operativa la persistencia real en PostgreSQL + PostGIS y cerrar las brechas funcionales que detectó el plan de pruebas —listado ordenado y paginado, y entradas sanitizadas—, y sumar la ubicación del evento en Google Maps (HU-28), sin ampliar el alcance con inicio de sesión ni roles.

| Jira | HU | Historia | SP | Criterio de aceptación | MTC | Estado |
|------|----|----------|---:|------------------------|-----|--------|
| MA-26 | HU-20 | Persistencia en PostgreSQL/PostGIS | 8 | Con `DATA_SOURCE=postgres` la API devuelve los mismos 24 eventos y los mismos resultados por filtro que el modo mock; la base se levanta con un solo comando de Docker | 00210, 00260 | Listo (verificado 26-10-2026) |
| MA-27 | HU-21 | Ordenamiento y paginación de resultados | 5 | `GET /api/events` acepta `sort`, `page` y `limit` y responde `total`, `totalPages` y `sort`; la pantalla permite ordenar y cambiar de página | 00110, 00190 | Listo (verificado 30-10-2026) |
| MA-28 | HU-22 | Cerrar brechas MTC_00190 y MTC_00110 | 3 | Ambos casos quedan cubiertos por pruebas automatizadas que pasan con el mock y con PostgreSQL | 00110, 00190 | Listo (verificado 30-10-2026) |
| MA-29 | HU-23 | Sanitización avanzada de entradas | 3 | Los textos se normalizan; control, byte nulo y largos excesivos devuelven 400; la inyección SQL o HTML no altera datos ni se refleja | 00270 | Listo (verificado 30-10-2026) |
| MA-47 | HU-28 | Ver ubicación del evento en Google Maps (a pedido del usuario) | 3 | El detalle muestra «Abrir en Google Maps» (enlace oficial, sin clave): usa las coordenadas y, si no sirven, la dirección; sin datos no se muestra | — | Listo (verificado 19-11-2026) |

**Total: 22 SP** (27 planificados menos 5 de HU-29, movida al Sprint 5). La Etapa 11 incluye las subtareas MA-40, MA-41 y MA-42 (servicio `db` en compose, migraciones y semilla, `PostgresEventRepository`), todas en Listo.

## Sprint 5 — Fuentes externas, proximidad, datos reales (planificado)

| Jira | HU | Historia | SP | Estado |
|------|----|----------|---:|--------|
| MA-30 | HU-24 | Ingesta de fuentes externas (ETL): importar eventos de fuentes externas para mantener la cartelera actualizada | 8 | Por hacer |
| MA-31 | HU-25 | Búsqueda de eventos por proximidad (PostGIS): ver eventos cercanos a la ubicación del usuario | 8 | Por hacer |
| MA-48 | HU-29 | Dejar de usar datos mock: la API y el frontend leen solo del repositorio real; carga inicial de eventos reales; Docker Compose levanta app + base sin pasos manuales | 5 | Por hacer (depende de HU-20 y HU-24) |
| MA-49 | HU-30 | Perfiles de creador y administrador con aprobación de eventos dentro de la norma | 13 (propuesta) | Listo (verificado 28-11-2026) |

Subtareas de HU-30: MA-50 (migración 0002), MA-51 (autenticación y sesiones), MA-52 (flujo de moderación, política y API) y MA-53 (pantallas y documentación). Detalle técnico y pasos de verificación: [`ROLES-Y-MODERACION.md`](ROLES-Y-MODERACION.md).

## Sprint 6 — Rendimiento, E2E y Android (planificado)

| Jira | HU | Historia | SP | Estado |
|------|----|----------|---:|--------|
| MA-32 | HU-26 | Rendimiento y pruebas E2E (optimización y Playwright) | 5 | Por hacer |
| MA-33 | HU-27 | Versión Android (Capacitor) | 8 | Por hacer |

## Ceremonias y registro

Las ceremonias Scrum del proyecto, su adaptación a un equipo pequeño y el registro de aprendizajes están en [`METODOLOGIA.md`](METODOLOGIA.md) y [`RETROSPECTIVAS.md`](RETROSPECTIVAS.md). La Definition of Done aplicable a cada historia está en [`DEFINITION-OF-DONE.md`](DEFINITION-OF-DONE.md).
