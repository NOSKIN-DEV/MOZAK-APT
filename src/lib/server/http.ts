import { WORKFLOW_ERROR_STATUS, WorkflowError } from "@/lib/moderation/errors";

/**
 * Utilidades HTTP de las rutas de la Etapa 15 (login, creadores, administración).
 *
 * Trabajan con Request/Response estándar (no dependen de next/server), así que
 * las pruebas las ejecutan directamente.
 */

const MAX_BODY_BYTES = 64 * 1024;

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  // Las respuestas privadas (sesión, borradores, revisión) nunca deben quedar en una caché.
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function errorResponse(status: number, message: string, extra: Record<string, unknown> = {}): Response {
  return json({ error: message, ...extra }, status);
}

/** Convierte un error del flujo en su respuesta HTTP; cualquier otro error es un 500 sin detalles. */
export function failure(error: unknown): Response {
  if (error instanceof WorkflowError) {
    return errorResponse(WORKFLOW_ERROR_STATUS[error.code], error.message, {
      code: error.code,
      ...(error.issues.length > 0 ? { issues: error.issues } : {}),
    });
  }
  console.error("[api] error inesperado:", error);
  return errorResponse(500, "Error interno del servidor");
}

/**
 * Defensa contra CSRF para las peticiones que cambian datos: además de la
 * cookie SameSite=Lax, se rechaza la petición si el navegador declara que viene
 * de otro sitio (Sec-Fetch-Site) o si la cabecera Origin no es este mismo servidor.
 * Las llamadas sin Origin (curl, pruebas) se aceptan: no las hace un navegador.
 */
export function checkSameOrigin(request: Request): Response | null {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return errorResponse(403, "Petición de origen no permitido.", { code: "FORBIDDEN" });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (!host || originHost !== host) {
      return errorResponse(403, "Petición de origen no permitido.", { code: "FORBIDDEN" });
    }
  }
  return null;
}

export type BodyResult = { ok: true; body: unknown } | { ok: false; response: Response };

/** Lee un cuerpo JSON de hasta 64 KB. Un cuerpo vacío se lee como objeto vacío. */
export async function readJsonBody(request: Request): Promise<BodyResult> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, response: errorResponse(415, 'El contenido debe enviarse como "application/json".') };
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) {
    return { ok: false, response: errorResponse(413, "El contenido enviado es demasiado grande.") };
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return { ok: false, response: errorResponse(413, "El contenido enviado es demasiado grande.") };
  }
  if (text.trim() === "") {
    return { ok: true, body: {} };
  }
  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: errorResponse(400, "El contenido no es un JSON válido.") };
  }
}
