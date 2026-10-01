import { describe, expect, it } from "vitest";
import { formatEventDate, formatPrice } from "./format";

/**
 * Épica APT-8 (Sprint 2) — pruebas unitarias de funciones puras de
 * formateo, usadas por las tarjetas de evento y la página de detalle.
 */
describe("formatPrice", () => {
  it('devuelve "Gratis" para un evento gratuito, sin importar el valor de price', () => {
    expect(formatPrice(0, true)).toBe("Gratis");
    expect(formatPrice(5000, true)).toBe("Gratis");
  });

  it("formatea un precio pagado como CLP sin decimales", () => {
    const result = formatPrice(8000, false);
    expect(result).toMatch(/\$\s?8\.000/);
    expect(result).not.toMatch(/,/);
  });

  it("formatea un precio sin miles de forma simple", () => {
    const result = formatPrice(500, false);
    expect(result).toMatch(/\$\s?500/);
  });
});

describe("formatEventDate", () => {
  const dateFormatter = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" });

  it("formatea un evento de un solo día como una fecha única (sin rango)", () => {
    const expected = dateFormatter.format(new Date("2026-10-05T00:00:00"));
    expect(formatEventDate("2026-10-05", "2026-10-05")).toBe(expected);
  });

  it("formatea un evento multi-día como un rango separado por un guion largo", () => {
    const expectedStart = dateFormatter.format(new Date("2026-10-03T00:00:00"));
    const expectedEnd = dateFormatter.format(new Date("2026-10-20T00:00:00"));
    expect(formatEventDate("2026-10-03", "2026-10-20")).toBe(`${expectedStart} – ${expectedEnd}`);
  });
});
