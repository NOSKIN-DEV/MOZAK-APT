import { toApiEvent, type ApiEvent } from "@/lib/api/serializers";
import { rejectionReasonLabel } from "@/lib/moderation/content-policy";
import type { ManagedEvent, ModerationReviewRecord } from "@/lib/repositories/management-repository";
import type { EventStatus, ReviewDecision } from "@/types";

/** Quién consulta: el creador ve lo que decidieron sobre SU evento; el administrador ve además la auditoría. */
export type Audience = "creator" | "admin";

export interface ApiReview {
  id: string;
  decision: ReviewDecision;
  reasonCategory: string | null;
  reasonLabel: string | null;
  note: string | null;
  createdAt: string;
  /** Solo para el administrador. */
  reviewerName?: string | null;
  flaggedCategories?: string[];
  checklistConfirmed?: boolean;
  policyVersion?: string;
}

export interface ApiManagedEvent extends ApiEvent {
  status: EventStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  contentPolicyAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastReview: ApiReview | null;
  /** Solo para el administrador: quién creó el evento (null = evento de demostración). */
  createdBy?: { id: string; name: string; email: string } | null;
}

export function toApiReview(review: ModerationReviewRecord, audience: Audience): ApiReview {
  const base: ApiReview = {
    id: review.id,
    decision: review.decision,
    reasonCategory: review.reasonCategory,
    reasonLabel: review.reasonCategory ? rejectionReasonLabel(review.reasonCategory) : null,
    note: review.note,
    createdAt: review.createdAt,
  };
  if (audience === "admin") {
    return {
      ...base,
      reviewerName: review.reviewerName,
      flaggedCategories: review.flaggedCategories,
      checklistConfirmed: review.checklistConfirmed,
      policyVersion: review.policyVersion,
    };
  }
  return base;
}

export function toApiManagedEvent(event: ManagedEvent, audience: Audience): ApiManagedEvent {
  const base: ApiManagedEvent = {
    ...toApiEvent(event),
    status: event.status,
    submittedAt: event.submittedAt,
    reviewedAt: event.reviewedAt,
    contentPolicyAcceptedAt: event.contentPolicyAcceptedAt,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    lastReview: event.lastReview ? toApiReview(event.lastReview, audience) : null,
  };
  return audience === "admin" ? { ...base, createdBy: event.createdBy } : base;
}
