import type { EventRepository } from "./event-repository";
import { MockEventRepository } from "./mock-event-repository";

export type DataSource = "mock" | "postgres";

/**
 * Lee la fuente de datos activa desde DATA_SOURCE.
 * Sin valor (o vacío) se usa "mock", que es el modo por defecto del prototipo.
 */
export function resolveDataSource(raw: string | undefined = process.env.DATA_SOURCE): DataSource {
  const value = (raw ?? "").trim().toLowerCase();

  if (value === "" || value === "mock") {
    return "mock";
  }
  if (value === "postgres") {
    return "postgres";
  }
  throw new Error(`DATA_SOURCE inválido: "${raw}". Valores permitidos: "mock" o "postgres".`);
}

/**
 * Crea el repositorio según la fuente de datos. El repositorio de PostgreSQL
 * se carga de forma diferida (import dinámico): en modo mock nunca se carga
 * @prisma/client, así que el prototipo sigue funcionando sin base de datos.
 */
export async function createEventRepository(source: DataSource = resolveDataSource()): Promise<EventRepository> {
  if (source === "postgres") {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATA_SOURCE="postgres" requiere definir DATABASE_URL (ver .env.example).');
    }
    const [{ PostgresEventRepository }, { getPrisma }] = await Promise.all([
      import("./postgres-event-repository"),
      import("@/lib/db/prisma"),
    ]);
    return new PostgresEventRepository(getPrisma());
  }

  return new MockEventRepository();
}

let pending: Promise<EventRepository> | undefined;

function getRepository(): Promise<EventRepository> {
  if (!pending) {
    pending = createEventRepository().catch((error: unknown) => {
      pending = undefined; // si la configuración estaba mal, permite reintentar tras corregirla
      throw error;
    });
  }
  return pending;
}

/**
 * Repositorio activo de la aplicación. La API interna (src/app/api/**) y los
 * scripts lo importan desde "@/lib/repositories"; qué implementación hay
 * detrás se decide con DATA_SOURCE la primera vez que se usa.
 */
export const eventRepository: EventRepository = {
  findAll: async (filters) => (await getRepository()).findAll(filters),
  findPage: async (filters, options) => (await getRepository()).findPage(filters, options),
  findById: async (id) => (await getRepository()).findById(id),
  findAllCategories: async () => (await getRepository()).findAllCategories(),
  findAllCommunes: async () => (await getRepository()).findAllCommunes(),
};
