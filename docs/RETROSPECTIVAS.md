# Retrospectivas y aprendizajes — MOZAK (APT)

> **Qué es este documento.** Reúne los aprendizajes que quedaron **documentados** durante el proyecto y una plantilla para las retrospectivas de los próximos sprints. **No registra reuniones con fecha y asistentes, porque no hay constancia de ellas en el repositorio**; si el equipo las realizó, hay que completar la tabla de §1 con lo que sí ocurrió. Inventar actas no tendría valor como evidencia.

## 1. Retrospectivas realizadas

| Sprint | Fecha | Participantes | Registro |
|---|---|---|---|
| Sprint 1 a 3 | **(completar)** | **(completar)** | **(completar)** |
| Sprint 4 | **(completar)** | **(completar)** | Aprendizaje documentado en la planificación (ver §2) |
| Sprint 5 | — | — | Aún no iniciado |

## 2. Aprendizajes documentados

| # | Cuándo | Qué pasó | Aprendizaje | Acción tomada |
|---|---|---|---|---|
| 1 | Etapa 1 | Turbopack 16.0.1 provocaba un *panic* en Windows, sobre todo en carpetas sincronizadas (OneDrive, Drive) | Las herramientas nuevas pueden fallar en el equipo real aunque funcionen en otro | Scripts con `--webpack`; recomendación de no desarrollar dentro de carpetas sincronizadas (README) |
| 2 | Etapa 11, verificada el 26-10-2026 | La tarea `migrate` corría antes de que la base aceptara conexiones (error P1001) y no aparecía en el entorno de desarrollo | **Verificar en el equipo real detecta errores que el entorno de desarrollo no muestra**; no se debe declarar una etapa verificada sin ejecutarla | *Healthcheck* por TCP antes de migrar; regla «verificado = ejecutado por el usuario» en la Definition of Done |
| 3 | Etapa 12, 30-10-2026 | El modo `FlatCompat` de ESLint fallaba con «Converting circular structure to JSON» al actualizar Next.js | Al subir de versión mayor hay que revisar la configuración de las herramientas, no solo el código | Migración al formato nativo de `eslint-config-next` 16 |
| 4 | Etapa 12, 30-10-2026 | `npm audit` informó 4 vulnerabilidades altas | Cada hallazgo se evalúa antes de actuar; `--force` puede romper el proyecto | Evaluación registrada; no se usó `--force` |
| 5 | 19-11-2026 | HU-29 (fin de los datos mock) dependía de la ingesta de fuentes (HU-24) | Las dependencias entre historias deben verse al planificar, no al ejecutar | HU-29 pasó al Sprint 5 |
| 6 | Etapa 15, 23-11-2026 | El entorno de apoyo no podía ejecutar `npm`, y el clon del usuario tenía cambios sin guardar en otra rama | Separar lo verificado de lo no ejecutado y evitar cambiar de rama sobre trabajo sin guardar | Arnés de pruebas propio, documentación con «pendiente de verificación» explícito y clon nuevo en carpeta aparte |

## 3. Plantilla para la próxima retrospectiva

**Sprint:** ___ · **Fecha:** ___ · **Participantes:** ___

| ¿Qué funcionó? | ¿Qué no funcionó? | ¿Qué probamos distinto? |
|---|---|---|
| | | |

**Acciones acordadas**

| Acción | Responsable | Fecha límite | Estado |
|---|---|---|---|
| | | | |

**Revisión de las acciones del sprint anterior:** ___

**Métricas del sprint:** puntos planificados ___, puntos completados ___, casos de prueba en OK ___.
