import { afterEach, describe, expect, it, vi } from "vitest";
import { createEventRepository, eventRepository, resolveDataSource } from "./factory";
import { MockEventRepository } from "./mock-event-repository";

/**
 * Etapa 11 — selección de la fuente de datos con DATA_SOURCE.
 */
describe("resolveDataSource", () => {
  it('sin valor o vacío usa "mock" (modo por defecto del prototipo)', () => {
    expect(resolveDataSource(undefined)).toBe("mock");
    expect(resolveDataSource("")).toBe("mock");
    expect(resolveDataSource("   ")).toBe("mock");
  });

  it("reconoce mock y postgres sin distinguir mayúsculas ni espacios", () => {
    expect(resolveDataSource("mock")).toBe("mock");
    expect(resolveDataSource(" MOCK ")).toBe("mock");
    expect(resolveDataSource("postgres")).toBe("postgres");
    expect(resolveDataSource("Postgres")).toBe("postgres");
  });

  it("un valor desconocido falla con un mensaje claro (no cae en mock en silencio)", () => {
    expect(() => resolveDataSource("mongo")).toThrow(/DATA_SOURCE inválido/);
  });
});

describe("createEventRepository", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('"mock" crea un MockEventRepository', async () => {
    expect(await createEventRepository("mock")).toBeInstanceOf(MockEventRepository);
  });

  it('"postgres" sin DATABASE_URL falla indicando la variable que falta', async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(createEventRepository("postgres")).rejects.toThrow(/DATABASE_URL/);
  });
});

describe("eventRepository (instancia de la aplicación)", () => {
  it("con DATA_SOURCE sin definir sirve los 24 eventos de demostración", async () => {
    vi.stubEnv("DATA_SOURCE", "");
    const result = await eventRepository.findAll();
    expect(result).toHaveLength(24);
    vi.unstubAllEnvs();
  });
});
