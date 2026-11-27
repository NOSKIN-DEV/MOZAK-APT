# Innovación — MOZAK (APT)

> **BORRADOR para confirmar.** Describe qué aporta el proyecto con lo que existe en el repositorio, sin exagerar. **No incluye comparación con productos competidores**, porque ese análisis no se ha hecho (queda pendiente junto con la validación de negocio); cualquier afirmación del tipo «nadie hace esto» necesitaría esa investigación.

## Dónde está la novedad

La innovación de MOZAK es de **combinación y de ingeniería**, más que de una idea sin precedentes: reúne en un solo producto prácticas que suelen verse por separado.

| Aporte | Qué es | Estado |
|---|---|---|
| **Catálogo único normalizado** | Un modelo común (categoría, comuna, fecha, precio, lugar, fuente) pensado para recibir eventos de fuentes públicas heterogéneas (APIs REST, JSON, CSV, GeoJSON) | Modelo e interfaz entregados; importación real **por hacer** (Sprint 5) |
| **Búsqueda por cercanía** | Eventos cercanos a una ubicación con PostGIS (radio en km) | Base de datos con PostGIS lista; la columna geográfica y la búsqueda son HU-25 (Sprint 5, **por hacer**) |
| **Moderación con humano en el circuito** | Un creador propone; solo un administrador publica, confirmando una lista de condiciones; un cribado automático por palabras clave **solo orienta** y nunca decide; cada decisión queda en un historial auditable | Implementado en la rama `feature/roles-moderacion` (PR #1, borrador), **no integrada a `master`**; **pendiente de verificación** |
| **Arquitectura intercambiable por contrato** | El acceso a datos está detrás de una interfaz (`EventRepository`) y una misma batería de pruebas la cumplen el repositorio en memoria y el de PostgreSQL, de modo que cambiar de fuente no cambia los resultados | Entregado y verificado (Etapa 11) |
| **Costo cero y sin claves** | Mapa embebido sin clave y botón de Google Maps por enlace oficial (sin API key ni facturación); servidor de prueba gratuito documentado | Entregado; el despliegue en Neon + Vercel está documentado pero **sin ejecutar** |
| **Desarrollo asistido y verificado** | Cada cambio se prueba en el equipo real antes de darlo por terminado, con la evidencia registrada y las limitaciones a la vista | Práctica aplicada a lo largo del proyecto |

## Qué no se afirma

- No se afirma que la moderación detecte contenido prohibido de forma automática: el cribado es orientativo y la decisión es humana.
- No se afirma ventaja frente a otras plataformas de eventos: falta el análisis comparativo.
- No se afirma uso masivo ni rendimiento bajo carga: no hay mediciones ([`PLAN-DE-PRUEBAS.md`](PLAN-DE-PRUEBAS.md), §7).

## Trabajo para fundamentar la innovación **(confirmar prioridad)**

1. Análisis comparativo con alternativas existentes (agendas municipales, redes sociales, portales de venta de entradas).
2. Encuesta a usuarios potenciales para validar que la búsqueda por comuna, fecha y precio resuelve el problema.
3. Primera fuente real importada, para pasar el catálogo único de promesa a evidencia.
