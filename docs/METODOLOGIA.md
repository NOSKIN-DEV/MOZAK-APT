# Metodología de trabajo — MOZAK (APT)

> **BORRADOR para confirmar con el equipo y el docente.** La metodología declarada (Scrum, gestionada en Jira) viene de la planificación del proyecto en Drive («Planificación del Proyecto (Scrum) - MOZAK»). La **justificación** de este documento la redactó el asistente a partir de cómo se trabajó realmente; los puntos marcados **(confirmar)** necesitan la respuesta de quien conoce el acuerdo con el curso.

## 1. Metodología declarada

**Scrum**, adaptado a un equipo pequeño y a un calendario académico, con el espacio de Jira **MOZAK-APT** (clave `MA`) como herramienta de gestión.

| Elemento de Scrum | Cómo se aplica en MOZAK |
|---|---|
| Product Backlog | 30 historias de usuario (HU-01 a HU-30) con puntos de historia, criterios de aceptación y trazabilidad a los casos de prueba: [`PRODUCT-BACKLOG.md`](PRODUCT-BACKLOG.md) |
| Sprint | Un sprint agrupa una o más **etapas** de desarrollo y es una **épica** en Jira (MA-1 a MA-6) |
| Sprint Backlog | Historias del sprint con su estado: [`SPRINT-BACKLOG.md`](SPRINT-BACKLOG.md) |
| Incremento | Cada etapa deja una versión que funciona, con pruebas y documentación; se integra a `master` solo después de verificarse |
| Definition of Done | [`DEFINITION-OF-DONE.md`](DEFINITION-OF-DONE.md) |
| Estimación | Puntos de historia, registrados en la descripción de la historia y en la etiqueta `sp-N` |
| Etiquetas Jira | `mozak`, `sprint-N`, `etapa-NN`, `sp-N` y `pedido-usuario` (cambios solicitados por el usuario durante el desarrollo) |

### Roles

| Rol Scrum | Quién | Estado |
|---|---|---|
| Product Owner | Decide el alcance y la prioridad; hace los pedidos de cambio (por ejemplo, HU-28 Google Maps, HU-29 y la Etapa 15) | Alejandro Pedraza Soto |
| Scrum Master | Cuida el proceso, las reglas de verificación y el tablero | Alejandro Pedraza Soto |
| Equipo de desarrollo | Diseña, programa, prueba y documenta | Alejandro Pedraza Soto, **con un asistente de IA (Claude) como herramienta de apoyo, declarado como tal** |

El equipo es de **una persona**: los tres roles recaen en el estudiante, que decide, ejecuta y verifica cada cambio. El asistente de IA escribe código, pruebas y documentación bajo su dirección, pero no es un integrante ni decide el alcance.

### Ceremonias

| Ceremonia | En MOZAK |
|---|---|
| Sprint Planning | Al iniciar el sprint se revisan y ajustan puntos y prioridades según la capacidad disponible |
| Daily Scrum | Con un equipo de una o dos personas se reemplaza por un registro breve: qué se hizo, qué sigue, qué bloquea |
| Sprint Review | Demostración en vivo: `npm run test` y `npm run test:db` en verde y la aplicación leyendo de PostgreSQL con `npm run docker:postgres` |
| Sprint Retrospective | Qué funcionó y qué mejorar antes del siguiente sprint: [`RETROSPECTIVAS.md`](RETROSPECTIVAS.md) |

## 2. Por qué Scrum

1. **Los requisitos fueron cambiando durante el proyecto.** Se incorporaron pedidos del usuario (ubicación en Google Maps, fin de los datos mock, perfiles de creador y administrador con moderación) y brechas detectadas por el plan de pruebas (orden y paginación). Un backlog que se reordena en cada sprint absorbe esos cambios; un plan en cascada habría exigido congelarlos al inicio.
2. **Se necesitaba un incremento verificable en cada paso.** Cada etapa termina con algo que se puede ejecutar y comprobar en el equipo real (Windows, Docker Desktop), y esa comprobación detectó errores que el entorno de desarrollo no mostraba (por ejemplo, la migración que corría antes de que la base aceptara conexiones).
3. **Hay fechas de evaluación fijas** (demo funcional, defensa del 20-11-2026). Los sprints con alcance acotado permiten decidir qué entra y qué pasa al siguiente: HU-29 (fin de los datos mock) se movió al Sprint 5 porque dependía de la ingesta de fuentes externas.
4. **Equipo pequeño.** Scrum se adapta quitando ceremonias formales sin perder lo esencial: backlog priorizado, incrementos, criterios de aceptación y revisión.
5. **Trazabilidad.** Jira permite seguir cada historia hasta su caso de prueba y su estado.

### Alternativas consideradas

| Alternativa | Por qué no se eligió |
|---|---|
| Cascada | Supone requisitos completos y estables desde el inicio; aquí no lo fueron |
| Kanban | Flujo continuo sin cadencia ni objetivos de iteración; dificulta alinear el trabajo con fechas de evaluación |
| XP | Se adoptan sus prácticas técnicas más útiles (pruebas automatizadas, integración en pasos pequeños, refactorización), pero no se sigue como marco completo (por ejemplo, no hay programación en pareja) |

## 3. Adaptaciones y límites

- **Sprints por alcance, no por calendario fijo.** Los sprints se definieron como grupos de etapas; la duración en semanas **no está registrada en el repositorio** **(confirmar si el curso exige una duración fija)**.
- **Fechas de planificación.** Los documentos de planificación en Drive se crearon el 10-10-2026, cuando ya existían las Etapas 1 a 10; por eso el registro de los Sprints 1 a 3 pudo hacerse sobre trabajo ya realizado **(confirmar con el equipo cuándo se creó cada sprint en Jira y si hubo planificación previa)**.
- **Regla de verificación propia.** Un cambio solo se declara «Listo» cuando el usuario lo ejecuta en su equipo; hasta entonces queda «En revisión» en Jira y «pendiente de verificación» en la documentación. Es más estricta que una revisión interna y evita declarar terminado lo que no se probó.
- **Asistente de IA en el desarrollo.** Buena parte del código y la documentación se elaboró con un asistente de IA; el equipo decide el alcance, ejecuta y verifica. **(confirmar el texto de la declaración de uso de IA que pida el curso)**

## 4. Mediciones disponibles

| Sprint | Puntos | Estado |
|---|---|---|
| Sprint 1 | 33 | Listo |
| Sprint 2 | 28 | Listo |
| Sprint 3 | 16 | Listo |
| Sprint 4 | 22 | Listo |
| Sprint 5 | 21 (+13 propuestos con HU-30) | Por hacer; HU-30 implementada, pendiente de verificación |
| Sprint 6 | 13 | Por hacer |

Avance general al 19-11-2026: 99 de 133 puntos (74 %); con HU-30 (Etapa 15, 13 puntos propuestos, pendiente de verificación) el plan total pasaría a 146 puntos. Detalle y fórmulas en [`PRODUCT-BACKLOG.md`](PRODUCT-BACKLOG.md).
