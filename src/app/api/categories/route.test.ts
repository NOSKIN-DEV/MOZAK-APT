import { describe, expect, it } from "vitest";
import { GET } from "./route";

/**
 * Épica APT-8 (Sprint 2), historia APT-89 — GET /api/categories responde
 * 200 con la lista completa de categorías, para llenar el filtro.
 */
describe("GET /api/categories", () => {
  it("responde 200 con las 9 categorías de demostración", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toHaveLength(9);
    expect(body.data[0]).toHaveProperty("id");
    expect(body.data[0]).toHaveProperty("name");
  });
});
