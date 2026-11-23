import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { UserRecord } from "@/types";
import type { EventRepository } from "./event-repository";
import {
  EmailAlreadyUsedError,
  type EventContent,
  type EventManagementRepository,
  type NewModerationReview,
  type UserRepository,
} from "./management-repository";

/**
 * Batería de pruebas de CONTRATO de EventManagementRepository y UserRepository
 * (Etapa 15). Igual que event-repository.contract.ts, se ejecuta contra la
 * implementación en memoria (siempre, en `npm run test`) y contra PostgreSQL
 * (en `npm run test:db`): si ambas la pasan, cambiar DATA_SOURCE no cambia el
 * comportamiento.
 *
 * Cada prueba crea sus propios datos con ids únicos que empiezan con "ctest-"
 * (así la versión PostgreSQL puede borrarlos al terminar sin tocar la semilla)
 * y usa solo categorías y recintos de la semilla (cat-cine, venue-01...).
 *
 * Este archivo no termina en ".test.ts": Vitest solo lo ejecuta a través de
 * los archivos que lo invocan.
 */
export interface ManagementFixture {
  management: EventManagementRepository;
  users: UserRepository;
  /** Repositorio de lectura PÚBLICA sobre los mismos datos. */
  publicEvents: EventRepository;
}

const NOW = "2026-11-23T15:00:00.000Z";
const LATER = "2026-11-24T10:00:00.000Z";

function uid(prefix: string): string {
  return `ctest-${prefix}-${randomUUID().slice(0, 8)}`;
}

function content(overrides: Partial<EventContent> = {}): EventContent {
  return {
    title: "Ciclo de cine de prueba",
    description: "Funciones de prueba para validar el contrato del repositorio.",
    category: "cat-cine",
    startDate: "2026-12-10",
    endDate: "2026-12-12",
    startTime: "19:30",
    endTime: "22:00",
    price: 3000,
    isFree: false,
    imageUrl: null,
    posterImageUrl: null,
    videoUrl: null,
    sourceUrl: "https://organizador.example.com/ciclo",
    venueId: "venue-01",
    ...overrides,
  };
}

async function newUser(users: UserRepository, role: "ADMIN" | "CREATOR", name = "Persona de prueba"): Promise<UserRecord> {
  const id = uid("user");
  return users.create({
    id,
    email: `${id}@example.test`,
    name,
    passwordHash: "scrypt$16384$8$1$c2FsdA$aGFzaA",
    role,
    active: true,
    createdAt: NOW,
    lastLoginAt: null,
  });
}

function review(eventId: string, reviewerId: string, overrides: Partial<NewModerationReview> = {}): NewModerationReview {
  return {
    id: uid("review"),
    eventId,
    reviewerId,
    decision: "APPROVED",
    reasonCategory: null,
    note: null,
    flaggedCategories: [],
    checklistConfirmed: true,
    policyVersion: "2026-11-v1",
    createdAt: LATER,
    ...overrides,
  };
}

export function defineManagementRepositoryContract(setup: () => Promise<ManagementFixture> | ManagementFixture): void {
  describe("usuarios", () => {
    it("crea un usuario y lo encuentra por correo (sin distinguir mayúsculas) y por id", async () => {
      const { users } = await setup();
      const created = await newUser(users, "CREATOR", "Teatro del Barrio");
      expect((await users.findByEmail(created.email.toUpperCase()))?.id).toBe(created.id);
      expect((await users.findById(created.id))?.name).toBe("Teatro del Barrio");
      expect(await users.findByEmail("nadie@example.test")).toBeNull();
      expect(await users.findById("ctest-no-existe")).toBeNull();
    });

    it("rechaza un correo repetido", async () => {
      const { users } = await setup();
      const created = await newUser(users, "CREATOR");
      await expect(users.create({ ...created, id: uid("user") })).rejects.toThrow(EmailAlreadyUsedError);
    });

    it("lista por rol, activa/desactiva cuentas y registra el último ingreso", async () => {
      const { users } = await setup();
      const creator = await newUser(users, "CREATOR");
      const admin = await newUser(users, "ADMIN");
      const creators = await users.list({ role: "CREATOR" });
      expect(creators.some((u) => u.id === creator.id)).toBe(true);
      expect(creators.some((u) => u.id === admin.id)).toBe(false);

      expect((await users.setActive(creator.id, false))?.active).toBe(false);
      expect((await users.findById(creator.id))?.active).toBe(false);
      expect(await users.setActive("ctest-no-existe", false)).toBeNull();

      await users.recordLogin(creator.id, LATER);
      expect((await users.findById(creator.id))?.lastLoginAt).toBe(LATER);
    });
  });

  describe("recintos", () => {
    it("crea un recinto nuevo y lo devuelve en el listado y por id", async () => {
      const { management } = await setup();
      const id = uid("venue");
      await management.createVenue({
        id,
        name: "Sala de prueba",
        address: "Calle Falsa 123",
        commune: "Providencia",
        city: "Santiago",
        latitude: -33.43,
        longitude: -70.61,
      });
      expect((await management.findVenueById(id))?.name).toBe("Sala de prueba");
      expect((await management.listVenues()).some((v) => v.id === id)).toBe(true);
      expect((await management.listVenues()).some((v) => v.id === "venue-01")).toBe(true);
      expect(await management.findVenueById("ctest-no-existe")).toBeNull();
    });
  });

  describe("eventos de creadores", () => {
    it("un evento nuevo nace en borrador, con sus relaciones y su autor, y NO aparece en la API pública", async () => {
      const { management, users, publicEvents } = await setup();
      const creator = await newUser(users, "CREATOR", "Cine Club");
      const id = uid("event");

      const created = await management.createEvent({ id, content: content(), sourceId: "source-organizadores", createdById: creator.id, at: NOW });

      expect(created.status).toBe("DRAFT");
      expect(created.category.id).toBe("cat-cine");
      expect(created.venue.id).toBe("venue-01");
      expect(created.source.id).toBe("source-organizadores");
      expect(created.createdBy?.id).toBe(creator.id);
      expect(created.createdBy?.name).toBe("Cine Club");
      expect(created.submittedAt).toBeNull();
      expect(created.lastReview).toBeNull();
      expect(created.createdAt).toBe(NOW);

      expect(await publicEvents.findById(id)).toBeNull();
      expect((await publicEvents.findAll()).some((event) => event.id === id)).toBe(false);
      expect((await publicEvents.findAll({ search: "Ciclo de cine de prueba" })).length).toBe(0);
    });

    it("lista por autor y por estado; el más recientemente modificado primero", async () => {
      const { management, users } = await setup();
      const mine = await newUser(users, "CREATOR");
      const other = await newUser(users, "CREATOR");
      const a = uid("event");
      const b = uid("event");
      const c = uid("event");
      await management.createEvent({ id: a, content: content({ title: "Evento A de prueba" }), sourceId: "source-organizadores", createdById: mine.id, at: NOW });
      await management.createEvent({ id: b, content: content({ title: "Evento B de prueba" }), sourceId: "source-organizadores", createdById: mine.id, at: LATER });
      await management.createEvent({ id: c, content: content({ title: "Evento C de prueba" }), sourceId: "source-organizadores", createdById: other.id, at: NOW });

      const ofMine = await management.listManaged({ createdById: mine.id });
      expect(ofMine.map((event) => event.id)).toEqual([b, a]);

      await management.transition({ id: a, from: ["DRAFT"], to: "PENDING_REVIEW", set: { submittedAt: LATER }, at: "2026-11-25T10:00:00.000Z" });
      expect((await management.listManaged({ createdById: mine.id, status: "PENDING_REVIEW" })).map((event) => event.id)).toEqual([a]);
      expect((await management.listManaged({ createdById: other.id })).map((event) => event.id)).toEqual([c]);
    });

    it("edita el contenido solo si el estado está permitido", async () => {
      const { management, users } = await setup();
      const creator = await newUser(users, "CREATOR");
      const id = uid("event");
      await management.createEvent({ id, content: content(), sourceId: "source-organizadores", createdById: creator.id, at: NOW });

      const edited = await management.updateContent(id, content({ title: "Título corregido de prueba", price: 0, isFree: true }), ["DRAFT", "REJECTED"], LATER);
      expect(edited?.title).toBe("Título corregido de prueba");
      expect(edited?.isFree).toBe(true);
      expect(edited?.updatedAt).toBe(LATER);

      await management.transition({ id, from: ["DRAFT"], to: "PENDING_REVIEW", at: LATER });
      expect(await management.updateContent(id, content({ title: "No debe guardarse" }), ["DRAFT", "REJECTED"], LATER)).toBeNull();
      expect((await management.findManagedById(id))?.title).toBe("Título corregido de prueba");
      expect(await management.updateContent("ctest-no-existe", content(), ["DRAFT"], LATER)).toBeNull();
    });
  });

  describe("cambios de estado y auditoría", () => {
    it("aprobar publica el evento: aparece en la API pública y la decisión queda registrada", async () => {
      const { management, users, publicEvents } = await setup();
      const creator = await newUser(users, "CREATOR");
      const admin = await newUser(users, "ADMIN", "Administradora Ana");
      const id = uid("event");
      await management.createEvent({ id, content: content(), sourceId: "source-organizadores", createdById: creator.id, at: NOW });
      await management.transition({ id, from: ["DRAFT", "REJECTED"], to: "PENDING_REVIEW", set: { submittedAt: NOW, contentPolicyAcceptedAt: NOW }, at: NOW });

      const decision = review(id, admin.id, { note: "Todo en regla", flaggedCategories: ["DRUGS"] });
      const published = await management.transition({ id, from: ["PENDING_REVIEW"], to: "PUBLISHED", set: { reviewedAt: LATER }, review: decision, at: LATER });

      expect(published?.status).toBe("PUBLISHED");
      expect(published?.reviewedAt).toBe(LATER);
      expect(published?.contentPolicyAcceptedAt).toBe(NOW);
      expect(published?.lastReview?.decision).toBe("APPROVED");
      expect(published?.lastReview?.reviewerName).toBe("Administradora Ana");
      expect(published?.lastReview?.flaggedCategories).toEqual(["DRUGS"]);
      expect(published?.lastReview?.checklistConfirmed).toBe(true);
      expect(published?.lastReview?.policyVersion).toBe("2026-11-v1");

      expect((await publicEvents.findById(id))?.title).toBe("Ciclo de cine de prueba");
      expect((await publicEvents.findAll({ search: "Ciclo de cine de prueba" })).map((e) => e.id)).toEqual([id]);
      const page = await publicEvents.findPage({}, { limit: 100 });
      expect(page.items.some((event) => event.id === id)).toBe(true);
    });

    it("no cambia nada si el evento ya no está en un estado permitido (nunca se aprueba dos veces)", async () => {
      const { management, users } = await setup();
      const creator = await newUser(users, "CREATOR");
      const admin = await newUser(users, "ADMIN");
      const id = uid("event");
      await management.createEvent({ id, content: content(), sourceId: "source-organizadores", createdById: creator.id, at: NOW });
      await management.transition({ id, from: ["DRAFT"], to: "PENDING_REVIEW", at: NOW });
      await management.transition({ id, from: ["PENDING_REVIEW"], to: "PUBLISHED", review: review(id, admin.id), at: LATER });

      const second = await management.transition({
        id,
        from: ["PENDING_REVIEW"],
        to: "REJECTED",
        review: review(id, admin.id, { decision: "REJECTED", reasonCategory: "OTHER_NORM", note: "Llegó tarde", checklistConfirmed: false }),
        at: LATER,
      });
      expect(second).toBeNull();
      expect((await management.findManagedById(id))?.status).toBe("PUBLISHED");
      expect((await management.listReviews(id)).map((r) => r.decision)).toEqual(["APPROVED"]);
      expect(await management.transition({ id: "ctest-no-existe", from: ["DRAFT"], to: "PENDING_REVIEW", at: LATER })).toBeNull();
    });

    it("rechazar y retirar: el evento deja de ser público y el historial conserva todas las decisiones, la más reciente primero", async () => {
      const { management, users, publicEvents } = await setup();
      const creator = await newUser(users, "CREATOR");
      const admin = await newUser(users, "ADMIN");
      const id = uid("event");
      await management.createEvent({ id, content: content(), sourceId: "source-organizadores", createdById: creator.id, at: NOW });
      await management.transition({ id, from: ["DRAFT"], to: "PENDING_REVIEW", at: NOW });
      await management.transition({
        id,
        from: ["PENDING_REVIEW"],
        to: "REJECTED",
        set: { reviewedAt: NOW },
        review: review(id, admin.id, { decision: "REJECTED", reasonCategory: "INCOMPLETE_INFO", note: "Falta la dirección exacta", checklistConfirmed: false, createdAt: NOW }),
        at: NOW,
      });
      expect((await management.findManagedById(id))?.lastReview?.reasonCategory).toBe("INCOMPLETE_INFO");

      await management.transition({ id, from: ["REJECTED"], to: "PENDING_REVIEW", at: LATER });
      await management.transition({ id, from: ["PENDING_REVIEW"], to: "PUBLISHED", set: { reviewedAt: LATER }, review: review(id, admin.id, { createdAt: LATER }), at: LATER });
      expect(await publicEvents.findById(id)).not.toBeNull();

      const withdrawn = await management.transition({
        id,
        from: ["PUBLISHED"],
        to: "REJECTED",
        review: review(id, admin.id, { decision: "UNPUBLISHED", reasonCategory: "OTHER_NORM", note: "Reclamo del recinto", checklistConfirmed: false, createdAt: "2026-11-26T10:00:00.000Z" }),
        at: "2026-11-26T10:00:00.000Z",
      });
      expect(withdrawn?.status).toBe("REJECTED");
      expect(withdrawn?.lastReview?.decision).toBe("UNPUBLISHED");
      expect(await publicEvents.findById(id)).toBeNull();

      const history = await management.listReviews(id);
      expect(history.map((r) => r.decision)).toEqual(["UNPUBLISHED", "APPROVED", "REJECTED"]);
    });

    it("el creador puede retirar su evento publicado: vuelve a borrador y deja de ser público", async () => {
      const { management, users, publicEvents } = await setup();
      const creator = await newUser(users, "CREATOR");
      const admin = await newUser(users, "ADMIN");
      const id = uid("event");
      await management.createEvent({ id, content: content(), sourceId: "source-organizadores", createdById: creator.id, at: NOW });
      await management.transition({ id, from: ["DRAFT"], to: "PENDING_REVIEW", set: { submittedAt: NOW, contentPolicyAcceptedAt: NOW }, at: NOW });
      await management.transition({ id, from: ["PENDING_REVIEW"], to: "PUBLISHED", set: { reviewedAt: LATER }, review: review(id, admin.id), at: LATER });

      const back = await management.transition({
        id,
        from: ["PENDING_REVIEW", "PUBLISHED"],
        to: "DRAFT",
        set: { submittedAt: null, reviewedAt: null, contentPolicyAcceptedAt: null },
        at: LATER,
      });
      expect(back?.status).toBe("DRAFT");
      expect(back?.submittedAt).toBeNull();
      expect(back?.reviewedAt).toBeNull();
      expect(back?.contentPolicyAcceptedAt).toBeNull();
      expect(await publicEvents.findById(id)).toBeNull();
    });
  });

  describe("lectura pública con eventos de creadores", () => {
    it("un recinto nuevo solo aparece como comuna filtrable cuando tiene un evento publicado", async () => {
      const { management, users, publicEvents } = await setup();
      const creator = await newUser(users, "CREATOR");
      const admin = await newUser(users, "ADMIN");
      const venueId = uid("venue");
      await management.createVenue({ id: venueId, name: "Casa de prueba", address: "Pasaje 1", commune: "Zzcomuna Ficticia", city: "Santiago", latitude: -33.4, longitude: -70.6 });
      const id = uid("event");
      await management.createEvent({ id, content: content({ venueId }), sourceId: "source-organizadores", createdById: creator.id, at: NOW });

      expect(await publicEvents.findAllCommunes()).not.toContain("Zzcomuna Ficticia");
      await management.transition({ id, from: ["DRAFT"], to: "PENDING_REVIEW", at: NOW });
      expect(await publicEvents.findAllCommunes()).not.toContain("Zzcomuna Ficticia");
      await management.transition({ id, from: ["PENDING_REVIEW"], to: "PUBLISHED", review: review(id, admin.id), at: LATER });
      expect(await publicEvents.findAllCommunes()).toContain("Zzcomuna Ficticia");
      expect((await publicEvents.findAll({ commune: "Zzcomuna Ficticia" })).map((e) => e.id)).toEqual([id]);
    });
  });
}
