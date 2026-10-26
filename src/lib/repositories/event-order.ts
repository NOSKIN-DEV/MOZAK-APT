import type { EventSort } from "@/lib/schemas";

/** Lo mínimo que se necesita de un evento para ordenarlo cronológicamente. */
export interface Orderable {
  id: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
}

/**
 * Orden cronológico ascendente: fecha de inicio, luego hora de inicio y, para
 * que el resultado sea siempre el mismo ante empates, el id. Las fechas y
 * horas ISO se comparan como texto (YYYY-MM-DD y HH:mm ordenan igual que el
 * tiempo). PostgresEventRepository ordena por las mismas tres columnas.
 */
export function compareByDateAsc(a: Orderable, b: Orderable): number {
  if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
  if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

/** Devuelve una copia ordenada; "date_desc" es exactamente el inverso de "date_asc". */
export function sortEvents<T extends Orderable>(events: readonly T[], sort: EventSort): T[] {
  const ascending = [...events].sort(compareByDateAsc);
  return sort === "date_desc" ? ascending.reverse() : ascending;
}
