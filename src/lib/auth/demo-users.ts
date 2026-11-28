import type { UserRecord } from "@/types";
import { hashPassword } from "./password";

/**
 * Cuentas DE DEMOSTRACIÓN para probar el prototipo en tu propio computador.
 *
 * No son cuentas reales: la contraseña está escrita en el código y en el README,
 * así que NUNCA deben existir en un servidor accesible desde Internet.
 *  - Modo mock: se crean solo con ENABLE_DEMO_USERS=true o fuera de producción
 *    (npm run dev). docker-compose.yml lo activa para la demostración local.
 *  - PostgreSQL: la semilla las crea solo con SEED_DEMO_USERS=true.
 * Con DEMO_USERS_PASSWORD se puede cambiar la contraseña de demostración.
 */
export const DEFAULT_DEMO_PASSWORD = "mozak-demo-2026";

export const DEMO_USER_DEFINITIONS = [
  { id: "user-demo-admin", email: "admin@mozak.demo", name: "Administración MOZAK (demo)", role: "ADMIN" },
  { id: "user-demo-creador", email: "organizador@mozak.demo", name: "Organizador de prueba (demo)", role: "CREATOR" },
] as const;

export function demoUsersPassword(env: NodeJS.ProcessEnv = process.env): string {
  const value = (env.DEMO_USERS_PASSWORD ?? "").trim();
  return value === "" ? DEFAULT_DEMO_PASSWORD : value;
}

/** ¿Hay que crear las cuentas de demostración en el modo mock? */
export function demoUsersEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = (env.ENABLE_DEMO_USERS ?? "").trim().toLowerCase();
  if (flag === "true") {
    return true;
  }
  if (flag === "false") {
    return false;
  }
  return env.NODE_ENV !== "production";
}

export async function buildDemoUsers(
  password: string = demoUsersPassword(),
  now: Date = new Date(),
): Promise<UserRecord[]> {
  const passwordHash = await hashPassword(password);
  return DEMO_USER_DEFINITIONS.map((definition) => ({
    ...definition,
    passwordHash,
    active: true,
    createdAt: now.toISOString(),
    lastLoginAt: null,
  }));
}
