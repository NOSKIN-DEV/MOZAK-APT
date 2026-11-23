import { toPublicUser } from "@/lib/auth/auth-service";
import { MODERATION_CHECKLIST, REJECTION_REASONS } from "@/lib/moderation/content-policy";
import { WorkflowError } from "@/lib/moderation/errors";
import { EVENT_STATUSES, type EventStatus } from "@/types";
import { protectedAction } from "./guard";
import { json } from "./http";
import { toApiManagedEvent, toApiReview } from "./serializers";
import type { Services } from "./services";

/**
 * Rutas del perfil ADMINISTRADOR: revisar y decidir sobre los eventos y
 * gestionar las cuentas de los creadores. Es el ÚNICO perfil que puede aprobar
 * la publicación de un evento.
 */
export function createAdminHandlers(services: Services) {
  const { workflow, auth } = services;
  const read = { role: "ADMIN", mutating: false } as const;
  const write = { role: "ADMIN", mutating: true, withBody: true } as const;

  return {
    /** GET /api/admin/events?status=PENDING_REVIEW (sin status = todos). */
    listEvents: (request: Request) =>
      protectedAction(request, services, read, async (user) => {
        const raw = new URL(request.url).searchParams.get("status");
        if (raw !== null && !EVENT_STATUSES.includes(raw as EventStatus)) {
          throw new WorkflowError("VALIDATION", "El estado pedido no existe.", [
            { path: "status", message: `Estados válidos: ${EVENT_STATUSES.join(", ")}` },
          ]);
        }
        const events = await workflow.listForReview(user, (raw as EventStatus | null) ?? undefined);
        return json({
          data: events.map((event) => toApiManagedEvent(event, "admin")),
          // La lista de condiciones y los motivos de rechazo los define el servidor (política de contenido).
          policy: { checklist: MODERATION_CHECKLIST, rejectionReasons: REJECTION_REASONS },
        });
      }),

    getEvent: (request: Request, id: string) =>
      protectedAction(request, services, read, async (user) => {
        const { event, flags, reviews } = await workflow.getForReview(user, id);
        return json({
          data: toApiManagedEvent(event, "admin"),
          flags,
          reviews: reviews.map((review) => toApiReview(review, "admin")),
        });
      }),

    approve: (request: Request, id: string) =>
      protectedAction(request, services, write, async (user, body) =>
        json({ data: toApiManagedEvent(await workflow.approve(user, id, body), "admin") }),
      ),

    reject: (request: Request, id: string) =>
      protectedAction(request, services, write, async (user, body) =>
        json({ data: toApiManagedEvent(await workflow.reject(user, id, body), "admin") }),
      ),

    unpublish: (request: Request, id: string) =>
      protectedAction(request, services, write, async (user, body) =>
        json({ data: toApiManagedEvent(await workflow.unpublish(user, id, body), "admin") }),
      ),

    listUsers: (request: Request) =>
      protectedAction(request, services, read, async (user) => {
        const creators = await auth.listCreators(user);
        return json({ data: creators.map(toPublicUser) });
      }),

    createUser: (request: Request) =>
      protectedAction(request, services, write, async (user, body) =>
        json({ data: toPublicUser(await auth.createCreator(user, body)) }, 201),
      ),

    setUserActive: (request: Request, id: string) =>
      protectedAction(request, services, write, async (user, body) =>
        json({ data: toPublicUser(await auth.setCreatorActive(user, id, body)) }),
      ),
  };
}
