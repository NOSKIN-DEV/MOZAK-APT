# Dockerfile multi-stage para MOZAK (APT) — Etapa 9, ampliado en la Etapa 11.
#
# Etapas, cada una con una sola responsabilidad:
#   0. base    → node:22-slim + OpenSSL (Prisma lo necesita; la imagen slim
#                no lo trae).
#   1. deps    → instala dependencias de Node y genera el cliente de Prisma
#                (capa cacheable: solo se repite si cambia package.json o
#                prisma/).
#   2. build   → compila la aplicación Next.js (npm run build).
#   3. tools   → imagen con el código completo y la CLI de Prisma; la usa el
#                servicio "migrate" de docker-compose.postgres.yml para
#                aplicar migraciones y la semilla. No es la imagen final.
#   4. runner  → imagen final, liviana: copia únicamente el servidor
#                standalone generado por Next.js (next.config.ts tiene
#                output: "standalone"), no todo node_modules.
#
# En modo mock (DATA_SOURCE=mock, por defecto) la imagen "app" es
# autosuficiente y no necesita base de datos. Con DATA_SOURCE=postgres se
# conecta a la base indicada en DATABASE_URL (ver docker-compose.postgres.yml).

ARG NODE_VERSION=22-slim

# ---------- 0. base ----------
FROM node:${NODE_VERSION} AS base
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---------- 1. deps ----------
FROM base AS deps
WORKDIR /app

# Se copia solo package.json (y el lockfile, si existe) para que esta capa
# se reutilice mientras no cambien las dependencias. prisma/ se copia aquí
# porque el script "postinstall" (prisma generate) necesita schema.prisma.
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install

# ---------- 2. build ----------
FROM base AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next build --webpack (ver package.json) genera .next/standalone y .next/static
RUN npm run build

# ---------- 3. tools (migraciones y semilla) ----------
FROM deps AS tools
WORKDIR /app
COPY . .
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed"]

# ---------- 4. runner ----------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario sin privilegios para no correr el servidor como root.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Activos estáticos públicos (src/public) y el servidor standalone.
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cliente de Prisma generado + su motor de consultas. El servidor standalone
# normalmente ya los incluye; copiarlos de forma explícita evita el error
# "could not locate the Query Engine" cuando DATA_SOURCE=postgres.
COPY --from=build --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

USER nextjs
EXPOSE 3000

# server.js es generado por Next.js dentro de .next/standalone; ya incluye
# su propio runtime de Node, no se necesita "next start".
CMD ["node", "server.js"]
