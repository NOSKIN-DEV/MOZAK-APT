import type { EventStatus, UserRecord, UserRole, Venue } from "@/types";
import {
  EmailAlreadyUsedError,
  type EventContent,
  type EventManagementRepository,
  type ManagedEvent,
  type ModerationReviewRecord,
  type NewManagedEvent,
  type TransitionRequest,
  type UserRepository,
} from "./management-repository";
import { MemoryStore, resolveManagedEvent, type StoredEvent } from "./memory-store";

function withReviewerName(store: MemoryStore, review: ModerationReviewRecord): ModerationReviewRecord {
  return { ...review, reviewerName: store.users.find((user) => user.id === review.reviewerId)?.name ?? null };
}

/**
 * Gestión de eventos (creación, edición, cambios de estado y auditoría) sobre
 * el almacén en memoria del modo mock. Comparte la misma batería de pruebas de
 * contrato que PostgresEventManagementRepository.
 */
export class MockEventManagementRepository implements EventManagementRepository {
  constructor(private readonly store: MemoryStore = MemoryStore.seeded()) {}

  private managed(event: StoredEvent): ManagedEvent {
    const managed = resolveManagedEvent(this.store, event);
    return managed.lastReview ? { ...managed, lastReview: withReviewerName(this.store, managed.lastReview) } : managed;
  }

  async listVenues(): Promise<Venue[]> {
    return [...this.store.venues].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  async findVenueById(id: string): Promise<Venue | null> {
    return this.store.venues.find((venue) => venue.id === id) ?? null;
  }

  async createVenue(venue: Venue): Promise<Venue> {
    if (this.store.venues.some((existing) => existing.id === venue.id)) {
      throw new Error(`Ya existe un recinto con id ${venue.id}`);
    }
    this.store.venues.push({ ...venue });
    return { ...venue };
  }

  async createEvent(input: NewManagedEvent): Promise<ManagedEvent> {
    if (this.store.events.some((event) => event.id === input.id)) {
      throw new Error(`Ya existe un evento con id ${input.id}`);
    }
    const stored: StoredEvent = {
      ...input.content,
      id: input.id,
      externalId: null,
      sourceId: input.sourceId,
      status: "DRAFT",
      createdById: input.createdById,
      submittedAt: null,
      reviewedAt: null,
      contentPolicyAcceptedAt: null,
      createdAt: input.at,
      updatedAt: input.at,
    };
    this.store.events.push(stored);
    return this.managed(stored);
  }

  async updateContent(
    id: string,
    content: EventContent,
    allowedStatuses: readonly EventStatus[],
    at: string,
  ): Promise<ManagedEvent | null> {
    const event = this.store.events.find((e) => e.id === id);
    if (!event || !allowedStatuses.includes(event.status)) {
      return null;
    }
    Object.assign(event, content, { updatedAt: at });
    return this.managed(event);
  }

  async findManagedById(id: string): Promise<ManagedEvent | null> {
    const event = this.store.events.find((e) => e.id === id);
    return event ? this.managed(event) : null;
  }

  async listManaged(filter: { status?: EventStatus; createdById?: string } = {}): Promise<ManagedEvent[]> {
    return this.store.events
      .filter((event) => (filter.status ? event.status === filter.status : true))
      .filter((event) => (filter.createdById ? event.createdById === filter.createdById : true))
      .map((event) => this.managed(event))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.id.localeCompare(b.id)));
  }

  async transition(request: TransitionRequest): Promise<ManagedEvent | null> {
    const event = this.store.events.find((e) => e.id === request.id);
    if (!event || !request.from.includes(event.status)) {
      return null;
    }
    event.status = request.to;
    event.updatedAt = request.at;
    if (request.set) {
      if (request.set.submittedAt !== undefined) event.submittedAt = request.set.submittedAt;
      if (request.set.reviewedAt !== undefined) event.reviewedAt = request.set.reviewedAt;
      if (request.set.contentPolicyAcceptedAt !== undefined) {
        event.contentPolicyAcceptedAt = request.set.contentPolicyAcceptedAt;
      }
    }
    if (request.review) {
      this.store.reviews.push({ ...request.review, reviewerName: null });
    }
    return this.managed(event);
  }

  async listReviews(eventId: string): Promise<ModerationReviewRecord[]> {
    return this.store.reviews
      .filter((review) => review.eventId === eventId)
      .map((review) => withReviewerName(this.store, review))
      .reverse(); // más reciente primero
  }
}

/** Usuarios (administradores y creadores) en el almacén en memoria del modo mock. */
export class MockUserRepository implements UserRepository {
  constructor(private readonly store: MemoryStore = MemoryStore.seeded()) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    const user = this.store.users.find((u) => u.email === normalized);
    return user ? { ...user } : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = this.store.users.find((u) => u.id === id);
    return user ? { ...user } : null;
  }

  async list(filter: { role?: UserRole } = {}): Promise<UserRecord[]> {
    return this.store.users
      .filter((user) => (filter.role ? user.role === filter.role : true))
      .map((user) => ({ ...user }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  async create(user: UserRecord): Promise<UserRecord> {
    const email = user.email.trim().toLowerCase();
    if (this.store.users.some((existing) => existing.email === email)) {
      throw new EmailAlreadyUsedError(email);
    }
    const stored = { ...user, email };
    this.store.users.push(stored);
    return { ...stored };
  }

  async setActive(id: string, active: boolean): Promise<UserRecord | null> {
    const user = this.store.users.find((u) => u.id === id);
    if (!user) {
      return null;
    }
    user.active = active;
    return { ...user };
  }

  async recordLogin(id: string, at: string): Promise<void> {
    const user = this.store.users.find((u) => u.id === id);
    if (user) {
      user.lastLoginAt = at;
    }
  }
}
