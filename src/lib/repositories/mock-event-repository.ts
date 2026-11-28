import type { Category } from "@/types";
import type { EventFilters, EventListOptions } from "@/lib/schemas";
import type { EventPage, EventRepository, EventWithRelations } from "./event-repository";
import { sortEvents } from "./event-order";
import { MemoryStore, resolveEvent } from "./memory-store";
import { buildPage, resolveListOptions } from "./pagination";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quita tildes para una búsqueda más tolerante
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
 * Repositorio de eventos del modo mock. Cumple el contrato EventRepository,
 * igual que PostgresEventRepository, así que se puede reemplazar (DATA_SOURCE)
 * sin tocar la API ni el frontend. Es la fuente por defecto del prototipo.
 *
 * Etapa 15: lee del almacén en memoria (MemoryStore) y SOLO muestra los eventos
 * PUBLISHED: un borrador, un evento en revisión o uno rechazado nunca aparece
 * en la API pública. Sin argumentos usa una copia nueva de los datos de
 * demostración (los 24 eventos, todos publicados); la aplicación le pasa el
 * almacén compartido para que lo aprobado por un administrador se vea en el listado.
 */
export class MockEventRepository implements EventRepository {
  constructor(private readonly store: MemoryStore = MemoryStore.seeded()) {}

  private published(): EventWithRelations[] {
    return this.store.events.filter((event) => event.status === "PUBLISHED").map((event) => resolveEvent(this.store, event));
  }

  async findAll(filters: EventFilters = {}): Promise<EventWithRelations[]> {
    return this.published().filter((event) => matchesFilters(event, filters));
  }

  async findPage(filters: EventFilters = {}, options: EventListOptions = {}): Promise<EventPage> {
    const resolved = resolveListOptions(options);
    const matching = sortEvents(
      this.published().filter((event) => matchesFilters(event, filters)),
      resolved.sort,
    );
    const items = matching.slice(resolved.offset, resolved.offset + resolved.limit);
    return buildPage(items, matching.length, resolved);
  }

  async findById(id: string): Promise<EventWithRelations | null> {
    const event = this.store.events.find((e) => e.id === id && e.status === "PUBLISHED");
    return event ? resolveEvent(this.store, event) : null;
  }

  async findAllCategories(): Promise<Category[]> {
    return this.store.categories;
  }

  async findAllCommunes(): Promise<string[]> {
    // Solo comunas con al menos un evento publicado: un recinto nuevo de un
    // borrador no debe aparecer como filtro con resultados vacíos.
    const communes = new Set(this.published().map((event) => event.venue.commune));
    return Array.from(communes).sort((a, b) => a.localeCompare(b, "es"));
  }
}
