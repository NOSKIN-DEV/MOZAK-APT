import { describe, expect, it } from "vitest";
import { isUniqueViolation, toManagedEvent, toReviewRecord, toUserRecord, type ManagedEventRow, type ReviewRow } from "./postgres-management-mapping";

const review: ReviewRow = {
  id: "review-1",
  eventId: "event-x",
  reviewerId: "user-admin",
  decision: "REJECTED",
  reasonCategory: "DRUGS",
  note: "Incluye venta de sustancias.",
  flaggedCategories: ["DRUGS", "CATEGORIA_VIEJA"],
  checklistConfirmed: false,
  policyVersion: "2026-11-v1",
  createdAt: new Date("2026-11-24T10:00:00.000Z"),
  reviewer: { name: "Administradora Ana" },
};

const row: ManagedEventRow = {
  id: "event-x",
  externalId: null,
  title: "Evento de prueba",
  description: "Descripción de prueba del evento.",
  startDate: new Date("2026-12-10T00:00:00.000Z"),
  endDate: new Date("2026-12-12T00:00:00.000Z"),
  startTime: new Date("1970-01-01T19:30:00.000Z"),
  endTime: new Date("1970-01-01T22:00:00.000Z"),
  price: 0,
  isFree: true,
  imageUrl: null,
  posterImageUrl: null,
  videoUrl: null,
  sourceUrl: "https://organizador.example.com/x",
  category: { id: "cat-cine", name: "Cine", description: "Funciones de cine." },
  venue: { id: "venue-01", name: "Sala", address: "Calle 1", commune: "Maipú", city: "Santiago", latitude: -33.5, longitude: -70.7 },
  source: { id: "source-organizadores", name: "Organizadores registrados", organization: "Org", type: "organizador_registrado", url: "https://x.example", apiUrl: null, active: true },
  status: "REJECTED",
  submittedAt: new Date("2026-11-23T15:00:00.000Z"),
  reviewedAt: new Date("2026-11-24T10:00:00.000Z"),
  contentPolicyAcceptedAt: new Date("2026-11-23T15:00:00.000Z"),
  createdAt: new Date("2026-11-23T14:00:00.000Z"),
  updatedAt: new Date("2026-11-24T10:00:00.000Z"),
  createdBy: { id: "user-a", name: "Creador A", email: "a@mozak.test" },
  reviews: [review],
};

describe("conversión de filas de la base (Etapa 15)", () => {
  it("un evento con su autor y su última decisión", () => {
    const event = toManagedEvent(row);
    expect(event.status).toBe("REJECTED");
    expect(event.startDate).toBe("2026-12-10");
    expect(event.startTime).toBe("19:30");
    expect(event.createdBy).toEqual({ id: "user-a", name: "Creador A", email: "a@mozak.test" });
    expect(event.submittedAt).toBe("2026-11-23T15:00:00.000Z");
    expect(event.lastReview).toMatchObject({ decision: "REJECTED", reasonCategory: "DRUGS", reviewerName: "Administradora Ana" });
  });

  it("sin autor ni decisiones (evento de demostración) devuelve null en esos campos", () => {
    const event = toManagedEvent({ ...row, createdBy: null, reviews: [], submittedAt: null, reviewedAt: null, contentPolicyAcceptedAt: null });
    expect(event.createdBy).toBeNull();
    expect(event.lastReview).toBeNull();
    expect(event.submittedAt).toBeNull();
  });

  it("descarta categorías desconocidas y convierte un motivo desconocido en 'otra infracción'", () => {
    const converted = toReviewRecord({ ...review, reasonCategory: "MOTIVO_VIEJO" });
    expect(converted.flaggedCategories).toEqual(["DRUGS"]);
    expect(converted.reasonCategory).toBe("OTHER_NORM");
    expect(toReviewRecord({ ...review, reasonCategory: null, reviewer: null })).toMatchObject({ reasonCategory: null, reviewerName: null });
  });

  it("un usuario conserva el hash (solo para uso interno) y las fechas en ISO", () => {
    const user = toUserRecord({
      id: "user-a",
      email: "a@mozak.test",
      name: "Creador A",
      passwordHash: "scrypt$16384$8$1$c2Fs$a2V5",
      role: "CREATOR",
      active: true,
      createdAt: new Date("2026-11-01T12:00:00.000Z"),
      lastLoginAt: null,
    });
    expect(user.createdAt).toBe("2026-11-01T12:00:00.000Z");
    expect(user.lastLoginAt).toBeNull();
    expect(user.passwordHash.startsWith("scrypt$")).toBe(true);
  });

  it("reconoce el error de restricción única de Prisma (P2002)", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
    expect(isUniqueViolation({ code: "P2025" })).toBe(false);
    expect(isUniqueViolation(new Error("otro"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
