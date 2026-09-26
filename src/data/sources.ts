import type { Source } from "@/types";

/**
 * DATOS DE DEMOSTRACIÓN.
 *
 * Estas fuentes son completamente ficticias: no representan a ninguna
 * municipalidad, teatro, museo u organización real. Se usan solo para
 * poblar el prototipo y probar el modelo de datos. `apiUrl` es null en
 * todos los casos porque en esta etapa no se consulta ninguna API
 * externa real (ver sección 12 del documento de requisitos: eso se
 * implementará en una etapa futura, con conectores reales).
 */
export const sources: Source[] = [
  {
    id: "source-demo-cultura",
    name: "Portal Cultural Demo",
    organization: "Red de Espacios Culturales (datos ficticios)",
    type: "portal_cultural",
    url: "https://demo-portal-cultural.example.com",
    apiUrl: null,
    active: true,
  },
  {
    id: "source-demo-municipal",
    name: "Cartelera Municipal Demo",
    organization: "Asociación de Municipalidades Demo",
    type: "municipalidad",
    url: "https://demo-cartelera-municipal.example.com",
    apiUrl: null,
    active: true,
  },
  {
    id: "source-demo-deportes",
    name: "Agenda Deportiva Demo",
    organization: "Corporación Deportiva Demo",
    type: "organizacion_deportiva",
    url: "https://demo-agenda-deportiva.example.com",
    apiUrl: null,
    active: true,
  },
];
