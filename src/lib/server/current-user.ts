import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { toPublicUser } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import type { PublicUser, UserRole } from "@/types";
import { getServices } from "./container";

/** Usuario de la sesión actual en una página del servidor (o null). */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value ?? null;
  const user = await (await getServices()).auth.authenticate(token);
  return user ? toPublicUser(user) : null;
}

/** Ruta de inicio de cada perfil. */
export function homeFor(role: UserRole): string {
  return role === "ADMIN" ? "/admin" : "/creador";
}

/**
 * Para las páginas de un perfil: sin sesión lleva al inicio de sesión y con el
 * perfil equivocado, a la página que le corresponde. La API vuelve a comprobar
 * el permiso en cada petición: esto solo evita mostrar una pantalla inútil.
 */
export async function requirePageUser(role: UserRole): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/ingresar");
  }
  if (user.role !== role) {
    redirect(homeFor(user.role));
  }
  return user;
}
