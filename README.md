# Digital Twin Car Project

## 🚗 Description
Projet de jumeau numérique pour véhicules, comprenant :
- Frontend Next.js avec dashboard en temps réel
- Backend FastAPI avec MQTT
- Base de données Supabase
- Broker MQTT (Mosquitto)

## 📋 Prérequis
- Git
- Python 3.13+
- Node.js 18+
- Docker Desktop
- VS Code (recommandé)

## 🚀 Installation

### 1. Cloner le projet
```bash
git clone https://github.com/Herchan321/digital_twin_car.git
cd digital_twin_car
```

### 2. Configuration du Backend
```bash
cd digital_twin_logic/backend
python -m venv .venv
# Sur Windows :
.\.venv\Scripts\activate
# Sur Linux/Mac :
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configuration du Frontend
```bash
cd ../../digital-twin-car-dashboard
corepack enable  # Active pnpm
pnpm install
```

### 4. Configuration de l'environnement
Copier le fichier `.env.example` vers `.env` et remplir avec vos valeurs :
```env
SUPABASE_URL=votre_url_supabase
SUPABASE_KEY=votre_clé_supabase
SUPABASE_ANON_KEY=votre_clé_anonyme_supabase
MQTT_BROKER=localhost
MQTT_PORT=1883
```

### 5. Démarrage

#### Avec Docker (recommandé)
```bash
# Depuis la racine du projet
docker-compose up --build
```

#### Sans Docker (développement)
Dans des terminaux séparés :

Terminal 1 (Backend) :
```bash
cd digital_twin_logic/backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload
```

Terminal 2 (Frontend) :
```bash
cd digital-twin-car-dashboard
pnpm dev
```

## 📌 URLs
- Frontend : http://localhost:3000
- Backend API : http://localhost:8000
- API Documentation : http://localhost:8000/docs
- MQTT Broker : localhost:1883

## 🧪 Tests
```bash
# Tests Backend
cd digital_twin_logic/backend
python -m pytest tests/

# Tests Frontend
cd digital-twin-car-dashboard
pnpm test
```

## 📁 Structure du projet
```
digital_twin_car/
├── digital_twin_logic/          # Backend
│   ├── backend/                 # FastAPI
│   │   ├── app/
│   │   └── tests/
│   └── mosquitto/              # MQTT Broker
├── digital-twin-car-dashboard/  # Frontend
│   ├── app/
│   ├── components/
│   └── lib/
└── docker-compose.yml
```

## 🤝 Contribution
1. Créer une branche pour votre fonctionnalité
2. Commiter vos changements
3. Pousser sur la branche
4. Créer une Pull Request

## 📝 License
MIT