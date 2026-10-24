-- Migración inicial de MOZAK (APT) — Etapa 11.
-- Escrita a mano a partir del "Modelo físico" del documento «Modelo de Datos».
-- Se aplica con `prisma migrate deploy` (npm run db:migrate).

-- Extensiones -----------------------------------------------------------
-- postgis : tipos y funciones geográficas (se usará en la búsqueda por
--           proximidad, HU-25; por ahora solo queda habilitada).
-- unaccent: búsqueda y filtro de comuna insensibles a tildes, igual que el
--           repositorio mock (normalize() de mock-event-repository.ts).
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "venue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "venue_latitude_chk" CHECK ("latitude" BETWEEN -90 AND 90),
    CONSTRAINT "venue_longitude_chk" CHECK ("longitude" BETWEEN -180 AND 180)
);

-- CreateTable
CREATE TABLE "source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "api_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "external_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "price" INTEGER NOT NULL,
    "is_free" BOOLEAN NOT NULL,
    "image_url" TEXT,
    "poster_image_url" TEXT,
    "video_url" TEXT,
    "source_url" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id"),
    -- Mismas reglas que eventSchema (src/lib/schemas.ts):
    CONSTRAINT "event_price_chk" CHECK (("is_free" AND "price" = 0) OR (NOT "is_free" AND "price" > 0)),
    CONSTRAINT "event_dates_chk" CHECK ("end_date" >= "start_date"),
    CONSTRAINT "event_poster_chk" CHECK ("poster_image_url" IS NULL OR "poster_image_url" ~ '^(/(?!/)|https?://)\S+$'),
    CONSTRAINT "event_video_chk" CHECK ("video_url" IS NULL OR "video_url" ~ '^(/(?!/)|https?://)\S+$')
);

-- CreateIndex
CREATE INDEX "event_category_idx" ON "event"("category_id");

-- CreateIndex
CREATE INDEX "event_venue_idx" ON "event"("venue_id");

-- CreateIndex
CREATE INDEX "event_source_idx" ON "event"("source_id");

-- CreateIndex
CREATE INDEX "event_dates_idx" ON "event"("start_date", "end_date");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
