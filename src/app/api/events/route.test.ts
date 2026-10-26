import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function request(query = ""): NextRequest {
  return new NextRequest(`http://localhost:3000/api/events${query}`);
}

/**
 * Épica APT-8 (Sprint 2), historia APT-89 — pruebas de integración de
 * GET /api/events: códigos de estado, forma del JSON y validación de
 * query params (contrato descrito en el documento de requisitos).
 */
describe("GET /api/events", () => {
  it("responde 200 con JSON válido; sin parámetros devuelve la primera página (20 de 24)", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(20);
    expect(body.meta).toEqual({ total: 24, page: 1, limit: 20, totalPages: 2, sort: "date_asc" });
  });

  it("cada evento serializado trae category y venue como objetos (no solo ids)", async () => {
    const response = await GET(request());
    const body = await response.json();
    const first = body.data[0];
    expect(first.category).toHaveProperty("id");
    expect(first.category).toHaveProperty("name");
    expect(first.venue).toHaveProperty("commune");
  });

  it("aplica filtros combinados vía query params", async () => {
    const response = await GET(request("?category=cat-conciertos&isFree=true"));
    const body = await response.json();
    expect(body.data.map((e: { id: string }) => e.id)).toEqual(["event-017"]);
  });

  it('responde 400 con el detalle del error ante isFree="si" (parámetro inválido)', async () => {
    const response = await GET(request("?isFree=si"));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Parámetros de búsqueda inválidos");
    expect(body.issues).toEqual([
      { path: "isFree", message: 'El parámetro "isFree" debe ser "true" o "false"' },
    ]);
  });

  it("responde 400 ante una fecha mal formada", async () => {
    const response = await GET(request("?dateFrom=2026/10/01"));
    expect(response.status).toBe(400);
  });

  // HU-21 / MTC_00110: ordenamiento por fecha
  describe("sort", () => {
    it("date_asc devuelve del evento más próximo al más lejano", async () => {
      const body = await (await GET(request("?sort=date_asc&limit=100"))).json();
      const dates = body.data.map((e: { startDate: string; startTime: string }) => `${e.startDate} ${e.startTime}`);
      expect(dates).toEqual([...dates].sort());
      expect(body.data[0].id).toBe("event-001");
    });

    it("date_desc devuelve del más lejano al más próximo", async () => {
      const body = await (await GET(request("?sort=date_desc&limit=3"))).json();
      expect(body.data.map((e: { id: string }) => e.id)).toEqual(["event-024", "event-023", "event-022"]);
      expect(body.meta.sort).toBe("date_desc");
    });

    it("responde 400 ante un sort desconocido", async () => {
      const response = await GET(request("?sort=precio"));
      expect(response.status).toBe(400);
    });
  });

  // HU-22 / MTC_00190: paginación o límite de resultados
  describe("page y limit", () => {
    it("limit=20 con 24 eventos devuelve exactamente 20 (MTC_00190)", async () => {
      const body = await (await GET(request("?limit=20"))).json();
      expect(body.data).toHaveLength(20);
      expect(body.meta.total).toBe(24);
    });

    it("limit=5 devuelve 5 y calcula 5 páginas", async () => {
      const body = await (await GET(request("?limit=5"))).json();
      expect(body.data).toHaveLength(5);
      expect(body.meta).toMatchObject({ total: 24, page: 1, limit: 5, totalPages: 5 });
    });

    it("la última página trae solo los que quedan", async () => {
      const body = await (await GET(request("?limit=5&page=5"))).json();
      expect(body.data.map((e: { id: string }) => e.id)).toEqual(["event-021", "event-022", "event-023", "event-024"]);
    });

    it("una página fuera de rango responde 200 con data vacío y el total intacto", async () => {
      const response = await GET(request("?page=99"));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([]);
      expect(body.meta.total).toBe(24);
    });

    it("meta.total cuenta todos los resultados del filtro, no solo los de la página", async () => {
      const body = await (await GET(request("?isFree=true&limit=2"))).json();
      expect(body.data).toHaveLength(2);
      expect(body.meta.total).toBeGreaterThan(2);
      expect(body.meta.totalPages).toBe(Math.ceil(body.meta.total / 2));
    });

    it.each(["0", "101", "-1", "abc", "1.5", "1e1"])(
      "responde 400 ante limit=%s",
      async (limit) => {
        const response = await GET(request(`?limit=${limit}`));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.issues[0].path).toBe("limit");
      },
    );

    it.each(["0", "-1", "abc", "1.5"])("responde 400 ante page=%s", async (page) => {
      const response = await GET(request(`?page=${page}`));
      expect(response.status).toBe(400);
    });

    it("responde 400 si limit viene repetido", async () => {
      const response = await GET(request("?limit=5&limit=500"));
      expect(response.status).toBe(400);
    });
  });

  // HU-23 / MTC_00270: seguridad básica de parámetros
  describe("entradas con caracteres especiales o inválidas (MTC_00270)", () => {
    it("un intento de inyección SQL se trata como texto: 200, sin resultados y sin tocar los datos", async () => {
      const attack = encodeURIComponent("'; DROP TABLE event; --");
      const response = await GET(request(`?search=${attack}`));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([]);
      expect(body.meta.total).toBe(0);

      const after = await (await GET(request())).json();
      expect(after.meta.total).toBe(24);
    });

    it("% y _ en la búsqueda no actúan como comodines", async () => {
      for (const search of ["%", "_", "%25"]) {
        const body = await (await GET(request(`?search=${encodeURIComponent(search)}`))).json();
        expect(body.meta.total).toBe(0);
      }
    });

    it("un byte nulo (%00) responde 400, no 500", async () => {
      const response = await GET(request("?search=a%00b"));
      expect(response.status).toBe(400);
    });

    it("una búsqueda de más de 100 caracteres responde 400", async () => {
      const response = await GET(request(`?search=${"a".repeat(101)}`));
      expect(response.status).toBe(400);
    });

    it("una comuna o categoría con símbolos de código responde 400 sin repetir el valor", async () => {
      for (const query of ["?commune=%3Cscript%3Ealert(1)%3C/script%3E", "?category=cat'%20OR%201=1"]) {
        const response = await GET(request(query));
        expect(response.status).toBe(400);
        const text = await response.text();
        expect(text).not.toContain("script");
        expect(text).not.toContain("OR 1=1");
      }
    });

    it("los parámetros desconocidos se ignoran", async () => {
      const response = await GET(request("?foo=bar&_=123456"));
      expect(response.status).toBe(200);
    });
  });
});
