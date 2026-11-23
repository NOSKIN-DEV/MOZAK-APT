import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Contraseñas (Etapa 15).
 *
 * Se guarda únicamente un hash scrypt con sal aleatoria, nunca la contraseña.
 * scrypt viene incluido en Node (módulo node:crypto): no agrega dependencias.
 *
 * Formato: scrypt$<N>$<r>$<p>$<sal base64url>$<hash base64url>
 * Los parámetros viajan dentro del propio texto, de modo que se pueden subir en
 * el futuro sin invalidar los hashes antiguos.
 */

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// N = 2^14 (costo), r = 8, p = 1: valores recomendados para uso interactivo.
const DEFAULT_PARAMS = { N: 16384, r: 8, p: 1 } as const;
// Tope para los parámetros leídos de un hash: evita que un valor corrupto agote la memoria.
const MAX_N = 2 ** 20;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

function derive(password: string, salt: Buffer, params: { N: number; r: number; p: number }): Promise<Buffer> {
  const options: ScryptOptions = { N: params.N, r: params.r, p: params.p, maxmem: 256 * params.N * params.r };
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, options, (error, key) => {
      if (error) {
        reject(error);
      } else {
        resolve(key);
      }
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, DEFAULT_PARAMS);
  const { N, r, p } = DEFAULT_PARAMS;
  return ["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/**
 * Compara la contraseña con un hash guardado. Devuelve false (no lanza) si el
 * hash está mal formado, para que un registro dañado no tumbe el inicio de sesión.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }
  const [, nText, rText, pText, saltText, keyText] = parts as [string, string, string, string, string, string];
  const N = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0) || N > MAX_N || (N & (N - 1)) !== 0) {
    return false;
  }

  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(keyText, "base64url");
  if (salt.length === 0 || expected.length === 0) {
    return false;
  }

  try {
    const key = await derive(password, salt, { N, r, p });
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

export type PasswordCheck = { ok: true } | { ok: false; message: string };

/** Reglas mínimas para las contraseñas nuevas. */
export function checkPasswordPolicy(password: string): PasswordCheck {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, message: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.` };
  }
  if (password.trim().length === 0) {
    return { ok: false, message: "La contraseña no puede estar compuesta solo de espacios." };
  }
  return { ok: true };
}

/**
 * Hash "de señuelo" para igualar el tiempo de respuesta cuando el correo no
 * existe (así no se puede averiguar qué correos están registrados midiendo la
 * demora). Se calcula una sola vez.
 */
let decoy: Promise<string> | undefined;
export function decoyHash(): Promise<string> {
  decoy ??= hashPassword(randomBytes(16).toString("hex"));
  return decoy;
}
