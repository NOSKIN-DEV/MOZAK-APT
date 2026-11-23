import type { ValidationIssue } from "./schemas";

export type WorkflowErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "VALIDATION"
  | "CHECKLIST_INCOMPLETE"
  | "NOTE_REQUIRED"
  | "EMAIL_TAKEN";

/** Estado HTTP de cada error de negocio. */
export const WORKFLOW_ERROR_STATUS: Record<WorkflowErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_STATE: 409,
  VALIDATION: 400,
  CHECKLIST_INCOMPLETE: 422,
  NOTE_REQUIRED: 422,
  EMAIL_TAKEN: 409,
};

/** Error esperado del flujo de moderación o de la gestión de usuarios (no es un fallo del servidor). */
export class WorkflowError extends Error {
  constructor(
    readonly code: WorkflowErrorCode,
    message: string,
    readonly issues: ValidationIssue[] = [],
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}
