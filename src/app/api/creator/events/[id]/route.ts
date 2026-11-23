import { createCreatorHandlers } from "@/lib/server/creator-handlers";
import { getServices } from "@/lib/server/container";

// Siempre dinámica: depende de la cookie de sesión y nunca debe quedar en caché.
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return createCreatorHandlers(await getServices()).get(request, id);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return createCreatorHandlers(await getServices()).update(request, id);
}
