import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Regresión del 28-11-2026: sin SESSION_SECRET, la sesión se cerraba al pasar de
 * una pantalla del panel a otra porque cada copia del módulo (Next.js compila por
 * separado las páginas y las rutas de la API) generaba su propio secreto temporal.
 */
describe("secreto temporal de sesión (sin SESSION_SECRET)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("es el mismo aunque el módulo se cargue más de una vez en el proceso", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.resetModules();
    const first = await import("./session");
    vi.resetModules();
    const second = await import("./session");

    expect(second).not.toBe(first);
    expect(second.resolveSessionSecret("")).toBe(first.resolveSessionSecret(""));
  });

  it("una sesión firmada por una copia del módulo la reconoce otra copia", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.resetModules();
    const loginModule = await import("./session");
    vi.resetModules();
    const pageModule = await import("./session");

    const token = loginModule.createSessionToken("user-1", loginModule.resolveSessionSecret(""));
    expect(pageModule.verifySessionToken(token, pageModule.resolveSessionSecret(""))).toBe("user-1");
  });
});
