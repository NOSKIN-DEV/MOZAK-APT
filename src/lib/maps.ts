/**
 * Enlace a Google Maps para un evento (Etapa 14, HU-28 / MA-47).
 *
 * Usa el formato oficial de «Maps URLs» (`/maps/search/?api=1&query=...`), que
 * NO requiere clave de API ni cuenta de facturación: es solo un enlace que el
 * navegador (o la app de Google Maps, en el teléfono) abre por su cuenta.
 * El mapa embebido de Google, en cambio, sí exige una clave; por eso el mapa
 * incrustado en la página sigue siendo el de OpenStreetMap y este enlace lo
 * complementa.
 *
 * Reglas (criterios de aceptación de MA-47):
 *  1. Si hay coordenadas válidas, se usan (`query=<lat>,<lng>`).
 *  2. Si no, se usa la dirección (`dirección, comuna, Chile`) codificada.
 *  3. Si no hay ninguna de las dos, devuelve `null` y la pantalla no muestra
 *     el enlace.
 */

export interface MapsLocation {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  commune?: string | null;
}

const GOOGLE_MAPS_SEARCH_URL = "https://www.google.com/maps/search/?api=1&query=";

/** Caracteres de control (incluido el byte nulo): se reemplazan por un espacio. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/**
 * Coordenadas utilizables: números finitos dentro de rango. El punto (0, 0)
 * («Null Island») se trata como dato ausente: en la práctica es el valor que
 * dejan las fuentes con la ubicación vacía, y llevaría al usuario al océano.
 */
export function hasUsableCoordinates(latitude?: number | null, longitude?: number | null): boolean {
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return false;
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

/** Hasta 6 decimales (~11 cm) y sin notación científica, que Google Maps no entiende. */
function formatCoordinate(value: number): string {
  return String(Number(value.toFixed(6)));
}

function cleanText(value?: string | null): string {
  return (value ?? "").replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
}

/** Texto de dirección para buscar: «dirección, comuna, Chile»; vacío si no hay dirección. */
export function buildAddressQuery(address?: string | null, commune?: string | null): string {
  const street = cleanText(address);
  if (!street) return "";
  const parts = [street];
  const area = cleanText(commune);
  if (area) parts.push(area);
  parts.push("Chile");
  return parts.join(", ");
}

/** URL de Google Maps para el lugar, o `null` si no hay coordenadas ni dirección. */
export function buildGoogleMapsUrl(location: MapsLocation): string | null {
  if (hasUsableCoordinates(location.latitude, location.longitude)) {
    const lat = formatCoordinate(location.latitude as number);
    const lng = formatCoordinate(location.longitude as number);
    // La coma que separa latitud y longitud se deja sin codificar, como en la documentación oficial.
    return `${GOOGLE_MAPS_SEARCH_URL}${lat},${lng}`;
  }

  const query = buildAddressQuery(location.address, location.commune);
  if (!query) return null;
  return `${GOOGLE_MAPS_SEARCH_URL}${encodeURIComponent(query)}`;
}
