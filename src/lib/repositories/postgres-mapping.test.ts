import { describe, expect, it } from "vitest";
import { categories, events, sources, venues } from "@/data";
import { MockEventRepository } from "./mock-event-repository";
import {
  fromDbDate,
  fromDbTime,
  toCategory,
  toDbDate,
  toDbTime,
  toEventWithRelations,
  type EventRow,
} from "./postgres-mapping";

/**
 * Etapa 11 — conversión base de datos ↔ dominio, sin necesidad de PostgreSQL.
 */
describe("conversión de fechas y horas (UTC)", () => {
  it("toDbDate → fromDbDate devuelve la misma fecha ISO", () => {
    expect(fromDbDate(toDbDate("2026-10-03"))).toBe("2026-10-03");
    expect(fromDbDate(toDbDate("2026-12-31"))).toBe("2026-12-31");
  });

  it("toDbTime → fromDbTime devuelve la misma hora HH:mm", () => {
    expect(fromDbTime(toDbTime("00:00"))).toBe("00:00");
    expect(fromDbTime(toDbTime("19:30"))).toBe("19:30");
    expect(fromDbTime(toDbTime("23:59"))).toBe("23:59");
  });

  it("las fechas se representan a medianoche UTC y las horas sobre 1970-01-01 UTC", () => {
    expect(toDbDate("2026-10-03").toISOString()).toBe("2026-10-03T00:00:00.000Z");
    expect(toDbTime("19:30").toISOString()).toBe("1970-01-01T19:30:00.000Z");
  });
});

describe("toEventWithRelations", () => {
  it("no filtra columnas internas de la base (sortOrder de Category) hacia el dominio", () => {
    const category = { id: "cat-x", name: "X", description: "Y", sortOrder: 4 };
    expect(toCategory(category)).toEqual({ id: "cat-x", name: "X", description: "Y" });
  });

  it("convierte las 24 filas de demostración al mismo resultado que MockEventRepository", async () => {
    const mock = new MockEventRepository();

    for (const event of events) {
      const row: EventRow = {
        id: event.id,
        externalId: event.externalId,
        title: event.title,
        description: event.description,
        startDate: toDbDate(event.startDate),
        endDate: toDbDate(event.endDate),
        startTime: toDbTime(event.startTime),
        endTime: toDbTime(event.endTime),
        price: event.price,
        isFree: event.isFree,
        imageUrl: event.imageUrl,
        posterImageUrl: event.posterImageUrl,
        videoUrl: event.videoUrl,
        sourceUrl: event.sourceUrl,
        category: { ...categories.find((c) => c.id === event.category)!, sortOrder: 0 } as EventRow["category"],
        venue: venues.find((v) => v.id === event.venueId)!,
        source: sources.find((s) => s.id === event.sourceId)!,
      };

      expect(toEventWithRelations(row)).toEqual(await mock.findById(event.id));
    }
  });
});
