# Dockerfile multi-stage para MOZAK (APT) — Etapa 9.
#
# 3 etapas, cada una con una sola responsabilidad:
#   1. deps    → instala dependencias de Node (capa cacheable: solo se
#                vuelve a ejecutar si cambia package.json).
#   2. build   → compila la aplicación Next.js (npm run build).
#   3. runner  → imagen final, liviana: copia únicamente el servidor
#                standalone generado por Next.js (next.config.ts tiene
#                output: "standalone"), no todo node_modules.
#
# No requiere base de datos: el prototipo usa datos mock en memoria
# (MockEventRepository), así que la imagen "app" es autosuficiente.

ARG NODE_VERSION=22-slim

# ---------- 1. deps ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Se copia solo package.json (y el lockfile, si existe) para que esta capa
# se reutilice mientras no cambien las dependencias.
COPY package.json package-lock.json* ./
RUN npm install

# ---------- 2. build ----------
FROM node:${NODE_VERSION} AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next build --webpack (ver package.json) genera .next/standalone y .next/static
RUN npm run build

# ---------- 3. runner ----------
FROM node:${NODE_VERSION} AS runner
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

USER nextjs
EXPOSE 3000

# server.js es generado por Next.js dentro de .next/standalone; ya incluye
# su propio runtime de Node, no se necesita "next start".
CMD ["node", "server.js"]
