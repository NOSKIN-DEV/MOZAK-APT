import { NextResponse, type NextRequest } from "next/server";
import { eventRepository } from "@/lib/repositories";
import { parseEventQuery, toApiEvent } from "@/lib/api";

/**
 * GET /api/events
 * GET /api/events?search=teatro
 * GET /api/events?category=cat-ferias&commune=Recoleta&isFree=true
 * GET /api/events?dateFrom=2026-10-01&dateTo=2026-10-31
 * GET /api/events?sort=date_desc&page=2&limit=10
 *
 * Filtros (todos opcionales, se combinan con AND): search, category, commune,
 * dateFrom, dateTo, isFree.
 *
 * Orden y paginación (Etapa 13):
 *  - sort: "date_asc" (por defecto, más próximos primero) o "date_desc".
 *  - page: desde 1 (por defecto 1). limit: de 1 a 100 (por defecto 20).
 *  - Una página fuera de rango responde 200 con data = [].
 *
 * Respuesta: { data, meta: { total, page, limit, totalPages, sort } }, donde
 * meta.total es el total de resultados de los filtros (no solo los de la página).
 *
 * Cualquier parámetro inválido, repetido, con caracteres de control o demasiado
 * largo responde 400 con el detalle de cada error (sin repetir el valor recibido).
 */
export async function GET(request: NextRequest) {
  const parsed = parseEventQuery(request.nextUrl.searchParams);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros de búsqueda inválidos", issues: parsed.issues },
      { status: 400 },
    );
  }

  const page = await eventRepository.findPage(parsed.filters, parsed.options);

  return NextResponse.json({
    data: page.items.map(toApiEvent),
    meta: {
      total: page.total,
      page: page.page,
      limit: page.limit,
      totalPages: page.totalPages,
      sort: page.sort,
    },
  });
}
