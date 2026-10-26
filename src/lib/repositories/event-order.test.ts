import { describe, expect, it } from "vitest";
import { compareByDateAsc, sortEvents, type Orderable } from "./event-order";

function ev(id: string, startDate: string, startTime: string): Orderable {
  return { id, startDate, startTime };
}

/**
 * Etapa 13 — HU-21 / MTC_00110: orden cronológico (3 eventos con fechas distintas).
 */
describe("sortEvents", () => {
  const a = ev("e-a", "2026-11-20", "10:00");
  const b = ev("e-b", "2026-10-05", "19:30");
  const c = ev("e-c", "2026-12-01", "09:00");

  it("date_asc ordena del más próximo al más lejano", () => {
    expect(sortEvents([a, b, c], "date_asc").map((e) => e.id)).toEqual(["e-b", "e-a", "e-c"]);
  });

  it("date_desc ordena del más lejano al más próximo", () => {
    expect(sortEvents([a, b, c], "date_desc").map((e) => e.id)).toEqual(["e-c", "e-a", "e-b"]);
  });

  it("con la misma fecha desempata por hora de inicio", () => {
    const morning = ev("e-1", "2026-10-05", "09:00");
    const evening = ev("e-2", "2026-10-05", "20:00");
    expect(sortEvents([evening, morning], "date_asc").map((e) => e.id)).toEqual(["e-1", "e-2"]);
  });

  it("con la misma fecha y hora desempata por id, así el orden es siempre el mismo", () => {
    const x = ev("e-2", "2026-10-05", "09:00");
    const y = ev("e-1", "2026-10-05", "09:00");
    expect(sortEvents([x, y], "date_asc").map((e) => e.id)).toEqual(["e-1", "e-2"]);
    expect(sortEvents([y, x], "date_asc").map((e) => e.id)).toEqual(["e-1", "e-2"]);
  });

  it("date_desc es el inverso exacto de date_asc, también en los empates", () => {
    const list = [ev("e-2", "2026-10-05", "09:00"), ev("e-1", "2026-10-05", "09:00"), c, b];
    const asc = sortEvents(list, "date_asc").map((e) => e.id);
    expect(sortEvents(list, "date_desc").map((e) => e.id)).toEqual([...asc].reverse());
  });

  it("no modifica el arreglo original", () => {
    const original = [a, b, c];
    sortEvents(original, "date_asc");
    expect(original.map((e) => e.id)).toEqual(["e-a", "e-b", "e-c"]);
  });
});

describe("compareByDateAsc", () => {
  it("retorna 0 solo para el mismo evento", () => {
    const e = ev("e-a", "2026-10-05", "09:00");
    expect(compareByDateAsc(e, { ...e })).toBe(0);
  });
});
