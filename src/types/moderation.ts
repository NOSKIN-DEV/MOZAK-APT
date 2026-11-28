/**
 * Tipos de roles, usuarios y moderación de eventos (Etapa 15).
 *
 * El consumidor (quien busca qué hacer) NO tiene cuenta: sigue siendo una
 * plataforma de consulta anónima. Solo existen dos perfiles con sesión:
 *  - CREATOR (creador/organizador): prepara eventos y los envía a revisión.
 *  - ADMIN (administrador): es el único que puede aprobar la publicación.
 */
export type UserRole = "ADMIN" | "CREATOR";

export const USER_ROLES: readonly UserRole[] = ["ADMIN", "CREATOR"];

/**
 * Ciclo de vida de un evento:
 *
 *   DRAFT ──enviar──▶ PENDING_REVIEW ──aprobar (admin)──▶ PUBLISHED
 *     ▲                    │                                  │
 *     │                    └──rechazar (admin)──▶ REJECTED    │
 *     └────── retirar (creador) / corregir ◀──────────────────┘ (retirar → DRAFT)
 *
 * Solo los eventos PUBLISHED son visibles en la API pública.
 */
export type EventStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED";

export const EVENT_STATUSES: readonly EventStatus[] = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED"];

/** Decisión registrada en la auditoría de moderación. */
export type ReviewDecision = "APPROVED" | "REJECTED" | "UNPUBLISHED";

/** Usuario con sesión (administrador o creador), tal como se guarda. */
export interface UserRecord {
  id: string;
  /** Siempre en minúsculas. Es el identificador de acceso. */
  email: string;
  /** Nombre visible: persona u organización. */
  name: string;
  /** Hash scrypt de la contraseña (nunca la contraseña). Ver src/lib/auth/password.ts. */
  passwordHash: string;
  role: UserRole;
  active: boolean;
  /** Fecha ISO 8601 (UTC). */
  createdAt: string;
  lastLoginAt: string | null;
}

/** Usuario sin datos sensibles: lo único que sale por la API. */
export type PublicUser = Omit<UserRecord, "passwordHash">;
