/** Fecha de hoy (AAAA-MM-DD) en la zona horaria de Chile continental. */
export function todayInSantiago(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
