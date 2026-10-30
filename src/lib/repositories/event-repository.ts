import type { Category, Event, Source, Venue } from "@/types";
import type { EventFilters, EventListOptions } from "@/lib/schemas";
import type { Page } from "./pagination";

/**
 * Evento "denormalizado": las referencias por id (category, venueId,
 * sourceId) ya vienen resueltas como objetos completos. Es la forma en
 * la que el frontend y la API interna consumen los eventos (ver el
 * ejemplo de JSON en la sección 11 del documento de requisitos).
 */
export interface EventWithRelations extends Omit<Event, "category" | "venueId" | "sourceId"> {
  category: Category;
  venue: Venue;
  source: Source;
}

/** Una página de resultados del listado (Etapa 13). */
export type EventPage = Page<EventWithRelations>;

/**
 * Puerto (en el sentido de arquitectura hexagonal) para acceder a los
 * eventos, sin acoplar el resto de la aplicación a la fuente de datos
 * concreta.
 *
 * Implementaciones (se elige con DATA_SOURCE, ver factory.ts):
 * - MockEventRepository ("mock", por defecto): lee de src/data/*.
 * - PostgresEventRepository ("postgres", Etapa 11): lee desde PostgreSQL
 *   vía Prisma, sin que el frontend ni la API deban cambiar.
 *
 * Ambas se validan con la misma batería de pruebas (event-repository.contract.ts).
 */
export interface EventRepository {
  /** Todos los eventos que cumplen los filtros, sin paginar, ordenados por id. */
  findAll(filters?: EventFilters): Promise<EventWithRelations[]>;
  /**
   * Listado ordenado por fecha y paginado (Etapa 13, HU-21/HU-22). Sin opciones:
   * orden "date_asc", página 1, 20 resultados. `total` cuenta todos los
   * resultados de los filtros, no solo los de la página.
   */
  findPage(filters?: EventFilters, options?: EventListOptions): Promise<EventPage>;
  findById(id: string): Promise<EventWithRelations | null>;
  findAllCategories(): Promise<Category[]>;
  findAllCommunes(): Promise<string[]>;
}
