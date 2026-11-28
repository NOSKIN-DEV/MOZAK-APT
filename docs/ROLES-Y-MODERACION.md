# Perfiles, moderación y política de contenido (Etapa 15)

Este documento describe cómo funcionan los perfiles de **administrador** y **creador**, el flujo de aprobación de eventos y la política de contenido de MOZAK. El **usuario consumidor no tiene cuenta**: para él la plataforma sigue siendo de consulta (solo ve eventos publicados).

> **Estado:** implementado en la rama `feature/roles-moderacion`. **Verificado el 28-11-2026 en el equipo del usuario** (Windows, Node 22.23.5, Docker Desktop; carpeta de la rama `feature/mapa-eventos`, que contiene la Etapa 15 completa): `npm run lint` con 0 errores y 6 avisos; `npm run test` con 25 archivos y 323 pruebas (18 de ellas son del mapa de la Etapa 16); `npm run build` correcto; Docker con PostgreSQL aplica `0001_init` y `0002_roles_moderacion` sobre una base nueva y `npm run test:db` da 78 de 78. Prueba manual: inicio de sesión, navegación por el panel sin perder la sesión, revisión y aprobación de eventos. La verificación encontró y corrigió tres defectos: un error de lint en una prueba, la sesión que se perdía al cambiar de pantalla sin `SESSION_SECRET` y dos pruebas de contrato que publicaban sin fecha de revisión.

## 1. Perfiles

| Perfil | ¿Cómo se obtiene? | Qué puede hacer |
|---|---|---|
| **Consumidor** | No tiene cuenta | Buscar y ver eventos **publicados** (`/`, `/eventos/[id]`, `/api/events…`). |
| **Creador** | Lo crea un administrador (no hay registro abierto) | Crear y editar **sus** borradores, enviarlos a revisión, retirarlos y ver el estado y los motivos de rechazo. |
| **Administrador** | Se crea con la semilla (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`) | Revisar la cola, **aprobar** (publicar), rechazar, retirar publicaciones, ver el historial y crear/activar/desactivar creadores. |

**Solo el administrador puede publicar un evento.** Un creador nunca puede dejar un evento en estado «Publicado»: el servidor lo impide y además la base de datos lo rechaza (restricción `event_published_reviewed_chk`).

## 2. Ciclo de vida de un evento

```
            enviar (acepta la política)            aprobar (solo administrador)
 BORRADOR ───────────────────────────► EN REVISIÓN ─────────────────────────────► PUBLICADO
    ▲  ▲                                  │   │                                      │
    │  └──── retirar (creador) ───────────┘   │ rechazar (administrador, con motivo)  │
    │                                         ▼                                      │
    └───── corregir y volver a enviar ─── RECHAZADO ◄──── retirar publicación (administrador)
                                                                                     │
    BORRADOR ◄──────────────── retirar publicación (creador) ────────────────────────┘
```

- Solo los eventos **PUBLISHED** aparecen en `/api/events`, `/api/events/[id]`, categorías y comunas.
- Las transiciones son **atómicas** (`UPDATE … WHERE status IN (…)` más el registro de la decisión en la misma transacción): si dos administradores deciden a la vez, solo uno gana y el otro recibe `409`.
- Cada decisión queda en `moderation_review` (quién, cuándo, motivo, nota, alertas automáticas, casillas confirmadas y versión de la política).

## 3. Política de contenido (versión `2026-11-v1`)

No se pueden publicar eventos con:

1. **Contenido adulto:** desnudos o actos sexuales (eventos «+18» por ese motivo).
2. **Drogas** o tráfico de drogas.
3. **Mercado negro** o comercio ilícito.

Un evento «+18» que **no** incluya nada de lo anterior (por ejemplo, un concierto con restricción de edad) no se rechaza por la sola edad; lo decide el administrador con la lista de condiciones. *(Interpretación a confirmar con el equipo.)*

Cómo se aplica:

- **El creador** declara, al enviar, que el evento cumple la política (`acceptsContentPolicy`); queda la fecha y hora de la declaración.
- **Revisión automática (orientativa):** el sistema busca palabras clave en título y descripción y muestra alertas al administrador. **Nunca aprueba ni rechaza por sí sola.**
- **El administrador** debe marcar las **tres condiciones** («no incluye desnudos ni actos sexuales», «no incluye drogas ni tráfico de drogas», «no incluye mercado negro o comercio ilícito») para poder aprobar. Si hay alertas automáticas, debe además escribir una **nota** (mínimo 10 caracteres). Rechazar y retirar exigen motivo y explicación.

### Límites conocidos de la revisión automática

- Es por **palabras clave en español**: «Charla de prevención de drogas» genera una alerta (falso positivo) y una redacción disfrazada puede no generarla (falso negativo). Por eso la decisión depende de la confirmación humana.
- **No analiza imágenes, afiches ni videos**: el administrador abre los enlaces y los revisa él mismo (las direcciones se muestran completas).
- No es asesoría legal: la política refleja los criterios definidos por el equipo del proyecto.

## 4. Seguridad de las cuentas

- Contraseñas con **scrypt** (sal propia por usuario); largo mínimo 10 y máximo 128.
- Sesión con token firmado (HMAC-SHA256) en cookie `mozak_session` (`HttpOnly`, `SameSite=Lax`, `Secure` si es https), duración 8 horas. **El rol se lee de la base en cada petición**: desactivar una cuenta o cambiar su rol tiene efecto inmediato.
- Límite de intentos de ingreso: 5 por 15 minutos por IP y correo. **Limitación:** el contador vive en la memoria de cada instancia (en Vercel o con varias instancias no se comparte).
- Mismo mensaje de error para correo inexistente, contraseña incorrecta y cuenta desactivada.
- Defensa CSRF en las rutas que modifican datos (cabeceras `Sec-Fetch-Site` y `Origin`), cuerpo JSON de máximo 64 KB y `Cache-Control: no-store`.
- Los enlaces que ingresa el creador solo pueden ser `http://` o `https://` (se bloquea `javascript:`).
- **`SESSION_SECRET`** (mínimo 32 caracteres) es obligatorio en Vercel o con varias instancias. Si falta, se usa un secreto temporal con un aviso en el log.

## 5. API

Todas las respuestas de estos endpoints son `no-store`. Los errores traen `error` (mensaje en español) y `code`; los de validación traen además `issues`.

| Endpoint | Método | Perfil | Descripción |
|---|---|---|---|
| `/api/auth/login` | POST | — | Inicia sesión (`email`, `password`). |
| `/api/auth/logout` | POST | cualquiera | Cierra sesión. |
| `/api/auth/me` | GET | cualquiera | Usuario de la sesión. |
| `/api/creator/catalog` | GET | creador | Categorías, recintos y política de contenido. |
| `/api/creator/events` | GET, POST | creador | Lista propia / crea borrador. |
| `/api/creator/events/[id]` | GET, PUT | creador | Detalle propio / actualiza borrador o rechazado. |
| `/api/creator/events/[id]/submit` | POST | creador | Envía a revisión (`acceptsContentPolicy: true`). |
| `/api/creator/events/[id]/withdraw` | POST | creador | Retira (de revisión o publicado) a borrador. |
| `/api/admin/events` | GET | administrador | Lista (filtro `?status=`) y política de revisión. |
| `/api/admin/events/[id]` | GET | administrador | Detalle, alertas automáticas e historial. |
| `/api/admin/events/[id]/approve` | POST | administrador | Aprueba (3 casillas + nota si hay alertas). |
| `/api/admin/events/[id]/reject` | POST | administrador | Rechaza (`reason`, `note`). |
| `/api/admin/events/[id]/unpublish` | POST | administrador | Retira una publicación (`reason`, `note`). |
| `/api/admin/users` | GET, POST | administrador | Lista / crea cuentas de creador. |
| `/api/admin/users/[id]` | PATCH | administrador | Activa o desactiva un creador. |

Códigos: `401` sin sesión, `403` perfil sin permiso o CSRF, `404` no existe o no es tuyo, `409` estado no permitido o correo repetido, `400` datos inválidos, `422` casillas incompletas o nota faltante, `429` demasiados intentos de ingreso.

## 6. Modelo de datos (migración `0002_roles_moderacion`)

- `app_user` (id, email único en minúsculas, nombre, hash, rol `ADMIN|CREATOR`, activo, fechas).
- `event` agrega: `status`, `created_by_id`, `submitted_at`, `reviewed_at`, `content_policy_accepted_at`, `created_at`, `updated_at`. Los eventos existentes quedan **PUBLISHED** (no cambia lo que ya se veía). Restricción: un evento de un creador no puede estar publicado sin `reviewed_at`.
- `moderation_review` (evento, revisor, decisión `APPROVED|REJECTED|UNPUBLISHED`, motivo, nota, categorías alertadas, `checklist_confirmed`, versión de la política). Restricción: una aprobación exige `checklist_confirmed`.

## 7. Cuentas de demostración y cómo crear el administrador

- **Modo mock (`DATA_SOURCE=mock`):** con `npm run dev` y con `docker compose up` existen `admin@mozak.demo` y `organizador@mozak.demo` (contraseña `mozak-demo-2026`, o `DEMO_USERS_PASSWORD`). Los datos creados **se pierden al reiniciar** el servidor.
- **PostgreSQL:** `npm run db:seed` crea el administrador solo si defines `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`; con `SEED_DEMO_USERS=true` crea además las cuentas de demostración. `docker-compose.postgres.yml` activa `SEED_DEMO_USERS` por defecto (solo para uso local).
- **Nunca** dejes las cuentas de demostración en un servidor accesible desde Internet: su contraseña está en el código y en este documento.

## 8. Limitaciones conocidas

- Contador de intentos de ingreso en memoria (por instancia).
- Sin cambio ni recuperación de contraseña (el administrador crea la cuenta con una contraseña inicial).
- Los eventos de catálogo (anteriores a esta etapa, sin creador) que un administrador retira de la publicación no se pueden volver a publicar desde la interfaz.
- Las coordenadas de un recinto nuevo se ingresan a mano; no se suben imágenes (solo enlaces).
- La revisión automática es por palabras clave (ver §3).
- Esta etapa **no** incluye lo marcado como pendiente por el equipo: validación de negocio/SaaS, política de legalidad de fuentes de ingesta, política de privacidad y datos, reorganización de la presentación por sprint y ampliación de la encuesta.

## 9. Cómo verificarlo (en el equipo del proyecto)

```bash
npm install
npm run lint
npm run test            # incluye 97 pruebas nuevas (moderación, auth, workflow, API)
npm run build
# PostgreSQL (Docker): aplica la migración 0002 y crea cuentas
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build
npm run test:db         # contrato de gestión + restricciones del esquema
```

Prueba manual sugerida: ingresar en `/ingresar` como creador → crear evento → enviar a revisión (verifica que sin la declaración no deja) → ingresar como administrador → revisar → intentar aprobar sin marcar las casillas (debe estar deshabilitado) → aprobar → confirmar que aparece en `/` → retirarlo y confirmar que desaparece. Repetir con un evento cuya descripción mencione «desnudos» o «cocaína» y comprobar la alerta.
