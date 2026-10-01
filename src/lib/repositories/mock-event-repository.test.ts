import { describe, expect, it } from "vitest";
import { MockEventRepository } from "./mock-event-repository";

/**
 * Épica APT-8 (Sprint 2) — pruebas de MockEventRepository.
 *
 * Los IDs y valores usados abajo corresponden a los 24 eventos reales de
 * src/data/events.ts (datos de demostración), no a fixtures inventados:
 * así las pruebas también detectan si alguien cambia los datos mock de
 * forma que rompa un escenario ya cubierto por el plan de pruebas oficial.
 */
describe("MockEventRepository", () => {
  const repo = new MockEventRepository();

  describe("findAll() sin filtros", () => {
    it("retorna los 24 eventos de demostración con sus relaciones resueltas", async () => {
      const result = await repo.findAll();
      expect(result).toHaveLength(24);
      const first = result[0]!;
      expect(first.category).toHaveProperty("name");
      expect(first.venue).toHaveProperty("commune");
      expect(first.source).toHaveProperty("name");
    });
  });

  // APT-82: búsqueda por texto libre (título, descripción, lugar, comuna)
  describe("filtro search", () => {
    it('"jazz" encuentra el evento cuyo título lo contiene', async () => {
      const result = await repo.findAll({ search: "jazz" });
      expect(result.map((e) => e.id)).toEqual(["event-002"]);
    });

    it("la búsqueda no distingue mayúsculas ni tildes", async () => {
      const result = await repo.findAll({ search: "JAZZ" });
      expect(result.map((e) => e.id)).toEqual(["event-002"]);
    });

    it('"providencia" encuentra eventos por el nombre de la comuna del venue, no solo por título', async () => {
      const result = await repo.findAll({ search: "providencia" });
      expect(result.map((e) => e.id).sort()).toEqual(["event-002", "event-017"]);
    });

    it("una búsqueda sin coincidencias retorna una lista vacía", async () => {
      const result = await repo.findAll({ search: "esteNoExisteEnNingunEvento" });
      expect(result).toEqual([]);
    });
  });

  // APT-83: filtro por categoría
  describe("filtro category", () => {
    it("retorna solo eventos de la categoría solicitada", async () => {
      const result = await repo.findAll({ category: "cat-exposiciones" });
      expect(result.map((e) => e.id).sort()).toEqual(["event-001", "event-011", "event-021"]);
      expect(result.every((e) => e.category.id === "cat-exposiciones")).toBe(true);
    });
  });

  // APT-84: filtro por comuna
  describe("filtro commune", () => {
    it("retorna solo eventos de la comuna solicitada", async () => {
      const result = await repo.findAll({ commune: "Las Condes" });
      expect(result.map((e) => e.id).sort()).toEqual(["event-001", "event-013"]);
    });

    it("la comparación de comuna no distingue mayúsculas ni tildes", async () => {
      const result = await repo.findAll({ commune: "las condes" });
      expect(result.map((e) => e.id).sort()).toEqual(["event-001", "event-013"]);
    });
  });

  // APT-86: filtro gratis/pagado
  describe("filtro isFree", () => {
    it("isFree=true retorna solo eventos con price=0", async () => {
      const result = await repo.findAll({ isFree: true });
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((e) => e.isFree === true && e.price === 0)).toBe(true);
    });

    it("isFree=false retorna solo eventos pagados", async () => {
      const result = await repo.findAll({ isFree: false });
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((e) => e.isFree === false && e.price > 0)).toBe(true);
    });

    it("isFree=true e isFree=false cubren entre ambos los 24 eventos", async () => {
      const free = await repo.findAll({ isFree: true });
      const paid = await repo.findAll({ isFree: false });
      expect(free.length + paid.length).toBe(24);
    });
  });

  // APT-85: filtro por fecha, incluyendo eventos multi-día
  describe("filtro de fecha (dateFrom/dateTo)", () => {
    it("un evento multi-día aparece si la ventana filtrada cae dentro de su rango", async () => {
      // event-001 dura del 2026-10-03 al 2026-10-20; esta ventana (17/10) está
      // contenida en el rango pero no coincide con el inicio ni el fin.
      const result = await repo.findAll({ dateFrom: "2026-10-17", dateTo: "2026-10-17" });
      expect(result.map((e) => e.id)).toEqual(["event-001"]);
    });

    it("un evento no aparece si termina antes del dateFrom solicitado", async () => {
      // event-001 empieza el 2026-10-03; una ventana totalmente anterior no debe incluirlo.
      const result = await repo.findAll({ dateFrom: "2026-10-01", dateTo: "2026-10-02" });
      expect(result.map((e) => e.id)).not.toContain("event-001");
    });

    it("un evento no aparece si empieza después del dateTo solicitado", async () => {
      const result = await repo.findAll({ dateTo: "2026-10-02" });
      expect(result.map((e) => e.id)).not.toContain("event-001");
    });
  });

  // APT-87: combinación de filtros (AND)
  describe("combinación de filtros", () => {
    it("category + isFree se combinan con AND", async () => {
      const result = await repo.findAll({ category: "cat-conciertos", isFree: true });
      expect(result.map((e) => e.id)).toEqual(["event-017"]);
    });

    it("una combinación sin eventos que cumplan todos los filtros retorna vacío", async () => {
      // Las 3 ferias del catálogo (event-004, event-009, event-016) son gratuitas,
      // así que pedir ferias pagadas no debe traer ningún resultado falso-positivo.
      const result = await repo.findAll({ category: "cat-ferias", isFree: false });
      expect(result).toEqual([]);
    });

    it("category + commune + isFree + search aplicados juntos exigen que TODOS se cumplan", async () => {
      const result = await repo.findAll({
        category: "cat-conciertos",
        commune: "Providencia",
        isFree: false,
        search: "jazz",
      });
      expect(result.map((e) => e.id)).toEqual(["event-002"]);
    });
  });

  // APT-88: consulta de detalle de evento (findById)
  describe("findById", () => {
    it("retorna el evento con sus relaciones resueltas cuando el id existe", async () => {
      const result = await repo.findById("event-002");
      expect(result).not.toBeNull();
      expect(result?.title).toBe("Concierto de jazz en el parque");
      expect(result?.venue.commune).toBe("Providencia");
      expect(result?.category.id).toBe("cat-conciertos");
    });

    it("retorna null cuando el id no existe", async () => {
      const result = await repo.findById("event-999");
      expect(result).toBeNull();
    });
  });

  describe("findAllCategories / findAllCommunes", () => {
    it("findAllCategories retorna las 9 categorías de demostración", async () => {
      const result = await repo.findAllCategories();
      expect(result).toHaveLength(9);
    });

    it("findAllCommunes retorna las comunas sin duplicados y ordenadas alfabéticamente (es)", async () => {
      const result = await repo.findAllCommunes();
      expect(result).toEqual([
        "Independencia",
        "La Florida",
        "La Reina",
        "Las Condes",
        "Maipú",
        "Ñuñoa",
        "Peñalolén",
        "Providencia",
        "Recoleta",
        "San Miguel",
        "Santiago",
        "Vitacura",
      ]);
    });
  });
});
