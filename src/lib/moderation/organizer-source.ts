import type { Source } from "@/types";

/**
 * Fuente común de los eventos que publican los creadores (Etapa 15).
 *
 * Todo evento necesita una Source (ver el modelo de datos). Los eventos creados
 * por organizadores registrados cuelgan de esta fuente fija; las fuentes
 * externas (ETL, HU-24) quedan fuera de esta etapa. No forma parte de
 * src/data/sources.ts a propósito: ese archivo son las 3 fuentes ficticias de
 * demostración que usan las pruebas del repositorio.
 *
 * La semilla (prisma/seed.ts) y el almacén en memoria (modo mock) la crean.
 */
export const ORGANIZER_SOURCE: Source = {
  id: "source-organizadores",
  name: "Organizadores registrados",
  organization: "Organizador registrado en MOZAK (publicado tras revisión de un administrador)",
  type: "organizador_registrado",
  url: "https://mozak.example.com/organizadores",
  apiUrl: null,
  active: true,
};
