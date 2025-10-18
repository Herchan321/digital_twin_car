# Build stage
FROM cgr.dev/chainguard/node:latest-dev AS deps

WORKDIR /app

# Installation de pnpm
RUN npm install -g pnpm@latest

# Copie des fichiers de configuration
COPY package.json pnpm-lock.yaml ./

# Installation des dépendances
RUN pnpm install --frozen-lockfile --prod

# Build stage
FROM cgr.dev/chainguard/node:latest-dev AS builder

WORKDIR /app

# Copie des node_modules et du code source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build de l'application
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm build

# Production stage
FROM gcr.io/distroless/nodejs20:nonroot AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copie des fichiers nécessaires depuis le build stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Configuration de sécurité
USER nextjs

# Exposition du port
EXPOSE 3000

ENV PORT 3000

# Démarrage de l'application
CMD ["node", "server.js"]