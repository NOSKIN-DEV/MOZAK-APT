import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Sesión (Etapa 15): una cookie con un token firmado (HMAC-SHA256).
 *
 * El token solo contiene quién es (sub), cuándo se emitió (iat) y cuándo vence
 * (exp). NO contiene el rol: el rol y el estado activo se leen de la base en
 * cada petición, así que desactivar una cuenta o cambiarle el rol tiene efecto
 * de inmediato aunque el token siga sin vencer.
 *
 * Formato: <payload base64url>.<firma base64url>
 */

export const SESSION_COOKIE_NAME = "mozak_session";
/** Duración de una sesión: 8 horas. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const MIN_SECRET_LENGTH = 32;

interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

function sign(data: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

export function createSessionToken(
  userId: string,
  secret: string,
  now: Date = new Date(),
  ttlSeconds: number = SESSION_TTL_SECONDS,
): string {
  const iat = Math.floor(now.getTime() / 1000);
  const payload: SessionPayload = { sub: userId, iat, exp: iat + ttlSeconds };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret).toString("base64url")}`;
}

/** Devuelve el id del usuario si el token es auténtico y no venció; si no, null. */
export function verifySessionToken(token: string, secret: string, now: Date = new Date()): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [body, signature] = parts as [string, string];

  const expected = sign(body, secret);
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number" || typeof payload.iat !== "number") {
      return null;
    }
    if (Math.floor(now.getTime() / 1000) >= payload.exp) {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

const EPHEMERAL_SECRET_KEY = Symbol.for("mozak.ephemeralSessionSecret");

/**
 * Secreto temporal del proceso, compartido por todas las copias de este módulo.
 *
 * Se guarda en globalThis (igual que el MemoryStore) porque Next.js carga este
 * módulo más de una vez en el mismo proceso: las páginas y las rutas de la API se
 * compilan por separado. Con una variable del módulo, cada copia tenía su propio
 * secreto y la sesión firmada al iniciar sesión no se reconocía en la pantalla
 * siguiente (error informado en la verificación del 28-11-2026).
 */
function ephemeralSecret(): string {
  const holder = globalThis as unknown as Record<symbol, string | undefined>;
  let secret = holder[EPHEMERAL_SECRET_KEY];
  if (!secret) {
    secret = randomBytes(32).toString("hex");
    holder[EPHEMERAL_SECRET_KEY] = secret;
    console.warn(
      "[auth] SESSION_SECRET no está definido: se usa un secreto temporal; las sesiones se perderán al reiniciar el servidor.",
    );
  }
  return secret;
}

/**
 * Secreto de firma de las sesiones, desde SESSION_SECRET (mínimo 32 caracteres).
 *
 * Si no está definido se usa uno aleatorio de este proceso: sirve para probar
 * en una sola máquina (las sesiones se pierden al reiniciar), pero NO sirve
 * donde hay varias instancias (por ejemplo Vercel): allí SESSION_SECRET es
 * obligatorio. El valor real va en una variable de entorno, nunca en el código.
 */
export function resolveSessionSecret(raw: string | undefined = process.env.SESSION_SECRET): string {
  const value = (raw ?? "").trim();
  if (value === "") {
    return ephemeralSecret();
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`SESSION_SECRET debe tener al menos ${MIN_SECRET_LENGTH} caracteres.`);
  }
  return value;
}
