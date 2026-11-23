import { categories, events, sources, venues } from "@/data";
import { ORGANIZER_SOURCE } from "@/lib/moderation/organizer-source";
import type { Category, Event, EventStatus, Source, UserRecord, Venue } from "@/types";
import type { EventWithRelations } from "./event-repository";
import type { ManagedEvent, ModerationReviewRecord } from "./management-repository";

/** Evento guardado en memoria: contenido + datos del flujo de moderación. */
export interface StoredEvent extends Event {
  status: EventStatus;
  createdById: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  contentPolicyAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Almacén en memoria del modo mock (Etapa 15).
 *
 * Antes el repositorio mock solo leía los arreglos de src/data. Ahora que hay
 * creadores y moderación, los datos cambian mientras corre el servidor, así que
 * se copian a este almacén. Los 24 eventos de demostración nacen PUBLISHED.
 *
 * Es memoria: los cambios (eventos, usuarios, decisiones) se pierden al
 * reiniciar el servidor. Para datos que persistan se usa DATA_SOURCE=postgres.
 */
export class MemoryStore {
  categories: Category[] = [];
  venues: Venue[] = [];
  sources: Source[] = [];
  events: StoredEvent[] = [];
  users: UserRecord[] = [];
  reviews: ModerationReviewRecord[] = [];

  /** Almacén nuevo con una copia de los datos de demostración. */
  static seeded(now: Date = new Date()): MemoryStore {
    const at = now.toISOString();
    const store = new MemoryStore();
    store.categories = structuredClone(categories);
    store.venues = structuredClone(venues);
    store.sources = [...structuredClone(sources), structuredClone(ORGANIZER_SOURCE)];
    store.events = events.map((event) => ({
      ...structuredClone(event),
      status: "PUBLISHED" as const,
      createdById: null,
      submittedAt: null,
      reviewedAt: null,
      contentPolicyAcceptedAt: null,
      createdAt: at,
      updatedAt: at,
    }));
    return store;
  }
}

const GLOBAL_KEY = Symbol.for("mozak.memoryStore");

/**
 * Almacén compartido de la aplicación. Se guarda en globalThis porque Next.js
 * recarga los módulos en desarrollo y, sin esto, cada recarga borraría los datos.
 */
export function getSharedMemoryStore(): MemoryStore {
  const holder = globalThis as unknown as Record<symbol, MemoryStore | undefined>;
  holder[GLOBAL_KEY] ??= MemoryStore.seeded();
  return holder[GLOBAL_KEY];
}

/** Resuelve las referencias por id (categoría, recinto, fuente) de un evento. */
export function resolveEvent(store: MemoryStore, event: StoredEvent): EventWithRelations {
  const category = store.categories.find((c) => c.id === event.category);
  const venue = store.venues.find((v) => v.id === event.venueId);
  const source = store.sources.find((s) => s.id === event.sourceId);

  if (!category) {
    throw new Error(`Evento ${event.id} referencia una categoría inexistente: ${event.category}`);
  }
  if (!venue) {
    throw new Error(`Evento ${event.id} referencia un venue inexistente: ${event.venueId}`);
  }
  if (!source) {
    throw new Error(`Evento ${event.id} referencia una fuente inexistente: ${event.sourceId}`);
  }

  return {
    id: event.id,
    externalId: event.externalId,
    title: event.title,
    description: event.description,
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
    category,
    venue,
    source,
  };
}

/** Evento con sus datos de flujo, autor y última decisión. */
export function resolveManagedEvent(store: MemoryStore, event: StoredEvent): ManagedEvent {
  const creator = event.createdById ? store.users.find((u) => u.id === event.createdById) : undefined;
  // Las decisiones se agregan en orden cronológico: la última del arreglo es la más reciente.
  const reviews = store.reviews.filter((review) => review.eventId === event.id);
  const lastReview = reviews[reviews.length - 1] ?? null;

  return {
    ...resolveEvent(store, event),
    status: event.status,
    createdBy: creator ? { id: creator.id, name: creator.name, email: creator.email } : null,
    submittedAt: event.submittedAt,
    reviewedAt: event.reviewedAt,
    contentPolicyAcceptedAt: event.contentPolicyAcceptedAt,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    lastReview,
  };
}
