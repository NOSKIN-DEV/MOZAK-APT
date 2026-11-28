import { buildDemoUsers, demoUsersEnabled, DEMO_USER_DEFINITIONS } from "@/lib/auth/demo-users";
import { resolveSessionSecret } from "@/lib/auth/session";
import { getSharedMemoryStore } from "@/lib/repositories/memory-store";
import { MockEventRepository } from "@/lib/repositories/mock-event-repository";
import { MockEventManagementRepository, MockUserRepository } from "@/lib/repositories/mock-management-repository";
import { resolveDataSource, type DataSource } from "@/lib/repositories/factory";
import { composeServices, type Services } from "./services";

/**
 * Conexión de la aplicación con su fuente de datos (DATA_SOURCE), igual que
 * src/lib/repositories/factory.ts pero para los servicios de la Etapa 15
 * (login, creadores, moderación).
 *
 *  - "mock": todo vive en la memoria del servidor (MemoryStore compartido con el
 *    listado público). Las cuentas de demostración solo se crean si
 *    demoUsersEnabled() lo permite (ver src/lib/auth/demo-users.ts).
 *  - "postgres": los repositorios de PostgreSQL; se cargan de forma diferida
 *    para que el modo mock siga funcionando sin @prisma/client.
 */
export async function createServices(source: DataSource = resolveDataSource()): Promise<Services> {
  const secret = resolveSessionSecret();

  if (source === "postgres") {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATA_SOURCE="postgres" requiere definir DATABASE_URL (ver .env.example).');
    }
    const [{ PostgresEventRepository }, { PostgresEventManagementRepository }, { PostgresUserRepository }, { getPrisma }] =
      await Promise.all([
        import("@/lib/repositories/postgres-event-repository"),
        import("@/lib/repositories/postgres-management-repository"),
        import("@/lib/repositories/postgres-user-repository"),
        import("@/lib/db/prisma"),
      ]);
    const prisma = getPrisma();
    return composeServices({
      events: new PostgresEventRepository(prisma),
      management: new PostgresEventManagementRepository(prisma),
      users: new PostgresUserRepository(prisma),
      secret,
    });
  }

  const store = getSharedMemoryStore();
  if (demoUsersEnabled() && !store.users.some((user) => DEMO_USER_DEFINITIONS.some((demo) => demo.id === user.id))) {
    store.users.push(...(await buildDemoUsers()));
  }
  return composeServices({
    events: new MockEventRepository(store),
    management: new MockEventManagementRepository(store),
    users: new MockUserRepository(store),
    secret,
  });
}

let pending: Promise<Services> | undefined;

/** Servicios de la aplicación (se crean una sola vez; si la configuración falla, se puede reintentar). */
export function getServices(): Promise<Services> {
  if (!pending) {
    pending = createServices().catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  }
  return pending;
}
