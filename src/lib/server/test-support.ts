import { hashPassword } from "@/lib/auth/password";
import { MemoryStore } from "@/lib/repositories/memory-store";
import { MockEventRepository } from "@/lib/repositories/mock-event-repository";
import { MockEventManagementRepository, MockUserRepository } from "@/lib/repositories/mock-management-repository";
import type { UserRecord } from "@/types";
import { composeServices, type Services } from "./services";

/**
 * Apoyo para las pruebas de la Etapa 15 (no es código de producción): arma los
 * servicios sobre un almacén en memoria nuevo, con un reloj controlable y tres
 * cuentas (un administrador y dos creadores). El hash se calcula una sola vez
 * porque scrypt es lento a propósito.
 */
export const TEST_SECRET = "s".repeat(48);
export const TEST_PASSWORD = "clave-de-prueba-123";

let cachedHash: Promise<string> | undefined;

export interface TestWorld {
  services: Services;
  store: MemoryStore;
  admin: UserRecord;
  creatorA: UserRecord;
  creatorB: UserRecord;
  /** Cambia la hora que ven los servicios. */
  setNow: (date: Date) => void;
}

export async function createTestWorld(start: Date = new Date("2026-11-23T15:00:00.000Z")): Promise<TestWorld> {
  cachedHash ??= hashPassword(TEST_PASSWORD);
  const passwordHash = await cachedHash;

  let current = start;
  const store = MemoryStore.seeded(start);
  let counter = 0;
  const services = composeServices({
    events: new MockEventRepository(store),
    management: new MockEventManagementRepository(store),
    users: new MockUserRepository(store),
    secret: TEST_SECRET,
    now: () => current,
    newId: (prefix) => `${prefix}-test-${++counter}`,
  });

  const make = (id: string, role: UserRecord["role"], name: string): UserRecord => ({
    id,
    email: `${id}@mozak.test`,
    name,
    passwordHash,
    role,
    active: true,
    createdAt: start.toISOString(),
    lastLoginAt: null,
  });
  const admin = await services.users.create(make("user-admin", "ADMIN", "Admin de prueba"));
  const creatorA = await services.users.create(make("user-a", "CREATOR", "Creador A"));
  const creatorB = await services.users.create(make("user-b", "CREATOR", "Creador B"));

  return { services, store, admin, creatorA, creatorB, setNow: (date) => (current = date) };
}

/** Datos válidos de un evento escritos por un creador (se pueden sobrescribir campos). */
export function validEventInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: "Ciclo de cine al aire libre",
    description: "Tres funciones de cine chileno en el parque, con conversatorio posterior.",
    categoryId: "cat-cine",
    venueId: "venue-01",
    startDate: "2026-12-10",
    endDate: "2026-12-12",
    startTime: "19:30",
    endTime: "22:00",
    price: 0,
    isFree: true,
    imageUrl: "https://organizador.example.com/imagen.jpg",
    posterImageUrl: "",
    videoUrl: null,
    sourceUrl: "https://organizador.example.com/ciclo",
    ...overrides,
  };
}

export const FULL_CHECKLIST = { noAdultContent: true, noDrugs: true, noBlackMarket: true } as const;
