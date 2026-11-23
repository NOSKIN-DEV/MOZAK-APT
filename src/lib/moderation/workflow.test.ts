import { describe, expect, it } from "vitest";
import { WorkflowError, type WorkflowErrorCode } from "./errors";
import { createTestWorld, FULL_CHECKLIST, validEventInput, type TestWorld } from "@/lib/server/test-support";

async function codeOf(promise: Promise<unknown>): Promise<WorkflowErrorCode | "NO_ERROR"> {
  try {
    await promise;
    return "NO_ERROR";
  } catch (error) {
    if (error instanceof WorkflowError) return error.code;
    throw error;
  }
}

/** Crea un borrador del creador A y lo deja en revisión. */
async function pendingEvent(world: TestWorld, overrides: Record<string, unknown> = {}) {
  const { workflow } = world.services;
  const draft = await workflow.createDraft(world.creatorA, validEventInput(overrides));
  await workflow.submit(world.creatorA, draft.id, { acceptsContentPolicy: true });
  return draft.id;
}

describe("creador: crear y editar borradores", () => {
  it("crea un borrador a su nombre, con la fuente de organizadores, y no es público", async () => {
    const world = await createTestWorld();
    const event = await world.services.workflow.createDraft(world.creatorA, validEventInput());
    expect(event.status).toBe("DRAFT");
    expect(event.createdBy?.id).toBe(world.creatorA.id);
    expect(event.source.id).toBe("source-organizadores");
    expect(event.posterImageUrl).toBeNull(); // "" se guarda como null
    expect(await world.services.events.findById(event.id)).toBeNull();
  });

  it("solo un creador puede crear eventos: un administrador recibe FORBIDDEN", async () => {
    const world = await createTestWorld();
    expect(await codeOf(world.services.workflow.createDraft(world.admin, validEventInput()))).toBe("FORBIDDEN");
  });

  it("puede proponer un recinto nuevo, que se crea junto con el evento", async () => {
    const world = await createTestWorld();
    const event = await world.services.workflow.createDraft(
      world.creatorA,
      validEventInput({
        venueId: undefined,
        newVenue: { name: "Casa Cultural del Barrio", address: "Av. Siempre Viva 742", commune: "Maipú", city: "Santiago", latitude: -33.51, longitude: -70.76 },
      }),
    );
    expect(event.venue.name).toBe("Casa Cultural del Barrio");
    expect((await world.services.management.listVenues()).some((v) => v.id === event.venue.id)).toBe(true);
  });

  it("rechaza datos inválidos con el detalle de cada campo", async () => {
    const world = await createTestWorld();
    const bad = validEventInput({ title: "no", price: 100, isFree: true, endDate: "2026-12-01", sourceUrl: "javascript:alert(1)", imageUrl: "ftp://x.cl/a.png" });
    try {
      await world.services.workflow.createDraft(world.creatorA, bad);
      throw new Error("debía fallar");
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowError);
      const paths = (error as WorkflowError).issues.map((issue) => issue.path).sort();
      expect(paths).toEqual(["endDate", "imageUrl", "price", "sourceUrl", "title"]);
    }
  });

  it("rechaza una categoría o un recinto que no existen", async () => {
    const world = await createTestWorld();
    expect(await codeOf(world.services.workflow.createDraft(world.creatorA, validEventInput({ categoryId: "cat-inexistente" })))).toBe("VALIDATION");
    expect(await codeOf(world.services.workflow.createDraft(world.creatorA, validEventInput({ venueId: "venue-999" })))).toBe("VALIDATION");
    // no debe haber quedado un recinto huérfano ni un evento a medias
    expect((await world.services.management.listManaged({ createdById: world.creatorA.id })).length).toBe(0);
  });

  it("exige elegir un recinto existente O uno nuevo, no ambos ni ninguno", async () => {
    const world = await createTestWorld();
    const newVenue = { name: "Sala X", address: "Calle 1", commune: "Maipú", city: "Santiago", latitude: -33.5, longitude: -70.7 };
    expect(await codeOf(world.services.workflow.createDraft(world.creatorA, validEventInput({ venueId: undefined })))).toBe("VALIDATION");
    expect(await codeOf(world.services.workflow.createDraft(world.creatorA, validEventInput({ newVenue })))).toBe("VALIDATION");
  });

  it("un creador no ve ni toca los eventos de otro creador (responde NOT_FOUND, no FORBIDDEN)", async () => {
    const world = await createTestWorld();
    const { workflow } = world.services;
    const event = await workflow.createDraft(world.creatorA, validEventInput());
    expect(await codeOf(workflow.getMine(world.creatorB, event.id))).toBe("NOT_FOUND");
    expect(await codeOf(workflow.updateDraft(world.creatorB, event.id, validEventInput()))).toBe("NOT_FOUND");
    expect(await codeOf(workflow.submit(world.creatorB, event.id, { acceptsContentPolicy: true }))).toBe("NOT_FOUND");
    expect(await codeOf(workflow.withdraw(world.creatorB, event.id))).toBe("NOT_FOUND");
    expect((await workflow.listMine(world.creatorB)).length).toBe(0);
    expect((await workflow.listMine(world.creatorA)).map((e) => e.id)).toEqual([event.id]);
  });

  it("edita un borrador, pero no uno en revisión", async () => {
    const world = await createTestWorld();
    const { workflow } = world.services;
    const id = await pendingEvent(world);
    expect(await codeOf(workflow.updateDraft(world.creatorA, id, validEventInput({ title: "Otro título distinto" })))).toBe("INVALID_STATE");

    const draft = await workflow.createDraft(world.creatorA, validEventInput());
    const edited = await workflow.updateDraft(world.creatorA, draft.id, validEventInput({ title: "Título actualizado del ciclo" }));
    expect(edited.title).toBe("Título actualizado del ciclo");
  });
});

describe("creador: enviar a revisión", () => {
  it("exige declarar que cumple la política de contenido", async () => {
    const world = await createTestWorld();
    const { workflow } = world.services;
    const draft = await workflow.createDraft(world.creatorA, validEventInput());
    expect(await codeOf(workflow.submit(world.creatorA, draft.id, {}))).toBe("VALIDATION");
    expect(await codeOf(workflow.submit(world.creatorA, draft.id, { acceptsContentPolicy: false }))).toBe("VALIDATION");
    expect(await codeOf(workflow.submit(world.creatorA, draft.id, { acceptsContentPolicy: "true" }))).toBe("VALIDATION");
    expect((await workflow.getMine(world.creatorA, draft.id)).event.status).toBe("DRAFT");
  });

  it("deja el evento en revisión y registra la fecha de envío y de la declaración", async () => {
    const world = await createTestWorld();
    const id = await pendingEvent(world);
    const { event } = await world.services.workflow.getMine(world.creatorA, id);
    expect(event.status).toBe("PENDING_REVIEW");
    expect(event.submittedAt).toBe("2026-11-23T15:00:00.000Z");
    expect(event.contentPolicyAcceptedAt).toBe("2026-11-23T15:00:00.000Z");
  });

  it("no se puede enviar un evento cuya fecha de término ya pasó", async () => {
    const world = await createTestWorld();
    const { workflow } = world.services;
    const draft = await workflow.createDraft(world.creatorA, validEventInput({ startDate: "2026-11-20", endDate: "2026-11-22" }));
    expect(await codeOf(workflow.submit(world.creatorA, draft.id, { acceptsContentPolicy: true }))).toBe("VALIDATION");
    // el mismo día de término todavía se puede enviar (zona horaria de Chile)
    const today = await workflow.createDraft(world.creatorA, validEventInput({ startDate: "2026-11-23", endDate: "2026-11-23" }));
    expect((await workflow.submit(world.creatorA, today.id, { acceptsContentPolicy: true })).status).toBe("PENDING_REVIEW");
  });

  it("no se puede enviar dos veces", async () => {
    const world = await createTestWorld();
    const id = await pendingEvent(world);
    expect(await codeOf(world.services.workflow.submit(world.creatorA, id, { acceptsContentPolicy: true }))).toBe("INVALID_STATE");
  });
});

describe("administrador: aprobar", () => {
  it("un creador NUNCA puede aprobar, ni siquiera su propio evento", async () => {
    const world = await createTestWorld();
    const id = await pendingEvent(world);
    expect(await codeOf(world.services.workflow.approve(world.creatorA, id, { checklist: FULL_CHECKLIST }))).toBe("FORBIDDEN");
    expect(await codeOf(world.services.workflow.reject(world.creatorA, id, { reason: "OTHER_NORM", note: "No me gusta mi evento" }))).toBe("FORBIDDEN");
    expect(await codeOf(world.services.workflow.listForReview(world.creatorA))).toBe("FORBIDDEN");
    expect((await world.services.management.findManagedById(id))?.status).toBe("PENDING_REVIEW");
    expect(await world.services.events.findById(id)).toBeNull();
  });

  it("con las tres condiciones confirmadas publica el evento y lo deja visible en la API pública", async () => {
    const world = await createTestWorld();
    const id = await pendingEvent(world);
    world.setNow(new Date("2026-11-24T09:00:00.000Z"));
    const approved = await world.services.workflow.approve(world.admin, id, { checklist: FULL_CHECKLIST });

    expect(approved.status).toBe("PUBLISHED");
    expect(approved.reviewedAt).toBe("2026-11-24T09:00:00.000Z");
    expect(approved.lastReview).toMatchObject({
      decision: "APPROVED",
      reviewerId: world.admin.id,
      reviewerName: "Admin de prueba",
      checklistConfirmed: true,
      flaggedCategories: [],
      policyVersion: "2026-11-v1",
    });
    expect((await world.services.events.findById(id))?.title).toBe("Ciclo de cine al aire libre");
    expect((await world.services.events.findAll()).length).toBe(25);
  });

  it("si falta CUALQUIERA de las tres condiciones no se publica", async () => {
    const world = await createTestWorld();
    const id = await pendingEvent(world);
    const { workflow } = world.services;
    for (const missing of ["noAdultContent", "noDrugs", "noBlackMarket"] as const) {
      expect(await codeOf(workflow.approve(world.admin, id, { checklist: { ...FULL_CHECKLIST, [missing]: false } }))).toBe("CHECKLIST_INCOMPLETE");
    }
    expect(await codeOf(workflow.approve(world.admin, id, { checklist: { noAdultContent: true, noDrugs: true } }))).toBe("CHECKLIST_INCOMPLETE");
    expect(await codeOf(workflow.approve(world.admin, id, {}))).toBe("CHECKLIST_INCOMPLETE");
    expect(await codeOf(workflow.approve(world.admin, id, { checklist: { noAdultContent: "true", noDrugs: 1, noBlackMarket: "yes" } }))).toBe("CHECKLIST_INCOMPLETE");
    expect((await world.services.management.findManagedById(id))?.status).toBe("PENDING_REVIEW");
    expect((await world.services.management.listReviews(id)).length).toBe(0);
  });

  it("si el cribado automático levantó alertas exige una nota que explique por qué es aceptable", async () => {
    const world = await createTestWorld();
    const id = await pendingEvent(world, { title: "Charla de prevención de drogas", description: "Charla abierta para apoderados sobre prevención del consumo de drogas en adolescentes." });
    const { workflow } = world.services;

    const detail = await workflow.getForReview(world.admin, id);
    expect(detail.flags.map((flag) => flag.category)).toContain("DRUGS");

    expect(await codeOf(workflow.approve(world.admin, id, { checklist: FULL_CHECKLIST }))).toBe("NOTE_REQUIRED");
    expect(await codeOf(workflow.approve(world.admin, id, { checklist: FULL_CHECKLIST, note: "ok" }))).toBe("NOTE_REQUIRED");

    const approved = await workflow.approve(world.admin, id, { checklist: FULL_CHECKLIST, note: "Es una charla de prevención organizada por el consultorio." });
    expect(approved.status).toBe("PUBLISHED");
    expect(approved.lastReview?.flaggedCategories).toEqual(["DRUGS"]);
    expect(approved.lastReview?.note).toBe("Es una charla de prevención organizada por el consultorio.");
  });

  it("solo se aprueban eventos en revisión (no borradores ni ya publicados)", async () => {
    const world = await createTestWorld();
    const { workflow } = world.services;
    const draft = await workflow.createDraft(world.creatorA, validEventInput());
    expect(await codeOf(workflow.approve(world.admin, draft.id, { checklist: FULL_CHECKLIST }))).toBe("INVALID_STATE");

    const id = await pendingEvent(world);
    await workflow.approve(world.admin, id, { checklist: FULL_CHECKLIST });
    expect(await codeOf(workflow.approve(world.admin, id, { checklist: FULL_CHECKLIST }))).toBe("INVALID_STATE");
    expect(await codeOf(workflow.approve(world.admin, "event-no-existe", { checklist: FULL_CHECKLIST }))).toBe("NOT_FOUND");
  });

  it("dos administradores decidiendo a la vez: solo una decisión queda", async () => {
    const world = await createTestWorld();
    const id = await pendingEvent(world);
    const { workflow } = world.services;
    const results = await Promise.all([
      codeOf(workflow.approve(world.admin, id, { checklist: FULL_CHECKLIST })),
      codeOf(workflow.reject(world.admin, id, { reason: "OTHER_NORM", note: "Rechazo simultáneo de prueba" })),
    ]);
    expect(results.filter((code) => code === "NO_ERROR").length).toBe(1);
    expect((await world.services.management.listReviews(id)).length).toBe(1);
  });
});

describe("administrador: rechazar y retirar", () => {
  it("rechazar exige un motivo válido y una explicación", async () => {
    const world = await createTestWorld();
    const id = await pendingEvent(world);
    const { workflow } = world.services;
    expect(await codeOf(workflow.reject(world.admin, id, {}))).toBe("VALIDATION");
    expect(await codeOf(workflow.reject(world.admin, id, { reason: "SPAM", note: "Motivo que no existe en la lista" }))).toBe("VALIDATION");
    expect(await codeOf(workflow.reject(world.admin, id, { reason: "DRUGS", note: "corta" }))).toBe("VALIDATION");
    expect((await world.services.management.findManagedById(id))?.status).toBe("PENDING_REVIEW");
  });

  it("al rechazar, el creador ve el motivo y la explicación, corrige y reenvía", async () => {
    const world = await createTestWorld();
    const id = await pendingEvent(world);
    const { workflow } = world.services;

    const rejected = await workflow.reject(world.admin, id, { reason: "INCOMPLETE_INFO", note: "Falta indicar el horario real de cada función." });
    expect(rejected.status).toBe("REJECTED");
    expect(await world.services.events.findById(id)).toBeNull();

    const mine = await workflow.getMine(world.creatorA, id);
    expect(mine.event.lastReview).toMatchObject({ decision: "REJECTED", reasonCategory: "INCOMPLETE_INFO", note: "Falta indicar el horario real de cada función." });

    await workflow.updateDraft(world.creatorA, id, validEventInput({ title: "Ciclo de cine con horarios" }));
    const resubmitted = await workflow.submit(world.creatorA, id, { acceptsContentPolicy: true });
    expect(resubmitted.status).toBe("PENDING_REVIEW");
    expect((await workflow.approve(world.admin, id, { checklist: FULL_CHECKLIST })).status).toBe("PUBLISHED");
    expect((await world.services.management.listReviews(id)).map((r) => r.decision)).toEqual(["APPROVED", "REJECTED"]);
  });

  it("el administrador puede retirar un evento publicado (incluidos los 24 de demostración)", async () => {
    const world = await createTestWorld();
    const { workflow } = world.services;

    const demo = await workflow.unpublish(world.admin, "event-001", { reason: "OTHER_NORM", note: "Reclamo del recinto, en revisión." });
    expect(demo.status).toBe("REJECTED");
    expect(await world.services.events.findById("event-001")).toBeNull();
    expect((await world.services.events.findAll()).length).toBe(23);

    expect(await codeOf(workflow.unpublish(world.admin, "event-001", { reason: "OTHER_NORM", note: "Ya estaba retirado." }))).toBe("INVALID_STATE");
    expect(await codeOf(workflow.unpublish(world.creatorA, "event-002", { reason: "OTHER_NORM", note: "No tengo permiso." }))).toBe("FORBIDDEN");
  });

  it("el creador puede retirar su evento publicado o en revisión: vuelve a borrador", async () => {
    const world = await createTestWorld();
    const { workflow } = world.services;
    const id = await pendingEvent(world);
    await workflow.approve(world.admin, id, { checklist: FULL_CHECKLIST });
    expect(await world.services.events.findById(id)).not.toBeNull();

    const back = await workflow.withdraw(world.creatorA, id);
    expect(back.status).toBe("DRAFT");
    expect(back.submittedAt).toBeNull();
    expect(await world.services.events.findById(id)).toBeNull();
    expect(await codeOf(workflow.withdraw(world.creatorA, id))).toBe("INVALID_STATE");

    // y al volver a enviarlo hay que aprobarlo de nuevo: no se salta la moderación
    await workflow.updateDraft(world.creatorA, id, validEventInput({ title: "Ciclo de cine con cambios" }));
    await workflow.submit(world.creatorA, id, { acceptsContentPolicy: true });
    expect(await world.services.events.findById(id)).toBeNull();
  });
});

describe("administrador: revisión", () => {
  it("lista los pendientes por orden de llegada y entrega el historial completo", async () => {
    const world = await createTestWorld();
    const { workflow } = world.services;
    const first = await pendingEvent(world, { title: "Primer evento enviado" });
    world.setNow(new Date("2026-11-23T16:00:00.000Z"));
    const second = await pendingEvent(world, { title: "Segundo evento enviado" });

    const pending = await workflow.listForReview(world.admin, "PENDING_REVIEW");
    expect(pending.map((e) => e.id)).toEqual([first, second]);

    await workflow.reject(world.admin, first, { reason: "OTHER_NORM", note: "Rechazo para probar el historial" });
    const detail = await workflow.getForReview(world.admin, first);
    expect(detail.reviews.length).toBe(1);
    expect(detail.event.createdBy?.email).toBe("user-a@mozak.test");
    expect(await codeOf(workflow.getForReview(world.creatorA, first))).toBe("FORBIDDEN");
  });
});
