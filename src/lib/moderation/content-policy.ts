/**
 * Política de contenido de MOZAK (Etapa 15).
 *
 * Define qué eventos NO se pueden publicar y ofrece una revisión automática
 * ORIENTATIVA para ayudar al administrador. Quien decide es siempre una
 * persona: el cribado automático solo levanta alertas, nunca aprueba ni
 * rechaza por sí solo.
 *
 * Eventos no permitidos (definidos por el equipo del proyecto):
 *  - ADULT_CONTENT: eventos para adultos donde existan desnudos o actos sexuales.
 *  - DRUGS: eventos con drogas o tráfico de drogas.
 *  - BLACK_MARKET: mercado negro y comercio ilícito (contrabando, mercadería
 *    robada, falsificaciones, tráfico de armas o de personas, etc.).
 *
 * La lista es extensible: agregar una categoría nueva es agregar un elemento a
 * CONTENT_CATEGORIES (y su casilla en MODERATION_CHECKLIST).
 *
 * Límites conocidos del cribado (se documentan también en docs/ROLES-Y-MODERACION.md):
 *  - Busca palabras clave en título y descripción, en español y sin distinguir
 *    mayúsculas ni tildes. No entiende contexto: "Charla de prevención de
 *    drogas" levanta alerta (falso positivo) y una redacción disfrazada puede
 *    no levantarla (falso negativo). Por eso la aprobación exige la
 *    confirmación explícita del administrador y no depende de este cribado.
 *  - No analiza imágenes, afiches ni videos.
 */

/** Versión de la política: queda registrada en cada decisión de moderación. */
export const CONTENT_POLICY_VERSION = "2026-11-v1";

export type ContentCategoryId = "ADULT_CONTENT" | "DRUGS" | "BLACK_MARKET";

export interface ContentCategory {
  id: ContentCategoryId;
  /** Nombre corto para mostrar. */
  label: string;
  /** Qué no se permite, en palabras simples (se muestra al creador y al administrador). */
  description: string;
  /** Patrones sobre texto ya normalizado (minúsculas, sin tildes). */
  patterns: readonly RegExp[];
}

/**
 * Los patrones se aplican sobre texto normalizado (ver normalizeForScreening).
 * Cada uno exige que la palabra empiece en un límite (no dentro de otra
 * palabra), de modo que "heterosexual" no coincide con "sexual" pero sí
 * "desnudos" con "desnud".
 */
const START = "(?<![a-z0-9])";

function words(...stems: string[]): RegExp {
  return new RegExp(`${START}(?:${stems.join("|")})[a-z0-9]*`, "g");
}

function phrases(...items: string[]): RegExp {
  return new RegExp(`${START}(?:${items.join("|")})(?![a-z0-9])`, "g");
}

export const CONTENT_CATEGORIES: readonly ContentCategory[] = [
  {
    id: "ADULT_CONTENT",
    label: "Contenido adulto",
    description: "Eventos donde existan desnudos o actos sexuales, o que sean exclusivamente para adultos por ese motivo.",
    patterns: [
      words("desnud", "nudis", "sexual", "sexo", "sexy", "porno", "erotic", "erotism", "orgia", "fetich", "prostitu", "swinger", "escort"),
      // "adultos mayores" (talleres y actividades para la tercera edad) NO es contenido adulto.
      phrases("strip ?tease", "table dance", "solo adultos(?! mayores)", "para adultos(?! mayores)", "mayores de 18", "\\+ ?18", "18 ?\\+", "xxx"),
    ],
  },
  {
    id: "DRUGS",
    label: "Drogas",
    description: "Eventos con consumo, venta o tráfico de drogas.",
    patterns: [
      words("drog", "cocain", "marihuana", "cannabis", "extasis", "heroin", "metanfetamin", "anfetamin", "ketamin", "fentanil", "estupefaciente", "alucinogen", "psilocib", "narco", "pasta base", "traficante"),
      phrases("mdma", "lsd", "poppers?"),
    ],
  },
  {
    id: "BLACK_MARKET",
    label: "Mercado negro",
    description: "Mercado negro y comercio ilícito: contrabando, mercadería robada, falsificaciones, tráfico de armas o de personas.",
    patterns: [
      phrases("mercado negro", "mercado ilegal", "venta ilegal", "comercio ilegal", "comercio ilicito", "contrabando", "lavado de dinero", "trata de personas", "venta de armas", "trafico de [a-z]+"),
      words("falsificad", "falsificacion", "robad", "ilicit"),
    ],
  },
];

/** Casillas que el administrador debe confirmar para aprobar un evento. */
export type ChecklistKey = "noAdultContent" | "noDrugs" | "noBlackMarket";

export interface ChecklistItem {
  key: ChecklistKey;
  category: ContentCategoryId;
  /** Texto de la casilla, redactado como afirmación que el administrador confirma. */
  label: string;
}

export const MODERATION_CHECKLIST: readonly ChecklistItem[] = [
  {
    key: "noAdultContent",
    category: "ADULT_CONTENT",
    label: "Confirmo que el evento no incluye desnudos ni actos sexuales.",
  },
  {
    key: "noDrugs",
    category: "DRUGS",
    label: "Confirmo que el evento no incluye drogas ni tráfico de drogas.",
  },
  {
    key: "noBlackMarket",
    category: "BLACK_MARKET",
    label: "Confirmo que el evento no es mercado negro ni comercio ilícito.",
  },
];

/** Motivos con los que un administrador puede rechazar o retirar un evento. */
export type RejectionReason = ContentCategoryId | "OTHER_NORM" | "INCOMPLETE_INFO";

export const REJECTION_REASONS: readonly { id: RejectionReason; label: string }[] = [
  { id: "ADULT_CONTENT", label: "Contenido adulto (desnudos o actos sexuales)" },
  { id: "DRUGS", label: "Drogas o tráfico de drogas" },
  { id: "BLACK_MARKET", label: "Mercado negro o comercio ilícito" },
  { id: "OTHER_NORM", label: "Otra infracción a la norma" },
  { id: "INCOMPLETE_INFO", label: "Información incompleta, errónea o engañosa" },
];

export function isRejectionReason(value: unknown): value is RejectionReason {
  return REJECTION_REASONS.some((reason) => reason.id === value);
}

export function rejectionReasonLabel(id: string): string {
  return REJECTION_REASONS.find((reason) => reason.id === id)?.label ?? id;
}

export function contentCategoryLabel(id: ContentCategoryId): string {
  return CONTENT_CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

/** Una alerta del cribado automático: qué categoría y qué palabra la activó. */
export interface ContentFlag {
  category: ContentCategoryId;
  term: string;
}

/** Minúsculas, sin tildes ni diacríticos y con espacios colapsados. */
export function normalizeForScreening(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Revisa título y descripción y devuelve las alertas encontradas (sin
 * repetir la misma categoría y palabra). Lista vacía = el cribado no vio nada;
 * NO significa que el evento sea aceptable.
 */
export function screenContent(fields: { title: string; description: string }): ContentFlag[] {
  const text = normalizeForScreening(`${fields.title} ${fields.description}`);
  const flags: ContentFlag[] = [];
  const seen = new Set<string>();

  for (const category of CONTENT_CATEGORIES) {
    for (const pattern of category.patterns) {
      for (const match of text.matchAll(pattern)) {
        const term = match[0].trim();
        const key = `${category.id}:${term}`;
        if (!seen.has(key)) {
          seen.add(key);
          flags.push({ category: category.id, term });
        }
      }
    }
  }

  return flags;
}

/** Categorías distintas presentes en una lista de alertas. */
export function flaggedCategories(flags: readonly ContentFlag[]): ContentCategoryId[] {
  return Array.from(new Set(flags.map((flag) => flag.category)));
}
