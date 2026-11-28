import { z } from "zod";
import { CATEGORY_ID_PATTERN, COMMUNE_PATTERN } from "@/lib/schemas";
import { codePointLength } from "@/lib/sanitize";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { REJECTION_REASONS, type RejectionReason } from "./content-policy";

/**
 * Validación de lo que escriben creadores y administradores (Etapa 15).
 *
 * Todo texto llega desde un formulario público-privado, así que se normaliza
 * (Unicode NFC, espacios) y se rechazan los caracteres de control, igual que
 * los filtros de la API pública (src/lib/sanitize.ts). Las direcciones web
 * aceptan SOLO http(s): una dirección "javascript:..." terminaría en un enlace
 * o un <img>/<video> de la página pública.
 */

export interface ValidationIssue {
  path: string;
  message: string;
}

export function zodIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

// Control (Cc) salvo el salto de línea.
const CONTROL_EXCEPT_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/;

function cleanInline(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

function cleanMultiline(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/gu, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function text(label: string, min: number, max: number, multiline = false) {
  return z
    .string({ error: `${label} es obligatorio` })
    .transform(multiline ? cleanMultiline : cleanInline)
    .pipe(
      z
        .string()
        .refine((value) => codePointLength(value) >= min, `${label} debe tener al menos ${min} caracteres`)
        .refine((value) => codePointLength(value) <= max, `${label} no puede superar ${max} caracteres`)
        .refine((value) => !CONTROL_EXCEPT_NEWLINE.test(value), `${label} contiene caracteres no permitidos`),
    );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
}

const httpUrl = z
  .string()
  .max(2000, "La dirección web no puede superar 2000 caracteres")
  .refine(isHttpUrl, "Debe ser una dirección web válida que empiece con http:// o https://");

const requiredHttpUrl = z
  .string({ error: "Este dato es obligatorio" })
  .transform((value) => value.trim())
  .pipe(httpUrl);

/** Dirección web opcional: vacío o ausente se guarda como null. */
const optionalHttpUrl = z
  .string()
  .nullish()
  .transform((value) => (value == null || value.trim() === "" ? null : value.trim()))
  .pipe(httpUrl.nullable());

const isoDate = z.iso.date("Fecha inválida, formato esperado AAAA-MM-DD");
const isoTime = z.string({ error: "Hora obligatoria" }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida, formato esperado HH:mm");

const newVenueSchema = z.object({
  name: text("El nombre del recinto", 2, 100),
  address: text("La dirección", 3, 150),
  commune: z
    .string({ error: "La comuna es obligatoria" })
    .transform(cleanInline)
    .pipe(z.string().regex(COMMUNE_PATTERN, "Comuna inválida")),
  city: text("La ciudad", 2, 60),
  latitude: z.number({ error: "La latitud debe ser un número" }).min(-90).max(90),
  longitude: z.number({ error: "La longitud debe ser un número" }).min(-180).max(180),
});

export type NewVenueInput = z.infer<typeof newVenueSchema>;

/**
 * Datos de un evento escritos por un creador. Se elige un recinto existente
 * (venueId) o se propone uno nuevo (newVenue), nunca ambos.
 */
export const creatorEventInputSchema = z
  .object({
    title: text("El título", 5, 120),
    description: text("La descripción", 20, 2000, true),
    categoryId: z.string({ error: "La categoría es obligatoria" }).regex(CATEGORY_ID_PATTERN, "Categoría inválida"),
    venueId: z.string().min(1).max(64).optional(),
    newVenue: newVenueSchema.optional(),
    startDate: isoDate,
    endDate: isoDate,
    startTime: isoTime,
    endTime: isoTime,
    price: z.number({ error: "El precio debe ser un número" }).int("El precio debe ser un número entero (pesos chilenos)").min(0).max(100_000_000),
    isFree: z.boolean({ error: "Indica si el evento es gratuito" }),
    imageUrl: optionalHttpUrl,
    posterImageUrl: optionalHttpUrl,
    videoUrl: optionalHttpUrl,
    sourceUrl: requiredHttpUrl,
  })
  .refine((input) => (input.venueId ? !input.newVenue : Boolean(input.newVenue)), {
    message: "Elige un recinto existente o ingresa uno nuevo (solo una de las dos opciones)",
    path: ["venueId"],
  })
  .refine((input) => (input.isFree ? input.price === 0 : input.price > 0), {
    message: "Un evento gratuito debe tener precio 0 y uno pagado, un precio mayor a 0",
    path: ["price"],
  })
  .refine((input) => input.endDate >= input.startDate, {
    message: "La fecha de término no puede ser anterior a la de inicio",
    path: ["endDate"],
  });

export type CreatorEventInput = z.infer<typeof creatorEventInputSchema>;

/** Declaración del creador al enviar el evento a revisión. */
export const submitInputSchema = z.object({
  acceptsContentPolicy: z.literal(true, {
    error: "Debes declarar que el evento cumple la política de contenido para enviarlo a revisión",
  }),
});

const confirmed = (message: string) => z.literal(true, { error: message });

/**
 * Condiciones que el administrador debe confirmar para aprobar. Las tres deben
 * ser true: si falta una, el evento no se publica.
 */
export const approveInputSchema = z.object({
  checklist: z.object(
    {
      noAdultContent: confirmed("Debes confirmar que el evento no incluye desnudos ni actos sexuales"),
      noDrugs: confirmed("Debes confirmar que el evento no incluye drogas ni tráfico de drogas"),
      noBlackMarket: confirmed("Debes confirmar que el evento no es mercado negro ni comercio ilícito"),
    },
    { error: "Debes confirmar la lista de condiciones de la norma" },
  ),
  note: z.string().max(500, "La nota no puede superar 500 caracteres").optional(),
});

const reasonIds = REJECTION_REASONS.map((reason) => reason.id) as [RejectionReason, ...RejectionReason[]];

/** Rechazo de un evento en revisión, o retiro de uno publicado: ambos exigen motivo y explicación. */
export const decisionInputSchema = z.object({
  reason: z.enum(reasonIds, { error: "Elige un motivo válido" }),
  note: text("La explicación", 10, 500),
});

export const loginInputSchema = z.object({
  email: z.string({ error: "El correo es obligatorio" }).trim().max(254).transform((value) => value.toLowerCase()),
  password: z.string({ error: "La contraseña es obligatoria" }).min(1).max(PASSWORD_MAX_LENGTH),
});

export const createUserInputSchema = z.object({
  name: text("El nombre", 2, 80),
  email: z
    .string({ error: "El correo es obligatorio" })
    .trim()
    .max(254)
    .pipe(z.email("Correo inválido"))
    .transform((value) => value.toLowerCase()),
  password: z
    .string({ error: "La contraseña es obligatoria" })
    .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .max(PASSWORD_MAX_LENGTH, `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres`),
});

export const setActiveInputSchema = z.object({
  active: z.boolean({ error: "Indica si la cuenta debe quedar activa" }),
});
