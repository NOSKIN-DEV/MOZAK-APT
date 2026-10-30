import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE } from "@/lib/schemas";
import { buildPage, resolveListOptions } from "./pagination";

/**
 * Etapa 13 — HU-21 / HU-22 / MTC_00190: valores por defecto y cálculo de páginas.
 */
describe("resolveListOptions", () => {
  it("sin opciones: date_asc, página 1 y el tamaño de página por defecto (20)", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect(resolveListOptions()).toEqual({ sort: "date_asc", page: 1, limit: 20, offset: 0 });
  });

  it("calcula el desplazamiento como (page - 1) * limit", () => {
    expect(resolveListOptions({ page: 3, limit: 10 })).toEqual({
      sort: "date_asc",
      page: 3,
      limit: 10,
      offset: 20,
    });
  });

  it("respeta el orden pedido", () => {
    expect(resolveListOptions({ sort: "date_desc" }).sort).toBe("date_desc");
  });
});

describe("buildPage", () => {
  const resolved = resolveListOptions({ page: 1, limit: 10 });

  it("totalPages = ceil(total / limit)", () => {
    expect(buildPage([], 24, resolved).totalPages).toBe(3);
    expect(buildPage([], 20, resolved).totalPages).toBe(2);
    expect(buildPage([], 1, resolved).totalPages).toBe(1);
  });

  it("sin resultados hay 0 páginas", () => {
    expect(buildPage([], 0, resolved).totalPages).toBe(0);
  });

  it("copia page, limit y sort de las opciones resueltas", () => {
    const page = buildPage(["x"], 5, resolveListOptions({ page: 2, limit: 3, sort: "date_desc" }));
    expect(page).toEqual({ items: ["x"], total: 5, page: 2, limit: 3, totalPages: 2, sort: "date_desc" });
  });
});
