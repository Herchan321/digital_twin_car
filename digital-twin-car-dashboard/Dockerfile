FROM node:18-alpine

WORKDIR /app

# Installation de pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copie des fichiers de configuration
COPY package.json pnpm-lock.yaml ./

# Installation des dépendances
RUN pnpm install --frozen-lockfile

# Copie du reste du code
COPY . .

# Build de l'application
RUN pnpm build

# Exposition du port
EXPOSE 3000

# Démarrage de l'application
CMD ["pnpm", "start"]