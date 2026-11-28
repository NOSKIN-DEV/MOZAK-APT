-- Migración 0002 de MOZAK (APT) — Etapa 15: roles, creadores y moderación.
-- Escrita a mano, igual que 0001. Se aplica con `prisma migrate deploy`.
--
-- Qué cambia:
--   1. Tipos enumerados: rol de usuario, estado del evento y decisión de moderación.
--   2. Tabla app_user (administradores y creadores). El consumidor NO tiene cuenta.
--   3. event: estado de publicación, autor y fechas del flujo. Los eventos que ya
--      existían quedan PUBLISHED (no desaparece nada de la API pública); los
--      nuevos nacen DRAFT por defecto.
--   4. Tabla moderation_review: auditoría de cada decisión de un administrador.
--
-- Los eventos de creadores solo llegan a PUBLISHED con una fecha de revisión
-- (restricción event_published_reviewed_chk) y toda aprobación debe tener la
-- lista de condiciones confirmada (moderation_review_approved_chk): son la
-- última línea de defensa si algún código se salta el flujo de la aplicación.

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'CREATOR');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "review_decision" AS ENUM ('APPROVED', 'REJECTED', 'UNPUBLISHED');

-- CreateTable
CREATE TABLE "app_user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(3),

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "app_user_email_lower_chk" CHECK ("email" = lower("email"))
);

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- AlterTable: los eventos existentes quedan publicados; luego el valor por defecto pasa a DRAFT.
ALTER TABLE "event"
    ADD COLUMN "status" "event_status" NOT NULL DEFAULT 'PUBLISHED',
    ADD COLUMN "created_by_id" TEXT,
    ADD COLUMN "submitted_at" TIMESTAMPTZ(3),
    ADD COLUMN "reviewed_at" TIMESTAMPTZ(3),
    ADD COLUMN "content_policy_accepted_at" TIMESTAMPTZ(3),
    ADD COLUMN "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "event" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Un evento de un creador no puede estar publicado sin haber sido revisado.
ALTER TABLE "event"
    ADD CONSTRAINT "event_published_reviewed_chk"
    CHECK ("created_by_id" IS NULL OR "status" <> 'PUBLISHED' OR "reviewed_at" IS NOT NULL);

-- CreateIndex
CREATE INDEX "event_status_idx" ON "event"("status");

-- CreateIndex
CREATE INDEX "event_created_by_idx" ON "event"("created_by_id");

-- CreateTable
CREATE TABLE "moderation_review" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "decision" "review_decision" NOT NULL,
    "reason_category" TEXT,
    "note" TEXT,
    "flagged_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "checklist_confirmed" BOOLEAN NOT NULL,
    "policy_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_review_pkey" PRIMARY KEY ("id"),
    -- Toda aprobación exige la lista de condiciones de la norma confirmada.
    CONSTRAINT "moderation_review_approved_chk" CHECK ("decision" <> 'APPROVED' OR "checklist_confirmed")
);

-- CreateIndex
CREATE INDEX "moderation_review_event_idx" ON "moderation_review"("event_id");

-- CreateIndex
CREATE INDEX "moderation_review_reviewer_idx" ON "moderation_review"("reviewer_id");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_review" ADD CONSTRAINT "moderation_review_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_review" ADD CONSTRAINT "moderation_review_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
