import { NextResponse, type NextRequest } from "next/server";
import { eventRepository } from "@/lib/repositories";
import { parseEventFilters, toApiEvent } from "@/lib/api";

/**
 * GET /api/events
 * GET /api/events?search=teatro
 * GET /api/events?category=cat-ferias&commune=Recoleta&isFree=true
 * GET /api/events?dateFrom=2026-10-01&dateTo=2026-10-31
 *
 * Todos los filtros son opcionales y se combinan con AND.
 */
export async function GET(request: NextRequest) {
  const parsed = parseEventFilters(request.nextUrl.searchParams);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros de búsqueda inválidos", issues: parsed.issues },
      { status: 400 },
    );
  }

  const events = await eventRepository.findAll(parsed.filters);
  const data = events.map(toApiEvent);

  return NextResponse.json({ data, meta: { total: data.length } });
}
