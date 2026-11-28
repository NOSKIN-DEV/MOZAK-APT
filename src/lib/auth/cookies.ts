import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "./session";

/** Lee una cookie de la cabecera `Cookie` de una petición. */
export function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) {
    return null;
  }
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) {
      continue;
    }
    if (part.slice(0, index).trim() === name) {
      const value = part.slice(index + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function readSessionCookie(request: Request): string | null {
  return readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
}

/**
 * Cookie de sesión: HttpOnly (el JavaScript de la página no puede leerla),
 * SameSite=Lax (el navegador no la envía en peticiones POST de otros sitios) y
 * Secure cuando la conexión es https.
 */
export function serializeSessionCookie(token: string, options: { secure: boolean }): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function serializeClearedSessionCookie(options: { secure: boolean }): string {
  const parts = [`${SESSION_COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/** true si la petición llegó por https (directo o detrás de un proxy como Vercel). */
export function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim().toLowerCase() === "https";
  }
  return new URL(request.url).protocol === "https:";
}
