import { describe, expect, it } from "vitest";
import { parseEventFilters, parseEventListOptions, parseEventQuery } from "./parse-event-query";

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

/**
 * Etapa 13 — HU-23 / MTC_00270: sanitización de los parámetros de texto.
 */
describe("parseEventFilters: sanitización (MTC_00270)", () => {
  it("colapsa espacios internos y recorta el texto de búsqueda", () => {
    const result = parseEventFilters(params({ search: "  teatro \t  infantil " }));
    expect(result).toEqual({ success: true, filters: { search: "teatro infantil" } });
  });

  it("normaliza a NFC (Ñuñoa con tilde combinante = Ñuñoa)", () => {
    const result = parseEventFilters(params({ commune: "Ñuñoa".normalize("NFD") }));
    expect(result).toEqual({ success: true, filters: { commune: "Ñuñoa" } });
  });

  it("rechaza el byte nulo con un 400 claro (evita un error 500 de PostgreSQL)", () => {
    const result = parseEventFilters(params({ search: "abc\u0000def" }));
    expect(result).toEqual({
      success: false,
      issues: [{ path: "search", message: 'El parámetro "search" contiene caracteres no permitidos' }],
    });
  });

  it("rechaza una búsqueda de más de 100 caracteres", () => {
    const result = parseEventFilters(params({ search: "a".repeat(101) }));
    expect(result).toEqual({
      success: false,
      issues: [{ path: "search", message: 'El parámetro "search" no puede superar 100 caracteres' }],
    });
  });

  it("acepta una búsqueda de exactamente 100 caracteres", () => {
    expect(parseEventFilters(params({ search: "a".repeat(100) })).success).toBe(true);
  });

  it("deja pasar comillas, %, _ y etiquetas en la búsqueda: son texto literal para la base de datos", () => {
    for (const search of ["'; DROP TABLE event; --", "100%", "a_b", "<script>alert(1)</script>"]) {
      expect(parseEventFilters(params({ search }))).toEqual({ success: true, filters: { search } });
    }
  });

  it("acepta comunas reales con tildes, eñes, espacios y apóstrofes", () => {
    for (const commune of ["Ñuñoa", "Peñalolén", "Estación Central", "O'Higgins"]) {
      expect(parseEventFilters(params({ commune }))).toEqual({ success: true, filters: { commune } });
    }
  });

  it("rechaza una comuna con símbolos de código", () => {
    for (const commune of ["<script>", "Santiago; DROP TABLE", "Recoleta%00", "1=1"]) {
      expect(parseEventFilters(params({ commune })).success).toBe(false);
    }
  });

  it("acepta ids de categoría y rechaza los que traen símbolos", () => {
    expect(parseEventFilters(params({ category: "cat-ferias" }))).toEqual({
      success: true,
      filters: { category: "cat-ferias" },
    });
    for (const category of ["cat ferias", "cat'--", "../etc/passwd", "cat-ferias;", "x".repeat(65)]) {
      expect(parseEventFilters(params({ category })).success).toBe(false);
    }
  });

  it("rechaza un parámetro repetido en vez de elegir uno al azar", () => {
    const repeated = new URLSearchParams([
      ["search", "a"],
      ["search", "b"],
    ]);
    expect(parseEventFilters(repeated)).toEqual({
      success: false,
      issues: [{ path: "search", message: 'El parámetro "search" no puede repetirse' }],
    });
  });

  it("los mensajes de error nunca repiten el valor recibido", () => {
    const attack = "<img src=x onerror=alert(1)>";
    const result = parseEventFilters(params({ commune: attack, category: attack, dateFrom: attack, isFree: attack }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.issues)).not.toContain("onerror");
    }
  });

  it("informa todos los errores a la vez", () => {
    const result = parseEventFilters(params({ isFree: "si", dateFrom: "ayer" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.map((i) => i.path).sort()).toEqual(["dateFrom", "isFree"]);
    }
  });
});

/**
 * Etapa 13 — HU-21 / HU-22: sort, page y limit.
 */
describe("parseEventListOptions", () => {
  it("sin parámetros no define nada (los valores por defecto los aplica el repositorio)", () => {
    expect(parseEventListOptions(params({}))).toEqual({ success: true, options: {} });
  });

  it("acepta sort, page y limit válidos", () => {
    expect(parseEventListOptions(params({ sort: "date_desc", page: "3", limit: "50" }))).toEqual({
      success: true,
      options: { sort: "date_desc", page: 3, limit: 50 },
    });
  });

  it("acepta los límites exactos: page 1 y limit 1 o 100", () => {
    expect(parseEventListOptions(params({ page: "1", limit: "1" })).success).toBe(true);
    expect(parseEventListOptions(params({ limit: "100" })).success).toBe(true);
  });

  it("ignora parámetros vacíos", () => {
    expect(parseEventListOptions(params({ sort: "", page: "", limit: " " }))).toEqual({
      success: true,
      options: {},
    });
  });

  it("rechaza un sort desconocido", () => {
    expect(parseEventListOptions(params({ sort: "precio" }))).toEqual({
      success: false,
      issues: [{ path: "sort", message: 'El parámetro "sort" debe ser "date_asc" o "date_desc"' }],
    });
  });

  it("rechaza page y limit que no sean enteros dentro del rango", () => {
    const invalidLimits = ["0", "101", "-1", "1.5", "1e1", "abc", "0x10", "٣", "999999999999"];
    for (const limit of invalidLimits) {
      expect(parseEventListOptions(params({ limit })).success).toBe(false);
    }
    for (const page of ["0", "-2", "2.0", "10001", "NaN", "Infinity"]) {
      expect(parseEventListOptions(params({ page })).success).toBe(false);
    }
  });

  it("el mensaje de error de limit indica el rango", () => {
    expect(parseEventListOptions(params({ limit: "500" }))).toEqual({
      success: false,
      issues: [{ path: "limit", message: 'El parámetro "limit" debe ser un entero entre 1 y 100' }],
    });
  });

  it("rechaza sort, page o limit repetidos", () => {
    const repeated = new URLSearchParams([
      ["limit", "5"],
      ["limit", "500"],
    ]);
    expect(parseEventListOptions(repeated)).toEqual({
      success: false,
      issues: [{ path: "limit", message: 'El parámetro "limit" no puede repetirse' }],
    });
  });
});

describe("parseEventQuery", () => {
  it("combina filtros y opciones", () => {
    expect(parseEventQuery(params({ search: "jazz", sort: "date_desc", limit: "5" }))).toEqual({
      success: true,
      filters: { search: "jazz" },
      options: { sort: "date_desc", limit: 5 },
    });
  });

  it("reúne los errores de filtros y de opciones en una sola respuesta", () => {
    const result = parseEventQuery(params({ isFree: "si", limit: "0" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.map((i) => i.path)).toEqual(["isFree", "limit"]);
    }
  });
});
