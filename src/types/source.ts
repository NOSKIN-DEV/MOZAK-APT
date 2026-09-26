/**
 * Fuente/organización desde donde se obtuvo la información de un evento.
 *
 * En el prototipo todas las fuentes son ficticias y están marcadas
 * explícitamente como datos de demostración (ver src/data/sources.ts).
 * En etapas futuras, "active" indicará si un conector/importador debe
 * consultar esa fuente automáticamente.
 */
export interface Source {
  id: string;
  name: string;
  organization: string;
  type: string;
  url: string;
  apiUrl: string | null;
  active: boolean;
}
