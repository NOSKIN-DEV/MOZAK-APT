/**
 * Evento de entretenimiento, cultura o recreación.
 *
 * Este es el modelo "normalizado" (tal como se guardaría en base de
 * datos): category, venueId y sourceId son referencias por id a las
 * entidades Category, Venue y Source respectivamente.
 *
 * Para mostrarlo en la interfaz o en la API pública se usa
 * `EventWithRelations` (ver src/lib/repositories/event-repository.ts),
 * que reemplaza esas referencias por los objetos completos.
 */
export interface Event {
  id: string;
  /** Id del evento en la fuente original. null si es un evento sin fuente externa (ej: dato 100% mock). */
  externalId: string | null;
  title: string;
  description: string;
  /** Referencia a Category.id */
  category: string;
  /** Fecha de inicio, formato ISO (YYYY-MM-DD) */
  startDate: string;
  /** Fecha de término, formato ISO (YYYY-MM-DD). Igual a startDate si el evento dura un solo día. */
  endDate: string;
  /** Hora de inicio, formato HH:mm (24h) */
  startTime: string;
  /** Hora de término, formato HH:mm (24h) */
  endTime: string;
  /** Precio en pesos chilenos (CLP). 0 si isFree es true. */
  price: number;
  isFree: boolean;
  imageUrl: string | null;
  /** URL a la publicación original del evento */
  sourceUrl: string;
  /** Referencia a Source.id */
  sourceId: string;
  /** Referencia a Venue.id */
  venueId: string;
}
