# Plan de pruebas — MOZAK (APT)

> **Fuente y vigencia.** Este documento lleva al repositorio el plan de pruebas que estaba solo en Drive («Plan de Pruebas - MOZAK», última edición 30-10-2026) y lo amplía con lo que faltaba: tipos de prueba **de integración, de seguridad y de rendimiento**, y la cobertura de la Etapa 15. Los resultados **verificados** son únicamente los que el usuario ejecutó en su equipo (Windows, Docker Desktop); lo demás está marcado como *no verificado* o *no ejecutado*. El libro oficial del curso (.xlsx, 32 casos MTC_0020 a MTC_00330) **sigue siendo el registro de OK/NOK**; este plan no lo reemplaza.

## 1. Objetivo y alcance

Definir **cómo** se prueba MOZAK (APT) y dejar trazabilidad entre requisito → historia ([`PRODUCT-BACKLOG.md`](PRODUCT-BACKLOG.md)) → caso de prueba → resultado.

- **Producto:** que cada funcionalidad entregada (búsqueda, filtros, orden y paginación, detalle, API interna, persistencia, responsive, perfiles y moderación) se comporte como se especificó y no retroceda.
- **Proceso:** que las pruebas se ejecuten antes de cada entrega y que un cambio **no se dé por verificado hasta que el usuario lo ejecuta en su equipo**; hasta entonces el estado es «pendiente de verificación».
- **Fuera de alcance:** importación desde fuentes externas (ETL, cancelada el 28-11-2026), geolocalización y proximidad (HU-25, Sprint 5), empaquetado Android (Sprint 6).

## 2. Tipos de prueba

| Tipo | Qué valida | Cómo se ejecuta | Estado |
|---|---|---|---|
| **Unitarias** | Funciones puras: formato de precio y fecha, enlaces de Google Maps, sanitización, orden, paginación, validación Zod, política de contenido, hashing y sesión | `npm run test` (Vitest) | Verificada hasta la Etapa 14 (16 archivos, 205 pruebas) |
| **De integración** | Rutas de la API contra el repositorio real (mock): códigos de estado, forma del JSON, validación de parámetros; y, desde la Etapa 15, **flujo completo creador → administrador → API pública** sin mocks intermedios | `npm run test` | Verificada hasta la Etapa 14; Etapa 15 **no verificada** |
| **De contrato** | Una misma batería de pruebas que deben cumplir **todas** las implementaciones de `EventRepository` (mock y PostgreSQL); lo mismo para `EventManagementRepository` (Etapa 15) | `npm run test` y `npm run test:db` | `EventRepository` verificada (60 pruebas con base, 30-10-2026); gestión de eventos (Etapa 15) **no verificada** |
| **Con base de datos real** | El contrato contra PostgreSQL 17 + PostGIS 3.5, claves foráneas y restricciones CHECK | `npm run test:db` (con la base levantada) | Verificada hasta la Etapa 13 (60 pruebas) |
| **De seguridad** | Entradas hostiles, consultas parametrizadas, autenticación, autorización por perfil, CSRF, bloqueo de intentos, cookies y sesión (ver §5) | `npm run test`, `npm run test:db`, `npm audit` | Entradas y SQL verificados (Etapa 13); autenticación y autorización (Etapa 15) **no verificadas** |
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
- **Datos de prueba:** los 24 eventos de demostración de `src/data` (sin fixtures inventados) y, en la Etapa 15, dos usuarios de demostración que solo existen con `ENABLE_DEMO_USERS` o `SEED_DEMO_USERS`.

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

Cubre el requisito RNF-05 (entradas) y, desde la Etapa 15, RNF-11 y RNF-12 ([`REQUISITOS-NO-FUNCIONALES.md`](REQUISITOS-NO-FUNCIONALES.md)).

| Riesgo | Control | Prueba | Estado |
|---|---|---|---|
| Inyección SQL en búsqueda y comuna | Consultas parametrizadas; el texto del usuario nunca se concatena al SQL | `postgres-text-filters.test.ts`; 8 textos hostiles (`'; DROP TABLE event; --`, `" OR 1=1 --`, `%`, `_`, `\`, `<script>`, `${process.env.DATABASE_URL}`…) × búsqueda y comuna, en mock y PostgreSQL | Verificado (30-10-2026) |
| Entradas malformadas | Sanitización (Unicode NFC, espacios, byte nulo y caracteres de control, largo máximo), validación Zod y respuesta 400 que no repite lo recibido | `sanitize.test.ts`, `parse-event-query.test.ts`, `events/route.test.ts` | Verificado (30-10-2026) |
| Datos inválidos en la base | Restricciones CHECK y claves foráneas | `*.db.test.ts` | Verificado (26-10 y 30-10-2026); las de la migración 0002 **no verificadas** |
| URLs de multimedia peligrosas | El esquema rechaza `javascript:`, `ftp:`, `//host` y rutas sin `/` inicial | `media-assets.test.ts` | Verificado (09-10-2026) |
| Dependencias vulnerables | `npm audit --omit=dev`, sin `--force` | Registro del 30-10-2026: 4 vulnerabilidades altas evaluadas (herramientas de Prisma; un aviso de Zod sin esquemas de arreglos en el código) | Evaluado; sin automatizar |
| Contraseñas filtradas o débiles | Hash scrypt con sal aleatoria; política de 10 a 128 caracteres; el hash nunca sale del servidor | `auth.test.ts`; `handlers.test.ts` («NO devuelve el hash», «la lista de creadores nunca incluye hashes») | **No verificado** |
| Sesión falsificada o robada | Token firmado con HMAC, vence a las 8 h, rol leído de la base en cada petición, cookie `HttpOnly` y `SameSite=Lax` (`Secure` bajo https), secreto de al menos 32 caracteres | `auth.test.ts`; `handlers.test.ts` («cookie alterada», «token de OTRO secreto», «tras desactivar la cuenta») | **No verificado** |
| Descubrir qué correos existen | Mismo mensaje y tiempo de respuesta con correo desconocido, contraseña errónea o cuenta desactivada | `handlers.test.ts` | **No verificado** |
| Fuerza bruta | Bloqueo (429) tras 5 fallos en 15 minutos por IP y correo | `auth.test.ts`, `handlers.test.ts` | **No verificado** |
| CSRF | Se exige mismo origen en login, logout y en toda acción que cambia datos | `handlers.test.ts` | **No verificado** |
| Escalada de privilegios | 401 sin sesión, 403 con el perfil equivocado; el creador no ve ni modifica eventos ajenos (404); solo un administrador publica | `handlers.test.ts`, `workflow.test.ts` | **No verificado** |
| Publicar sin revisión | Transición atómica con comparación de estado; restricciones CHECK `event_published_reviewed_chk` y `moderation_review_approved_chk` | `workflow.test.ts`, `management-repository.contract.ts`, `postgres-management-repository.db.test.ts` | **No verificado** |

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
| MTC_00220 a 00250 | Importación, normalización, duplicados y fuente caída (ETL) | Cancelados con HU-24 (28-11-2026) |
| MTC_00260 | Integridad de datos obligatorios | Automatizada (Zod, CHECK y claves foráneas en `test:db`) |
| MTC_00270 | Seguridad básica de parámetros | Sanitización y 400 ante entradas hostiles, Etapa 13 (verificado 30-10-2026); ver §5 |
| MTC_00280 / 00290 | Flujos E2E (escritorio y móvil) | Manual hoy; Playwright planificado (Sprint 6) |
| MTC_00300 / 00310 | Carga concurrente y carga elevada | **No ejecutada** (Sprint 6) |
| MTC_00320 | Inicio mediante Docker | Manual, verificado en las Etapas 9, 11 y 12 |
| MTC_00330 | Instalación Android (Capacitor) | Futuro (Sprint 6) |

La Etapa 15 (perfiles y moderación) **no tiene casos en el plan oficial**; se cubre con la tabla de §8.

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

## 8. Pruebas de la Etapa 15 (perfiles y moderación) — verificadas el 28-11-2026

### 8.1 Automatizadas

| Área | Qué valida | Archivos |
|---|---|---|
| Política de contenido | Categorías, normalización de texto, cribado por palabras clave (solo orientativo) | `content-policy.test.ts` |
| Flujo de moderación | Borrador → revisión → publicación o rechazo; retiro; transiciones inválidas; lista de condiciones; nota obligatoria con alertas; dueño del evento; fecha de término | `workflow.test.ts` |
| Autenticación | Hash, política de contraseña, sesión firmada y vencimiento, cookies, bloqueo de intentos | `auth.test.ts` |
| Rutas y permisos | Login, 401/403, CSRF, aislamiento entre creadores, alta y desactivación de cuentas, la API pública solo muestra eventos publicados | `handlers.test.ts`, `login/route.test.ts` |
| Repositorios | Contrato de gestión de eventos y usuarios (mock) y conversión fila ↔ dominio | `mock-management-repository.test.ts`, `postgres-management-mapping.test.ts` |
| Base real | El contrato de gestión contra PostgreSQL (incluida la transición que no se aplica dos veces) y las restricciones CHECK de la migración 0002: sin revisión no hay publicación, aprobación sin condiciones confirmadas, correo en minúsculas y único | `postgres-management-repository.db.test.ts` (`npm run test:db`) |

**Conteo.** Verificado en el equipo del usuario el 28-11-2026 (ver §10). Antes, en el entorno de apoyo sin npm, solo había corrido un arnés propio (287 pruebas), que no equivale a Vitest.

### 8.2 Recorrido manual de aceptación (para el equipo)

| # | Pasos | Resultado esperado |
|---|---|---|
| 1 | Sin sesión, abrir `/admin` y `/creador` | Redirige a `/ingresar` |
| 2 | Ingresar con el creador de demostración | Abre `/creador`; el menú no ofrece el panel de administración |
| 3 | Crear un evento y guardarlo | Queda en «Borrador»; **no** aparece en la pantalla principal |
| 4 | Enviarlo a revisión sin marcar la declaración | No permite enviar |
| 5 | Marcar la declaración y enviar | Queda «En revisión» |
| 6 | Salir e ingresar como administrador | Abre `/admin`; el evento aparece en la cola |
| 7 | Intentar aprobar sin marcar las 3 condiciones | No permite aprobar |
| 8 | Confirmar las 3 condiciones y aprobar | Queda «Publicado» y aparece en la pantalla principal |
| 9 | Crear otro evento, enviarlo y rechazarlo con motivo y explicación | El creador ve el motivo y puede corregirlo y reenviarlo |
| 10 | Retirar la publicación de un evento | Deja de verse en la pantalla principal |
| 11 | Equivocar 5 veces la contraseña | Mensaje de espera por demasiados intentos |
| 12 | Crear una cuenta de creador y luego desactivarla | La sesión de esa cuenta deja de funcionar de inmediato |
| 13 | Con PostgreSQL: aplicar la migración, `npm run db:seed` y repetir 3 a 10 | Mismo comportamiento y sin errores en la consola |

Al ejecutarlo, anotar fecha, comando, resultado y, si algo falla, el mensaje de error exacto; ese registro es lo que permite pasar la Etapa 15 de «pendiente» a «verificada».

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
| 15 | 28-11-2026 | Lint con 0 errores y 6 avisos; `npm run test`: 25 archivos y 323 pruebas (incluye 18 del mapa de la Etapa 16); build correcto; migraciones 0001 y 0002 sobre una base nueva; `npm run test:db`: 78 de 78; prueba manual de inicio de sesión, navegación con sesión, revisión y aprobación. Defectos encontrados y corregidos: error de lint (`no-explicit-any`), sesión perdida al cambiar de pantalla sin `SESSION_SECRET`, dos pruebas de contrato que publicaban sin fecha de revisión |

## 11. Limitaciones y trabajo pendiente

- Los E2E son manuales; la automatización con Playwright depende del Sprint 6.
- Rendimiento y carga: sin ejecución ni umbrales (ver §7).
- Pruebas de seguridad avanzadas y automatización en integración continua: sin planificar todavía.
- Los 32 casos del libro oficial siguen en «Pendiente de ejecución»: marcar OK/NOK es una tarea del equipo.
- Los avisos `react-hooks/set-state-in-effect` son deuda técnica: 3 registrados el 30-10-2026 y 3 nuevos de los paneles de la Etapa 15 (`AdminDashboard`, `CreatorDashboard`, `UsersPanel`), confirmados con `npm run lint` el 28-11-2026.
- Del recorrido manual de §8.2 se informaron los pasos de inicio de sesión, revisión y aprobación; el rechazo, el retiro, el bloqueo por intentos y la desactivación de cuentas quedan cubiertos solo por las pruebas automatizadas.
