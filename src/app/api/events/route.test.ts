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
  it("responde 200 con JSON válido y meta.total consistente con data.length", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(24);
    expect(body.meta.total).toBe(24);
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
});
