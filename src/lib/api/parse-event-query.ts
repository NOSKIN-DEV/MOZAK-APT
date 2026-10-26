import {
  MAX_PAGE,
  MAX_PAGE_SIZE,
  eventFiltersSchema,
  eventListOptionsSchema,
  type EventFilters,
  type EventListOptions,
} from "@/lib/schemas";
import { MAX_TEXT_LENGTH, sanitizeText } from "@/lib/sanitize";

export interface QueryIssue {
  path: string;
  message: string;
}

export type ParseEventFiltersResult =
  | { success: true; filters: EventFilters }
  | { success: false; issues: QueryIssue[] };

export type ParseEventListOptionsResult =
  | { success: true; options: EventListOptions }
  | { success: false; issues: QueryIssue[] };

export type ParseEventQueryResult =
  | { success: true; filters: EventFilters; options: EventListOptions }
  | { success: false; issues: QueryIssue[] };

const FILTER_KEYS = ["search", "category", "commune", "dateFrom", "dateTo", "isFree"] as const;
const LIST_OPTION_KEYS = ["sort", "page", "limit"] as const;

/** Solo dígitos ASCII (rechaza "-1", "1e3", "2.5", " 7", "0x10" y dígitos de otros alfabetos). */
const INTEGER_PATTERN = /^\d{1,6}$/;

// Los mensajes de error nunca repiten el valor recibido: así una respuesta 400
// no puede usarse para reflejar contenido arbitrario del atacante.
function repeatedParamIssues(searchParams: URLSearchParams, keys: readonly string[]): QueryIssue[] {
  return keys
    .filter((key) => searchParams.getAll(key).length > 1)
    .map((key) => ({ path: key, message: `El parámetro "${key}" no puede repetirse` }));
}

/**
 * Lee un parámetro de texto, lo sanitiza (NFC, espacios, caracteres de control,
 * largo) y devuelve undefined si no viene o queda vacío.
 */
function readText(searchParams: URLSearchParams, key: string, issues: QueryIssue[]): string | undefined {
  const raw = searchParams.get(key);
  if (raw === null) return undefined;

  const result = sanitizeText(raw);
  if (!result.ok) {
    issues.push({
      path: key,
      message:
        result.reason === "too-long"
          ? `El parámetro "${key}" no puede superar ${MAX_TEXT_LENGTH} caracteres`
          : `El parámetro "${key}" contiene caracteres no permitidos`,
    });
    return undefined;
  }
  return result.value === "" ? undefined : result.value;
}

/**
 * Los query params siempre llegan como strings. Esta función los sanitiza,
 * construye un objeto crudo y lo valida con eventFiltersSchema (el mismo
 * esquema que usa el repositorio), para que un valor mal formado devuelva un
 * 400 claro en vez de fallar más adentro (o, peor, llegar a la base de datos).
 */
export function parseEventFilters(searchParams: URLSearchParams): ParseEventFiltersResult {
  const issues: QueryIssue[] = repeatedParamIssues(searchParams, FILTER_KEYS);
  const raw: Record<string, unknown> = {};

  const search = readText(searchParams, "search", issues);
  if (search !== undefined) raw.search = search;

  const category = readText(searchParams, "category", issues);
  if (category !== undefined) raw.category = category;

  const commune = readText(searchParams, "commune", issues);
  if (commune !== undefined) raw.commune = commune;

  const dateFrom = readText(searchParams, "dateFrom", issues);
  if (dateFrom !== undefined) raw.dateFrom = dateFrom;

  const dateTo = readText(searchParams, "dateTo", issues);
  if (dateTo !== undefined) raw.dateTo = dateTo;

  const isFreeParam = searchParams.get("isFree");
  if (isFreeParam !== null) {
    if (isFreeParam === "true") {
      raw.isFree = true;
    } else if (isFreeParam === "false") {
      raw.isFree = false;
    } else {
      issues.push({ path: "isFree", message: 'El parámetro "isFree" debe ser "true" o "false"' });
    }
  }

  const result = eventFiltersSchema.safeParse(raw);
  if (!result.success) {
    issues.push(
      ...result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  if (issues.length > 0 || !result.success) {
    return { success: false, issues };
  }
  return { success: true, filters: result.data };
}

/**
 * Ordenamiento y paginación: sort ("date_asc" | "date_desc"), page (entero
 * desde 1) y limit (entero de 1 a MAX_PAGE_SIZE). Todos opcionales; los
 * valores por defecto los aplica el repositorio.
 */
export function parseEventListOptions(searchParams: URLSearchParams): ParseEventListOptionsResult {
  const issues: QueryIssue[] = repeatedParamIssues(searchParams, LIST_OPTION_KEYS);
  const raw: Record<string, unknown> = {};

  const sort = readText(searchParams, "sort", issues);
  if (sort !== undefined) {
    if (sort === "date_asc" || sort === "date_desc") {
      raw.sort = sort;
    } else {
      issues.push({ path: "sort", message: 'El parámetro "sort" debe ser "date_asc" o "date_desc"' });
    }
  }

  const readInteger = (key: "page" | "limit", max: number) => {
    const value = readText(searchParams, key, issues);
    if (value === undefined) return;
    const parsed = INTEGER_PATTERN.test(value) ? Number(value) : Number.NaN;
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= max) {
      raw[key] = parsed;
    } else {
      issues.push({ path: key, message: `El parámetro "${key}" debe ser un entero entre 1 y ${max}` });
    }
  };
  readInteger("page", MAX_PAGE);
  readInteger("limit", MAX_PAGE_SIZE);

  const result = eventListOptionsSchema.safeParse(raw);
  if (!result.success) {
    issues.push(
      ...result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  if (issues.length > 0 || !result.success) {
    return { success: false, issues };
  }
  return { success: true, options: result.data };
}

/** Filtros + orden + paginación de GET /api/events, con todos los errores juntos. */
export function parseEventQuery(searchParams: URLSearchParams): ParseEventQueryResult {
  const filters = parseEventFilters(searchParams);
  const options = parseEventListOptions(searchParams);

  if (filters.success && options.success) {
    return { success: true, filters: filters.filters, options: options.options };
  }

  return {
    success: false,
    issues: [...(filters.success ? [] : filters.issues), ...(options.success ? [] : options.issues)],
  };
}
