# Diagramas UML — MOZAK (APT)

> **Fuente y vigencia.** Diagramas versionados en git, escritos en **Mermaid** (GitHub los muestra directamente). Los de **clases** y **secuencia** se construyeron a partir del código real (`src/lib/**`, `src/app/api/**`; fecha 24-11-2026), no de un diseño aparte. El diagrama de **casos de uso** amplía el de Drive («Arquitectura del Sistema - MOZAK», 30-10-2026, un solo actor) con los perfiles de la Etapa 15. Los elementos de la **Etapa 15 (creador y administrador) están implementados pero pendientes de verificación** en el equipo del usuario. La arquitectura general, el diagrama de componentes y el proceso BPM siguen en el documento de Drive; el modelo entidad-relación está en [`MODELO-DE-DATOS.md`](MODELO-DE-DATOS.md).

Contenido: 1. casos de uso · 2. clases (acceso a datos) · 3. clases (servicios de la Etapa 15) · 4. secuencia: consulta pública · 5. secuencia: inicio de sesión · 6. secuencia: del borrador a la publicación.

## 1. Casos de uso

El **visitante no tiene cuenta**: solo consulta eventos publicados. Creador y administrador inician sesión. Las líneas punteadas con «incluye» indican que un caso de uso siempre requiere otro.

```mermaid
flowchart LR
    V(["Visitante<br/>sin cuenta"])
    C(["Creador"])
    A(["Administrador"])

    subgraph PUB["Consulta pública"]
        U1(["Buscar eventos por texto"])
        U2(["Filtrar por categoría, comuna,<br/>fecha y precio"])
        U3(["Ordenar por fecha y paginar"])
        U7(["Alternar tema claro u oscuro"])
        U4(["Ver el detalle del evento"])
        U5(["Abrir la ubicación en Google Maps"])
        U6(["Ir a la fuente oficial"])
    end

    subgraph CRE["Panel del creador (Etapa 15)"]
        C1(["Iniciar sesión"])
        C2(["Crear y editar un borrador"])
        C3(["Enviar a revisión"])
        C4(["Declarar que cumple la política<br/>de contenido"])
        C5(["Retirar un evento"])
        C6(["Ver estado y motivos de rechazo"])
    end

    subgraph ADM["Panel del administrador (Etapa 15)"]
        A1(["Revisar la cola de eventos"])
        A2(["Aprobar y publicar"])
        A3(["Confirmar las condiciones de la norma"])
        A4(["Rechazar con motivo y explicación"])
        A5(["Retirar una publicación"])
        A6(["Crear y desactivar cuentas de creador"])
    end

    V --- U1
    V --- U2
    V --- U3
    V --- U4
    V --- U7
    U4 -. incluye .-> U5
    U4 -. incluye .-> U6

    C --- C1
    C --- C2
    C --- C3
    C --- C5
    C --- C6
    C3 -. incluye .-> C4

    A --- C1
    A --- A1
    A --- A2
    A --- A4
    A --- A5
    A --- A6
    A2 -. incluye .-> A3

    style PUB fill:none,stroke:#888
    style CRE fill:none,stroke:#888
    style ADM fill:none,stroke:#888
```

Notas: ordenar y paginar corresponde a la Etapa 13 (verificada 30-10-2026) y el enlace a Google Maps a la Etapa 14 (verificada 19-11-2026). La condición de la norma que confirma el administrador son tres: sin desnudos ni actos sexuales, sin drogas ni tráfico de drogas, sin mercado negro (política `2026-11-v1`, ver [`ROLES-Y-MODERACION.md`](ROLES-Y-MODERACION.md)).

## 2. Diagrama de clases — acceso a datos

El código de la aplicación (API y páginas) solo conoce las **interfaces** (puertos). Cada una tiene una implementación en memoria (modo `mock`, por defecto) y otra en PostgreSQL con Prisma; una misma batería de contrato las ejecuta a ambas. Desde la Etapa 15, el repositorio mock y la gestión de eventos comparten un `MemoryStore`, de modo que lo que aprueba un administrador aparece en el listado público.

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
        -store MemoryStore
    }
    class PostgresEventRepository {
        -prisma PrismaClient
    }

    class EventManagementRepository {
        <<interface>>
        +listVenues() List~Venue~
        +findVenueById(id) Venue
        +createVenue(venue) Venue
        +createEvent(input) ManagedEvent
        +updateContent(id, content, allowedStatuses, at) ManagedEvent
        +findManagedById(id) ManagedEvent
        +listManaged(filter) List~ManagedEvent~
        +transition(request) ManagedEvent
        +listReviews(eventId) List~ModerationReviewRecord~
    }
    class MockEventManagementRepository
    class PostgresEventManagementRepository

    class UserRepository {
        <<interface>>
        +findByEmail(email) UserRecord
        +findById(id) UserRecord
        +list(filter) List~UserRecord~
        +create(user) UserRecord
        +setActive(id, active) UserRecord
        +recordLogin(id, at) void
    }
    class MockUserRepository
    class PostgresUserRepository

    class MemoryStore {
        +categories List~Category~
        +venues List~Venue~
        +sources List~Source~
        +events List~StoredEvent~
        +users List~UserRecord~
        +reviews List~ModerationReviewRecord~
        +seeded() MemoryStore
    }

    EventRepository <|.. MockEventRepository
    EventRepository <|.. PostgresEventRepository
    EventManagementRepository <|.. MockEventManagementRepository
    EventManagementRepository <|.. PostgresEventManagementRepository
    UserRepository <|.. MockUserRepository
    UserRepository <|.. PostgresUserRepository

    MockEventRepository --> MemoryStore : lee solo PUBLISHED
    MockEventManagementRepository --> MemoryStore
    MockUserRepository --> MemoryStore

    note for PostgresEventRepository "Solo devuelve eventos PUBLISHED. Búsqueda y comuna con SQL parametrizado"
    note for EventManagementRepository "transition compara el estado y cambia en una sola operación, junto con la decisión de moderación"
```

La fuente se elige con `DATA_SOURCE` (`mock` por defecto, `postgres`) en `factory.ts`; el repositorio de PostgreSQL se carga de forma diferida, de modo que el modo mock nunca carga `@prisma/client`.

## 3. Diagrama de clases — servicios de la Etapa 15

`composeServices` arma los servicios a partir de los repositorios sin saber de dónde vienen los datos. Las rutas de `src/app/api/{auth,creator,admin}` son delgadas: delegan en los manejadores (`src/lib/server`), que validan sesión, perfil y origen y llaman a estos servicios.

```mermaid
classDiagram
    direction TB

    class Services {
        +events EventRepository
        +management EventManagementRepository
        +users UserRepository
        +workflow EventWorkflowService
        +auth AuthService
        +throttle LoginThrottle
    }

    class EventWorkflowService {
        +catalog(actor) Catalog
        +listMine(actor) List~ManagedEvent~
        +getMine(actor, id) EventAndReviews
        +createDraft(actor, input) ManagedEvent
        +updateDraft(actor, id, input) ManagedEvent
        +submit(actor, id, input) ManagedEvent
        +withdraw(actor, id) ManagedEvent
        +listForReview(actor, status) List~ManagedEvent~
        +getForReview(actor, id) ReviewDetail
        +approve(actor, id, input) ManagedEvent
        +reject(actor, id, input) ManagedEvent
        +unpublish(actor, id, input) ManagedEvent
    }

    class AuthService {
        +login(email, password) LoginResult
        +authenticate(token) UserRecord
        +listCreators(actor) List~UserRecord~
        +createCreator(actor, input) UserRecord
        +setCreatorActive(actor, id, input) UserRecord
    }

    class LoginThrottle {
        +retryAfterSeconds(key) number
        +recordFailure(key) void
        +reset(key) void
    }

    class ContentPolicy {
        <<module>>
        +CONTENT_POLICY_VERSION string
        +screenContent(fields) List~ContentFlag~
        +flaggedCategories(flags) List~ContentCategoryId~
        +MODERATION_CHECKLIST
        +REJECTION_REASONS
    }

    class WorkflowError {
        +code WorkflowErrorCode
        +issues List~ValidationIssue~
    }

    class EventRepository {
        <<interface>>
    }
    class EventManagementRepository {
        <<interface>>
    }
    class UserRepository {
        <<interface>>
    }

    Services *-- EventWorkflowService
    Services *-- AuthService
    Services *-- LoginThrottle
    EventWorkflowService --> EventRepository : valida categorías
    EventWorkflowService --> EventManagementRepository : guarda y cambia de estado
    EventWorkflowService ..> ContentPolicy : alertas orientativas
    AuthService --> UserRepository
    EventWorkflowService ..> WorkflowError : lanza
    AuthService ..> WorkflowError : lanza

    note for EventWorkflowService "El actor ADMIN decide. Un CREATOR solo ve y modifica sus propios eventos y nunca puede publicar"
    note for AuthService "Contraseñas con scrypt y sesión firmada con HMAC. El rol se lee de la base en cada petición"
```

## 4. Secuencia — consulta pública de eventos

Es el flujo del visitante (sin cuenta). Se verificó en las Etapas 3, 5 y 13; desde la Etapa 15 el repositorio solo devuelve eventos publicados.

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
        R->>D: solo PUBLISHED, orden por fecha, hora e id, con límite
        D-->>R: página de eventos y total
        R-->>A: EventPage
        A-->>P: 200 con data y meta
    end
    P-->>V: tarjetas, contador de resultados y paginación
```

## 5. Secuencia — inicio de sesión (Etapa 15)

El mismo mensaje de error se usa para correo inexistente, contraseña incorrecta y cuenta desactivada. Los intentos fallidos se cuentan por IP y correo.

```mermaid
sequenceDiagram
    actor U as Creador o administrador
    participant L as Formulario de ingreso
    participant H as POST api auth login
    participant T as LoginThrottle
    participant S as AuthService
    participant R as UserRepository

    U->>L: correo y contraseña
    L->>H: POST con JSON
    H->>H: comprobar origen, tamaño y forma del cuerpo
    H->>T: retryAfterSeconds(IP y correo)
    alt demasiados intentos fallidos
        T-->>H: segundos de espera
        H-->>L: 429
    else puede intentar
        H->>S: login(correo, contraseña)
        S->>R: findByEmail(correo)
        R-->>S: usuario o nada
        S->>S: verificar scrypt, con hash señuelo si no existe
        alt credenciales inválidas o cuenta desactivada
            S-->>H: error UNAUTHENTICATED
            H->>T: recordFailure
            H-->>L: 401 con el mensaje genérico
        else credenciales correctas
            S->>R: recordLogin
            S-->>H: usuario y token firmado
            H->>T: reset
            H-->>L: 200 con cookie HttpOnly de sesión
            L-->>U: redirige a /creador o /admin según el perfil
        end
    end
```

## 6. Secuencia — del borrador a la publicación (Etapa 15)

Muestra el ciclo completo con las garantías del diseño: el creador declara la política, el administrador confirma las tres condiciones, y el cambio de estado y la decisión se guardan de forma atómica.

```mermaid
sequenceDiagram
    actor C as Creador
    actor A as Administrador
    participant API as API creator y admin
    participant W as EventWorkflowService
    participant P as ContentPolicy
    participant M as EventManagementRepository
    participant Pub as API pública

    C->>API: POST /api/creator/events
    API->>W: createDraft(creador, datos)
    W->>M: createEvent, estado DRAFT
    C->>API: POST submit con acceptsContentPolicy verdadero
    API->>W: submit(creador, id, declaración)
    W->>W: comprobar dueño, estado y que la fecha de término no pasó
    W->>M: transition DRAFT o REJECTED a PENDING_REVIEW
    A->>API: GET /api/admin/events/id
    API->>W: getForReview(admin, id)
    W->>P: screenContent(título, descripción)
    P-->>W: alertas orientativas
    W-->>A: evento, alertas e historial
    A->>API: POST approve con las 3 condiciones y nota
    API->>W: approve(admin, id, condiciones, nota)
    W->>W: exigir condiciones, nota si hubo alertas y datos válidos
    W->>M: transition PENDING_REVIEW a PUBLISHED y registrar APPROVED
    alt otro administrador ya decidió
        M-->>W: nada, el estado cambió
        W-->>A: 409 INVALID_STATE
    else decisión registrada
        M-->>W: evento publicado
        W-->>A: 200
    end
    Pub->>M: GET /api/events solo muestra PUBLISHED
```

Variantes: **rechazar** y **retirar la publicación** siguen el mismo patrón (`REJECTED`/`UNPUBLISHED`, con motivo y explicación obligatorios); el creador puede **retirar** su evento (de revisión o publicado) y vuelve a borrador.
