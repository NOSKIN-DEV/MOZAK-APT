# Plan de pruebas — MOZAK (APT)

> **Fuente y vigencia.** Este documento lleva al repositorio el plan de pruebas que estaba solo en Drive («Plan de Pruebas - MOZAK», última edición 30-10-2026) y lo amplía con lo que faltaba: tipos de prueba **de integración, de seguridad y de rendimiento**, y la cobertura de la Etapa 15. Los resultados **verificados** son únicamente los que el usuario ejecutó en su equipo (Windows, Docker Desktop); lo demás está marcado como *no verificado* o *no ejecutado*. El libro oficial del curso (.xlsx, 32 casos MTC_0020 a MTC_00330) **sigue siendo el registro de OK/NOK**; este plan no lo reemplaza.

## 1. Objetivo y alcance

Definir **cómo** se prueba MOZAK (APT) y dejar trazabilidad entre requisito → historia ([`PRODUCT-BACKLOG.md`](PRODUCT-BACKLOG.md)) → caso de prueba → resultado.

- **Producto:** que cada funcionalidad entregada (búsqueda, filtros, orden y paginación, detalle, API interna, persistencia, responsive) se comporte como se especificó y no retroceda.
- **Proceso:** que las pruebas se ejecuten antes de cada entrega y que un cambio **no se dé por verificado hasta que el usuario lo ejecuta en su equipo**; hasta entonces el estado es «pendiente de verificación».
- **Fuera de alcance:** importación desde fuentes externas (ETL, Sprint 5), geolocalización y proximidad (HU-25, Sprint 5), empaquetado Android (Sprint 6).

## 2. Tipos de prueba

| Tipo | Qué valida | Cómo se ejecuta | Estado |
|---|---|---|---|
| **Unitarias** | Funciones puras: formato de precio y fecha, enlaces de Google Maps, sanitización, orden, paginación, validación Zod | `npm run test` (Vitest) | Verificada hasta la Etapa 14 (16 archivos, 205 pruebas) |
| **De integración** | Rutas de la API contra el repositorio real (mock): códigos de estado, forma del JSON, validación de parámetros | `npm run test` | Verificada hasta la Etapa 14 (16 archivos, 205 pruebas) |
| **De contrato** | Una misma batería de pruebas que deben cumplir **todas** las implementaciones de `EventRepository` (mock y PostgreSQL) | `npm run test` y `npm run test:db` | `EventRepository` verificada (60 pruebas con base, 30-10-2026) |
| **Con base de datos real** | El contrato contra PostgreSQL 17 + PostGIS 3.5, claves foráneas y restricciones CHECK | `npm run test:db` (con la base levantada) | Verificada hasta la Etapa 13 (60 pruebas) |
| **De seguridad** | Entradas hostiles, consultas parametrizadas, restricciones de la base y dependencias (ver §5) | `npm run test`, `npm run test:db`, `npm audit` | Entradas y SQL verificados (Etapa 13); la autenticación y la autorización de la Etapa 15 se probarán al integrarla (ver §8) |
| **De aceptación (manual)** | Casos funcionales del plan oficial contra los criterios de cada historia | Manual, en el navegador | Parcial (ver §6) |
| **End to End (E2E)** | Flujos completos de usuario: buscar → filtrar → ver detalle → abrir la fuente | Hoy manual; automatización con Playwright **planificada, no instalada** | Manual |
| **De rendimiento y carga** | Tiempo de respuesta del listado y comportamiento con usuarios concurrentes | Sin herramienta todavía (ver §7) | **No ejecutada** (HU-26, Sprint 6) |

## 3. Estrategia

Se sigue una **pirámide de pruebas**: base amplia de pruebas unitarias (rápidas y aisladas), capa intermedia de integración y contrato (API + repositorio) y capa delgada de E2E.

| Momento | Qué se ejecuta |
|---|---|
| En cada cambio de código | `npm run lint` y `npm run test` (sin base de datos) |
| Al tocar la capa de PostgreSQL | `npm run test:db` (requiere la base levantada) y `npm run build` |
| Antes de cada entrega o evaluación | Toda la suite, el recorrido manual de §6 y `docker compose up --build` |
| Al cambiar dependencias | `npm audit --omit=dev`; los hallazgos se evalúan y registran, no se corrigen con `--force` |

- **Criterio de entrada:** la funcionalidad está implementada y `npm run lint` no reporta errores.
- **Criterio de salida:** 100 % de las pruebas automatizadas en verde y cada caso MTC aplicable marcado «OK» o «NOK» en el libro oficial, nunca «pendiente», antes de una entrega.
- **Regresión:** se vuelve a ejecutar toda la suite antes de cada entrega.
- **Datos de prueba:** los 24 eventos de demostración de `src/data` (sin fixtures inventados).

## 4. Herramientas

| Herramienta | Uso |
|---|---|
| Vitest 2.1.8 | Pruebas unitarias, de integración y de contrato (`npm run test`); pruebas con base real (`npm run test:db`, `vitest.db.config.ts`) |
| PostgreSQL 17.5 + PostGIS 3.5 (Docker) | Base real de `npm run test:db` (`docker-compose.postgres.yml`) |
| ESLint (`eslint-config-next` 16) | Análisis estático (`npm run lint`) |
| TypeScript 5.9 | Verificación de tipos en `npm run build` |
| Zod 4 | Validación en tiempo de ejecución de datos y parámetros |
| `scripts/check-mock-data.ts` | Integridad referencial y esquemas de los datos (`npm run check:data`) |
| `npm audit` | Revisión de vulnerabilidades de dependencias |
| Jira (proyecto MA) | Historias y tareas de prueba; los defectos se registran como tareas nuevas |
| Libro oficial del curso (.xlsx) | Registro y seguimiento de los 32 casos MTC |
| Playwright | **Planificado** para E2E (MTC_00280/00290); aún no instalado |
| Herramienta de carga | **Por elegir** en Sprint 6 (ver §7) |

## 5. Pruebas de seguridad

Cubre el requisito RNF-05 (entradas) y RNF-10 (dependencias) ([`REQUISITOS-NO-FUNCIONALES.md`](REQUISITOS-NO-FUNCIONALES.md)). Los controles de cuentas y sesiones de la Etapa 15 (RNF-11 y RNF-12) se describen en §8.

| Riesgo | Control | Prueba | Estado |
|---|---|---|---|
| Inyección SQL en búsqueda y comuna | Consultas parametrizadas; el texto del usuario nunca se concatena al SQL | `postgres-text-filters.test.ts`; 8 textos hostiles (`'; DROP TABLE event; --`, `" OR 1=1 --`, `%`, `_`, `\`, `<script>`, `${process.env.DATABASE_URL}`…) × búsqueda y comuna, en mock y PostgreSQL | Verificado (30-10-2026) |
| Entradas malformadas | Sanitización (Unicode NFC, espacios, byte nulo y caracteres de control, largo máximo), validación Zod y respuesta 400 que no repite lo recibido | `sanitize.test.ts`, `parse-event-query.test.ts`, `events/route.test.ts` | Verificado (30-10-2026) |
| Datos inválidos en la base | Restricciones CHECK y claves foráneas | `*.db.test.ts` | Verificado (26-10 y 30-10-2026) |
| URLs de multimedia peligrosas | El esquema rechaza `javascript:`, `ftp:`, `//host` y rutas sin `/` inicial | `media-assets.test.ts` | Verificado (09-10-2026) |
| Dependencias vulnerables | `npm audit --omit=dev`, sin `--force` | Registro del 30-10-2026: 4 vulnerabilidades altas evaluadas (herramientas de Prisma; un aviso de Zod sin esquemas de arreglos en el código) | Evaluado; sin automatizar |

**No cubierto hoy** (para no sobrestimar la cobertura): prueba de penetración o escaneo dinámico, escaneo automático de secretos y dependencias en integración continua, pruebas de XSS en navegador real, y el bloqueo de intentos compartido entre varias instancias (el contador es en memoria y se reinicia con el servidor).

## 6. Cobertura por caso del plan oficial

El libro oficial todavía registra los 32 casos como «Pendiente de ejecución». La columna «Cobertura actual» describe qué evidencia existe; el OK/NOK se registra en el libro al ejecutar cada caso.

| Caso | Descripción | Cobertura actual |
|---|---|---|
| MTC_0020 | Visualización del listado de eventos | Manual en navegador (Etapa 4) |
| MTC_0030 | Búsqueda por nombre | Automatizada (contrato, mock y PostgreSQL) |
| MTC_0040 | Filtro por categoría | Automatizada |
| MTC_0050 | Filtro por comuna | Automatizada |
| MTC_0060 | Filtro por fecha | Automatizada (incluye eventos de varios días) |
| MTC_0070 | Filtro de eventos gratuitos | Automatizada |
| MTC_0080 | Combinación de filtros | Automatizada (AND) |
| MTC_0090 | Vista de detalle de un evento | Automatizada (`findById` y API) y revisión visual (Etapa 10) |
| MTC_00100 | Enlace a la fuente original | Manual (la URL de fuente es obligatoria y válida en el esquema) |
| MTC_00110 | Ordenamiento por fecha | Automatizada, Etapa 13 (verificado 30-10-2026) |
| MTC_00120 | Ausencia de resultados | Automatizada y mensaje en pantalla (manual) |
| MTC_00130 | Campos opcionales incompletos | Automatizada (por ejemplo `videoUrl: null`) |
| MTC_00140 | Geolocalización del lugar | Manual: mapa OpenStreetMap y botón de Google Maps (verificado visualmente 19-11-2026) |
| MTC_00150 | Eventos cercanos | Futuro (HU-25, Sprint 5, PostGIS) |
| MTC_00160 / 00170 | Responsive en teléfono y escritorio | Manual (Etapa 7) |
| MTC_00180 | Tiempo de respuesta del listado | **No ejecutada** (Sprint 6) |
| MTC_00190 | Paginación o límite de resultados | Automatizada, Etapa 13 (verificado 30-10-2026) |
| MTC_00200 | API de consulta de eventos | Automatizada |
| MTC_00210 | Conexión API ↔ PostgreSQL | `npm run test:db` (verificado 26-10-2026) |
| MTC_00220 a 00250 | Importación, normalización, duplicados y fuente caída (ETL) | Futuro (Sprint 5) |
| MTC_00260 | Integridad de datos obligatorios | Automatizada (Zod, CHECK y claves foráneas en `test:db`) |
| MTC_00270 | Seguridad básica de parámetros | Sanitización y 400 ante entradas hostiles, Etapa 13 (verificado 30-10-2026); ver §5 |
| MTC_00280 / 00290 | Flujos E2E (escritorio y móvil) | Manual hoy; Playwright planificado (Sprint 6) |
| MTC_00300 / 00310 | Carga concurrente y carga elevada | **No ejecutada** (Sprint 6) |
| MTC_00320 | Inicio mediante Docker | Manual, verificado en las Etapas 9, 11 y 12 |
| MTC_00330 | Instalación Android (Capacitor) | Futuro (Sprint 6) |

La Etapa 15 (perfiles y moderación) **no tiene casos en el plan oficial**; su cobertura se describe en §8.

## 7. Plan de pruebas de rendimiento y carga (no ejecutadas)

**No existe ninguna medición de tiempos**: este documento no afirma ningún tiempo de respuesta. Se planifica en HU-26 (Sprint 6) para cerrar MTC_00180, 00300 y 00310 y el requisito RNF-02.

| Prueba | Escenario | Qué se mide |
|---|---|---|
| Listado (MTC_00180) | `GET /api/events` por defecto (primera página de 20) y con filtros combinados, un usuario a la vez, sobre mock y sobre PostgreSQL | Tiempo de respuesta (mediana y percentil 95) |
| Carga concurrente (MTC_00300) | Varios usuarios simultáneos consultando el listado y el detalle | Tiempo de respuesta y tasa de errores |
| Carga elevada (MTC_00310) | Aumento progresivo de usuarios hasta degradarse | Punto en que aumentan errores o tiempos |

- **Herramienta:** a definir al iniciar el Sprint 6; se evalúan opciones instalables con npm (por ejemplo `autocannon`) o k6.
- **Entorno:** la medición se hará sobre la compilación de producción (`npm run build` + `npm start`, o Docker), nunca sobre `npm run dev`, con la misma base de 24 eventos y, para PostgreSQL, el contenedor del proyecto.
- **Umbrales:** **pendientes de definir con el equipo y el docente**; no se fijan números aquí para no inventar objetivos. Cada resultado se registrará con fecha, máquina, versión y comando.
- **Límite conocido:** la paginación acota cada respuesta a 100 resultados como máximo, lo que limita el costo de cada consulta pero no es una medición.

## 8. Etapa 15 (perfiles y moderación): pruebas previstas, aún no integradas

La Etapa 15 está implementada en la rama `feature/roles-moderacion` (PR #1, en borrador) y **no forma parte de `master`**; sus pruebas y su plan de verificación viajan con ella. Se resume aquí qué cubrirán para que el plan esté completo:

| Área | Qué validará |
|---|---|
| Política de contenido | Categorías prohibidas y cribado por palabras clave (solo orientativo) |
| Flujo de moderación | Borrador → revisión → publicación o rechazo; retiro; transiciones inválidas; lista de condiciones; nota obligatoria si hay alertas |
| Autenticación y sesión | Hash de contraseñas, sesión firmada y con vencimiento, cookies, bloqueo de intentos |
| Rutas y permisos | 401 sin sesión, 403 con el perfil equivocado, defensa CSRF, aislamiento entre creadores, la API pública solo muestra eventos publicados |
| Base de datos | Contrato de gestión de eventos contra PostgreSQL y restricciones de la migración `0002_roles_moderacion` |

**Estado:** sin verificar. En un entorno de apoyo sin acceso a npm se ejecutó la lógica con un arnés propio (287 pruebas del repositorio en verde); eso **no equivale** a `npm run test` con Vitest. No se ejecutaron `npm run lint`, `npm run build`, la migración ni `npm run test:db` con las pruebas nuevas. Hasta que el equipo los ejecute y registre el resultado, la Etapa 15 figura como «pendiente de verificación».

## 9. Gestión de defectos

Los defectos se registran como tareas nuevas en Jira (proyecto MA) con referencia al caso que los detectó y se priorizan igual que el resto del backlog. Ejemplo real: al verificar la Etapa 11 se encontró que la tarea `migrate` corría antes de que la base aceptara conexiones (error P1001); se corrigió con un *healthcheck* por TCP antes de dar la etapa por verificada. Otro ejemplo: en la Etapa 12 el modo `FlatCompat` de ESLint fallaba con «Converting circular structure to JSON»; se migró al formato nativo de `eslint-config-next` 16.

## 10. Registro de verificación

Resultados que el usuario obtuvo en su equipo (Windows, Docker Desktop):

| Etapa | Fecha | Resultado |
|---|---|---|
| 8 | (fecha no registrada en el plan de Drive) | 7 archivos y 41 pruebas en verde |
| 10 | 09-10-2026 | 8 archivos y 59 pruebas en verde; revisión visual del detalle |
| 11 | 26-10-2026 | `npm run test`: 11 archivos y 77 pruebas; `npm run test:db`: 33 de 33; Docker con 24 eventos y PostGIS 3.5 |
| 12 y 13 | 30-10-2026 | Lint con 0 errores y 3 avisos; `npm run test`: 15 archivos y 181 pruebas; `npm run test:db`: 60 pruebas; build correcto; revisión visual |
| 14 | 30-10-2026 y 19-11-2026 | `npm run test`: 16 archivos y 205 pruebas; lint (0 errores, 3 avisos); build; el botón abre Google Maps con las coordenadas del lugar |
| 15 | — | **Sin verificar**; está en la rama `feature/roles-moderacion` (ver §8) |

## 11. Limitaciones y trabajo pendiente

- Los E2E son manuales; la automatización con Playwright depende del Sprint 6.
- Rendimiento y carga: sin ejecución ni umbrales (ver §7).
- Pruebas de seguridad avanzadas y automatización en integración continua: sin planificar todavía.
- Los 32 casos del libro oficial siguen en «Pendiente de ejecución»: marcar OK/NOK es una tarea del equipo.
- Los 3 avisos `react-hooks/set-state-in-effect` registrados el 30-10-2026 son deuda técnica.
