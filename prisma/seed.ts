/**
 * Semilla de la base de datos (Etapa 11).
 *
 * Carga en PostgreSQL los mismos datos de demostración que usa el repositorio
 * mock (src/data/*): 9 categorías, 3 fuentes, 12 recintos y 24 eventos. Así
 * `DATA_SOURCE=postgres` muestra exactamente lo mismo que `DATA_SOURCE=mock`.
 *
 * Es idempotente: usa upsert, por lo que se puede ejecutar varias veces sin
 * duplicar filas (y actualiza las existentes si cambian los datos mock).
 * Valida cada registro con Zod antes de tocar la base.
 *
 * Uso: npm run db:seed   (requiere DATABASE_URL y la migración aplicada)
 */
import { PrismaClient } from "@prisma/client";
import { categories, events, sources, venues } from "../src/data";
import { toDbDate, toDbTime } from "../src/lib/repositories/postgres-mapping";
import { categorySchema, eventSchema, sourceSchema, venueSchema } from "../src/lib/schemas";

const prisma = new PrismaClient();

async function main() {
  // 1) Validar antes de escribir: un dato inválido aborta sin dejar la base a medias.
  categories.forEach((item) => categorySchema.parse(item));
  venues.forEach((item) => venueSchema.parse(item));
  sources.forEach((item) => sourceSchema.parse(item));
  events.forEach((item) => eventSchema.parse(item));

  // 2) Escribir en orden de dependencias (las claves foráneas lo exigen), en una sola transacción.
  await prisma.$transaction([
    ...categories.map((category, index) => {
      const data = { name: category.name, description: category.description, sortOrder: index };
      return prisma.category.upsert({
        where: { id: category.id },
        create: { id: category.id, ...data },
        update: data,
      });
    }),
    ...sources.map(({ id, ...data }) => prisma.source.upsert({ where: { id }, create: { id, ...data }, update: data })),
    ...venues.map(({ id, ...data }) => prisma.venue.upsert({ where: { id }, create: { id, ...data }, update: data })),
    ...events.map((event) => {
      const data = {
        externalId: event.externalId,
        title: event.title,
        description: event.description,
        categoryId: event.category,
        startDate: toDbDate(event.startDate),
        endDate: toDbDate(event.endDate),
        startTime: toDbTime(event.startTime),
        endTime: toDbTime(event.endTime),
        price: event.price,
        isFree: event.isFree,
        imageUrl: event.imageUrl,
        posterImageUrl: event.posterImageUrl,
        videoUrl: event.videoUrl,
        sourceUrl: event.sourceUrl,
        sourceId: event.sourceId,
        venueId: event.venueId,
      };
      return prisma.event.upsert({ where: { id: event.id }, create: { id: event.id, ...data }, update: data });
    }),
  ]);

  // 3) Confirmar lo que quedó en la base.
  const [categoryCount, sourceCount, venueCount, eventCount] = await Promise.all([
    prisma.category.count(),
    prisma.source.count(),
    prisma.venue.count(),
    prisma.event.count(),
  ]);
  console.log(
    `✅ Semilla aplicada: ${categoryCount} categorías, ${sourceCount} fuentes, ${venueCount} recintos, ${eventCount} eventos.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("❌ Error aplicando la semilla:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
