# Definición del Proyecto APT — MOZAK

> **Formato:** sigue la estructura de la *Guía Estudiante — Definición Proyecto APT (Fase 1)* de la asignatura Capstone (PTY4614) y su pauta de evaluación (indicadores 1 a 13). Los datos de contexto salen del repositorio, de Jira y de los documentos de planificación de Drive.
>
> **Dos versiones.** Este archivo es la versión del repositorio, que es público: no incluye el RUT ni el nombre del docente, ni las conclusiones y la reflexión individuales. La versión que se entrega al docente es el informe en Word (portada, índice, *abstract*, desarrollo, conclusiones y reflexión en inglés; Arial 11; número de página), que incluye esos datos.

## Portada

| Campo | Valor |
|---|---|
| Asignatura | Capstone (PTY4614) — Portafolio de Título |
| Proyecto | **MOZAK** — Plataforma de descubrimiento de entretenimiento y actividades |
| Estudiante | Alejandro Pedraza Soto |
| Carrera y sede | Ingeniería en Informática, Duoc UC, sede Maipú |
| RUT | *(consta en el informe entregado; no se publica en este repositorio)* |
| Sección | 007 |
| Inicio de la asignatura | 15-08-2026 |

## Índice

1. Abstract (español e inglés) · 2. Antecedentes personales · 3. Descripción del proyecto · 4. Fundamentación · 5. Objetivos · 6. Metodología · 7. Evidencias · 8. Plan de trabajo · 9. Carta Gantt · 10. Conclusiones y reflexión individuales · Anexo A (hitos conocidos) · Anexo B (riesgos)

## 1. Abstract

**Español.** MOZAK es una plataforma web que reúne y normaliza eventos de entretenimiento, cultura y recreación, hoy dispersos en los sitios de municipalidades, centros culturales, teatros y museos, para que las personas encuentren qué hacer en su comuna según texto, categoría, comuna, fecha y precio. Se desarrolló con Next.js, TypeScript, Zod y PostgreSQL con PostGIS, siguiendo Scrum en Jira, con pruebas automatizadas, contenedores Docker y documentación versionada. A la fecha, el prototipo cubre la consulta pública con búsqueda, filtros, orden y paginación, el detalle del evento con enlace a su fuente y a Google Maps, y la persistencia en base de datos, verificados en el equipo del estudiante. También están verificados los perfiles de creador y administrador, con revisión previa a la publicación; la búsqueda por proximidad y la medición de rendimiento quedan como trabajo futuro, y la importación automática de fuentes externas se descartó.

**English.** MOZAK is a web platform that gathers and normalizes entertainment, culture and recreation events, currently scattered across municipal, cultural-center, theater and museum websites, so that people can find what to do in their district by text, category, district, date and price. It was built with Next.js, TypeScript, Zod and PostgreSQL with PostGIS, following Scrum in Jira, with automated tests, Docker containers and version-controlled documentation. To date, the prototype covers public browsing with search, filters, sorting and pagination, an event detail page linking to its source and to Google Maps, and database persistence, all verified on the student's own machine. Creator and administrator roles with pre-publication review have also been verified; proximity search and performance measurement remain future work, and automatic import from external sources was dropped.

## 2. Antecedentes personales

Ver la portada. Equipo: **una persona** (ver §6).

## 3. Descripción del proyecto APT

| Campo | Contenido |
|---|---|
| Nombre | MOZAK — plataforma de descubrimiento de entretenimiento y actividades |
| Áreas de desempeño | Desarrollo de software; análisis y evaluación de soluciones informáticas **(confirmar con el plan de estudio)** |
| Competencias del perfil de egreso | Las cuatro que lista la pauta: pruebas de certificación, gestión de proyectos informáticos, modelos de datos y desarrollo de una solución de software (detalle en §4, «Pertinencia») |
| Repositorio | `github.com/NOSKIN-DEV/MOZAK-APT` |
| Gestión | Jira, espacio MOZAK-APT (clave `MA`); documentos de planificación en Google Drive |

## 4. Fundamentación

### 4.1 Relevancia

**Problema.** La información sobre eventos de entretenimiento, cultura y recreación está dispersa entre municipalidades, centros culturales, teatros, museos y otras organizaciones, lo que dificulta encontrar actividades según ubicación, fecha, categoría y costo.

**Descripción de la solución.** Una plataforma web con un catálogo único de eventos con datos normalizados, consultable sin cuenta. Hoy entrega:

- búsqueda por texto y filtros combinables por categoría, comuna, fecha y precio, con orden por fecha y paginación;
- detalle del evento con horario, lugar, precio, afiche y video, enlace a la fuente oficial y botón para abrir la ubicación en Google Maps;
- API interna validada y sanitizada, persistencia en PostgreSQL + PostGIS y arranque con Docker;
- 205 pruebas automatizadas y 60 contra una base de datos real, verificadas en el equipo del estudiante.

**Relevancia para el campo laboral.** Reúne las tareas habituales de un ingeniero informático en un producto de software real: levantar requisitos, modelar datos, construir y asegurar una API, probarla, empaquetarla y documentarla. La situación es real (el problema lo vive cualquier persona que busca actividades) y el beneficio esperado, aunque en este prototipo solo con datos de demostración, es ahorrar el recorrido fuente por fuente.

### 4.2 Pertinencia con el perfil de egreso

| Competencia | Cómo se pone en práctica en MOZAK | Evidencia |
|---|---|---|
| Realizar pruebas de certificación (IC 1.1 a 1.3) | Diseño y ejecución de pruebas unitarias, de integración, de contrato y con base real; casos del plan oficial (MTC) con trazabilidad; mejoras a partir de los resultados (por ejemplo, la tarea `migrate` corría antes de que la base aceptara conexiones y se corrigió con un *healthcheck*) | [`PLAN-DE-PRUEBAS.md`](PLAN-DE-PRUEBAS.md) |
| Gestionar proyectos informáticos (IC 2.1 y 2.2) | Planificación con Scrum: Product Backlog de 30 historias (HU-01 a HU-30), 6 sprints, puntos de historia, Definition of Done y control en Jira; decisiones de alcance entre alternativas (HU-29 pasó al Sprint 5 por dependencia de la ingesta) | [`PRODUCT-BACKLOG.md`](PRODUCT-BACKLOG.md), [`SPRINT-BACKLOG.md`](SPRINT-BACKLOG.md), [`METODOLOGIA.md`](METODOLOGIA.md) |
| Construir modelos de datos (IC 3.1 y 3.2) | Modelo relacional de cuatro entidades en PostgreSQL con restricciones CHECK, claves foráneas e índices; migración versionada con Prisma; PostGIS preparado para la búsqueda por proximidad | [`MODELO-DE-DATOS.md`](MODELO-DE-DATOS.md) |
| Desarrollar una solución de software (IC 4.1 a 4.3) | Aplicación Next.js + TypeScript con acceso a datos aislado detrás de una interfaz, dos implementaciones (memoria y PostgreSQL), validación con Zod, contenedores Docker y guía de despliegue | [`DOCUMENTACION-TECNICA.md`](DOCUMENTACION-TECNICA.md), [`DIAGRAMAS-UML.md`](DIAGRAMAS-UML.md), [`MANUAL-TECNICO.md`](MANUAL-TECNICO.md) |

### 4.3 Relación con los intereses profesionales

Mi interés profesional es desarrollar soluciones de software para personas y empresas y, más adelante, formar un equipo de desarrollo y hacerlo crecer hasta constituir una consultoría o empresa de software dedicada a esa misión.

MOZAK se relaciona con ese interés de dos maneras. Primero, es una solución pensada para personas: me veo reflejado en el usuario ideal, alguien que quiere conocer, en un solo lugar, toda la información sobre los eventos cercanos a los que le gustaría asistir. Segundo, el proyecto reproduce el trabajo de una consultoría de software (entender un problema, acotar el alcance, construir, probar, documentar y entregar de forma ordenada), con una proyección a futuro que incluye funciones más avanzadas, como fuentes de datos reales y búsqueda por cercanía.

### 4.4 Factibilidad

| Aspecto | Argumento |
|---|---|
| Tiempo | El prototipo se construyó dentro del semestre: el historial de git parte el 25-09-2026 y los Sprints 1 a 4 (Etapas 1 a 14) quedaron cerrados y verificados el 19-11-2026, antes de la defensa del 20-11-2026 |
| Materiales y recursos | Solo tecnologías de código abierto (Next.js, PostgreSQL, Docker, Vitest); sin claves de pago ni servicios con costo, porque el mapa es un enlace oficial sin clave |
| Factores que facilitan | Alcance acotado por etapas verificables; datos de demostración para trabajar sin depender de terceros; pruebas automatizadas que evitan regresiones |
| Factores que dificultan y cómo se abordan | Cambios de alcance durante el proyecto → backlog que se reordena cada sprint. Errores que solo aparecen en el equipo real (Turbopack en Windows, `migrate` antes de la base) → regla «un cambio no está verificado hasta ejecutarlo en el equipo del estudiante». Dependencia de fuentes públicas externas → la ingesta automática (ETL) se canceló el 28-11-2026; los eventos reales entran por los creadores, con revisión de un administrador |

## 5. Objetivos

**General.** Desarrollar una plataforma web que centralice y normalice eventos de entretenimiento, cultura y recreación, y permita encontrarlos por texto, categoría, comuna, fecha y precio.

**Específicos.**

1. Diseñar e implementar un modelo de datos relacional en PostgreSQL con PostGIS que garantice la integridad de los eventos, sus lugares y sus fuentes.
2. Desarrollar una API interna validada y sanitizada, con búsqueda, filtros combinables, orden y paginación.
3. Construir una interfaz web responsiva con detalle del evento, enlace a la fuente y ubicación en Google Maps.
4. Ejecutar un plan de pruebas automatizadas (unitarias, de integración, de contrato y con base de datos real) y de seguridad básica de entradas.
5. Implementar perfiles de creador y administrador con revisión previa a la publicación y historial de decisiones.
6. Documentar y empaquetar la solución con Docker, de modo que pueda instalarse y ejecutarse a partir del repositorio.

## 6. Metodología

**Scrum**, adaptado a un equipo de una persona, con Jira como tablero y backlog; justificación y alternativas descartadas en [`METODOLOGIA.md`](METODOLOGIA.md). Se trabaja por sprints con alcance acotado (una o más etapas), puntos de historia, criterios de aceptación y una Definition of Done ([`DEFINITION-OF-DONE.md`](DEFINITION-OF-DONE.md)); cada sprint termina con una demostración en vivo y una retrospectiva ([`RETROSPECTIVAS.md`](RETROSPECTIVAS.md)).

### Roles y responsabilidades

| Quién | Roles | Responsabilidades |
|---|---|---|
| **Alejandro Pedraza Soto** | Product Owner, Scrum Master y desarrollador (equipo de una persona) | Define el alcance y las prioridades; decide las etapas; ejecuta cada cambio en su equipo (Windows, Docker Desktop) y lo verifica; es quien responde por el proyecto ante la comisión |
| **Claude (asistente de IA de Anthropic)** | Herramienta de apoyo; **no es integrante del equipo** | Propone y escribe código, pruebas y documentación bajo la dirección del estudiante; el estudiante revisa, ejecuta y decide |

El uso del asistente de IA está **declarado** y se aplica con una regla: nada se da por verificado hasta que el estudiante lo ejecuta y lo confirma. Conviene confirmar con el docente la política de la asignatura sobre herramientas de IA, y que un proyecto con un solo integrante es aceptable, porque la guía contempla equipos de 2 o 3 personas.

## 7. Evidencias

| Tipo | Evidencia | Qué demuestra y por qué se elige |
|---|---|---|
| Avance | Product Backlog, Sprint Backlog y requisitos no funcionales | Muestran el alcance y la planificación, y permiten comprobar que cada historia se conecta con un caso de prueba |
| Avance | Modelo de datos con diagrama entidad-relación y diagramas UML | Muestran el diseño y la arquitectura, comparables con el código |
| Avance | Prototipo funcional y repositorio con historial de commits y ramas | Permite validar el producto y la forma de trabajo en cualquier momento |
| Final | Aplicación ejecutable con Docker, con persistencia en PostgreSQL | Es el producto de software operativo; se instala y ejecuta con un comando |
| Final | Plan de pruebas y registro de verificaciones (205 pruebas, 60 con base real, build, lint) | Certifica calidad y seguridad con resultados reproducibles y fechados |
| Final | Documentación técnica, manual técnico, metodología, retrospectivas y registro en Jira | Permite entender, mantener y auditar el proyecto |

## 8. Plan de trabajo

Las fechas son las del historial de git y del registro de verificación; los Sprints 5 y 6 son hoja de ruta sin fechas comprometidas.

| Competencia | Actividad | Descripción | Recursos | Período | Responsable | Facilitador (F) y obstaculizador (O) |
|---|---|---|---|---|---|---|
| Gestión de proyectos | Levantamiento y Product Backlog | Historias de usuario con criterios de aceptación y puntos; trazabilidad a los casos MTC | Jira, Drive | Continuo desde el inicio | A. Pedraza | F: Jira. O: requisitos que cambian → backlog reordenable |
| Desarrollo de software | Sprint 1: prototipo con datos mock (Etapas 1 a 7) | Proyecto base, datos de demostración, API, interfaz, búsqueda y filtros, detalle y responsive | Next.js, TypeScript, Tailwind, Zod | Desde el 25-09-2026 | A. Pedraza | O: Turbopack falla en Windows → `--webpack` |
| Pruebas | Sprint 2: pruebas automatizadas (Etapa 8) | Vitest; 41 pruebas (7 archivos) sobre búsqueda, filtros, detalle y API | Vitest | Verificado antes del 09-10-2026 (fecha exacta no registrada) | A. Pedraza | F: datos mock reales para los casos |
| Desarrollo de software | Sprint 3: Docker, afiche y video, documentación (Etapas 9 y 10) | Contenedores, multimedia opcional con respaldo, documentación técnica | Docker, `docker compose` | Verificado el 09-10-2026 | A. Pedraza | F: entorno reproducible |
| Modelos de datos | Sprint 4: PostgreSQL + PostGIS (Etapa 11) | Esquema, migración, semilla, repositorio PostgreSQL y batería de contrato | Prisma, PostgreSQL 17, PostGIS 3.5 | Verificado el 26-10-2026 | A. Pedraza | O: `migrate` antes de la base (P1001) → *healthcheck* |
| Desarrollo y pruebas | Sprint 4: seguridad, orden, paginación, sanitización y Google Maps (Etapas 12 a 14) | Next.js 16.4.1, ordenar y paginar, entradas hostiles, botón de ubicación | Next.js, Vitest | Etapas 12 y 13 verificadas el 30-10-2026; Etapa 14, el 19-11-2026 | A. Pedraza | O: avisos de `npm audit` evaluados sin `--force` |
| Desarrollo de software | Sprint 5: perfiles y moderación (Etapa 15) | Creador y administrador, flujo de revisión e historial | Next.js, Prisma | Implementada el 23-11-2026; verificada el 28-11-2026 | A. Pedraza | O: la verificación encontró 3 defectos, corregidos el mismo día |
| Modelos de datos y software | Sprint 5: proximidad (el ETL de fuentes externas se canceló el 28-11-2026) | Columna geográfica y búsqueda por radio | PostGIS | Por hacer | A. Pedraza | O: condiciones de uso y formato de las fuentes |
| Pruebas | Sprint 6: rendimiento, E2E y Android | Medición de tiempos, pruebas de extremo a extremo, empaquetado | Playwright, herramienta de carga | Por hacer | A. Pedraza | — |
| Gestión de proyectos | Documentación final y cierre | Manuales, retrospectivas e informe | Este repositorio | Noviembre de 2026 | A. Pedraza | F: documentación versionada en git |

## 9. Carta Gantt

Las semanas S1 a S18 salen del calendario de la asignatura, **Sección 007 (sábados)**; la primera es el 15-08-2026. Las tres fases siguen los hitos del calendario: **Fase 1** (S1–S4, Entregable 1, 20 %), **Fase 2** (S5–S15, Entregable 2.1 en S9, 25 %, y Entregable 2.2 en S15, 25 %) y **Fase 3** (S16–S18, presentación a la comisión en S17, 30 %). Las barras de desarrollo se ubican con las fechas del historial de git y del registro de verificaciones (cada fecha se asigna a la semana cuyo sábado es el siguiente o el mismo día); **E** = Etapa. Las semanas S1 a S6 no tienen registro en el repositorio.

| Actividad | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | S11 | S12 | S13 | S14 | S15 | S16 | S17 | S18 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| *Sábado (Sección 007)* | 15-08 | 22-08 | 29-08 | 05-09 | 12-09 | 19-09 | 26-09 | 03-10 | 10-10 | 17-10 | 24-10 | 31-10 | 07-11 | 14-11 | 21-11 | 28-11 | 05-12 | 12-12 |
| Definición del proyecto | ■ | ■ | ■ | ■ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Product Backlog y planificación Scrum |  |  |  |  |  |  | ■ | ■ | ■ | ■ | ■ | ■ | ■ | ■ | ■ | ■ |  |  |
| Sprint 1: prototipo con datos mock (E1–7) |  |  |  |  |  |  | ■ |  |  |  |  |  |  |  |  |  |  |  |
| Sprint 2: pruebas automatizadas (E8) |  |  |  |  |  |  |  | ■ |  |  |  |  |  |  |  |  |  |  |
| Sprint 3: Docker y multimedia (E9–10) |  |  |  |  |  |  |  | ■ | ■ |  |  |  |  |  |  |  |  |  |
| Sprint 4: PostgreSQL + PostGIS (E11) |  |  |  |  |  |  |  |  |  |  | ■ | ■ |  |  |  |  |  |  |
| Sprint 4: seguridad, orden y paginación (E12–13) |  |  |  |  |  |  |  |  |  |  |  | ■ |  |  |  |  |  |  |
| Sprint 4: Google Maps (E14) |  |  |  |  |  |  |  |  |  |  |  | ■ |  |  | ■ |  |  |  |
| Sprint 5: perfiles y moderación (E15) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ■ |  |  |
| Documentación de la evaluación y cierre |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ■ | ■ |  |
| Presentación a la comisión |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ■ |  |
| **Hitos de evaluación** |  |  |  | **E1** |  |  |  |  | **2.1** |  |  |  |  |  | **2.2** |  | **Com.** |  |

Coincidencias con el calendario: el Entregable 2.1 (S9, 10-10-2026) cae un día después de verificar las Etapas 1 a 10 (09-10-2026), y el Entregable 2.2 (S15, 21-11-2026) cae dos días después de cerrar la verificación de los Sprints 1 a 4 (19-11-2026).

### Hitos con fecha

| Fecha | Semana | Hito |
|---|---|---|
| 15-08-2026 | S1 | Inicio de la asignatura |
| 25-09-2026 | S7 | Primer commit del repositorio |
| 09-10-2026 | S9 | Etapas 1 a 10 verificadas (Sprints 1 a 3) |
| 10-10-2026 | S9 | Documentos de planificación creados en Drive |
| 26-10-2026 | S12 | Etapa 11 verificada (PostgreSQL + PostGIS) |
| 30-10-2026 | S12 | Etapas 12 y 13 verificadas; Etapa 14 desarrollada |
| 19-11-2026 | S15 | Etapa 14 verificada visualmente; Sprints 1 a 4 cerrados |
| 20-11-2026 | S15 | Defensa APT |
| 23-11-2026 | S16 | Etapa 15 implementada |
| 28-11-2026 | S16 | Etapa 15 verificada (323 pruebas, 78 con PostgreSQL, build y prueba manual) |
| 26-11-2026 | S16 | Documentación de la evaluación integrada a `master` |
| 05-12-2026 | S17 | Presentación a la comisión |

## 10. Conclusiones y reflexión individuales

La guía pide **conclusiones individuales y reflexión solo en inglés**. Son personales y se redactan en el informe en Word que se entrega al docente; no se publican en este repositorio.

## Anexo A. Fuentes

Repositorio y historial de git; Jira (espacio MOZAK-APT); documentos de planificación en Drive; guía y pauta de la Fase 1 de la asignatura.

## Anexo B. Riesgos

| Riesgo | Mitigación |
|---|---|
| Fuentes públicas con condiciones de uso restrictivas o cambios de formato | Se materializó: la ingesta automática (ETL) se canceló el 28-11-2026; los eventos los cargan creadores con moderación |
| Contenido publicado fuera de la norma | Revisión de un administrador con lista de condiciones (Etapa 15) |
| Errores que solo aparecen en el equipo real | Verificación en el equipo del estudiante antes de dar por terminado |
| Tiempo acotado del proyecto académico | Backlog priorizado y hoja de ruta explícita |
| Proyecto de una persona con apoyo de IA | Declararlo, verificar todo en el equipo propio y poder explicar cada decisión técnica |
