/**
 * Semilla de la base de datos (Etapa 11, ampliada en la Etapa 15).
 *
 * Carga en PostgreSQL los mismos datos de demostración que usa el repositorio
 * mock (src/data/*): 9 categorías, 3 fuentes, 12 recintos y 24 eventos. Así
 * `DATA_SOURCE=postgres` muestra exactamente lo mismo que `DATA_SOURCE=mock`.
 *
 * Etapa 15: los 24 eventos de demostración se cargan PUBLISHED (sin autor), se
 * crea la fuente común de los organizadores y, SOLO si se piden, las cuentas:
 *  - SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD (+ SEED_ADMIN_NAME): crea o
 *    actualiza el administrador. La contraseña viene de la variable de
 *    entorno, nunca está en el código ni se imprime.
 *  - SEED_DEMO_USERS=true: crea las cuentas de DEMOSTRACIÓN (contraseña pública,
 *    ver src/lib/auth/demo-users.ts). Solo para tu computador, jamás en un
 *    servidor accesible desde Internet.
 * Sin ninguna de las dos, no se crea ninguna cuenta.
 *
 * Es idempotente: usa upsert, por lo que se puede ejecutar varias veces sin
 * duplicar filas (y actualiza las existentes si cambian los datos mock).
 * Valida cada registro con Zod antes de tocar la base.
 *
 * Uso: npm run db:seed   (requiere DATABASE_URL y la migración aplicada)
 */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { categories, events, sources, venues } from "../src/data";
import { buildDemoUsers } from "../src/lib/auth/demo-users";
import { checkPasswordPolicy, hashPassword } from "../src/lib/auth/password";
import { ORGANIZER_SOURCE } from "../src/lib/moderation/organizer-source";
import { toDbDate, toDbTime } from "../src/lib/repositories/postgres-mapping";
import { categorySchema, eventSchema, sourceSchema, venueSchema } from "../src/lib/schemas";

const prisma = new PrismaClient();

async function main() {
  // 1) Validar antes de escribir: un dato inválido aborta sin dejar la base a medias.
  categories.forEach((item) => categorySchema.parse(item));
  venues.forEach((item) => venueSchema.parse(item));
  sources.forEach((item) => sourceSchema.parse(item));
  sourceSchema.parse(ORGANIZER_SOURCE);
  events.forEach((item) => eventSchema.parse(item));
  const admin = readAdminFromEnv();

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
    ...[...sources, ORGANIZER_SOURCE].map(({ id, ...data }) =>
      prisma.source.upsert({ where: { id }, create: { id, ...data }, update: data }),
    ),
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
      // El estado solo se fija al CREAR: volver a ejecutar la semilla no vuelve a
      // publicar un evento que un administrador haya retirado.
      return prisma.event.upsert({
        where: { id: event.id },
        create: { id: event.id, status: "PUBLISHED", ...data },
        update: data,
      });
    }),
  ]);

  // 3) Cuentas (solo si se pidieron).
  const accounts = await seedAccounts(admin);

  // 4) Confirmar lo que quedó en la base.
  const [categoryCount, sourceCount, venueCount, eventCount] = await Promise.all([
    prisma.category.count(),
    prisma.source.count(),
    prisma.venue.count(),
    prisma.event.count(),
  ]);
  console.log(
    `✅ Semilla aplicada: ${categoryCount} categorías, ${sourceCount} fuentes, ${venueCount} recintos, ${eventCount} eventos.`,
  );
  console.log(accounts);
}

interface AdminSeed {
  email: string;
  name: string;
  password: string;
}

/** Lee y valida el administrador pedido por variables de entorno (o null si no se pidió). */
function readAdminFromEnv(): AdminSeed | null {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  if (email === "" && password === "") {
    return null;
  }
  if (!z.email().safeParse(email).success) {
    throw new Error("SEED_ADMIN_EMAIL no es un correo válido.");
  }
  const check = checkPasswordPolicy(password);
  if (!check.ok) {
    throw new Error(`SEED_ADMIN_PASSWORD no es válida: ${check.message}`);
  }
  return { email, password, name: (process.env.SEED_ADMIN_NAME ?? "").trim() || "Administración MOZAK" };
}

/** Crea o actualiza las cuentas pedidas. Nunca imprime contraseñas. */
async function seedAccounts(admin: AdminSeed | null): Promise<string> {
  const lines: string[] = [];

  if (admin) {
    const passwordHash = await hashPassword(admin.password);
    await prisma.user.upsert({
      where: { email: admin.email },
      create: { id: `user-${randomUUID().replace(/-/g, "").slice(0, 12)}`, email: admin.email, name: admin.name, passwordHash, role: "ADMIN" },
      update: { name: admin.name, passwordHash, role: "ADMIN", active: true },
    });
    lines.push(`👤 Administrador listo: ${admin.email}`);
  }

  if ((process.env.SEED_DEMO_USERS ?? "").trim().toLowerCase() === "true") {
    for (const user of await buildDemoUsers()) {
      const { id, email, name, passwordHash, role } = user;
      await prisma.user.upsert({
        where: { id },
        create: { id, email, name, passwordHash, role },
        update: { email, name, passwordHash, role, active: true },
      });
      lines.push(`👤 Cuenta de DEMOSTRACIÓN lista: ${email} (${role}). Solo para uso local.`);
    }
  }

  if (lines.length === 0) {
    lines.push(
      "ℹ️  No se creó ninguna cuenta. Para tener un administrador define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD " +
        "(o SEED_DEMO_USERS=true para las cuentas de demostración locales) y vuelve a ejecutar la semilla.",
    );
  }
  return lines.join("\n");
}

main()
  .catch((error: unknown) => {
    console.error("❌ Error aplicando la semilla:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
