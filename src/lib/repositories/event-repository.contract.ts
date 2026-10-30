import { expect, it, describe } from "vitest";
import type { EventRepository } from "./event-repository";

/**
 * Batería de pruebas de CONTRATO de EventRepository.
 *
 * Épica APT-8 (Sprint 2), generalizada en la Etapa 11: la misma batería se
 * ejecuta contra MockEventRepository (mock-event-repository.test.ts, siempre)
 * y contra PostgresEventRepository (postgres-event-repository.db.test.ts, con
 * `npm run test:db`, requiere la base de datos levantada y con la semilla).
 * Si ambas implementaciones la pasan, cambiar DATA_SOURCE no altera el
 * comportamiento visible de la API.
 *
 * Los IDs y valores usados abajo corresponden a los 24 eventos reales de
 * src/data/events.ts (datos de demostración), no a fixtures inventados:
 * así las pruebas también detectan si alguien cambia los datos mock de
 * forma que rompa un escenario ya cubierto por el plan de pruebas oficial.
 *
 * Este archivo no termina en ".test.ts" a propósito: Vitest no lo ejecuta
 * por sí solo, solo a través de los archivos que lo invocan.
 */
export function defineEventRepositoryContract(createRepository: () => EventRepository): void {
  const repo = createRepository();

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

    it('la búsqueda ignora tildes y eñes en ambos sentidos ("Ñuñoa" y "nunoa" dan lo mismo)', async () => {
      const withAccents = await repo.findAll({ search: "Ñuñoa" });
      const withoutAccents = await repo.findAll({ search: "nunoa" });
      expect(withAccents.length).toBeGreaterThan(0);
      expect(withoutAccents.map((e) => e.id)).toEqual(withAccents.map((e) => e.id));
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

    it('"nunoa" (sin tilde ni eñe, en minúsculas) encuentra los eventos de Ñuñoa', async () => {
      const result = await repo.findAll({ commune: "nunoa" });
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.venue.commune === "Ñuñoa")).toBe(true);
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

    it("incluye afiche y video (Etapa 10); videoUrl es null si el evento no tiene video", async () => {
      const withVideo = await repo.findById("event-002");
      expect(withVideo?.posterImageUrl).toBe("/media/posters/event-002.svg");
      expect(withVideo?.videoUrl).toBe("/media/videos/promo-a.mp4");

      const withoutVideo = await repo.findById("event-005");
      expect(withoutVideo?.posterImageUrl).toBe("/media/posters/event-005.svg");
      expect(withoutVideo?.videoUrl).toBeNull();
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

  // HU-21 / HU-22 (Etapa 13): orden por fecha (MTC_00110) y paginación (MTC_00190)
  describe("findPage: orden y paginación", () => {
    const ALL_IDS = Array.from({ length: 24 }, (_, i) => `event-${String(i + 1).padStart(3, "0")}`);

    it("sin opciones: orden date_asc, página 1 y 20 resultados de un total de 24", async () => {
      const page = await repo.findPage();
      expect(page.items).toHaveLength(20);
      expect(page.total).toBe(24);
      expect(page.page).toBe(1);
      expect(page.limit).toBe(20);
      expect(page.totalPages).toBe(2);
      expect(page.sort).toBe("date_asc");
      expect(page.items.map((e) => e.id)).toEqual(ALL_IDS.slice(0, 20));
    });

    it("date_asc deja los eventos de la fecha de inicio más próxima a la más lejana", async () => {
      const page = await repo.findPage({}, { sort: "date_asc", limit: 100 });
      const keys = page.items.map((e) => `${e.startDate} ${e.startTime}`);
      expect(keys).toEqual([...keys].sort());
      expect(page.items[0]?.id).toBe("event-001");
      expect(page.items[23]?.id).toBe("event-024");
    });

    it("date_desc es exactamente el orden inverso de date_asc", async () => {
      const asc = await repo.findPage({}, { sort: "date_asc", limit: 100 });
      const desc = await repo.findPage({}, { sort: "date_desc", limit: 100 });
      expect(desc.items.map((e) => e.id)).toEqual(asc.items.map((e) => e.id).reverse());
      expect(desc.sort).toBe("date_desc");
    });

    it("limit respeta el máximo pedido (MTC_00190: limit=20 con 24 eventos devuelve 20)", async () => {
      const page = await repo.findPage({}, { limit: 20 });
      expect(page.items).toHaveLength(20);
      expect(page.total).toBe(24);
    });

    it("page y limit seleccionan el tramo correcto (página 2 de 10 = event-011 a event-020)", async () => {
      const page = await repo.findPage({}, { page: 2, limit: 10 });
      expect(page.items.map((e) => e.id)).toEqual(ALL_IDS.slice(10, 20));
      expect(page.page).toBe(2);
      expect(page.totalPages).toBe(3);
    });

    it("la última página puede traer menos resultados que limit", async () => {
      const page = await repo.findPage({}, { page: 5, limit: 5 });
      expect(page.items.map((e) => e.id)).toEqual(ALL_IDS.slice(20, 24));
      expect(page.totalPages).toBe(5);
    });

    it("recorrer todas las páginas entrega cada evento una sola vez y en orden", async () => {
      const collected: string[] = [];
      for (let page = 1; page <= 5; page++) {
        const result = await repo.findPage({}, { page, limit: 5, sort: "date_desc" });
        collected.push(...result.items.map((e) => e.id));
      }
      expect(collected).toEqual([...ALL_IDS].reverse());
    });

    it("una página fuera de rango devuelve lista vacía pero conserva el total", async () => {
      const page = await repo.findPage({}, { page: 99, limit: 10 });
      expect(page.items).toEqual([]);
      expect(page.total).toBe(24);
      expect(page.totalPages).toBe(3);
    });

    it("el total y las páginas respetan los filtros (AND)", async () => {
      const free = await repo.findAll({ isFree: true });
      const page = await repo.findPage({ isFree: true }, { limit: 5 });
      expect(page.total).toBe(free.length);
      expect(page.totalPages).toBe(Math.ceil(free.length / 5));
      expect(page.items.every((e) => e.isFree)).toBe(true);
    });

    it("sin resultados: lista vacía, total 0 y 0 páginas", async () => {
      const page = await repo.findPage({ search: "zzzz-sin-coincidencias" });
      expect(page.items).toEqual([]);
      expect(page.total).toBe(0);
      expect(page.totalPages).toBe(0);
    });

    it("conserva las relaciones resueltas en cada elemento de la página", async () => {
      const page = await repo.findPage({}, { limit: 1 });
      const first = page.items[0]!;
      expect(first.category).toHaveProperty("name");
      expect(first.venue).toHaveProperty("commune");
      expect(first.source).toHaveProperty("name");
    });
  });

  // HU-23 (Etapa 13): MTC_00270 — entradas con caracteres especiales no rompen la consulta
  describe("textos con caracteres especiales (se tratan como texto literal)", () => {
    const hostile = [
      "'; DROP TABLE event; --",
      "\" OR 1=1 --",
      "teatro' OR '1'='1",
      "%",
      "_",
      "\\",
      "<script>alert(1)</script>",
      "${process.env.DATABASE_URL}",
    ];

    for (const text of hostile) {
      it(`search=${JSON.stringify(text)} no falla, no encuentra nada y no altera los datos`, async () => {
        const page = await repo.findPage({ search: text });
        expect(page.items).toEqual([]);
        expect(page.total).toBe(0);
        // Los datos siguen intactos después de la consulta.
        expect(await repo.findAll()).toHaveLength(24);
      });

      it(`commune=${JSON.stringify(text)} no falla ni encuentra nada`, async () => {
        const result = await repo.findAll({ commune: text });
        expect(result).toEqual([]);
      });
    }
  });
}
