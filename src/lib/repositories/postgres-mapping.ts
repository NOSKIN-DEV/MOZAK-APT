import type { Category, Source, Venue } from "@/types";
import type { EventWithRelations } from "./event-repository";

/**
 * Conversión entre el formato de la base de datos (Prisma) y el dominio.
 *
 * Funciones puras, sin dependencia de @prisma/client en tiempo de ejecución:
 * así se pueden probar sin base de datos (ver postgres-mapping.test.ts).
 *
 * Prisma devuelve las columnas DATE y TIME como objetos Date en UTC:
 *   - DATE "2026-10-03"  → 2026-10-03T00:00:00.000Z
 *   - TIME "19:30:00"    → 1970-01-01T19:30:00.000Z
 * Por eso todas las conversiones usan UTC, para no depender de la zona
 * horaria del servidor.
 */

/** "2026-10-03" → Date (UTC medianoche), para columnas DATE. */
export function toDbDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** "19:30" → Date (1970-01-01 UTC), para columnas TIME. */
export function toDbTime(time: string): Date {
  return new Date(`1970-01-01T${time}:00.000Z`);
}

/** Date de una columna DATE → "YYYY-MM-DD". */
export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Date de una columna TIME → "HH:mm". */
export function fromDbTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

/** Forma mínima de una fila de `event` con sus relaciones, tal como la devuelve Prisma con `include`. */
export interface EventRow {
  id: string;
  externalId: string | null;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  startTime: Date;
  endTime: Date;
  price: number;
  isFree: boolean;
  imageUrl: string | null;
  posterImageUrl: string | null;
  videoUrl: string | null;
  sourceUrl: string;
  category: Category;
  venue: Venue;
  source: Source;
}

/**
 * Copia solo los campos del dominio: así no se filtran columnas internas de
 * la base (por ejemplo `sortOrder` de Category) hacia la API.
 */
export function toCategory(row: Category): Category {
  return { id: row.id, name: row.name, description: row.description };
}

function toVenue(row: Venue): Venue {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    commune: row.commune,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

function toSource(row: Source): Source {
  return {
    id: row.id,
    name: row.name,
    organization: row.organization,
    type: row.type,
    url: row.url,
    apiUrl: row.apiUrl,
    active: row.active,
  };
}

export function toEventWithRelations(row: EventRow): EventWithRelations {
  return {
    id: row.id,
    externalId: row.externalId,
    title: row.title,
    description: row.description,
    startDate: fromDbDate(row.startDate),
    endDate: fromDbDate(row.endDate),
    startTime: fromDbTime(row.startTime),
    endTime: fromDbTime(row.endTime),
    price: row.price,
    isFree: row.isFree,
    imageUrl: row.imageUrl,
    posterImageUrl: row.posterImageUrl,
    videoUrl: row.videoUrl,
    sourceUrl: row.sourceUrl,
    category: toCategory(row.category),
    venue: toVenue(row.venue),
    source: toSource(row.source),
  };
}
