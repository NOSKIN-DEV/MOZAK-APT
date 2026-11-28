import { hasUsableCoordinates } from "./maps";

/**
 * Utilidades geográficas del mapa de eventos (Etapa 16).
 *
 * Son funciones puras, sin dependencias del navegador ni de la librería de mapas,
 * para poder probarlas con Vitest. La distancia es «en línea recta» (fórmula del
 * semiverseno), no la distancia por calles: sirve para ordenar lo que está cerca.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Centro por defecto del mapa (Plaza de Armas de Santiago) cuando no hay ubicación del usuario. */
export const SANTIAGO_CENTER: LatLng = { latitude: -33.4489, longitude: -70.6693 };

/** Radio medio de la Tierra en kilómetros. */
const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Distancia en línea recta entre dos puntos, en kilómetros. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const oneDecimal = new Intl.NumberFormat("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Distancia legible: «350 m» (redondeado a 10 m) bajo 1 km, «2,4 km» bajo 10 km
 * y «12 km» desde ahí. Una distancia no válida devuelve una cadena vacía.
 */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 1) {
    const meters = Math.max(10, Math.round((km * 1000) / 10) * 10);
    return meters >= 1000 ? "1,0 km" : `${meters} m`;
  }
  if (km < 10) return `${oneDecimal.format(km)} km`;
  return `${Math.round(km)} km`;
}

/** Un punto del mapa: un lugar con uno o más eventos. */
export interface PlaceGroup<T> {
  /** Coordenadas redondeadas a 5 decimales (~1 m): identifica el punto. */
  key: string;
  latitude: number;
  longitude: number;
  /** Nombre del lugar (el del primer evento del grupo). */
  name: string;
  items: T[];
}

export interface Place {
  name: string;
  latitude: number;
  longitude: number;
}

export function placeKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

/**
 * Agrupa los elementos por lugar: varios eventos en el mismo recinto (o en las
 * mismas coordenadas) quedan en un solo punto del mapa, para que no se tapen
 * unos a otros. Se omiten los que no tienen coordenadas utilizables. El orden
 * de los grupos y de los elementos sigue el orden de entrada.
 */
export function groupByPlace<T>(items: readonly T[], placeOf: (item: T) => Place): PlaceGroup<T>[] {
  const groups = new Map<string, PlaceGroup<T>>();
  for (const item of items) {
    const place = placeOf(item);
    if (!hasUsableCoordinates(place.latitude, place.longitude)) continue;
    const key = placeKey(place.latitude, place.longitude);
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, { key, latitude: place.latitude, longitude: place.longitude, name: place.name, items: [item] });
    }
  }
  return [...groups.values()];
}

/** El grupo más cercano al origen, o `null` si no hay grupos. */
export function nearestGroup<T>(groups: readonly PlaceGroup<T>[], origin: LatLng): PlaceGroup<T> | null {
  let best: PlaceGroup<T> | null = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const group of groups) {
    const km = distanceKm(origin, group);
    if (km < bestKm) {
      best = group;
      bestKm = km;
    }
  }
  return best;
}
