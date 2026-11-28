import { randomUUID } from "node:crypto";
import { eventSchema } from "@/lib/schemas";
import type { Category, Event, EventStatus, UserRecord, Venue } from "@/types";
import type { EventRepository } from "@/lib/repositories/event-repository";
import type {
  EventContent,
  EventManagementRepository,
  ManagedEvent,
  ModerationReviewRecord,
} from "@/lib/repositories/management-repository";
import {
  CONTENT_POLICY_VERSION,
  flaggedCategories,
  screenContent,
  type ContentFlag,
} from "./content-policy";
import { todayInSantiago } from "./dates";
import { WorkflowError } from "./errors";
import { ORGANIZER_SOURCE } from "./organizer-source";
import {
  approveInputSchema,
  creatorEventInputSchema,
  decisionInputSchema,
  submitInputSchema,
  zodIssues,
  type ValidationIssue,
} from "./schemas";

/**
 * Flujo de creación, revisión y publicación de eventos (Etapa 15).
 *
 * Reglas (todas se hacen cumplir AQUÍ, en el servidor; la interfaz solo las muestra):
 *  - Solo un CREATOR crea eventos y solo ve y edita los suyos.
 *  - Un creador solo puede editar un evento en DRAFT o REJECTED, y solo puede
 *    enviarlo a revisión declarando que cumple la política de contenido.
 *  - SOLO un ADMIN puede aprobar la publicación. Para aprobar debe confirmar
 *    las tres condiciones de la norma (sin contenido adulto, sin drogas, sin
 *    mercado negro); si el cribado automático levantó alertas debe, además,
 *    dejar una nota que explique por qué el evento es aceptable.
 *  - Rechazar o retirar un evento publicado exige un motivo y una explicación.
 *  - Cada decisión queda registrada (quién, cuándo, qué, con qué alertas y
 *    versión de la política).
 *  - Un cambio de estado compara y cambia en una sola operación: si dos
 *    administradores deciden a la vez, el segundo recibe INVALID_STATE.
 */

export interface WorkflowDeps {
  /** Lectura pública: se usa solo para validar categorías. */
  catalog: Pick<EventRepository, "findAllCategories">;
  events: EventManagementRepository;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

export type Actor = Pick<UserRecord, "id" | "role" | "name" | "email">;

function defaultNewId(prefix: string): string {
  return `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/** Evento listo para mostrar al administrador: con las alertas automáticas y el historial. */
export interface ReviewDetail {
  event: ManagedEvent;
  flags: ContentFlag[];
  reviews: ModerationReviewRecord[];
}

const EDITABLE: readonly EventStatus[] = ["DRAFT", "REJECTED"];

export class EventWorkflowService {
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(private readonly deps: WorkflowDeps) {
    this.now = deps.now ?? (() => new Date());
    this.newId = deps.newId ?? defaultNewId;
  }

  // ---------------------------------------------------------------- creador

  /** Categorías y recintos que el creador puede elegir en el formulario. */
  async catalog(actor: Actor): Promise<{ categories: Category[]; venues: Venue[] }> {
    this.requireRole(actor, "CREATOR");
    const [categories, venues] = await Promise.all([this.deps.catalog.findAllCategories(), this.deps.events.listVenues()]);
    return { categories, venues };
  }

  async listMine(actor: Actor): Promise<ManagedEvent[]> {
    this.requireRole(actor, "CREATOR");
    return this.deps.events.listManaged({ createdById: actor.id });
  }

  async getMine(actor: Actor, id: string): Promise<{ event: ManagedEvent; reviews: ModerationReviewRecord[] }> {
    const event = await this.ownedEvent(actor, id);
    return { event, reviews: await this.deps.events.listReviews(id) };
  }

  async createDraft(actor: Actor, rawInput: unknown): Promise<ManagedEvent> {
    this.requireRole(actor, "CREATOR");
    const content = await this.buildContent(rawInput);
    return this.deps.events.createEvent({
      id: this.newId("event"),
      content,
      sourceId: ORGANIZER_SOURCE.id,
      createdById: actor.id,
      at: this.now().toISOString(),
    });
  }

  async updateDraft(actor: Actor, id: string, rawInput: unknown): Promise<ManagedEvent> {
    const current = await this.ownedEvent(actor, id);
    if (!EDITABLE.includes(current.status)) {
      throw new WorkflowError(
        "INVALID_STATE",
        "Solo se pueden editar los eventos en borrador o rechazados. Si el evento está publicado o en revisión, retíralo primero.",
      );
    }
    const content = await this.buildContent(rawInput);
    const updated = await this.deps.events.updateContent(id, content, EDITABLE, this.now().toISOString());
    if (!updated) {
      throw new WorkflowError("INVALID_STATE", "El evento cambió de estado mientras lo editabas. Recarga e inténtalo de nuevo.");
    }
    return updated;
  }

  /** Envía el evento a revisión. El creador declara que cumple la política de contenido. */
  async submit(actor: Actor, id: string, rawInput: unknown): Promise<ManagedEvent> {
    const current = await this.ownedEvent(actor, id);

    const declaration = submitInputSchema.safeParse(rawInput);
    if (!declaration.success) {
      throw new WorkflowError("VALIDATION", declaration.error.issues[0]?.message ?? "Declaración inválida", zodIssues(declaration.error));
    }
    if (!EDITABLE.includes(current.status)) {
      throw new WorkflowError("INVALID_STATE", "Solo se pueden enviar a revisión los eventos en borrador o rechazados.");
    }
    if (current.endDate < todayInSantiago(this.now())) {
      throw new WorkflowError("VALIDATION", "El evento ya terminó: corrige las fechas antes de enviarlo.", [
        { path: "endDate", message: "La fecha de término ya pasó" },
      ]);
    }

    const at = this.now().toISOString();
    const submitted = await this.deps.events.transition({
      id,
      from: EDITABLE,
      to: "PENDING_REVIEW",
      set: { submittedAt: at, contentPolicyAcceptedAt: at, reviewedAt: null },
      at,
    });
    if (!submitted) {
      throw new WorkflowError("INVALID_STATE", "El evento cambió de estado mientras lo enviabas. Recarga e inténtalo de nuevo.");
    }
    return submitted;
  }

  /** El creador retira su evento (de la revisión o de la publicación): vuelve a borrador. */
  async withdraw(actor: Actor, id: string): Promise<ManagedEvent> {
    const current = await this.ownedEvent(actor, id);
    if (current.status !== "PENDING_REVIEW" && current.status !== "PUBLISHED") {
      throw new WorkflowError("INVALID_STATE", "Solo se puede retirar un evento publicado o en revisión.");
    }
    const withdrawn = await this.deps.events.transition({
      id,
      from: ["PENDING_REVIEW", "PUBLISHED"],
      to: "DRAFT",
      set: { submittedAt: null, reviewedAt: null, contentPolicyAcceptedAt: null },
      at: this.now().toISOString(),
    });
    if (!withdrawn) {
      throw new WorkflowError("INVALID_STATE", "El evento cambió de estado. Recarga e inténtalo de nuevo.");
    }
    return withdrawn;
  }

  // ------------------------------------------------------------ administrador

  /** Todos los eventos; los pendientes van del más antiguo al más reciente (orden de llegada). */
  async listForReview(actor: Actor, status?: EventStatus): Promise<ManagedEvent[]> {
    this.requireRole(actor, "ADMIN");
    const events = await this.deps.events.listManaged(status ? { status } : {});
    if (status === "PENDING_REVIEW") {
      events.sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
    }
    return events;
  }

  async getForReview(actor: Actor, id: string): Promise<ReviewDetail> {
    this.requireRole(actor, "ADMIN");
    const event = await this.requireEvent(id);
    return {
      event,
      flags: screenContent({ title: event.title, description: event.description }),
      reviews: await this.deps.events.listReviews(id),
    };
  }

  /** Aprueba la publicación. Solo un administrador y solo con la lista de condiciones confirmada. */
  async approve(actor: Actor, id: string, rawInput: unknown): Promise<ManagedEvent> {
    this.requireRole(actor, "ADMIN");
    const event = await this.requireEvent(id);

    const parsed = approveInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new WorkflowError(
        "CHECKLIST_INCOMPLETE",
        "Para aprobar debes confirmar las tres condiciones de la norma.",
        zodIssues(parsed.error),
      );
    }
    if (event.status !== "PENDING_REVIEW") {
      throw new WorkflowError("INVALID_STATE", "Solo se pueden aprobar los eventos que están en revisión.");
    }

    const flags = screenContent({ title: event.title, description: event.description });
    const note = parsed.data.note?.trim() ?? "";
    if (flags.length > 0 && note.length < 10) {
      throw new WorkflowError(
        "NOTE_REQUIRED",
        "El cribado automático levantó alertas: explica en una nota (mínimo 10 caracteres) por qué el evento está dentro de la norma.",
        [{ path: "note", message: "La nota es obligatoria cuando hay alertas automáticas" }],
      );
    }

    // El evento debe cumplir las mismas reglas de datos que los eventos de demostración.
    const publishable = eventSchema.safeParse(toDomainEvent(event));
    if (!publishable.success) {
      throw new WorkflowError("VALIDATION", "El evento tiene datos inválidos y no se puede publicar.", zodIssues(publishable.error));
    }

    const at = this.now().toISOString();
    const approved = await this.deps.events.transition({
      id,
      from: ["PENDING_REVIEW"],
      to: "PUBLISHED",
      set: { reviewedAt: at },
      review: {
        id: this.newId("review"),
        eventId: id,
        reviewerId: actor.id,
        decision: "APPROVED",
        reasonCategory: null,
        note: note === "" ? null : note,
        flaggedCategories: flaggedCategories(flags),
        checklistConfirmed: true,
        policyVersion: CONTENT_POLICY_VERSION,
        createdAt: at,
      },
      at,
    });
    if (!approved) {
      throw new WorkflowError("INVALID_STATE", "Otro administrador ya decidió sobre este evento. Recarga la lista.");
    }
    return approved;
  }

  /** Rechaza un evento en revisión. El creador verá el motivo y podrá corregirlo y reenviarlo. */
  async reject(actor: Actor, id: string, rawInput: unknown): Promise<ManagedEvent> {
    return this.decide(actor, id, rawInput, { from: "PENDING_REVIEW", decision: "REJECTED" });
  }

  /** Retira de la publicación un evento ya publicado (por ejemplo, tras un reclamo). */
  async unpublish(actor: Actor, id: string, rawInput: unknown): Promise<ManagedEvent> {
    return this.decide(actor, id, rawInput, { from: "PUBLISHED", decision: "UNPUBLISHED" });
  }

  private async decide(
    actor: Actor,
    id: string,
    rawInput: unknown,
    options: { from: EventStatus; decision: "REJECTED" | "UNPUBLISHED" },
  ): Promise<ManagedEvent> {
    this.requireRole(actor, "ADMIN");
    const event = await this.requireEvent(id);

    const parsed = decisionInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new WorkflowError("VALIDATION", "Indica el motivo y una explicación de al menos 10 caracteres.", zodIssues(parsed.error));
    }
    if (event.status !== options.from) {
      throw new WorkflowError(
        "INVALID_STATE",
        options.decision === "REJECTED"
          ? "Solo se pueden rechazar los eventos que están en revisión."
          : "Solo se pueden retirar los eventos publicados.",
      );
    }

    const flags = screenContent({ title: event.title, description: event.description });
    const at = this.now().toISOString();
    const decided = await this.deps.events.transition({
      id,
      from: [options.from],
      to: "REJECTED",
      set: { reviewedAt: at },
      review: {
        id: this.newId("review"),
        eventId: id,
        reviewerId: actor.id,
        decision: options.decision,
        reasonCategory: parsed.data.reason,
        note: parsed.data.note,
        flaggedCategories: flaggedCategories(flags),
        checklistConfirmed: false,
        policyVersion: CONTENT_POLICY_VERSION,
        createdAt: at,
      },
      at,
    });
    if (!decided) {
      throw new WorkflowError("INVALID_STATE", "Otro administrador ya decidió sobre este evento. Recarga la lista.");
    }
    return decided;
  }

  // ---------------------------------------------------------------- internos

  private requireRole(actor: Actor, role: Actor["role"]): void {
    if (actor.role !== role) {
      throw new WorkflowError("FORBIDDEN", role === "ADMIN" ? "Solo un administrador puede hacer esto." : "Solo un creador puede hacer esto.");
    }
  }

  private async requireEvent(id: string): Promise<ManagedEvent> {
    const event = await this.deps.events.findManagedById(id);
    if (!event) {
      throw new WorkflowError("NOT_FOUND", "Evento no encontrado.");
    }
    return event;
  }

  /** Evento propio del creador. Si no existe o es de otro creador, responde igual (NOT_FOUND). */
  private async ownedEvent(actor: Actor, id: string): Promise<ManagedEvent> {
    this.requireRole(actor, "CREATOR");
    const event = await this.deps.events.findManagedById(id);
    if (!event || event.createdBy?.id !== actor.id) {
      throw new WorkflowError("NOT_FOUND", "Evento no encontrado.");
    }
    return event;
  }

  /** Valida lo que escribió el creador y resuelve categoría y recinto (creando el recinto nuevo si corresponde). */
  private async buildContent(rawInput: unknown): Promise<EventContent> {
    const parsed = creatorEventInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new WorkflowError("VALIDATION", "Revisa los datos del evento.", zodIssues(parsed.error));
    }
    const input = parsed.data;
    const issues: ValidationIssue[] = [];

    const categories = await this.deps.catalog.findAllCategories();
    if (!categories.some((category) => category.id === input.categoryId)) {
      issues.push({ path: "categoryId", message: "La categoría no existe" });
    }

    let venueId = input.venueId;
    if (venueId && !(await this.deps.events.findVenueById(venueId))) {
      issues.push({ path: "venueId", message: "El recinto no existe" });
    }
    if (issues.length > 0) {
      throw new WorkflowError("VALIDATION", "Revisa los datos del evento.", issues);
    }

    if (!venueId && input.newVenue) {
      const venue = await this.deps.events.createVenue({ id: this.newId("venue"), ...input.newVenue });
      venueId = venue.id;
    }
    if (!venueId) {
      throw new WorkflowError("VALIDATION", "Falta el recinto.", [{ path: "venueId", message: "Elige un recinto" }]);
    }

    return {
      title: input.title,
      description: input.description,
      category: input.categoryId,
      startDate: input.startDate,
      endDate: input.endDate,
      startTime: input.startTime,
      endTime: input.endTime,
      price: input.price,
      isFree: input.isFree,
      imageUrl: input.imageUrl,
      posterImageUrl: input.posterImageUrl,
      videoUrl: input.videoUrl,
      sourceUrl: input.sourceUrl,
      venueId,
    };
  }
}

/** Forma "normalizada" del evento (referencias por id) para validarla con eventSchema. */
function toDomainEvent(event: ManagedEvent): Event {
  return {
    id: event.id,
    externalId: event.externalId,
    title: event.title,
    description: event.description,
    category: event.category.id,
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    price: event.price,
    isFree: event.isFree,
    imageUrl: event.imageUrl,
    posterImageUrl: event.posterImageUrl,
    videoUrl: event.videoUrl,
    sourceUrl: event.sourceUrl,
    sourceId: event.source.id,
    venueId: event.venue.id,
  };
}
