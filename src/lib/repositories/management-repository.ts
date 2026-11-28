import type { Event, EventStatus, ReviewDecision, UserRecord, UserRole, Venue } from "@/types";
import type { ContentCategoryId, RejectionReason } from "@/lib/moderation/content-policy";
import type { EventWithRelations } from "./event-repository";

/**
 * Puertos de la Etapa 15 (roles y moderación), en el mismo estilo hexagonal de
 * EventRepository: el resto de la aplicación depende de estas interfaces y no
 * de la fuente concreta (memoria en modo mock, PostgreSQL en modo postgres).
 *
 * EventRepository (lectura pública) sigue siendo solo de consulta y solo ve los
 * eventos PUBLISHED. Todo lo que cambia datos pasa por estos puertos.
 */

/** Una decisión de moderación, tal como queda en la auditoría. */
export interface ModerationReviewRecord {
  id: string;
  eventId: string;
  reviewerId: string;
  reviewerName: string | null;
  decision: ReviewDecision;
  reasonCategory: RejectionReason | null;
  note: string | null;
  /** Categorías que el cribado automático marcó al momento de decidir. */
  flaggedCategories: ContentCategoryId[];
  /** true si el administrador confirmó la lista de condiciones de la norma. */
  checklistConfirmed: boolean;
  policyVersion: string;
  /** ISO 8601 (UTC). */
  createdAt: string;
}

export type NewModerationReview = Omit<ModerationReviewRecord, "reviewerName">;

/** Evento con sus datos de flujo (estado, autor, fechas) y la última decisión. */
export interface ManagedEvent extends EventWithRelations {
  status: EventStatus;
  createdBy: { id: string; name: string; email: string } | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  /** Cuándo el creador declaró que el evento cumple la política de contenido. */
  contentPolicyAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastReview: ModerationReviewRecord | null;
}

/** Contenido que escribe el creador (sin id, fuente ni datos de flujo). */
export type EventContent = Omit<Event, "id" | "externalId" | "sourceId">;

export interface NewManagedEvent {
  id: string;
  content: EventContent;
  sourceId: string;
  createdById: string;
  /** ISO 8601 (UTC). */
  at: string;
}

export interface TransitionRequest {
  id: string;
  /** Estados desde los que se permite el cambio; si el evento está en otro, no se cambia nada. */
  from: readonly EventStatus[];
  to: EventStatus;
  set?: {
    submittedAt?: string | null;
    reviewedAt?: string | null;
    contentPolicyAcceptedAt?: string | null;
  };
  /** Decisión de moderación que se guarda en la misma operación (todo o nada). */
  review?: NewModerationReview;
  at: string;
}

export interface EventManagementRepository {
  listVenues(): Promise<Venue[]>;
  findVenueById(id: string): Promise<Venue | null>;
  createVenue(venue: Venue): Promise<Venue>;
  /** Crea un evento en estado DRAFT. */
  createEvent(input: NewManagedEvent): Promise<ManagedEvent>;
  /**
   * Reemplaza el contenido del evento SOLO si está en alguno de los estados
   * permitidos (comparación y cambio en una sola operación, sin carreras).
   * Devuelve null si no existe o ya no está en un estado permitido.
   */
  updateContent(
    id: string,
    content: EventContent,
    allowedStatuses: readonly EventStatus[],
    at: string,
  ): Promise<ManagedEvent | null>;
  findManagedById(id: string): Promise<ManagedEvent | null>;
  /** Más recientemente modificados primero. */
  listManaged(filter?: { status?: EventStatus; createdById?: string }): Promise<ManagedEvent[]>;
  /**
   * Cambia el estado solo si el evento está en uno de los estados `from` y, en
   * la misma operación, guarda la decisión de moderación. Devuelve null si no
   * existe o si otro cambio llegó antes (por ejemplo, dos administradores
   * decidiendo a la vez): nunca se aprueba dos veces.
   */
  transition(request: TransitionRequest): Promise<ManagedEvent | null>;
  listReviews(eventId: string): Promise<ModerationReviewRecord[]>;
}

export class EmailAlreadyUsedError extends Error {
  constructor(email: string) {
    super(`Ya existe un usuario con el correo ${email}`);
    this.name = "EmailAlreadyUsedError";
  }
}

export interface UserRepository {
  /** El correo se compara en minúsculas. */
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  list(filter?: { role?: UserRole }): Promise<UserRecord[]>;
  /** Lanza EmailAlreadyUsedError si el correo ya existe. */
  create(user: UserRecord): Promise<UserRecord>;
  setActive(id: string, active: boolean): Promise<UserRecord | null>;
  recordLogin(id: string, at: string): Promise<void>;
}
