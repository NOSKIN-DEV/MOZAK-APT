import type { Prisma, PrismaClient } from "@prisma/client";
import type { Category } from "@/types";
import type { EventFilters } from "@/lib/schemas";
import type { EventRepository, EventWithRelations } from "./event-repository";
import { toCategory, toDbDate, toEventWithRelations } from "./postgres-mapping";
import { buildTextFilterQuery } from "./postgres-text-filters";

const WITH_RELATIONS = { category: true, venue: true, source: true } as const;

/**
 * Repositorio de eventos respaldado por PostgreSQL (vía Prisma).
 *
 * Cumple el mismo contrato EventRepository que MockEventRepository y se
 * valida con la misma batería de pruebas (event-repository.contract.ts), de
 * modo que cambiar DATA_SOURCE de "mock" a "postgres" no exige modificar la
 * API interna ni el frontend.
 *
 * Reglas de filtrado (idénticas al mock):
 *  - search: texto en título, descripción, lugar o comuna, sin distinguir
 *    mayúsculas ni tildes.
 *  - commune: igualdad sin distinguir mayúsculas ni tildes.
 *  - dateFrom/dateTo: el evento se incluye si su rango [startDate, endDate]
 *    se solapa con la ventana pedida.
 *  - Todos los filtros se combinan con AND.
 *
 * Orden: por id ascendente (igual que el orden del arreglo mock). El orden
 * por fecha y la paginación son otra historia del Sprint 4 (HU-21).
 */
export class PostgresEventRepository implements EventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(filters: EventFilters = {}): Promise<EventWithRelations[]> {
    const where: Prisma.EventWhereInput = {};

    // Filtros de texto (búsqueda y comuna): consulta SQL con `unaccent`.
    const textQuery = buildTextFilterQuery(filters);
    if (textQuery) {
      const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(textQuery.text, ...textQuery.values);
      if (rows.length === 0) {
        return [];
      }
      where.id = { in: rows.map((row) => row.id) };
    }

    // Resto de filtros: consultas tipadas de Prisma.
    if (filters.category) {
      where.categoryId = filters.category;
    }
    if (typeof filters.isFree === "boolean") {
      where.isFree = filters.isFree;
    }
    if (filters.dateFrom) {
      where.endDate = { gte: toDbDate(filters.dateFrom) };
    }
    if (filters.dateTo) {
      where.startDate = { lte: toDbDate(filters.dateTo) };
    }

    const rows = await this.prisma.event.findMany({
      where,
      include: WITH_RELATIONS,
      orderBy: { id: "asc" },
    });
    return rows.map(toEventWithRelations);
  }

  async findById(id: string): Promise<EventWithRelations | null> {
    const row = await this.prisma.event.findUnique({ where: { id }, include: WITH_RELATIONS });
    return row ? toEventWithRelations(row) : null;
  }

  async findAllCategories(): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
    return rows.map(toCategory);
  }

  async findAllCommunes(): Promise<string[]> {
    const rows = await this.prisma.venue.findMany({ distinct: ["commune"], select: { commune: true } });
    // Se ordena en JS con el criterio del español (Ñuñoa después de Maipú) para
    // no depender de la collation de la base de datos.
    return rows.map((row) => row.commune).sort((a, b) => a.localeCompare(b, "es"));
  }
}
