import { describe, expect, it } from "vitest";
import { parseEventFilters } from "./parse-event-query";

function params(obj: Record<string, string>): URLSearchParams {
  return new URLSearchParams(obj);
}

/**
 * Épica APT-8 (Sprint 2), historia APT-89 (parte unitaria) — valida que
 * los query params de GET /api/events se traduzcan correctamente a
 * EventFilters, o que se rechacen con un mensaje claro cuando no lo son.
 */
describe("parseEventFilters", () => {
  it("retorna filtros vacíos cuando no hay query params", () => {
    expect(parseEventFilters(params({}))).toEqual({ success: true, filters: {} });
  });

  it('acepta isFree="true" y isFree="false"', () => {
    expect(parseEventFilters(params({ isFree: "true" }))).toEqual({
      success: true,
      filters: { isFree: true },
    });
    expect(parseEventFilters(params({ isFree: "false" }))).toEqual({
      success: true,
      filters: { isFree: false },
    });
  });

  it('rechaza un isFree que no sea "true" ni "false"', () => {
    const result = parseEventFilters(params({ isFree: "si" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues).toEqual([
        { path: "isFree", message: 'El parámetro "isFree" debe ser "true" o "false"' },
      ]);
    }
  });

  it("ignora parámetros vacíos o compuestos solo de espacios", () => {
    expect(parseEventFilters(params({ search: "   ", category: "" }))).toEqual({
      success: true,
      filters: {},
    });
  });

  it("rechaza una fecha con formato inválido", () => {
    const result = parseEventFilters(params({ dateFrom: "2026/10/01" }));
    expect(result.success).toBe(false);
  });

  it("combina varios filtros válidos a la vez", () => {
    const result = parseEventFilters(
      params({ search: "teatro", category: "cat-teatro", commune: "Santiago", isFree: "false" }),
    );
    expect(result).toEqual({
      success: true,
      filters: { search: "teatro", category: "cat-teatro", commune: "Santiago", isFree: false },
    });
  });
});
