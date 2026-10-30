const priceFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatPrice(price: number, isFree: boolean): string {
  if (isFree) return "Gratis";
  return priceFormatter.format(price);
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
});

/**
 * Formatea una fecha o rango de fechas de un evento.
 * "2026-10-03" -> "3 oct"
 * "2026-10-03" a "2026-10-20" -> "3 oct – 20 oct"
 */
export function formatEventDate(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);

  if (startDate === endDate) {
    return dateFormatter.format(start);
  }

  const end = new Date(`${endDate}T00:00:00`);
  return `${dateFormatter.format(start)} – ${dateFormatter.format(end)}`;
}

/**
 * Resumen del listado paginado (Etapa 13).
 * total = 24, page = 1, pageSize = 12, shown = 12  ->  "Mostrando 1–12 de 24 eventos"
 * total = 1                                          ->  "1 evento encontrado"
 * Cuando todo cabe en una sola página se mantiene el texto de siempre
 * ("N eventos encontrados").
 */
export function formatResultsSummary(total: number, page: number, pageSize: number, shown: number): string {
  if (total <= pageSize || shown === 0) {
    return `${total} ${total === 1 ? "evento encontrado" : "eventos encontrados"}`;
  }
  const first = (page - 1) * pageSize + 1;
  const last = first + shown - 1;
  return `Mostrando ${first}–${last} de ${total} eventos`;
}
