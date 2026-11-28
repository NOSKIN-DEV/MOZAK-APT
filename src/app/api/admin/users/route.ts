import { createAdminHandlers } from "@/lib/server/admin-handlers";
import { getServices } from "@/lib/server/container";

// Siempre dinámica: depende de la cookie de sesión y nunca debe quedar en caché.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return createAdminHandlers(await getServices()).listUsers(request);
}

export async function POST(request: Request) {
  return createAdminHandlers(await getServices()).createUser(request);
}
