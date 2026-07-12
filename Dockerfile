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

# schema + migrations dentro do container
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/prisma ./node_modules/prisma

COPY --from=builder --chown=nestjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

COPY --chown=nestjs:nodejs package.json ./
COPY --chown=nestjs:nodejs docs ./docs

USER nestjs

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]