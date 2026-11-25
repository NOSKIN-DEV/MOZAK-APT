# Diagramas UML — MOZAK (APT)

> **Fuente y vigencia.** Diagramas versionados en git, escritos en **Mermaid** (GitHub los muestra directamente). Los de **clases** y **secuencia** se construyeron a partir del código real de `master` (`src/lib/**`, `src/app/**`; fecha 24-11-2026), no de un diseño aparte. El diagrama de **casos de uso** parte del de Drive («Arquitectura del Sistema - MOZAK», 30-10-2026, un solo actor). La arquitectura general, el diagrama de componentes y el proceso BPM siguen en ese documento de Drive; el modelo entidad-relación está en [`MODELO-DE-DATOS.md`](MODELO-DE-DATOS.md). **Los perfiles de creador y administrador (Etapa 15) no están en `master`:** viven en la rama `feature/roles-moderacion`, pendientes de verificación, y sus diagramas (servicios, inicio de sesión y publicación) se agregan a este documento al integrarla.

Contenido: 1. casos de uso · 2. clases (acceso a datos) · 3. secuencia: consulta pública · 4. secuencia: detalle y ubicación.

## 1. Casos de uso

El **visitante no tiene cuenta**: solo consulta eventos. Las líneas punteadas con «incluye» indican que un caso de uso siempre requiere otro.

```mermaid
flowchart LR
    V(["Visitante<br/>sin cuenta"])

    subgraph PUB["Consulta pública"]
        U1(["Buscar eventos por texto"])
        U2(["Filtrar por categoría, comuna,<br/>fecha y precio"])
        U3(["Ordenar por fecha y paginar"])
        U7(["Alternar tema claro u oscuro"])
        U4(["Ver el detalle del evento"])
        U5(["Abrir la ubicación en Google Maps"])
        U6(["Ir a la fuente oficial"])
    end

    V --- U1
    V --- U2
    V --- U3
    V --- U4
    V --- U7
    U4 -. incluye .-> U5
    U4 -. incluye .-> U6

    style PUB fill:none,stroke:#888
```

Notas: ordenar y paginar corresponde a la Etapa 13 (verificada 30-10-2026) y el enlace a Google Maps a la Etapa 14 (verificada 19-11-2026).

## 2. Diagrama de clases — acceso a datos

El código de la aplicación (API y páginas) solo conoce la **interfaz** `EventRepository` (un *puerto*, en el sentido de la arquitectura hexagonal). Tiene dos implementaciones, una en memoria (modo `mock`, por defecto) y otra en PostgreSQL con Prisma; una misma batería de contrato (`event-repository.contract.ts`) las ejecuta a ambas, de modo que cambiar de fuente no cambia ningún resultado.

```mermaid
classDiagram
    direction LR

    class EventRepository {
        <<interface>>
        +findAll(filters) List~EventWithRelations~
        +findPage(filters, options) EventPage
        +findById(id) EventWithRelations
        +findAllCategories() List~Category~
        +findAllCommunes() List~string~
    }
    class MockEventRepository {
        lee los datos de src/data
    }
    class PostgresEventRepository {
        -prisma PrismaClient
    }
    class RepositoryFactory {
        <<module>>
        +resolveDataSource() DataSource
        +createEventRepository(source) EventRepository
        +eventRepository EventRepository
    }
    class DataSource {
        <<enumeration>>
        mock
        postgres
    }

    EventRepository <|.. MockEventRepository
    EventRepository <|.. PostgresEventRepository
    RepositoryFactory ..> EventRepository : crea
    RepositoryFactory ..> DataSource : lee DATA_SOURCE

    note for RepositoryFactory "eventRepository carga la implementación de forma diferida, así el modo mock nunca carga @prisma/client"
    note for PostgresEventRepository "Búsqueda y comuna con SQL parametrizado: el texto del usuario nunca se concatena a la consulta"
```

La fuente se elige con `DATA_SOURCE` (`mock` por defecto, `postgres`). Con `postgres` es obligatorio definir `DATABASE_URL`; un valor inválido de `DATA_SOURCE` se rechaza con un error explícito.

## 3. Secuencia — consulta pública de eventos

Es el flujo del visitante (sin cuenta). Se verificó en las Etapas 3, 5 y 13.

```mermaid
sequenceDiagram
    actor V as Visitante
    participant P as Pantalla principal
    participant A as GET api events
    participant Q as parseEventQuery
    participant R as EventRepository
    participant D as Datos mock o PostgreSQL

    V->>P: escribe una búsqueda, elige filtros, orden o página
    P->>A: GET /api/events con search, filtros, sort, page y limit
    A->>Q: sanitizar y validar los parámetros
    alt parámetros inválidos
        Q-->>A: lista de problemas
        A-->>P: 400 con issues, sin repetir el valor recibido
    else parámetros válidos
        Q-->>A: filtros y opciones
        A->>R: findPage(filtros, opciones)
        R->>D: filtrar, ordenar por fecha, hora e id y paginar
        D-->>R: página de eventos y total
        R-->>A: EventPage
        A-->>P: 200 con data y meta
    end
    P-->>V: tarjetas, contador de resultados y paginación
```

## 4. Secuencia — detalle del evento y ubicación

La página de detalle consulta la API y arma el enlace a Google Maps con las coordenadas del lugar o, si no sirven, con su dirección (Etapa 14).

```mermaid
sequenceDiagram
    actor V as Visitante
    participant P as Página de detalle
    participant A as GET api events id
    participant R as EventRepository
    participant M as EventLocationMap

    V->>P: abre /eventos/id
    P->>A: GET /api/events/id
    A->>R: findById(id)
    alt el evento no existe
        R-->>A: nada
        A-->>P: 404
        P-->>V: mensaje de evento no encontrado
    else el evento existe
        R-->>A: evento con categoría, lugar y fuente
        A-->>P: 200 con el evento
        P->>M: coordenadas, dirección y comuna
        M->>M: buildGoogleMapsUrl con coordenadas o, si no sirven, con la dirección
        P-->>V: detalle con afiche, video, mapa y enlace a la fuente
        V->>M: pulsa Abrir en Google Maps
        M-->>V: abre Google Maps en una pestaña nueva
    end
```
