import { readSessionCookie } from "@/lib/auth/cookies";
import type { UserRecord, UserRole } from "@/types";
import { checkSameOrigin, errorResponse, failure, readJsonBody } from "./http";
import type { Services } from "./services";

/**
 * Comprueba la sesión y el rol antes de cada acción protegida. Devuelve el
 * usuario, o directamente la respuesta de error (401 sin sesión, 403 con rol
 * equivocado). Las acciones que cambian datos además pasan la defensa CSRF.
 */
export async function requireUser(
  request: Request,
  services: Pick<Services, "auth">,
  role: UserRole,
  options: { mutating: boolean },
): Promise<UserRecord | Response> {
  if (options.mutating) {
    const blocked = checkSameOrigin(request);
    if (blocked) {
      return blocked;
    }
  }

  const user = await services.auth.authenticate(readSessionCookie(request));
  if (!user) {
    return errorResponse(401, "Debes iniciar sesión.", { code: "UNAUTHENTICATED" });
  }
  if (user.role !== role) {
    return errorResponse(403, "No tienes permiso para esta acción.", { code: "FORBIDDEN" });
  }
  return user;
}

export interface ProtectedOptions {
  role: UserRole;
  /** true si la acción cambia datos (activa la defensa CSRF). */
  mutating: boolean;
  /** true si la acción espera un cuerpo JSON. */
  withBody?: boolean;
}

/**
 * Envoltura común de las rutas protegidas: sesión y rol, cuerpo JSON opcional y
 * traducción de los errores del flujo a respuestas HTTP.
 */
export async function protectedAction(
  request: Request,
  services: Pick<Services, "auth">,
  options: ProtectedOptions,
  action: (user: UserRecord, body: unknown) => Promise<Response>,
): Promise<Response> {
  try {
    const user = await requireUser(request, services, options.role, { mutating: options.mutating });
    if (user instanceof Response) {
      return user;
    }

    let body: unknown = undefined;
    if (options.withBody) {
      const read = await readJsonBody(request);
      if (!read.ok) {
        return read.response;
      }
      body = read.body;
    }
    return await action(user, body);
  } catch (error) {
    return failure(error);
  }
}
