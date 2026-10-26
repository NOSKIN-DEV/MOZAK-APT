import { describe, expect, it } from "vitest";
import { buildEventsQuery, type EventsQueryInput } from "./build-events-query";
import { parseEventQuery } from "./parse-event-query";

const base: EventsQueryInput = {
  search: "",
  category: "",
  commune: "",
  date: "",
  priceFilter: "all",
  sort: "date_asc",
  page: 1,
  limit: 12,
};

describe("buildEventsQuery", () => {
  it("sin filtros solo manda orden y paginación", () => {
    expect(buildEventsQuery(base)).toBe("?sort=date_asc&page=1&limit=12");
  });

  it("incluye cada filtro activo; la fecha se manda como dateFrom = dateTo", () => {
    const query = buildEventsQuery({
      ...base,
      search: " teatro ",
      category: "cat-teatro",
      commune: "Santiago",
      date: "2026-10-05",
      priceFilter: "free",
      sort: "date_desc",
      page: 2,
    });
    const params = new URLSearchParams(query);
    expect(params.get("search")).toBe("teatro");
    expect(params.get("category")).toBe("cat-teatro");
    expect(params.get("commune")).toBe("Santiago");
    expect(params.get("dateFrom")).toBe("2026-10-05");
    expect(params.get("dateTo")).toBe("2026-10-05");
    expect(params.get("isFree")).toBe("true");
    expect(params.get("sort")).toBe("date_desc");
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("12");
  });

  it('priceFilter "paid" manda isFree=false', () => {
    expect(new URLSearchParams(buildEventsQuery({ ...base, priceFilter: "paid" })).get("isFree")).toBe("false");
  });

  it("codifica caracteres especiales y la API los recibe tal cual", () => {
    const search = "música & café #1 100%";
    const query = buildEventsQuery({ ...base, search, commune: "Ñuñoa" });
    expect(query).not.toContain("&café");
    const parsed = parseEventQuery(new URLSearchParams(query));
    expect(parsed).toEqual({
      success: true,
      filters: { search, commune: "Ñuñoa" },
      options: { sort: "date_asc", page: 1, limit: 12 },
    });
  });
});
