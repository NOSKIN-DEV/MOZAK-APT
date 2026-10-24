import type { Category, Event, Source, Venue } from "@/types";
import type { EventFilters } from "@/lib/schemas";

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
  findAll(filters?: EventFilters): Promise<EventWithRelations[]>;
  findById(id: string): Promise<EventWithRelations | null>;
  findAllCategories(): Promise<Category[]>;
  findAllCommunes(): Promise<string[]>;
}
