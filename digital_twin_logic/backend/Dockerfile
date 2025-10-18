FROM python:3.13-slim AS builder

WORKDIR /app

# Installation des dépendances système nécessaires
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copie des fichiers de dépendances
COPY requirements.txt .

# Installation des dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copie du reste du code
COPY app/ app/
COPY pyproject.toml .

# Production stage
FROM python:3.13-slim

WORKDIR /app

# Créer un utilisateur non-root et préparer les permissions
RUN useradd -m -r -s /bin/bash appuser && \
    mkdir -p /app && \
    chown appuser:appuser /app

# Copier les fichiers avec les bonnes permissions
COPY --from=builder --chown=appuser:appuser /usr/local/lib/python3.13/site-packages/ /usr/local/lib/python3.13/site-packages/
COPY --from=builder --chown=appuser:appuser /app/app/ ./app/
COPY --from=builder --chown=appuser:appuser /app/pyproject.toml .

# Utiliser l'utilisateur non-root
USER appuser

# Exposition du port
EXPOSE 8000

# Démarrage de l'application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]