import { describe, expect, it } from "vitest";
import { demoUsersPassword } from "@/lib/auth/demo-users";
import { POST as login } from "./route";
import { GET as me } from "../me/route";
import { GET as listCreatorEvents } from "../../creator/events/route";
import { GET as listAdminEvents } from "../../admin/events/route";

/**
 * Prueba de punta a punta de las rutas reales (modo mock, cuentas de
 * demostración): inicio de sesión, cookie y permisos por rol. No cambia datos.
 */
function post(body: unknown): Request {
  return new Request("http://mozak.test/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", host: "mozak.test" },
    body: JSON.stringify(body),
  });
}

function get(path: string, cookie: string): Request {
  return new Request(`http://mozak.test${path}`, { headers: { cookie, host: "mozak.test" } });
}

describe("rutas de sesión (modo mock con cuentas de demostración)", () => {
  it("el creador de demostración inicia sesión y solo puede usar las rutas de creador", async () => {
    const response = await login(post({ email: "organizador@mozak.demo", password: demoUsersPassword() }));
    expect(response.status).toBe(200);
    const cookie = (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "";

    expect((await me(get("/api/auth/me", cookie))).status).toBe(200);
    expect((await listCreatorEvents(get("/api/creator/events", cookie))).status).toBe(200);
    expect((await listAdminEvents(get("/api/admin/events", cookie))).status).toBe(403);
  });

  it("el administrador de demostración ve los 24 eventos publicados; sin sesión se recibe 401", async () => {
    const response = await login(post({ email: "admin@mozak.demo", password: demoUsersPassword() }));
    expect(response.status).toBe(200);
    const cookie = (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "";

    const events = await listAdminEvents(get("/api/admin/events?status=PUBLISHED", cookie));
    expect(events.status).toBe(200);
    expect((await events.json()).data).toHaveLength(24);
    expect((await listAdminEvents(new Request("http://mozak.test/api/admin/events"))).status).toBe(401);
  });

  it("una contraseña incorrecta da 401", async () => {
    const response = await login(post({ email: "admin@mozak.demo", password: "no-es-la-clave" }));
    expect(response.status).toBe(401);
  });
});
