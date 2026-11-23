import { describe, expect, it } from "vitest";
import { createAdminHandlers } from "./admin-handlers";
import { createAuthHandlers } from "./auth-handlers";
import { createCreatorHandlers } from "./creator-handlers";
import { createTestWorld, FULL_CHECKLIST, TEST_PASSWORD, validEventInput } from "./test-support";

const ORIGIN = "http://mozak.test";

interface Call {
  cookie?: string | null;
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
}

function request(method: string, path: string, call: Call = {}): Request {
  const headers: Record<string, string> = { host: "mozak.test", ...call.headers };
  if (call.cookie) headers.cookie = call.cookie;
  const hasBody = call.body !== undefined || call.rawBody !== undefined;
  if (hasBody && !headers["content-type"]) headers["content-type"] = "application/json";
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    body: hasBody ? (call.rawBody ?? JSON.stringify(call.body)) : undefined,
  });
}

async function bodyOf(response: Response): Promise<any> {
  return response.json();
}

function cookieFrom(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  return header.split(";")[0] ?? "";
}

async function setup() {
  const world = await createTestWorld();
  const auth = createAuthHandlers(world.services);
  const creator = createCreatorHandlers(world.services);
  const admin = createAdminHandlers(world.services);

  async function login(user: { email: string }, password = TEST_PASSWORD): Promise<string> {
    const response = await auth.login(request("POST", "/api/auth/login", { body: { email: user.email, password } }));
    expect(response.status).toBe(200);
    return cookieFrom(response);
  }
  return { world, auth, creator, admin, login };
}

describe("POST /api/auth/login", () => {
  it("con credenciales correctas entrega una cookie de sesión HttpOnly y NO devuelve el hash", async () => {
    const { world, auth } = await setup();
    const response = await auth.login(request("POST", "/api/auth/login", { body: { email: "USER-A@mozak.test ", password: TEST_PASSWORD } }));
    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/^mozak_session=/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const text = JSON.stringify(await bodyOf(response));
    expect(text.includes("passwordHash")).toBe(false);
    expect(text.includes("scrypt")).toBe(false);
    expect(JSON.parse(text).data).toMatchObject({ id: world.creatorA.id, role: "CREATOR", name: "Creador A" });
    expect((await world.services.users.findById(world.creatorA.id))?.lastLoginAt).not.toBeNull();
  });

  it("contraseña incorrecta, correo desconocido y cuenta desactivada dan el MISMO mensaje (no revela qué correos existen)", async () => {
    const { world, auth } = await setup();
    await world.services.users.setActive(world.creatorB.id, false);
    const attempts = [
      { email: world.creatorA.email, password: "contraseña-equivocada" },
      { email: "nadie@mozak.test", password: TEST_PASSWORD },
      { email: world.creatorB.email, password: TEST_PASSWORD },
    ];
    const messages: string[] = [];
    for (const attempt of attempts) {
      const response = await auth.login(request("POST", "/api/auth/login", { body: attempt }));
      expect(response.status).toBe(401);
      expect(response.headers.get("set-cookie")).toBeNull();
      messages.push((await bodyOf(response)).error);
    }
    expect(new Set(messages).size).toBe(1);
  });

  it("tras 5 intentos fallidos bloquea (429) incluso con la contraseña correcta; otro correo sigue pudiendo entrar", async () => {
    const { world, auth } = await setup();
    for (let i = 0; i < 5; i++) {
      const response = await auth.login(request("POST", "/api/auth/login", { body: { email: world.creatorA.email, password: "mala-clave-" + i } }));
      expect(response.status).toBe(401);
    }
    const blocked = await auth.login(request("POST", "/api/auth/login", { body: { email: world.creatorA.email, password: TEST_PASSWORD } }));
    expect(blocked.status).toBe(429);
    const other = await auth.login(request("POST", "/api/auth/login", { body: { email: world.creatorB.email, password: TEST_PASSWORD } }));
    expect(other.status).toBe(200);
  });

  it("valida el cuerpo: sin JSON, JSON roto o campos vacíos", async () => {
    const { auth } = await setup();
    expect((await auth.login(request("POST", "/api/auth/login", { rawBody: "texto", headers: { "content-type": "text/plain" } }))).status).toBe(415);
    expect((await auth.login(request("POST", "/api/auth/login", { rawBody: "{no es json" }))).status).toBe(400);
    expect((await auth.login(request("POST", "/api/auth/login", { body: { email: "", password: "" } }))).status).toBe(400);
    expect((await auth.login(request("POST", "/api/auth/login", { body: { email: "a@b.cl" } }))).status).toBe(400);
  });

  it("rechaza peticiones que vienen de otro sitio (CSRF)", async () => {
    const { world, auth } = await setup();
    const body = { email: world.creatorA.email, password: TEST_PASSWORD };
    expect((await auth.login(request("POST", "/api/auth/login", { body, headers: { origin: "https://sitio-malo.example" } }))).status).toBe(403);
    expect((await auth.login(request("POST", "/api/auth/login", { body, headers: { "sec-fetch-site": "cross-site" } }))).status).toBe(403);
    expect((await auth.login(request("POST", "/api/auth/login", { body, headers: { origin: ORIGIN, "sec-fetch-site": "same-origin" } }))).status).toBe(200);
  });
});

describe("sesión: /api/auth/me y logout", () => {
  it("me responde con el usuario de la cookie, y 401 sin cookie, con cookie alterada o tras desactivar la cuenta", async () => {
    const { world, auth, login } = await setup();
    const cookie = await login(world.creatorA);

    const ok = await auth.me(request("GET", "/api/auth/me", { cookie }));
    expect(ok.status).toBe(200);
    expect((await bodyOf(ok)).data.email).toBe(world.creatorA.email);

    expect((await auth.me(request("GET", "/api/auth/me"))).status).toBe(401);
    expect((await auth.me(request("GET", "/api/auth/me", { cookie: cookie.slice(0, -3) + "abc" }))).status).toBe(401);

    await world.services.users.setActive(world.creatorA.id, false);
    expect((await auth.me(request("GET", "/api/auth/me", { cookie }))).status).toBe(401);
  });

  it("un token de OTRO secreto no sirve", async () => {
    const { world, auth } = await setup();
    const { createSessionToken } = await import("@/lib/auth/session");
    const forged = createSessionToken(world.admin.id, "otro-secreto-".repeat(5));
    expect((await auth.me(request("GET", "/api/auth/me", { cookie: `mozak_session=${forged}` }))).status).toBe(401);
  });

  it("logout borra la cookie", async () => {
    const { auth } = await setup();
    const response = await auth.logout(request("POST", "/api/auth/logout"));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });
});

describe("permisos por rol (matriz)", () => {
  it("sin sesión todo lo protegido responde 401; con el rol equivocado, 403", async () => {
    const { world, creator, admin, login } = await setup();
    const creatorCookie = await login(world.creatorA);
    const adminCookie = await login(world.admin);

    const creatorRoutes: [string, (cookie?: string) => Promise<Response>][] = [
      ["catalog", (c) => creator.catalog(request("GET", "/api/creator/catalog", { cookie: c }))],
      ["list", (c) => creator.list(request("GET", "/api/creator/events", { cookie: c }))],
      ["create", (c) => creator.create(request("POST", "/api/creator/events", { cookie: c, body: validEventInput() }))],
      ["get", (c) => creator.get(request("GET", "/api/creator/events/x", { cookie: c }), "x")],
      ["update", (c) => creator.update(request("PUT", "/api/creator/events/x", { cookie: c, body: validEventInput() }), "x")],
      ["submit", (c) => creator.submit(request("POST", "/api/creator/events/x/submit", { cookie: c, body: { acceptsContentPolicy: true } }), "x")],
      ["withdraw", (c) => creator.withdraw(request("POST", "/api/creator/events/x/withdraw", { cookie: c }), "x")],
    ];
    const adminRoutes: [string, (cookie?: string) => Promise<Response>][] = [
      ["listEvents", (c) => admin.listEvents(request("GET", "/api/admin/events", { cookie: c }))],
      ["getEvent", (c) => admin.getEvent(request("GET", "/api/admin/events/x", { cookie: c }), "x")],
      ["approve", (c) => admin.approve(request("POST", "/api/admin/events/x/approve", { cookie: c, body: { checklist: FULL_CHECKLIST } }), "x")],
      ["reject", (c) => admin.reject(request("POST", "/api/admin/events/x/reject", { cookie: c, body: { reason: "DRUGS", note: "Motivo de prueba largo" } }), "x")],
      ["unpublish", (c) => admin.unpublish(request("POST", "/api/admin/events/x/unpublish", { cookie: c, body: { reason: "DRUGS", note: "Motivo de prueba largo" } }), "x")],
      ["listUsers", (c) => admin.listUsers(request("GET", "/api/admin/users", { cookie: c }))],
      ["createUser", (c) => admin.createUser(request("POST", "/api/admin/users", { cookie: c, body: { name: "Nuevo", email: "n@mozak.test", password: "clave-larga-123" } }))],
      ["setUserActive", (c) => admin.setUserActive(request("PATCH", "/api/admin/users/x", { cookie: c, body: { active: false } }), "x")],
    ];

    for (const [name, call] of creatorRoutes) {
      expect([name, (await call(undefined)).status]).toEqual([name, 401]);
      expect([name, (await call(adminCookie)).status]).toEqual([name, 403]);
    }
    for (const [name, call] of adminRoutes) {
      expect([name, (await call(undefined)).status]).toEqual([name, 401]);
      expect([name, (await call(creatorCookie)).status]).toEqual([name, 403]);
    }
  });

  it("las acciones que cambian datos también exigen mismo origen", async () => {
    const { world, creator, login } = await setup();
    const cookie = await login(world.creatorA);
    const response = await creator.create(request("POST", "/api/creator/events", { cookie, body: validEventInput(), headers: { origin: "https://sitio-malo.example" } }));
    expect(response.status).toBe(403);
    expect((await world.services.management.listManaged({ createdById: world.creatorA.id })).length).toBe(0);
  });
});

describe("flujo completo por HTTP: crear → enviar → aprobar → publicar", () => {
  it("el evento solo aparece en la API pública cuando un administrador lo aprueba", async () => {
    const { world, creator, admin, login } = await setup();
    const creatorCookie = await login(world.creatorA);
    const adminCookie = await login(world.admin);

    // 1) el creador crea un borrador
    const created = await creator.create(request("POST", "/api/creator/events", { cookie: creatorCookie, body: validEventInput() }));
    expect(created.status).toBe(201);
    const draft = (await bodyOf(created)).data;
    expect(draft).toMatchObject({ status: "DRAFT", title: "Ciclo de cine al aire libre" });
    expect(draft.createdBy).toBeUndefined(); // el creador no recibe el bloque de autoría de administración

    // 2) sin declarar la política de contenido no se puede enviar
    const noDeclaration = await creator.submit(request("POST", "/x", { cookie: creatorCookie, body: {} }), draft.id);
    expect(noDeclaration.status).toBe(400);
    const submitted = await creator.submit(request("POST", "/x", { cookie: creatorCookie, body: { acceptsContentPolicy: true } }), draft.id);
    expect(submitted.status).toBe(200);
    expect((await bodyOf(submitted)).data.status).toBe("PENDING_REVIEW");

    // 3) todavía no es público
    expect(await world.services.events.findById(draft.id)).toBeNull();

    // 4) el administrador lo ve en la cola, con la política que debe confirmar
    const queue = await admin.listEvents(request("GET", "/api/admin/events?status=PENDING_REVIEW", { cookie: adminCookie }));
    const queueBody = await bodyOf(queue);
    expect(queueBody.data.map((e: { id: string }) => e.id)).toEqual([draft.id]);
    expect(queueBody.data[0].createdBy).toMatchObject({ name: "Creador A", email: "user-a@mozak.test" });
    expect(queueBody.policy.checklist).toHaveLength(3);

    // 5) sin confirmar las condiciones no se aprueba
    const incomplete = await admin.approve(request("POST", "/x", { cookie: adminCookie, body: { checklist: { noAdultContent: true, noDrugs: false, noBlackMarket: true } } }), draft.id);
    expect(incomplete.status).toBe(422);
    expect((await bodyOf(incomplete)).code).toBe("CHECKLIST_INCOMPLETE");
    expect(await world.services.events.findById(draft.id)).toBeNull();

    // 6) con las tres condiciones, queda publicado
    const approved = await admin.approve(request("POST", "/x", { cookie: adminCookie, body: { checklist: FULL_CHECKLIST } }), draft.id);
    expect(approved.status).toBe(200);
    expect((await bodyOf(approved)).data).toMatchObject({ status: "PUBLISHED", lastReview: { decision: "APPROVED", reviewerName: "Admin de prueba" } });
    expect((await world.services.events.findById(draft.id))?.title).toBe("Ciclo de cine al aire libre");

    // 7) el creador ve que fue publicado, pero NO ve la auditoría interna
    const mine = await bodyOf(await creator.get(request("GET", "/x", { cookie: creatorCookie }), draft.id));
    expect(mine.data.status).toBe("PUBLISHED");
    expect(mine.data.lastReview.reviewerName).toBeUndefined();
    expect(mine.data.lastReview.flaggedCategories).toBeUndefined();
  });

  it("un rechazo llega al creador con el motivo y la explicación", async () => {
    const { world, creator, admin, login } = await setup();
    const creatorCookie = await login(world.creatorA);
    const adminCookie = await login(world.admin);
    const draft = (await bodyOf(await creator.create(request("POST", "/x", { cookie: creatorCookie, body: validEventInput({ title: "Fiesta con desnudos en vivo" }) })))).data;
    await creator.submit(request("POST", "/x", { cookie: creatorCookie, body: { acceptsContentPolicy: true } }), draft.id);

    const detail = await bodyOf(await admin.getEvent(request("GET", "/x", { cookie: adminCookie }), draft.id));
    expect(detail.flags).toEqual([{ category: "ADULT_CONTENT", term: "desnudos" }]);

    const rejected = await admin.reject(request("POST", "/x", { cookie: adminCookie, body: { reason: "ADULT_CONTENT", note: "No se permiten desnudos ni actos sexuales." } }), draft.id);
    expect(rejected.status).toBe(200);

    const mine = (await bodyOf(await creator.get(request("GET", "/x", { cookie: creatorCookie }), draft.id))).data;
    expect(mine.status).toBe("REJECTED");
    expect(mine.lastReview).toMatchObject({ decision: "REJECTED", reasonCategory: "ADULT_CONTENT", note: "No se permiten desnudos ni actos sexuales." });
    expect(mine.lastReview.reasonLabel).toMatch(/Contenido adulto/);
  });

  it("un creador no puede leer el evento de otro (404) ni verlo en su lista", async () => {
    const { world, creator, login } = await setup();
    const cookieA = await login(world.creatorA);
    const cookieB = await login(world.creatorB);
    const draft = (await bodyOf(await creator.create(request("POST", "/x", { cookie: cookieA, body: validEventInput() })))).data;
    expect((await creator.get(request("GET", "/x", { cookie: cookieB }), draft.id)).status).toBe(404);
    expect((await bodyOf(await creator.list(request("GET", "/x", { cookie: cookieB })))).data).toEqual([]);
  });

  it("errores de validación llegan como 400 con el detalle de cada campo", async () => {
    const { world, creator, login } = await setup();
    const cookie = await login(world.creatorA);
    const response = await creator.create(request("POST", "/x", { cookie, body: validEventInput({ title: "x", sourceUrl: "javascript:alert(1)" }) }));
    expect(response.status).toBe(400);
    const body = await bodyOf(response);
    expect(body.code).toBe("VALIDATION");
    expect(body.issues.map((i: { path: string }) => i.path).sort()).toEqual(["sourceUrl", "title"]);
  });
});

describe("administración: filtros y cuentas de creadores", () => {
  it("rechaza un filtro de estado inexistente", async () => {
    const { world, admin, login } = await setup();
    const cookie = await login(world.admin);
    expect((await admin.listEvents(request("GET", "/api/admin/events?status=BORRADO", { cookie }))).status).toBe(400);
    const published = await bodyOf(await admin.listEvents(request("GET", "/api/admin/events?status=PUBLISHED", { cookie })));
    expect(published.data).toHaveLength(24); // los 24 eventos de demostración
  });

  it("el administrador crea una cuenta de creador, que puede iniciar sesión; el correo repetido da 409", async () => {
    const { world, auth, admin, login } = await setup();
    const cookie = await login(world.admin);

    const created = await admin.createUser(request("POST", "/x", { cookie, body: { name: "Teatro Nuevo", email: "Teatro.Nuevo@Mozak.test", password: "una-clave-segura-1" } }));
    expect(created.status).toBe(201);
    const user = (await bodyOf(created)).data;
    expect(user).toMatchObject({ email: "teatro.nuevo@mozak.test", role: "CREATOR", active: true });
    expect(JSON.stringify(user).includes("passwordHash")).toBe(false);

    const newLogin = await auth.login(request("POST", "/x", { body: { email: "teatro.nuevo@mozak.test", password: "una-clave-segura-1" } }));
    expect(newLogin.status).toBe(200);

    const duplicate = await admin.createUser(request("POST", "/x", { cookie, body: { name: "Otro", email: "teatro.nuevo@mozak.test", password: "otra-clave-segura-1" } }));
    expect(duplicate.status).toBe(409);
  });

  it("no acepta contraseñas débiles ni correos inválidos", async () => {
    const { world, admin, login } = await setup();
    const cookie = await login(world.admin);
    const weak = await admin.createUser(request("POST", "/x", { cookie, body: { name: "Alguien", email: "a@mozak.test", password: "corta" } }));
    expect(weak.status).toBe(400);
    const badEmail = await admin.createUser(request("POST", "/x", { cookie, body: { name: "Alguien", email: "no-es-correo", password: "una-clave-segura-1" } }));
    expect(badEmail.status).toBe(400);
  });

  it("desactivar una cuenta corta su sesión de inmediato; no se pueden gestionar administradores", async () => {
    const { world, auth, creator, admin, login } = await setup();
    const adminCookie = await login(world.admin);
    const creatorCookie = await login(world.creatorA);
    expect((await creator.list(request("GET", "/x", { cookie: creatorCookie }))).status).toBe(200);

    const off = await admin.setUserActive(request("PATCH", "/x", { cookie: adminCookie, body: { active: false } }), world.creatorA.id);
    expect(off.status).toBe(200);
    expect((await creator.list(request("GET", "/x", { cookie: creatorCookie }))).status).toBe(401);
    expect((await auth.login(request("POST", "/x", { body: { email: world.creatorA.email, password: TEST_PASSWORD } }))).status).toBe(401);

    expect((await admin.setUserActive(request("PATCH", "/x", { cookie: adminCookie, body: { active: false } }), world.admin.id)).status).toBe(404);
    expect((await admin.setUserActive(request("PATCH", "/x", { cookie: adminCookie, body: { active: "no" } }), world.creatorB.id)).status).toBe(400);
  });

  it("la lista de creadores nunca incluye hashes ni administradores", async () => {
    const { world, admin, login } = await setup();
    const cookie = await login(world.admin);
    const body = await bodyOf(await admin.listUsers(request("GET", "/x", { cookie })));
    expect(body.data.map((u: { id: string }) => u.id).sort()).toEqual([world.creatorA.id, world.creatorB.id].sort());
    expect(JSON.stringify(body).includes("scrypt")).toBe(false);
  });
});

describe("la API pública no cambia", () => {
  it("los borradores y rechazados no están en el listado público ni en el detalle", async () => {
    const { world, creator, login } = await setup();
    const cookie = await login(world.creatorA);
    const draft = (await bodyOf(await creator.create(request("POST", "/x", { cookie, body: validEventInput() })))).data;
    expect(await world.services.events.findById(draft.id)).toBeNull();
    expect((await world.services.events.findPage({}, { limit: 100 })).total).toBe(24);
  });
});
