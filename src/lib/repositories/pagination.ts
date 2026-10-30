import { DEFAULT_PAGE_SIZE, type EventListOptions, type EventSort } from "@/lib/schemas";

/** Opciones de listado con los valores por defecto ya aplicados. */
export interface ResolvedListOptions {
  sort: EventSort;
  page: number;
  limit: number;
  /** Cuántos resultados se saltan: (page - 1) * limit. */
  offset: number;
}

export interface Page<T> {
  items: T[];
  /** Total de resultados que cumplen los filtros (en todas las páginas). */
  total: number;
  page: number;
  limit: number;
  /** ceil(total / limit); 0 cuando no hay resultados. */
  totalPages: number;
  sort: EventSort;
}

/**
 * Aplica los valores por defecto: orden "date_asc", página 1 y
 * DEFAULT_PAGE_SIZE resultados por página. Se asume que las opciones ya
 * pasaron por eventListOptionsSchema (page >= 1, 1 <= limit <= MAX_PAGE_SIZE).
 */
export function resolveListOptions(options: EventListOptions = {}): ResolvedListOptions {
  const page = options.page ?? 1;
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;
  return { sort: options.sort ?? "date_asc", page, limit, offset: (page - 1) * limit };
}

/** Arma la respuesta paginada. Una página fuera de rango devuelve items = [] (no es un error). */
export function buildPage<T>(items: T[], total: number, resolved: ResolvedListOptions): Page<T> {
  return {
    items,
    total,
    page: resolved.page,
    limit: resolved.limit,
    totalPages: Math.ceil(total / resolved.limit),
    sort: resolved.sort,
  };
}
