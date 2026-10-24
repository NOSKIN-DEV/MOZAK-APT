import { describe, expect, it } from "vitest";
import { buildTextFilterQuery } from "./postgres-text-filters";

/**
 * Etapa 11 — construcción de la consulta SQL de filtros de texto.
 * Se prueba el texto generado y que los valores viajen como parámetros; la
 * ejecución real contra PostgreSQL se cubre en postgres-event-repository.db.test.ts.
 */
describe("buildTextFilterQuery", () => {
  it("sin búsqueda ni comuna no genera consulta", () => {
    expect(buildTextFilterQuery({})).toBeNull();
    expect(buildTextFilterQuery({ search: undefined, commune: undefined })).toBeNull();
  });

  it("solo búsqueda: un parámetro y filtro con unaccent sobre título, descripción, lugar y comuna", () => {
    const query = buildTextFilterQuery({ search: "jazz" });
    expect(query?.values).toEqual(["jazz"]);
    expect(query?.text).toContain("unaccent");
    expect(query?.text).toContain('e."title"');
    expect(query?.text).toContain('e."description"');
    expect(query?.text).toContain('v."name"');
    expect(query?.text).toContain('v."commune"');
    expect(query?.text).toContain("$1");
    expect(query?.text).not.toContain("$2");
  });

  it("solo comuna: un parámetro y comparación de igualdad", () => {
    const query = buildTextFilterQuery({ commune: "Ñuñoa" });
    expect(query?.values).toEqual(["Ñuñoa"]);
    expect(query?.text).toContain('lower(unaccent(v."commune")) = lower(unaccent($1))');
  });

  it("búsqueda y comuna juntas: dos parámetros combinados con AND", () => {
    const query = buildTextFilterQuery({ search: "teatro", commune: "Santiago" });
    expect(query?.values).toEqual(["teatro", "Santiago"]);
    expect(query?.text).toContain("$1");
    expect(query?.text).toContain("$2");
    expect(query?.text).toContain(" AND ");
  });

  it("el texto del usuario nunca se concatena al SQL, solo viaja como parámetro", () => {
    const hostile = "'; DROP TABLE event; --";
    const query = buildTextFilterQuery({ search: hostile, commune: hostile });
    expect(query?.text).not.toContain("DROP");
    expect(query?.values).toEqual([hostile, hostile]);
  });
});
