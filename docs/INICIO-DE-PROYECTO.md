# Documento de inicio de proyecto — MOZAK (APT)

> **VERSIÓN PROVISIONAL.** El curso pide este documento según la **Guía 1.5**, que no está en el repositorio ni en Drive. Esta versión reúne lo que el proyecto ya declara (README, «Especificaciones Técnicas» y «Planificación del Proyecto» en Drive) con una estructura habitual de acta de inicio. **Cuando se tenga la Guía 1.5 hay que reordenar este contenido según su plantilla.** Lo marcado **(completar)** no se conoce desde el repositorio y no se inventó.

## 1. Datos generales

| Campo | Valor |
|---|---|
| Nombre del proyecto | MOZAK — Plataforma de descubrimiento de entretenimiento y actividades («APT» es el nombre académico; «MOZAK», el de marca) |
| Tipo | Proyecto de Título de Ingeniería en Informática (prototipo/MVP) |
| Institución | Duoc UC, sede Maipú **(confirmar)** |
| Fecha de inicio | **(completar)** |
| Repositorio | `NOSKIN-DEV/mozak-apt` |
| Gestión | Jira, espacio MOZAK-APT (clave `MA`); documentos en Google Drive, carpeta MOZAK-APT |
| Metodología | Scrum ([`METODOLOGIA.md`](METODOLOGIA.md)) |

## 2. Equipo, roles y docente

| Nombre | Rol | Responsabilidades |
|---|---|---|
| **(completar)** | **(completar)** | **(completar)** |

Docente guía: **(completar)**. Ver también «Integrantes y roles» en el README.

## 3. Contexto y problema

La información sobre eventos está dispersa entre municipalidades, centros culturales, teatros, museos y otras organizaciones, lo que dificulta encontrar actividades según ubicación, fecha, categoría y costo.

## 4. Objetivos

**General.** Centralizar y normalizar información de eventos de entretenimiento, cultura y recreación en una plataforma web, comenzando por un prototipo funcional y conectándolo luego a fuentes públicas.

**Específicos** (cada uno con la evidencia que lo respalda):

1. Permitir buscar y filtrar eventos por texto, categoría, comuna, fecha y precio, con orden y paginación — *cumplido; Etapas 4, 5 y 13*.
2. Mostrar el detalle del evento con fuente oficial, mapa, afiche y video — *cumplido; Etapas 6, 10 y 14*.
3. Exponer los datos mediante una API interna validada y sanitizada — *cumplido; Etapas 3 y 13*.
4. Persistir los datos en PostgreSQL + PostGIS sin cambiar el contrato de la API — *cumplido; Etapa 11*.
5. Garantizar la calidad con pruebas automatizadas y reproducibilidad con Docker — *cumplido; Etapas 8, 9 y 11*.
6. Incorporar perfiles de creador y administrador con revisión previa a la publicación — *implementado en la rama `feature/roles-moderacion`, pendiente de verificación e integración; Etapa 15*.
7. Importar eventos de fuentes públicas reales y permitir búsqueda por proximidad — *por hacer; Sprint 5*.
8. Medir rendimiento, automatizar pruebas E2E y empaquetar para Android — *por hacer; Sprint 6*.

## 5. Alcance

| Dentro | Fuera (por ahora) |
|---|---|
| Consulta pública de eventos sin cuenta | Pagos |
| API interna, base de datos y Docker | Cuentas para visitantes y notificaciones |
| Panel de creador y de administrador con moderación (Etapa 15, en una rama, pendiente) | Recuperación de contraseña, subida de imágenes |
| Documentación y pruebas | Operación continua en producción |

Detalle en [`PRODUCT-VISION.md`](PRODUCT-VISION.md) y [`PRODUCT-BACKLOG.md`](PRODUCT-BACKLOG.md).

## 6. Entregables

Código fuente y Docker; documentación del repositorio (índice en [`README.md`](README.md)); suite de pruebas; documentos de planificación en Drive; presentación para la defensa.

## 7. Hitos conocidos

| Fecha | Hito |
|---|---|
| 09-10-2026 | Etapa 10 verificada (afiche, video y documentación técnica) |
| 10-10-2026 | Documentos de planificación creados en Drive |
| 26-10-2026 | Etapa 11 verificada (PostgreSQL + PostGIS) |
| 30-10-2026 | Etapas 12 y 13 verificadas; Etapa 14 desarrollada |
| 19-11-2026 | Etapa 14 verificada visualmente; Sprints 1 a 4 cerrados |
| 20-11-2026 | Defensa APT |
| 23-11-2026 | Etapa 15 implementada (pendiente de verificación) |

Los Sprints 5 y 6 son hoja de ruta sin fechas comprometidas **(completar si el curso las exige)**.

## 8. Supuestos y restricciones

- Alcance académico; los datos de eventos son de demostración.
- Sin credenciales ni claves de pago en el prototipo; las credenciales de la base en Docker son solo de desarrollo local.
- Un cambio solo se da por verificado cuando el usuario lo ejecuta en su equipo (Windows, Docker Desktop).
- Uso de un asistente de IA en el desarrollo **(confirmar declaración exigida por el curso)**.

## 9. Riesgos iniciales

| Riesgo | Mitigación |
|---|---|
| Fuentes públicas con condiciones de uso restrictivas o cambios de formato | Revisar condiciones antes de importar; conectores aislados |
| Contenido publicado fuera de la norma | Revisión de un administrador con lista de condiciones |
| Errores que solo aparecen en el equipo real | Verificación en el equipo del usuario antes de dar por terminado |
| Tiempo acotado del proyecto académico | Backlog priorizado y hoja de ruta explícita |

## 10. Aprobación

| Nombre | Rol | Fecha | Firma |
|---|---|---|---|
| **(completar)** | | | |
