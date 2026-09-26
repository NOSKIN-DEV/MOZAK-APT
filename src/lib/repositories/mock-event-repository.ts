import { categories, events, sources, venues } from "@/data";
import type { Category, Event } from "@/types";
import type { EventFilters } from "@/lib/schemas";
import type { EventRepository, EventWithRelations } from "./event-repository";

function toEventWithRelations(event: Event): EventWithRelations {
  const category = categories.find((c) => c.id === event.category);
  const venue = venues.find((v) => v.id === event.venueId);
  const source = sources.find((s) => s.id === event.sourceId);

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
    sourceUrl: event.sourceUrl,
    category,
    venue,
    source,
  };
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita tildes para una búsqueda más tolerante
}

function matchesFilters(event: EventWithRelations, filters: EventFilters): boolean {
  if (filters.category && event.category.id !== filters.category) {
    return false;
  }

  if (filters.commune && normalize(event.venue.commune) !== normalize(filters.commune)) {
    return false;
  }

  if (typeof filters.isFree === "boolean" && event.isFree !== filters.isFree) {
    return false;
  }

  if (filters.dateFrom && event.endDate < filters.dateFrom) {
    return false;
  }

  if (filters.dateTo && event.startDate > filters.dateTo) {
    return false;
  }

  if (filters.search) {
    const needle = normalize(filters.search);
    const haystack = normalize(
      [event.title, event.description, event.venue.name, event.venue.commune].join(" "),
    );
    if (!haystack.includes(needle)) {
      return false;
    }
  }

  return true;
}

/**
 * Repositorio de eventos que lee desde los datos mock locales
 * (src/data). Cumple el contrato EventRepository para que, en una
 * etapa futura, pueda reemplazarse por un PostgresEventRepository sin
 * tocar la API ni el frontend.
 */
export class MockEventRepository implements EventRepository {
  async findAll(filters: EventFilters = {}): Promise<EventWithRelations[]> {
    return events.map(toEventWithRelations).filter((event) => matchesFilters(event, filters));
  }

  async findById(id: string): Promise<EventWithRelations | null> {
    const event = events.find((e) => e.id === id);
    return event ? toEventWithRelations(event) : null;
  }

  async findAllCategories(): Promise<Category[]> {
    return categories;
  }

  async findAllCommunes(): Promise<string[]> {
    const communes = new Set(venues.map((v) => v.commune));
    return Array.from(communes).sort((a, b) => a.localeCompare(b, "es"));
  }
}

/**
 * Instancia única del repositorio activo del prototipo.
 * Cuando exista PostgresEventRepository, este archivo (o una fábrica
 * basada en DATA_SOURCE) decidirá cuál instanciar.
 */
export const eventRepository: EventRepository = new MockEventRepository();
