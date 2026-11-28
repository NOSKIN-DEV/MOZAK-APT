import { randomUUID } from "node:crypto";
import type { PublicUser, UserRecord } from "@/types";
import { WorkflowError } from "@/lib/moderation/errors";
import { createUserInputSchema, setActiveInputSchema, zodIssues } from "@/lib/moderation/schemas";
import { EmailAlreadyUsedError, type UserRepository } from "@/lib/repositories/management-repository";
import { decoyHash, hashPassword, verifyPassword } from "./password";
import { createSessionToken, verifySessionToken } from "./session";

export interface AuthDeps {
  users: UserRepository;
  /** Secreto de firma de las sesiones (ver resolveSessionSecret). */
  secret: string;
  now?: () => Date;
}

/** Quita los datos sensibles de un usuario antes de enviarlo fuera del servidor. */
export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

const INVALID_CREDENTIALS = "Correo o contraseña incorrectos.";

/**
 * Inicio de sesión y gestión de cuentas de creadores (Etapa 15).
 *
 * El consumidor de la plataforma no tiene cuenta. Las cuentas son solo de dos
 * tipos: ADMIN (se crea con la semilla de la base, ver prisma/seed.ts) y
 * CREATOR (las crea un administrador; no hay registro abierto).
 */
export class AuthService {
  private readonly now: () => Date;

  constructor(private readonly deps: AuthDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  /**
   * Verifica correo y contraseña. El mensaje de error es el mismo si el correo
   * no existe, la contraseña es incorrecta o la cuenta está desactivada, para
   * no revelar qué correos están registrados.
   */
  async login(email: string, password: string): Promise<{ user: UserRecord; token: string }> {
    const user = await this.deps.users.findByEmail(email);
    // Con correo desconocido se verifica igual contra un hash señuelo (mismo tiempo de respuesta).
    const passwordOk = await verifyPassword(password, user?.passwordHash ?? (await decoyHash()));
    if (!user || !passwordOk || !user.active) {
      throw new WorkflowError("UNAUTHENTICATED", INVALID_CREDENTIALS);
    }

    const at = this.now();
    await this.deps.users.recordLogin(user.id, at.toISOString());
    return { user, token: createSessionToken(user.id, this.deps.secret, at) };
  }

  /**
   * Usuario de una cookie de sesión, o null. El rol y el estado activo se leen
   * de la base en cada petición: desactivar una cuenta corta la sesión de inmediato.
   */
  async authenticate(token: string | null): Promise<UserRecord | null> {
    if (!token) {
      return null;
    }
    const userId = verifySessionToken(token, this.deps.secret, this.now());
    if (!userId) {
      return null;
    }
    const user = await this.deps.users.findById(userId);
    return user?.active ? user : null;
  }

  // ------------------------------------------------- cuentas de creadores (admin)

  async listCreators(actor: Pick<UserRecord, "role">): Promise<UserRecord[]> {
    this.requireAdmin(actor);
    return this.deps.users.list({ role: "CREATOR" });
  }

  async createCreator(actor: Pick<UserRecord, "role">, rawInput: unknown): Promise<UserRecord> {
    this.requireAdmin(actor);
    const parsed = createUserInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new WorkflowError("VALIDATION", "Revisa los datos de la cuenta.", zodIssues(parsed.error));
    }

    const user: UserRecord = {
      id: `user-${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
      role: "CREATOR",
      active: true,
      createdAt: this.now().toISOString(),
      lastLoginAt: null,
    };
    try {
      return await this.deps.users.create(user);
    } catch (error) {
      if (error instanceof EmailAlreadyUsedError) {
        throw new WorkflowError("EMAIL_TAKEN", "Ya existe una cuenta con ese correo.", [
          { path: "email", message: "Ya existe una cuenta con ese correo" },
        ]);
      }
      throw error;
    }
  }

  /** Activa o desactiva la cuenta de un creador (no las de administradores). */
  async setCreatorActive(actor: Pick<UserRecord, "role">, id: string, rawInput: unknown): Promise<UserRecord> {
    this.requireAdmin(actor);
    const parsed = setActiveInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new WorkflowError("VALIDATION", "Indica si la cuenta debe quedar activa.", zodIssues(parsed.error));
    }
    const target = await this.deps.users.findById(id);
    if (!target || target.role !== "CREATOR") {
      throw new WorkflowError("NOT_FOUND", "Cuenta de creador no encontrada.");
    }
    const updated = await this.deps.users.setActive(id, parsed.data.active);
    if (!updated) {
      throw new WorkflowError("NOT_FOUND", "Cuenta de creador no encontrada.");
    }
    return updated;
  }

  private requireAdmin(actor: Pick<UserRecord, "role">): void {
    if (actor.role !== "ADMIN") {
      throw new WorkflowError("FORBIDDEN", "Solo un administrador puede gestionar cuentas.");
    }
  }
}
