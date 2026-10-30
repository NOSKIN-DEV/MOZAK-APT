import type { EventSort } from "@/lib/schemas";

export interface EventsQueryInput {
  search: string;
  category: string;
  commune: string;
  /** Fecha YYYY-MM-DD en que el evento debe estar ocurriendo ("" = sin filtro). */
  date: string;
  priceFilter: "all" | "free" | "paid";
  sort: EventSort;
  page: number;
  limit: number;
}

/**
 * Construye el query string de GET /api/events a partir del estado de la
 * pantalla principal. Vive aparte de page.tsx para poder probarlo sin React.
 * Devuelve "" o una cadena que empieza con "?". URLSearchParams se encarga de
 * codificar los caracteres especiales (tildes, espacios, &, #, etc.).
 */
export function buildEventsQuery(input: EventsQueryInput): string {
  const params = new URLSearchParams();

  const search = input.search.trim();
  if (search !== "") params.set("search", search);
  if (input.category !== "") params.set("category", input.category);
  if (input.commune !== "") params.set("commune", input.commune);
  if (input.date !== "") {
    // Un evento "ocurre" en la fecha elegida si esa fecha cae dentro de
    // su rango [startDate, endDate], por eso se manda como dateFrom=dateTo.
    params.set("dateFrom", input.date);
    params.set("dateTo", input.date);
  }
  if (input.priceFilter === "free") params.set("isFree", "true");
  if (input.priceFilter === "paid") params.set("isFree", "false");

  params.set("sort", input.sort);
  params.set("page", String(input.page));
  params.set("limit", String(input.limit));

  return `?${params.toString()}`;
}
