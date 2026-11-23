import type { EventStatus, ReviewDecision, UserRecord, UserRole } from "@/types";
import {
  CONTENT_CATEGORIES,
  isRejectionReason,
  type ContentCategoryId,
  type RejectionReason,
} from "@/lib/moderation/content-policy";
import type { ManagedEvent, ModerationReviewRecord } from "./management-repository";
import { toEventWithRelations, type EventRow } from "./postgres-mapping";

/**
 * Conversión entre las filas de PostgreSQL (Prisma) y el dominio de la Etapa 15.
 * Funciones puras, sin @prisma/client: se prueban sin base de datos
 * (postgres-management-mapping.test.ts).
 */

export interface UserRow {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface ReviewRow {
  id: string;
  eventId: string;
  reviewerId: string;
  decision: ReviewDecision;
  reasonCategory: string | null;
  note: string | null;
  flaggedCategories: string[];
  checklistConfirmed: boolean;
  policyVersion: string;
  createdAt: Date;
  reviewer?: { name: string } | null;
}

export interface ManagedEventRow extends EventRow {
  status: EventStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  contentPolicyAcceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; name: string; email: string } | null;
  /** La última decisión (la consulta pide solo una, la más reciente). */
  reviews: ReviewRow[];
}

const KNOWN_CATEGORIES = new Set<string>(CONTENT_CATEGORIES.map((category) => category.id));

const iso = (date: Date): string => date.toISOString();
const isoOrNull = (date: Date | null): string | null => (date ? date.toISOString() : null);

export function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    role: row.role,
    active: row.active,
    createdAt: iso(row.createdAt),
    lastLoginAt: isoOrNull(row.lastLoginAt),
  };
}

export function toReviewRecord(row: ReviewRow): ModerationReviewRecord {
  return {
    id: row.id,
    eventId: row.eventId,
    reviewerId: row.reviewerId,
    reviewerName: row.reviewer?.name ?? null,
    decision: row.decision,
    // Un valor desconocido (no debería existir) se muestra como "otra infracción", no rompe la pantalla.
    reasonCategory: row.reasonCategory === null ? null : isRejectionReason(row.reasonCategory) ? (row.reasonCategory as RejectionReason) : "OTHER_NORM",
    note: row.note,
    flaggedCategories: row.flaggedCategories.filter((category): category is ContentCategoryId => KNOWN_CATEGORIES.has(category)),
    checklistConfirmed: row.checklistConfirmed,
    policyVersion: row.policyVersion,
    createdAt: iso(row.createdAt),
  };
}

export function toManagedEvent(row: ManagedEventRow): ManagedEvent {
  const lastReview = row.reviews[0];
  return {
    ...toEventWithRelations(row),
    status: row.status,
    createdBy: row.createdBy ? { id: row.createdBy.id, name: row.createdBy.name, email: row.createdBy.email } : null,
    submittedAt: isoOrNull(row.submittedAt),
    reviewedAt: isoOrNull(row.reviewedAt),
    contentPolicyAcceptedAt: isoOrNull(row.contentPolicyAcceptedAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    lastReview: lastReview ? toReviewRecord(lastReview) : null,
  };
}

/** Prisma informa un correo repetido con el código P2002 (restricción única). */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}
