# Visión del producto — MOZAK (APT)

> **BORRADOR para confirmar.** Se redactó con el problema, el objetivo y los usuarios que ya están declarados en el README y en las «Especificaciones Técnicas» (Drive, 30-10-2026). La encuesta de validación, la validación de negocio y el análisis de competencia siguen **pendientes** (el usuario dejó esas sugerencias en espera), por eso no hay cifras de mercado ni de adopción.

## Declaración de visión

> **Para** las personas que buscan qué hacer en su comuna o alrededores, **que** hoy deben revisar por separado los sitios de municipalidades, centros culturales, teatros y museos, **MOZAK** es una plataforma web **que** reúne y normaliza los eventos de entretenimiento, cultura y recreación en un solo lugar, y permite encontrarlos por texto, categoría, comuna, fecha y precio. **A diferencia de** buscar fuente por fuente, MOZAK ofrece un único catálogo consultable, sin cuenta ni registro para quien solo quiere informarse, y con una revisión humana antes de publicar cualquier evento.

## El problema

La información sobre eventos está dispersa entre municipalidades, centros culturales, teatros, museos y otras organizaciones, lo que dificulta encontrar actividades según ubicación, fecha, categoría y costo.

## Usuarios

| Perfil | Qué necesita | Acceso |
|---|---|---|
| **Visitante** (consumidor) | Encontrar rápido algo que hacer cerca de él y decidir si asistir | Sin cuenta; solo lee eventos publicados |
| **Creador** (organizador) | Dar a conocer un evento de su organización | Con cuenta creada por un administrador; propone eventos, que quedan en revisión |
| **Administrador** | Mantener el catálogo dentro de la norma de contenido | Con cuenta; es el único que puede aprobar la publicación |

## Propuesta de valor

1. **Un solo catálogo** de eventos con datos normalizados (categoría, comuna, fecha, precio, lugar, fuente).
2. **Búsqueda y filtros combinables**, con orden por fecha y paginación.
3. **Detalle útil para decidir:** horario, lugar, precio, afiche y video, enlace a la fuente oficial y botón para abrir la ubicación en Google Maps.
4. **Sin fricción para el visitante:** funciona desde 360 px de ancho, con modo claro y oscuro, y sin crear cuenta.
5. **Contenido revisado:** solo se publica lo que un administrador aprueba dentro de la norma (sin desnudos ni actos sexuales, sin drogas ni tráfico de drogas, sin mercado negro). Los eventos +18 se permitirán con verificación; **el mecanismo está pendiente de decisión**.

## Alcance

| Estado | Capacidades |
|---|---|
| **Entregado** (Etapas 1 a 14) | Listado, búsqueda, filtros, orden y paginación, detalle con afiche y video, enlace a la fuente y a Google Maps, API interna, responsive, tema oscuro, persistencia en PostgreSQL + PostGIS, Docker, pruebas automatizadas |
| **Implementado, por verificar** (Etapa 15) | Perfiles de creador y administrador, flujo de revisión y publicación, historial de decisiones |
| **Hoja de ruta** (Sprints 5 y 6) | Importación de fuentes externas (ETL), búsqueda por proximidad con PostGIS, fin de los datos mock, pruebas de rendimiento y E2E, versión Android con Capacitor |
| **Fuera de alcance por ahora** | Pagos, cuentas para visitantes, notificaciones, recuperación de contraseña, subida de imágenes por el creador |

## Indicadores de éxito

No hay metas numéricas acordadas todavía. Propuestas para validar con el equipo y el docente **(confirmar)**:

- **Producto:** los casos del plan oficial en OK; tiempos de respuesta medidos y dentro de un umbral acordado (hoy sin medir).
- **Datos:** proporción de eventos que proviene de fuentes reales frente a datos de demostración (hoy, todos son de demostración).
- **Uso:** resultados de la encuesta de validación con usuarios (sugerencia pendiente).

## Riesgos

| Riesgo | Efecto | Mitigación |
|---|---|---|
| Los datos de las fuentes públicas pueden no poder reutilizarse o cambiar de formato | El catálogo real no se puede construir | Revisar condiciones de uso antes de importar; diseñar conectores aislados (sugerencia pendiente) |
| Publicar contenido fuera de la norma | Daño a usuarios y a la reputación del proyecto | Solo un administrador publica, con lista de condiciones obligatoria, cribado automático orientativo e historial de decisiones |
| Datos personales de creadores | Obligaciones de privacidad | Política de datos pendiente (sugerencia en espera); no se recogen datos de visitantes |
| El proyecto es académico y de duración limitada | No hay operación continua | Hoja de ruta explícita y documentación para retomar |
