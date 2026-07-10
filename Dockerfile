# syntax=docker/dockerfile:1

# ---- Base image shared by all stages ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Dependencies stage ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build stage ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npx prisma generate

RUN npm run build

# ---- Migration stage ----
# Reuses the builder stage as-is: it already has devDependencies (including
# the prisma CLI, which the slimmed-down runtime image below deliberately
# omits), the schema, migrations, and prisma.config.ts.
FROM builder AS migrator
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- Production dependencies stage ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional && npm cache clean --force

# ---- Runtime stage ----
FROM base AS runner
ENV NODE_ENV=production
 
RUN apk add --no-cache dumb-init && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

COPY --chown=nestjs:nodejs package.json ./
COPY --chown=nestjs:nodejs docs ./docs

USER nestjs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/src/main.js"]
