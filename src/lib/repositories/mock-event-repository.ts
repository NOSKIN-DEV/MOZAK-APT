import { categories, events, sources, venues } from "@/data";
import type { Category, Event } from "@/types";
import type { EventFilters, EventListOptions } from "@/lib/schemas";
import type { EventPage, EventRepository, EventWithRelations } from "./event-repository";
import { sortEvents } from "./event-order";
import { buildPage, resolveListOptions } from "./pagination";

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
    posterImageUrl: event.posterImageUrl,
    videoUrl: event.videoUrl,
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
 * (src/data). Cumple el contrato EventRepository, igual que
 * PostgresEventRepository, así que se puede reemplazar (DATA_SOURCE) sin
 * tocar la API ni el frontend. Es la fuente por defecto del prototipo.
 */
export class MockEventRepository implements EventRepository {
  async findAll(filters: EventFilters = {}): Promise<EventWithRelations[]> {
    return events.map(toEventWithRelations).filter((event) => matchesFilters(event, filters));
  }

  async findPage(filters: EventFilters = {}, options: EventListOptions = {}): Promise<EventPage> {
    const resolved = resolveListOptions(options);
    const matching = sortEvents(
      events.map(toEventWithRelations).filter((event) => matchesFilters(event, filters)),
      resolved.sort,
    );
    const items = matching.slice(resolved.offset, resolved.offset + resolved.limit);
    return buildPage(items, matching.length, resolved);
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
