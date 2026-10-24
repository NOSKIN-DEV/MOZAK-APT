import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { defineEventRepositoryContract } from "./event-repository.contract";
import { PostgresEventRepository } from "./postgres-event-repository";
import { toDbDate, toDbTime } from "./postgres-mapping";

/**
 * Pruebas contra una base PostgreSQL REAL (Etapa 11 / MA-42).
 *
 * No forman parte de `npm run test` (no exigen base de datos): se ejecutan con
 * `npm run test:db`, con el servicio `db` levantado, la migración aplicada y la
 * semilla cargada (ver README → "PostgreSQL").
 */
const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("PostgresEventRepository (contrato de EventRepository)", () => {
  defineEventRepositoryContract(() => new PostgresEventRepository(prisma));
});

describe("PostgresEventRepository (específico de PostgreSQL)", () => {
  const repo = new PostgresEventRepository(prisma);

  it("la búsqueda trata % y _ como texto literal, no como comodines", async () => {
    expect(await repo.findAll({ search: "%" })).toEqual([]);
    expect(await repo.findAll({ search: "_" })).toEqual([]);
  });

  it("un texto con comillas no rompe la consulta (parámetros, no concatenación)", async () => {
    expect(await repo.findAll({ search: "'; DROP TABLE event; --" })).toEqual([]);
    expect(await repo.findAll()).toHaveLength(24);
  });

  it("fechas y horas vuelven en el mismo formato que el mock (YYYY-MM-DD / HH:mm)", async () => {
    const event = await repo.findById("event-001");
    expect(event?.startDate).toBe("2026-10-03");
    expect(event?.endDate).toBe("2026-10-20");
    expect(event?.startTime).toBe("10:00");
    expect(event?.endTime).toBe("19:00");
  });
});

describe("Esquema de la base de datos", () => {
  const baseEvent = {
    id: "event-test-constraint",
    title: "Evento de prueba de restricciones",
    description: "No debe llegar a guardarse.",
    categoryId: "cat-cine",
    startDate: toDbDate("2026-11-01"),
    endDate: toDbDate("2026-11-01"),
    startTime: toDbTime("10:00"),
    endTime: toDbTime("11:00"),
    price: 0,
    isFree: true,
    sourceUrl: "https://demo.example.com/evento-de-prueba",
    sourceId: "source-demo-cultura",
    venueId: "venue-01",
  };

  it("la extensión PostGIS está instalada", async () => {
    const rows = await prisma.$queryRaw<{ version: string }[]>`SELECT PostGIS_Version() AS version`;
    expect(rows[0]?.version).toMatch(/^3\./);
  });

  it("CHECK de precio: un evento gratuito con precio > 0 es rechazado", async () => {
    await expect(prisma.event.create({ data: { ...baseEvent, price: 5000 } })).rejects.toThrow();
  });

  it("CHECK de fechas: un evento que termina antes de empezar es rechazado", async () => {
    await expect(
      prisma.event.create({ data: { ...baseEvent, startDate: toDbDate("2026-11-10"), endDate: toDbDate("2026-11-01") } }),
    ).rejects.toThrow();
  });

  it("CHECK de afiche: una ruta sin '/' inicial ni http(s) es rechazada", async () => {
    await expect(prisma.event.create({ data: { ...baseEvent, posterImageUrl: "media/posters/x.svg" } })).rejects.toThrow();
  });

  it("clave foránea: un evento con categoría inexistente es rechazado", async () => {
    await expect(prisma.event.create({ data: { ...baseEvent, categoryId: "cat-no-existe" } })).rejects.toThrow();
  });

  it("nada de lo anterior quedó guardado", async () => {
    expect(await prisma.event.count({ where: { id: baseEvent.id } })).toBe(0);
  });
});
