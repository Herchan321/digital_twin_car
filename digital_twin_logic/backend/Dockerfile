FROM python:3.13-slim

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

# Exposition du port
EXPOSE 8000

# Démarrage de l'application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]