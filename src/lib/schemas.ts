import { z } from "zod";
import { MAX_TEXT_LENGTH, codePointLength, hasControlChars } from "@/lib/sanitize";

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
});

export const venueSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  commune: z.string().min(1),
  city: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const sourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  organization: z.string().min(1),
  type: z.string().min(1),
  url: z.url(),
  apiUrl: z.url().nullable(),
  active: z.boolean(),
});

/**
 * Ruta de un recurso multimedia (afiche o video): o bien una ruta local
 * dentro de /public (empieza con "/", ej: "/media/posters/event-001.svg"),
 * o bien una URL absoluta http(s). No acepta valores vacíos ni rutas
 * relativas sin "/" inicial, que se romperían según la página que las use.
 */
const mediaUrl = z
  .string()
  .regex(/^(\/(?!\/)|https?:\/\/)\S+$/, "Debe ser una ruta local que empiece con '/' o una URL http(s)");

const isoDate = z.iso.date();
const isoTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida, formato esperado HH:mm");

export const eventSchema = z
  .object({
    id: z.string().min(1),
    externalId: z.string().nullable(),
    title: z.string().min(1),
    description: z.string().min(1),
    category: z.string().min(1),
    startDate: isoDate,
    endDate: isoDate,
    startTime: isoTime,
    endTime: isoTime,
    price: z.number().min(0),
    isFree: z.boolean(),
    imageUrl: z.url().nullable(),
    posterImageUrl: mediaUrl.nullable(),
    videoUrl: mediaUrl.nullable(),
    sourceUrl: z.url(),
    sourceId: z.string().min(1),
    venueId: z.string().min(1),
  })
  .refine((event) => (event.isFree ? event.price === 0 : event.price > 0), {
    message: "Un evento gratuito debe tener price = 0 y uno pagado price > 0",
    path: ["price"],
  })
  .refine((event) => event.endDate >= event.startDate, {
    message: "endDate no puede ser anterior a startDate",
    path: ["endDate"],
  });

/**
 * Formatos admitidos para los filtros de texto (Etapa 13, HU-23).
 *
 * - category: es un id (ej. "cat-ferias"), así que solo letras ASCII, dígitos
 *   y . _ : - (máximo 64).
 * - commune: nombre propio con tildes, eñes, espacios, apóstrofes o guiones
 *   (ej. "Ñuñoa", "Estación Central", "O'Higgins"); máximo 60 caracteres.
 * - search: texto libre; se admite cualquier carácter salvo los de control.
 */
const CATEGORY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
const COMMUNE_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\p{N} .'’-]{0,59}$/u;

/**
 * Filtros combinables de búsqueda de eventos (Etapa 5).
 * Se definen aquí desde ya porque la API interna (Etapa 3) y el
 * repositorio mock los usarán con la misma forma. La Etapa 13 les agrega
 * límites de largo y de formato (RNF-05); la limpieza previa (NFC, espacios)
 * la hace sanitizeText en src/lib/api/parse-event-query.ts.
 */
export const eventFiltersSchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .refine((value) => codePointLength(value) <= MAX_TEXT_LENGTH, {
      message: `Máximo ${MAX_TEXT_LENGTH} caracteres`,
    })
    .refine((value) => !hasControlChars(value), { message: "Contiene caracteres no permitidos" })
    .optional(),
  category: z.string().regex(CATEGORY_ID_PATTERN, "Formato de categoría inválido").optional(),
  commune: z.string().regex(COMMUNE_PATTERN, "Formato de comuna inválido").optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  isFree: z.boolean().optional(),
});

export type EventFilters = z.infer<typeof eventFiltersSchema>;

/**
 * Ordenamiento y paginación del listado (Etapa 13, HU-21 / HU-22).
 *
 * - sort: por fecha de inicio (luego hora de inicio e id, para que el orden
 *   sea siempre el mismo): "date_asc" = más próximos primero (por defecto),
 *   "date_desc" = más lejanos primero.
 * - page: página, desde 1. limit: eventos por página (por defecto 20,
 *   máximo 100: evita que una consulta sin límite devuelva miles de filas
 *   cuando la base crezca con la importación de fuentes externas).
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
/** Tope de page: mantiene el desplazamiento (offset) dentro de un entero de 32 bits. */
export const MAX_PAGE = 10_000;

export const eventSortSchema = z.enum(["date_asc", "date_desc"]);
export type EventSort = z.infer<typeof eventSortSchema>;

export const eventListOptionsSchema = z.object({
  sort: eventSortSchema.optional(),
  page: z.number().int().min(1).max(MAX_PAGE).optional(),
  limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});

export type EventListOptions = z.infer<typeof eventListOptionsSchema>;
