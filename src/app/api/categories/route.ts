import { NextResponse } from "next/server";
import { eventRepository } from "@/lib/repositories";

/** GET /api/categories - lista de categorías disponibles, para llenar el filtro. */
export async function GET() {
  const categories = await eventRepository.findAllCategories();
  return NextResponse.json({ data: categories });
}
