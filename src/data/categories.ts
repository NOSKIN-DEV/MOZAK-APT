import type { Category } from "@/types";

/**
 * DATOS DE DEMOSTRACIÓN — no representan categorías oficiales de ninguna
 * institución real.
 */
export const categories: Category[] = [
  { id: "cat-exposiciones", name: "Exposiciones", description: "Muestras de arte, fotografía e historia." },
  { id: "cat-conciertos", name: "Conciertos", description: "Presentaciones musicales en vivo." },
  { id: "cat-teatro", name: "Teatro", description: "Obras de teatro y artes escénicas." },
  { id: "cat-ferias", name: "Ferias", description: "Ferias artesanales, gastronómicas y de emprendimiento." },
  { id: "cat-familia", name: "Actividades familiares", description: "Actividades pensadas para asistir en familia." },
  { id: "cat-cine", name: "Cine", description: "Funciones de cine, ciclos y muestras audiovisuales." },
  { id: "cat-municipal", name: "Actividades municipales", description: "Actividades organizadas por municipalidades." },
  { id: "cat-talleres", name: "Talleres", description: "Talleres formativos y creativos, abiertos a la comunidad." },
  { id: "cat-deporte", name: "Actividades deportivas", description: "Actividades y eventos deportivos abiertos al público." },
];
