/**
 * Sanitización de texto de entrada (Etapa 13, HU-23 / MTC_00270 / RNF-05).
 *
 * Zod valida la FORMA de los parámetros (tipos, fechas, enumeraciones); este
 * módulo agrega la limpieza que Zod no hace por sí solo y que importa más al
 * hablar con una base de datos real:
 *
 *  - Normaliza a Unicode NFC, de modo que "Ñuñoa" escrita con una "n" más una
 *    tilde combinada y la escrita con "ñ" precompuesta sean el mismo texto.
 *  - Colapsa cualquier secuencia de espacios, tabulaciones o saltos de línea
 *    en un único espacio y recorta los extremos.
 *  - RECHAZA (no recorta en silencio) los caracteres de control, en especial el
 *    byte nulo (U+0000): PostgreSQL no puede almacenarlo ni compararlo, así que
 *    una búsqueda con "%00" terminaría en un error 500 en vez de un 400 claro.
 *  - RECHAZA los textos que superan el largo máximo.
 *
 * Lo que NO hace, a propósito: no "escapa" comillas, signos de porcentaje ni
 * etiquetas HTML. La defensa contra inyección SQL son las consultas
 * parametrizadas (los valores nunca se concatenan al SQL) y contra XSS el
 * escape de React al pintar y el Content-Type JSON de la API; quitar o
 * deformar esos caracteres solo estropearía búsquedas legítimas (por ejemplo
 * "d'Orsay"). Ver docs/DOCUMENTACION-TECNICA.md, sección de sanitización.
 */

/** Largo máximo (en caracteres Unicode) de los parámetros de texto libre. */
export const MAX_TEXT_LENGTH = 100;

export type SanitizeResult =
  | { ok: true; value: string }
  | { ok: false; reason: "control-chars" | "too-long" };

/** Cantidad de caracteres Unicode (un emoji cuenta 1, no 2 como `.length`). */
export function codePointLength(value: string): number {
  return Array.from(value).length;
}

/** true si el texto contiene algún carácter de control (categoría Unicode Cc). */
export function hasControlChars(value: string): boolean {
  return /\p{Cc}/u.test(value);
}

export function sanitizeText(raw: string, maxLength: number = MAX_TEXT_LENGTH): SanitizeResult {
  const value = raw.normalize("NFC").replace(/\s+/gu, " ").trim();

  // Los saltos de línea y tabulaciones ya se convirtieron en espacios arriba;
  // lo que quede en la categoría Cc (NUL, ESC, DEL, etc.) no es texto legítimo.
  if (hasControlChars(value)) {
    return { ok: false, reason: "control-chars" };
  }
  if (codePointLength(value) > maxLength) {
    return { ok: false, reason: "too-long" };
  }
  return { ok: true, value };
}
