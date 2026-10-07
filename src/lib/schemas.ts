import { z } from "zod";

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
 * Filtros combinables de búsqueda de eventos (Etapa 5).
 * Se definen aquí desde ya porque la API interna (Etapa 3) y el
 * repositorio mock los usarán con la misma forma.
 */
export const eventFiltersSchema = z.object({
  search: z.string().trim().min(1).optional(),
  category: z.string().min(1).optional(),
  commune: z.string().min(1).optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  isFree: z.boolean().optional(),
});

export type EventFilters = z.infer<typeof eventFiltersSchema>;
