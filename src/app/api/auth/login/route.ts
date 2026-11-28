import { createAuthHandlers } from "@/lib/server/auth-handlers";
import { getServices } from "@/lib/server/container";

// Siempre dinámica: depende de la cookie de sesión y nunca debe quedar en caché.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return createAuthHandlers(await getServices()).login(request);
}
