import { NextResponse } from "next/server";
import { eventRepository } from "@/lib/repositories";
import { toApiEvent } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/[id]
 * Devuelve 404 con un mensaje claro si el id no existe.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const event = await eventRepository.findById(id);

  if (!event) {
    return NextResponse.json({ error: `Evento "${id}" no encontrado` }, { status: 404 });
  }

  return NextResponse.json({ data: toApiEvent(event) });
}
