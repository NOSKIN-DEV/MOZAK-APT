import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { defineManagementRepositoryContract } from "./management-repository.contract";
import { PostgresEventManagementRepository } from "./postgres-management-repository";
import { PostgresEventRepository } from "./postgres-event-repository";
import { PostgresUserRepository } from "./postgres-user-repository";
import { toDbDate, toDbTime } from "./postgres-mapping";

/**
 * Pruebas contra una base PostgreSQL REAL (Etapa 15): gestión de eventos,
 * usuarios y moderación. Se ejecutan con `npm run test:db` (requiere la base
 * levantada, la migración 0002 aplicada y la semilla cargada).
 *
 * Todo lo que crean usa ids que empiezan con "ctest-" y se borra al terminar,
 * para no alterar los 24 eventos de demostración que cuentan las otras pruebas.
 */
const prisma = new PrismaClient();

afterAll(async () => {
  // Al borrar los eventos se borran también sus decisiones (ON DELETE CASCADE).
  await prisma.event.deleteMany({ where: { id: { startsWith: "ctest-" } } });
  await prisma.venue.deleteMany({ where: { id: { startsWith: "ctest-" } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: "ctest-" } } });
  await prisma.$disconnect();
});

describe("PostgresEventManagementRepository y PostgresUserRepository (contrato)", () => {
  defineManagementRepositoryContract(() => ({
    management: new PostgresEventManagementRepository(prisma),
    users: new PostgresUserRepository(prisma),
    publicEvents: new PostgresEventRepository(prisma),
  }));
});

describe("Esquema de la base de datos (Etapa 15)", () => {
  const userData = (id: string, role: "ADMIN" | "CREATOR" = "CREATOR") => ({
    id,
    email: `${id}@example.test`,
    name: "Prueba de restricciones",
    passwordHash: "scrypt$16384$8$1$c2FsdA$aGFzaA",
    role,
  });
  const eventData = (id: string, createdById: string | null) => ({
    id,
    title: "Evento de prueba de restricciones",
    description: "No debe quedar publicado sin revisión.",
    categoryId: "cat-cine",
    startDate: toDbDate("2026-12-01"),
    endDate: toDbDate("2026-12-01"),
    startTime: toDbTime("10:00"),
    endTime: toDbTime("11:00"),
    price: 0,
    isFree: true,
    sourceUrl: "https://demo.example.com/restricciones",
    sourceId: "source-organizadores",
    venueId: "venue-01",
    createdById,
  });

  it("los 24 eventos de demostración quedaron PUBLISHED y sin autor", async () => {
    const demo = await prisma.event.findMany({ where: { createdById: null, id: { startsWith: "event-" } } });
    expect(demo).toHaveLength(24);
    expect(demo.every((event) => event.status === "PUBLISHED")).toBe(true);
  });

  it("un evento nuevo, sin indicar estado, nace en DRAFT (nunca publicado por defecto)", async () => {
    await prisma.user.create({ data: userData("ctest-user-default") });
    const created = await prisma.event.create({ data: eventData("ctest-event-default", "ctest-user-default") });
    expect(created.status).toBe("DRAFT");
  });

  it("CHECK: un evento de un creador no puede pasar a PUBLISHED sin fecha de revisión", async () => {
    await prisma.user.create({ data: userData("ctest-user-check") });
    await expect(
      prisma.event.create({ data: { ...eventData("ctest-event-check", "ctest-user-check"), status: "PUBLISHED" } }),
    ).rejects.toThrow();
    expect(await prisma.event.count({ where: { id: "ctest-event-check" } })).toBe(0);

    const ok = await prisma.event.create({
      data: { ...eventData("ctest-event-check-ok", "ctest-user-check"), status: "PUBLISHED", reviewedAt: new Date() },
    });
    expect(ok.status).toBe("PUBLISHED");
  });

  it("CHECK: una aprobación sin la lista de condiciones confirmada es rechazada", async () => {
    await prisma.user.create({ data: userData("ctest-user-admin-check", "ADMIN") });
    await prisma.event.create({ data: eventData("ctest-event-review-check", null) });
    const base = {
      eventId: "ctest-event-review-check",
      reviewerId: "ctest-user-admin-check",
      policyVersion: "2026-11-v1",
    };
    await expect(
      prisma.moderationReview.create({ data: { ...base, id: "ctest-review-bad", decision: "APPROVED", checklistConfirmed: false } }),
    ).rejects.toThrow();
    const ok = await prisma.moderationReview.create({
      data: { ...base, id: "ctest-review-ok", decision: "APPROVED", checklistConfirmed: true },
    });
    expect(ok.flaggedCategories).toEqual([]);
  });

  it("CHECK: el correo debe estar en minúsculas y no puede repetirse", async () => {
    await expect(prisma.user.create({ data: { ...userData("ctest-user-upper"), email: "Mayusculas@Example.test" } })).rejects.toThrow();
    await prisma.user.create({ data: userData("ctest-user-unique") });
    await expect(
      prisma.user.create({ data: { ...userData("ctest-user-unique-2"), email: "ctest-user-unique@example.test" } }),
    ).rejects.toThrow();
  });
});
