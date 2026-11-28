import {
  isSecureRequest,
  readSessionCookie,
  serializeClearedSessionCookie,
  serializeSessionCookie,
} from "@/lib/auth/cookies";
import { toPublicUser } from "@/lib/auth/auth-service";
import { WorkflowError } from "@/lib/moderation/errors";
import { loginInputSchema, zodIssues } from "@/lib/moderation/schemas";
import { checkSameOrigin, errorResponse, failure, json, readJsonBody } from "./http";
import type { Services } from "./services";

function clientAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/**
 * POST /api/auth/login, POST /api/auth/logout y GET /api/auth/me.
 * Solo administradores y creadores tienen cuenta; el consumidor no inicia sesión.
 */
export function createAuthHandlers(services: Services) {
  return {
    async login(request: Request): Promise<Response> {
      try {
        const blocked = checkSameOrigin(request);
        if (blocked) return blocked;
        const body = await readJsonBody(request);
        if (!body.ok) return body.response;

        const parsed = loginInputSchema.safeParse(body.body);
        if (!parsed.success) {
          return errorResponse(400, "Ingresa tu correo y tu contraseña.", { code: "VALIDATION", issues: zodIssues(parsed.error) });
        }

        const key = `${clientAddress(request)}|${parsed.data.email}`;
        const wait = services.throttle.retryAfterSeconds(key);
        if (wait > 0) {
          return errorResponse(429, "Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.", { code: "TOO_MANY_ATTEMPTS" });
        }

        try {
          const { user, token } = await services.auth.login(parsed.data.email, parsed.data.password);
          services.throttle.reset(key);
          return json({ data: toPublicUser(user) }, 200, {
            "Set-Cookie": serializeSessionCookie(token, { secure: isSecureRequest(request) }),
          });
        } catch (error) {
          if (error instanceof WorkflowError && error.code === "UNAUTHENTICATED") {
            services.throttle.recordFailure(key);
          }
          throw error;
        }
      } catch (error) {
        return failure(error);
      }
    },

    async logout(request: Request): Promise<Response> {
      const blocked = checkSameOrigin(request);
      if (blocked) return blocked;
      return json({ data: { loggedOut: true } }, 200, {
        "Set-Cookie": serializeClearedSessionCookie({ secure: isSecureRequest(request) }),
      });
    },

    async me(request: Request): Promise<Response> {
      try {
        const user = await services.auth.authenticate(readSessionCookie(request));
        if (!user) {
          return errorResponse(401, "No hay una sesión activa.", { code: "UNAUTHENTICATED" });
        }
        return json({ data: toPublicUser(user) });
      } catch (error) {
        return failure(error);
      }
    },
  };
}
