import { CONTENT_CATEGORIES, CONTENT_POLICY_VERSION } from "@/lib/moderation/content-policy";
import { protectedAction } from "./guard";
import { json } from "./http";
import { toApiManagedEvent, toApiReview } from "./serializers";
import type { Services } from "./services";

/**
 * Rutas del perfil CREADOR. Cada una exige sesión de un creador y trabaja solo
 * con SUS eventos: los de otros creadores responden 404.
 */
export function createCreatorHandlers(services: Services) {
  const { workflow } = services;
  const read = { role: "CREATOR", mutating: false } as const;
  const write = { role: "CREATOR", mutating: true, withBody: true } as const;
  const action = { role: "CREATOR", mutating: true } as const;

  return {
    /** Categorías y recintos para el formulario, más la política de contenido que el creador declara cumplir. */
    catalog: (request: Request) =>
      protectedAction(request, services, read, async (user) =>
        json({
          data: await workflow.catalog(user),
          policy: {
            version: CONTENT_POLICY_VERSION,
            prohibited: CONTENT_CATEGORIES.map(({ id, label, description }) => ({ id, label, description })),
          },
        }),
      ),

    list: (request: Request) =>
      protectedAction(request, services, read, async (user) => {
        const events = await workflow.listMine(user);
        return json({ data: events.map((event) => toApiManagedEvent(event, "creator")) });
      }),

    get: (request: Request, id: string) =>
      protectedAction(request, services, read, async (user) => {
        const { event, reviews } = await workflow.getMine(user, id);
        return json({
          data: toApiManagedEvent(event, "creator"),
          reviews: reviews.map((review) => toApiReview(review, "creator")),
        });
      }),

    create: (request: Request) =>
      protectedAction(request, services, write, async (user, body) =>
        json({ data: toApiManagedEvent(await workflow.createDraft(user, body), "creator") }, 201),
      ),

    update: (request: Request, id: string) =>
      protectedAction(request, services, write, async (user, body) =>
        json({ data: toApiManagedEvent(await workflow.updateDraft(user, id, body), "creator") }),
      ),

    submit: (request: Request, id: string) =>
      protectedAction(request, services, write, async (user, body) =>
        json({ data: toApiManagedEvent(await workflow.submit(user, id, body), "creator") }),
      ),

    withdraw: (request: Request, id: string) =>
      protectedAction(request, services, action, async (user) =>
        json({ data: toApiManagedEvent(await workflow.withdraw(user, id), "creator") }),
      ),
  };
}
