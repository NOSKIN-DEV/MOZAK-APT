import type { EventFilters } from "@/lib/schemas";

/**
 * Filtros de texto (búsqueda libre y comuna) para PostgreSQL.
 *
 * Prisma no ofrece comparaciones insensibles a tildes, y el repositorio mock
 * sí las tiene (normalize(): minúsculas + sin tildes). Para mantener el mismo
 * comportamiento se usa la extensión `unaccent` de PostgreSQL con una consulta
 * SQL parametrizada que devuelve solo los ids de los eventos que cumplen.
 * El resto de los filtros (categoría, gratis, fechas) los resuelve Prisma
 * con consultas tipadas.
 *
 * Seguridad: el texto SQL se arma únicamente con fragmentos constantes; los
 * valores del usuario viajan siempre aparte, como parámetros ($1, $2...).
 */

export interface TextFilterQuery {
  text: string;
  values: string[];
}

/**
 * Devuelve la consulta de ids para los filtros de texto, o null si no se
 * pidió ni búsqueda ni comuna (en ese caso no hace falta consultar).
 */
export function buildTextFilterQuery(filters: Pick<EventFilters, "search" | "commune">): TextFilterQuery | null {
  const conditions: string[] = [];
  const values: string[] = [];

  if (filters.search) {
    values.push(filters.search);
    // Mismo "pajar" que el mock: título + descripción + lugar + comuna.
    // strpos() busca el texto literal (no interpreta % ni _ como comodines).
    conditions.push(
      `strpos(lower(unaccent(concat_ws(' ', e."title", e."description", v."name", v."commune"))), lower(unaccent($${values.length}))) > 0`,
    );
  }

  if (filters.commune) {
    values.push(filters.commune);
    conditions.push(`lower(unaccent(v."commune")) = lower(unaccent($${values.length}))`);
  }

  if (conditions.length === 0) {
    return null;
  }

  return {
    text: `SELECT e."id" FROM "event" e JOIN "venue" v ON v."id" = e."venue_id" WHERE ${conditions.join(" AND ")}`,
    values,
  };
}
