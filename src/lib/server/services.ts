import { AuthService } from "@/lib/auth/auth-service";
import { LoginThrottle } from "@/lib/auth/login-throttle";
import { EventWorkflowService } from "@/lib/moderation/workflow";
import type { EventRepository } from "@/lib/repositories/event-repository";
import type { EventManagementRepository, UserRepository } from "@/lib/repositories/management-repository";

/** Todo lo que necesitan las rutas de la API de la Etapa 15, ya conectado entre sí. */
export interface Services {
  /** Lectura pública (solo eventos publicados). */
  events: EventRepository;
  management: EventManagementRepository;
  users: UserRepository;
  workflow: EventWorkflowService;
  auth: AuthService;
  throttle: LoginThrottle;
}

export interface ServiceParts {
  events: EventRepository;
  management: EventManagementRepository;
  users: UserRepository;
  /** Secreto de firma de las sesiones. */
  secret: string;
  now?: () => Date;
  newId?: (prefix: string) => string;
  throttle?: LoginThrottle;
}

/** Arma los servicios a partir de los repositorios. No sabe de dónde vienen los datos. */
export function composeServices(parts: ServiceParts): Services {
  return {
    events: parts.events,
    management: parts.management,
    users: parts.users,
    workflow: new EventWorkflowService({
      catalog: parts.events,
      events: parts.management,
      now: parts.now,
      newId: parts.newId,
    }),
    auth: new AuthService({ users: parts.users, secret: parts.secret, now: parts.now }),
    throttle: parts.throttle ?? new LoginThrottle(),
  };
}
