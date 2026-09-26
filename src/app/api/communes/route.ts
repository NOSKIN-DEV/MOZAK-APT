import { NextResponse } from "next/server";
import { eventRepository } from "@/lib/repositories";

/** GET /api/communes - comunas disponibles (derivadas de los venues), para llenar el filtro. */
export async function GET() {
  const communes = await eventRepository.findAllCommunes();
  return NextResponse.json({ data: communes });
}
