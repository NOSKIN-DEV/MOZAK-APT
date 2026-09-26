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
