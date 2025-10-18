# Digital Twin Logic

Ce dossier contient la logique backend et le broker MQTT pour le projet Digital Twin Car.

## Structure
```
digital_twin_logic/
├── backend/           # API FastAPI
├── mosquitto/         # Broker MQTT
└── docker-compose.yml # Configuration Docker
```

## Configuration requise
- Python 3.13+
- Docker et Docker Compose
- Mosquitto MQTT Broker

## Installation

1. Configuration de l'environnement :
```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate  # Windows
pip install -r requirements.txt
```

2. Variables d'environnement :
Copier `.env.example` vers `.env` et configurer les variables.

3. Démarrage avec Docker :
```bash
docker-compose up -d
```

## Tests
```bash
cd backend
pytest tests/
```

## API Endpoints
- `GET /vehicles/` : Liste des véhicules
- `GET /vehicles/{id}` : Détails d'un véhicule
- `GET /analytics/telemetry/{id}` : Données télémétriques

## MQTT Topics
- `vehicle/+/telemetry` : Données télémétriques en temps réel
- `vehicle/+/status` : État des véhicules

## Sécurité
- Broker MQTT configuré pour le développement uniquement
- À configurer avec authentification pour la production