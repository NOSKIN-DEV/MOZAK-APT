import { createCreatorHandlers } from "@/lib/server/creator-handlers";
import { getServices } from "@/lib/server/container";

// Siempre dinámica: depende de la cookie de sesión y nunca debe quedar en caché.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return createCreatorHandlers(await getServices()).list(request);
}

export async function POST(request: Request) {
  return createCreatorHandlers(await getServices()).create(request);
}
