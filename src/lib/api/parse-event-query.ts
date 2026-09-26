import { eventFiltersSchema, type EventFilters } from "@/lib/schemas";

export type ParseEventQueryResult =
  | { success: true; filters: EventFilters }
  | { success: false; issues: Array<{ path: string; message: string }> };

/**
 * Los query params siempre llegan como strings. Esta función construye
 * un objeto crudo a partir de ellos y lo valida con eventFiltersSchema
 * (el mismo esquema que usará el repositorio), para que un valor mal
 * formado devuelva un 400 claro en vez de fallar más adentro.
 */
export function parseEventFilters(searchParams: URLSearchParams): ParseEventQueryResult {
  const raw: Record<string, unknown> = {};

  const search = searchParams.get("search");
  if (search !== null && search.trim() !== "") raw.search = search;

  const category = searchParams.get("category");
  if (category !== null && category.trim() !== "") raw.category = category;

  const commune = searchParams.get("commune");
  if (commune !== null && commune.trim() !== "") raw.commune = commune;

  const dateFrom = searchParams.get("dateFrom");
  if (dateFrom !== null && dateFrom.trim() !== "") raw.dateFrom = dateFrom;

  const dateTo = searchParams.get("dateTo");
  if (dateTo !== null && dateTo.trim() !== "") raw.dateTo = dateTo;

  const isFreeParam = searchParams.get("isFree");
  if (isFreeParam !== null) {
    if (isFreeParam === "true") {
      raw.isFree = true;
    } else if (isFreeParam === "false") {
      raw.isFree = false;
    } else {
      return {
        success: false,
        issues: [{ path: "isFree", message: 'El parámetro "isFree" debe ser "true" o "false"' }],
      };
    }
  }

  const result = eventFiltersSchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  return { success: true, filters: result.data };
}
