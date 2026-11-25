# Documentación de MOZAK (APT)

Índice de la documentación que viaja con el código. Los documentos de planificación originales también existen en Google Drive (carpeta MOZAK-APT); **el repositorio es la versión de referencia para la evaluación**. Los documentos marcados como borrador necesitan confirmación del equipo.

## Gestión del proyecto

| Documento | Contenido | Estado |
|---|---|---|
| [`INICIO-DE-PROYECTO.md`](INICIO-DE-PROYECTO.md) | Documento de inicio: objetivos, alcance, hitos, riesgos | Provisional (falta la Guía 1.5 y los datos del equipo) |
| [`METODOLOGIA.md`](METODOLOGIA.md) | Scrum declarado y su justificación | Borrador a confirmar |
| [`PRODUCT-VISION.md`](PRODUCT-VISION.md) | Visión, usuarios, propuesta de valor, alcance y riesgos | Borrador a confirmar |
| [`PRODUCT-BACKLOG.md`](PRODUCT-BACKLOG.md) | Historias HU-01 a HU-30, puntos y trazabilidad con los casos de prueba | Vigente (24-11-2026) |
| [`SPRINT-BACKLOG.md`](SPRINT-BACKLOG.md) | Backlog de cada sprint | Vigente (24-11-2026) |
| [`DEFINITION-OF-DONE.md`](DEFINITION-OF-DONE.md) | Criterios para dar algo por terminado | Borrador a confirmar |
| [`RETROSPECTIVAS.md`](RETROSPECTIVAS.md) | Aprendizajes documentados y plantilla | Faltan las actas reales |
| [`INNOVACION.md`](INNOVACION.md) | Qué aporta el proyecto y qué no se afirma | Borrador a confirmar |

## Requisitos, diseño y datos

| Documento | Contenido |
|---|---|
| [`REQUISITOS-NO-FUNCIONALES.md`](REQUISITOS-NO-FUNCIONALES.md) | RNF-01 a RNF-12 con la forma de comprobar cada uno |
| [`MODELO-DE-DATOS.md`](MODELO-DE-DATOS.md) | Diagrama entidad-relación, modelo lógico, índices y migraciones |
| [`DIAGRAMAS-UML.md`](DIAGRAMAS-UML.md) | Casos de uso, clases y secuencia |
| [`DOCUMENTACION-TECNICA.md`](DOCUMENTACION-TECNICA.md) | Arquitectura, API, pruebas por etapa y decisiones |

## Pruebas y operación

| Documento | Contenido |
|---|---|
| [`PLAN-DE-PRUEBAS.md`](PLAN-DE-PRUEBAS.md) | Estrategia, tipos de prueba (incluye seguridad, integración y rendimiento), cobertura por caso |
| [`MANUAL-TECNICO.md`](MANUAL-TECNICO.md) | Instalación, configuración, ejecución y mantenimiento |
| [`DESPLIEGUE.md`](DESPLIEGUE.md) | Servidor de prueba sin costo (Neon + Vercel) |

## Convención de estados

- **Verificado:** el usuario lo ejecutó en su equipo y lo confirmó.
- **Pendiente de verificación:** implementado, sin confirmar en el equipo del proyecto (hoy, la Etapa 15, que vive en la rama `feature/roles-moderacion` y no está en `master`; su documentación `ROLES-Y-MODERACION.md` llega con ella).
- **Futuro:** planificado, sin implementar.
- **(completar)** o **(confirmar):** dato que no está en el repositorio y no se inventó.
