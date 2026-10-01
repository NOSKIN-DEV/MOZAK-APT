import { describe, expect, it } from "vitest";
import { GET } from "./route";

/**
 * Épica APT-8 (Sprint 2), historia APT-89 — GET /api/communes responde
 * 200 con las comunas derivadas de los venues, sin duplicados y
 * ordenadas alfabéticamente.
 */
describe("GET /api/communes", () => {
  it("responde 200 con las 12 comunas, sin duplicados y ordenadas", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toHaveLength(12);
    expect(body.data).toEqual([...body.data].sort((a: string, b: string) => a.localeCompare(b, "es")));
  });
});
