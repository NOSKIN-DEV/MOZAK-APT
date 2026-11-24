# Product Backlog — MOZAK (APT)

> **Fuente y vigencia.** Copia versionada en git del Product Backlog que vive en el documento de Drive «Planificación del Proyecto (Scrum) - MOZAK» (última edición 19-11-2026) y en Jira (espacio **MOZAK-APT**, clave **MA**, consultado el 23-11-2026). Si Jira y este archivo difieren, **manda Jira**. Los estados «Verificado» son los que el equipo registró tras ejecutar el cambio en su propio equipo; lo que no tiene esa marca está pendiente de verificación.

## Cómo se organiza

- Cada **Sprint es una Épica** de Jira (MA-1 a MA-6) y cada **historia de usuario (HU)** es una Historia con criterios de aceptación; las tareas técnicas son Subtareas.
- Los **puntos de historia (SP)** se registran en la descripción y en la etiqueta `sp-N`.
- Cada historia se cruza con el plan de pruebas oficial del curso (32 casos, **MTC_0020 – MTC_00330**) para la trazabilidad (ver «Trazabilidad con el plan de pruebas»).
- El detalle de cada sprint está en [`SPRINT-BACKLOG.md`](SPRINT-BACKLOG.md). La visión del producto está en [`PRODUCT-VISION.md`](PRODUCT-VISION.md) y la metodología en [`METODOLOGIA.md`](METODOLOGIA.md).

## Backlog por historias

| HU | Jira | Historia | SP | Etapa | Sprint | Estado |
|----|------|----------|---:|-------|--------|--------|
| HU-01 | MA-7 | Configuración base del proyecto | 2 | 1 | 1 | Listo |
| HU-02 | MA-8 | Datos mock y repositorio de eventos | 5 | 2 | 1 | Listo |
| HU-03 | MA-9 | API interna REST | 5 | 3 | 1 | Listo |
| HU-04 | MA-10 | Listado de eventos (interfaz principal) | 5 | 4 | 1 | Listo |
| HU-05 | MA-11 | Búsqueda y filtros combinables | 8 | 5 | 1 | Listo |
| HU-06 | MA-12 | Detalle de evento con mapa y fuente oficial | 5 | 6 | 1 | Listo |
| HU-07 | MA-13 | Diseño responsive (360 px a escritorio) | 3 | 7 | 1 | Listo |
| HU-08 | MA-14 | Entorno de pruebas Vitest y documentación (APT-81, APT-90) | 3 | 8 | 2 | Listo |
| HU-09 | MA-15 | Pruebas de búsqueda por texto (APT-82) | 3 | 8 | 2 | Listo |
| HU-10 | MA-16 | Pruebas del filtro por categoría (APT-83) | 2 | 8 | 2 | Listo |
| HU-11 | MA-17 | Pruebas del filtro por comuna (APT-84) | 2 | 8 | 2 | Listo |
| HU-12 | MA-18 | Pruebas del filtro por fecha, incluye multi-día (APT-85) | 3 | 8 | 2 | Listo |
| HU-13 | MA-19 | Pruebas del filtro gratis/pagado (APT-86) | 2 | 8 | 2 | Listo |
| HU-14 | MA-20 | Pruebas de combinación de filtros (APT-87) | 5 | 8 | 2 | Listo |
| HU-15 | MA-21 | Pruebas de detalle de evento `findById` (APT-88) | 3 | 8 | 2 | Listo |
| HU-16 | MA-22 | Pruebas de integración de la API interna (APT-89) | 5 | 8 | 2 | Listo |
| HU-17 | MA-23 | Dockerización con docker compose | 5 | 9 | 3 | Listo |
| HU-18 | MA-24 | Afiche y video del evento | 8 | 10 | 3 | Listo |
| HU-19 | MA-25 | Documentación técnica ampliada | 3 | 10 | 3 | Listo |
| HU-20 | MA-26 | Persistencia en PostgreSQL/PostGIS | 8 | 11 | 4 | Listo (verificado 26-10-2026) |
| HU-21 | MA-27 | Ordenamiento y paginación de resultados | 5 | 13 | 4 | Listo (verificado 30-10-2026) |
| HU-22 | MA-28 | Cerrar brechas funcionales MTC_00190 y MTC_00110 | 3 | 13 | 4 | Listo (verificado 30-10-2026) |
| HU-23 | MA-29 | Sanitización avanzada de entradas | 3 | 13 | 4 | Listo (verificado 30-10-2026) |
| HU-28 | MA-47 | Ver ubicación del evento en Google Maps (pedido del usuario) | 3 | 14 | 4 | Listo (verificado 19-11-2026) |
| HU-24 | MA-30 | Ingesta de fuentes externas (ETL) | 8 | — | 5 | Por hacer |
| HU-25 | MA-31 | Búsqueda de eventos por proximidad (PostGIS) | 8 | — | 5 | Por hacer |
| HU-29 | MA-48 | Dejar de usar datos mock (pedido del usuario; depende de HU-20 y HU-24) | 5 | — | 5 | Por hacer |
| HU-30 | MA-49 | Perfiles de creador y administrador con aprobación de eventos dentro de la norma (pedido del usuario) | 13 (propuesta) | 15 | 5 | **Implementada en la rama `feature/roles-moderacion`; pendiente de verificación** (Jira: Por hacer) |
| HU-26 | MA-32 | Rendimiento y pruebas E2E | 5 | — | 6 | Por hacer |
| HU-27 | MA-33 | Versión Android | 8 | — | 6 | Por hacer |

La Etapa 12 (actualización de seguridad de Next.js 16.4.1 y migración de ESLint) es mantenimiento y **no tiene historia propia** en Jira.

## Avance

| Sprint | Épica Jira | Alcance | HU | SP | Estado |
|--------|-----------|---------|----|---:|--------|
| 1 | MA-1 | Etapas 1–7: prototipo con datos mock | HU-01…07 | 33 | Listo |
| 2 | MA-2 | Etapa 8: pruebas automatizadas | HU-08…16 | 28 | Listo |
| 3 | MA-3 | Etapas 9–10: Docker, afiche y video, documentación | HU-17…19 | 16 | Listo |
| 4 | MA-4 | PostgreSQL/PostGIS, brechas del plan de pruebas y Google Maps | HU-20…23, HU-28 | 22 | Listo |
| 5 | MA-5 | ETL, proximidad, datos reales (+ HU-30 propuesta) | HU-24, 25, 29 (+30) | 21 (+13) | Por hacer |
| 6 | MA-6 | Rendimiento, E2E y Android | HU-26, 27 | 13 | Por hacer |

- **Al 19-11-2026 (entrega de la defensa, Etapas 1–14):** 24 de 29 historias completadas; **99 de 133 puntos (74 %)**.
- **Efecto de HU-30:** si se acepta como parte del plan (13 puntos propuestos), el total pasa a 146 puntos y 30 historias; el avance quedaría en 99 de 146 (68 %) hasta que HU-30 se verifique. El denominador cambia por un pedido del usuario, no por un error de planificación.

## Trazabilidad con el plan de pruebas

**(brecha)** = caso que el plan espera pero el prototipo aún no implementaba (al momento de detectarse); **(parcial)** = cubierto solo en parte.

| Épica / funcionalidad | Etapa | Casos de prueba (MTC) | Sprint | Estado |
|----------------------|-------|-----------------------|--------|--------|
| Configuración base | 1 | — | 1 | Done |
| Datos mock y repositorio | 2 | MTC_00260 | 1 | Done |
| API interna | 3 | MTC_00200; MTC_00190 (brecha → Etapa 13); MTC_00270 (parcial → Etapa 13) | 1 | Done |
| Interfaz principal | 4 | MTC_0020 | 1 | Done |
| Búsqueda y filtros | 5 | MTC_0030, 0040, 0050, 0060, 0070, 0080, 00120; MTC_00110 (brecha → Etapa 13) | 1 | Done |
| Detalle de evento | 6 | MTC_0090, 00100, 00130, 00140 | 1 | Done |
| Responsive | 7 | MTC_00160, 00170 | 1 | Done |
| Pruebas automatizadas | 8 | MTC_00280, 00290 | 2 | Verificado |
| Docker | 9 | MTC_00320 | 3 | Verificado |
| Afiche y video del evento | 10 | MTC_0090, 00100 | 3 | Verificado |
| Persistencia PostgreSQL/PostGIS | 11 | MTC_00210, 00260 | 4 | Verificado (26-10-2026) |
| Actualización de seguridad de Next.js 16.4.1 | 12 | — | 4 | Verificado (30-10-2026) |
| Orden, paginación y sanitización | 13 | MTC_00110, 00190, 00270 | 4 | Verificado (30-10-2026) |
| Ubicación en Google Maps | 14 | — | 4 | Verificado (19-11-2026) |
| Perfiles y moderación (HU-30) | 15 | — (el plan oficial no lo contempla; ver [`PLAN-DE-PRUEBAS.md`](PLAN-DE-PRUEBAS.md)) | 5 | Pendiente de verificación |
| Fin de los datos mock (HU-29) | — | — | 5 | Pendiente |
| Importación y normalización de fuentes (ETL) | — | MTC_00220, 00230, 00240, 00250 | 5 | Pendiente |
| Geolocalización y proximidad | — | MTC_00150 | 5 | Pendiente |
| Rendimiento y carga | — | MTC_00180, 00300, 00310 | 6 | Pendiente |
| Empaquetado Android (Capacitor) | — | MTC_00330 | 6 | Pendiente |

## Pedidos del usuario y cambios al backlog

| Fecha | Cambio | Motivo |
|-------|--------|--------|
| 09-10-2026 | Se agregan HU-28 (Google Maps) y HU-29 (fin de los datos mock) | Pedidos del usuario (etiqueta `pedido-usuario`) |
| 19-11-2026 | HU-29 pasa del Sprint 4 al Sprint 5 | Depende de la ingesta de fuentes externas (HU-24) |
| 19-11-2026 | HU-28 cerrada tras su verificación visual | Etapa 14 verificada |
| 23-11-2026 | Se agrega HU-30 (perfiles de creador y administrador, moderación) al Sprint 5 | Pedido del usuario: el consumidor sigue sin cuenta; solo el administrador publica. Cambia el alcance acordado «sin inicio de sesión ni roles» |

## Fuera de alcance por ahora

Pagos, cuentas de consumidor, notificaciones, cambio y recuperación de contraseña, subida de imágenes por los creadores y versión Android (HU-27) quedan fuera de lo implementado. Lo que el equipo definió como pendiente de decisión (validación de negocio, política de fuentes de ingesta, privacidad y datos) **no está en este backlog** hasta que se solicite.
