import { describe, expect, it } from "vitest";
import {
  CONTENT_CATEGORIES,
  MODERATION_CHECKLIST,
  flaggedCategories,
  isRejectionReason,
  normalizeForScreening,
  rejectionReasonLabel,
  screenContent,
} from "./content-policy";

const screen = (title: string, description = "Descripción sin nada especial.") => screenContent({ title, description });

describe("normalizeForScreening", () => {
  it("pasa a minúsculas, quita tildes y colapsa espacios", () => {
    expect(normalizeForScreening("  COCAÍNA   y  Éxtasis ")).toBe(" cocaina y extasis ");
  });
});

describe("screenContent: eventos permitidos no levantan alertas", () => {
  it("un evento cultural normal no tiene alertas", () => {
    expect(screen("Festival de teatro callejero", "Funciones gratuitas para toda la familia en la plaza.")).toEqual([]);
  });

  it('"heterosexual" o "asexual" no se confunden con "sexual" (la palabra debe empezar en un límite)', () => {
    expect(screen("Charla sobre diversidad", "Personas heterosexuales y asexuales conversan.")).toEqual([]);
  });

  it('"adultos mayores" (tercera edad) no es contenido adulto', () => {
    expect(screen("Taller de memoria para adultos mayores")).toEqual([]);
    expect(screen("Baile solo adultos mayores de la comuna")).toEqual([]);
  });

  it('no se activa por palabras parecidas ("sexta", "cocina")', () => {
    expect(screen("Sexta feria de cocina chilena")).toEqual([]);
  });
});

describe("screenContent: contenido adulto", () => {
  it("detecta desnudos, en cualquier forma y sin importar tildes o mayúsculas", () => {
    for (const text of ["Noche de DESNUDOS artísticos", "Sesión de desnudo", "playa nudista", "show de desnudez"]) {
      expect(flaggedCategories(screen(text))).toEqual(["ADULT_CONTENT"]);
    }
  });

  it("detecta actos sexuales, striptease y similares", () => {
    for (const text of ["Show de striptease", "Strip tease en vivo", "Table dance", "Fiesta swinger", "Espectáculo erótico", "Fiesta XXX"]) {
      expect(flaggedCategories(screen(text))).toContain("ADULT_CONTENT");
    }
  });

  it('detecta las marcas explícitas de "+18" y "solo adultos"', () => {
    for (const text of ["Fiesta +18", "Concierto 18+", "Solo adultos", "Mayores de 18 años"]) {
      expect(flaggedCategories(screen(text))).toEqual(["ADULT_CONTENT"]);
    }
  });

  it("busca también en la descripción, no solo en el título", () => {
    const flags = screen("Noche especial", "Habrá un show con desnudos.");
    expect(flags).toEqual([{ category: "ADULT_CONTENT", term: "desnudos" }]);
  });
});

describe("screenContent: drogas y su tráfico", () => {
  it("detecta drogas, sustancias y tráfico", () => {
    for (const text of [
      "Venta de drogas",
      "Fiesta con cocaína",
      "Se vende marihuana",
      "Pasta base gratis",
      "Éxtasis y MDMA",
      "Tráfico de drogas",
      "Fiesta con LSD",
    ]) {
      expect(flaggedCategories(screen(text))).toContain("DRUGS");
    }
  });

  it('"tráfico de drogas" levanta alerta en drogas y también en mercado negro', () => {
    expect(flaggedCategories(screen("Tráfico de drogas")).slice().sort()).toEqual(["BLACK_MARKET", "DRUGS"]);
  });

  it("es una alerta orientativa: una charla de prevención también la activa (falso positivo conocido)", () => {
    expect(flaggedCategories(screen("Charla de prevención de drogas en colegios"))).toEqual(["DRUGS"]);
  });
});

describe("screenContent: mercado negro", () => {
  it("detecta mercado negro y comercio ilícito", () => {
    for (const text of [
      "Mercado negro de entradas",
      "Contrabando de licores",
      "Mercadería robada a buen precio",
      "Relojes falsificados",
      "Venta de armas",
      "Trata de personas",
      "Lavado de dinero",
    ]) {
      expect(flaggedCategories(screen(text))).toContain("BLACK_MARKET");
    }
  });
});

describe("screenContent: resultado", () => {
  it("no repite la misma alerta aunque la palabra aparezca varias veces", () => {
    const flags = screen("Desnudos", "Más desnudos y más desnudos");
    expect(flags).toEqual([{ category: "ADULT_CONTENT", term: "desnudos" }]);
  });

  it("puede devolver alertas de varias categorías a la vez", () => {
    const categories = flaggedCategories(screen("Fiesta con desnudos y cocaína", "Contrabando incluido"));
    expect(categories.slice().sort()).toEqual(["ADULT_CONTENT", "BLACK_MARKET", "DRUGS"]);
  });
});

describe("política", () => {
  it("cada categoría de contenido tiene su casilla en la lista de confirmación del administrador", () => {
    for (const category of CONTENT_CATEGORIES) {
      expect(MODERATION_CHECKLIST.some((item) => item.category === category.id)).toBeTruthy();
    }
    expect(MODERATION_CHECKLIST).toHaveLength(CONTENT_CATEGORIES.length);
  });

  it("reconoce los motivos de rechazo válidos y rechaza los desconocidos", () => {
    expect(isRejectionReason("DRUGS")).toBe(true);
    expect(isRejectionReason("OTHER_NORM")).toBe(true);
    expect(isRejectionReason("INCOMPLETE_INFO")).toBe(true);
    expect(isRejectionReason("SPAM")).toBe(false);
    expect(isRejectionReason(undefined)).toBe(false);
  });

  it("da una etiqueta legible para cada motivo", () => {
    expect(rejectionReasonLabel("BLACK_MARKET")).toMatch(/mercado negro/i);
  });
});
