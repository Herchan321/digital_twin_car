# 🚀 Guide de Démarrage - WebSocket Implementation

## 📋 Prérequis

- Python 3.8+
- Node.js 18+
- pnpm
- Backend FastAPI configuré
- Broker MQTT accessible

---

## 🔧 Installation

### 1. Backend (Python)

```bash
cd digital_twin_logic/backend

# Installer les dépendances (si pas déjà fait)
pip install -r requirements.txt

# Dépendances WebSocket requises
pip install fastapi uvicorn websockets
```

### 2. Frontend (Next.js)

```bash
cd digital-twin-car-dashboard

# Installer les dépendances (si pas déjà fait)
pnpm install
```

---

## 🚀 Démarrage

### 1. Démarrer le Backend

```bash
cd digital_twin_logic/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Vérifications :**
- ✅ `🚀 Démarrage de l'application FastAPI...`
- ✅ `✅ Connecté au broker MQTT avec succès!`
- ✅ `📡 Abonné au topic: wican/#`
- ✅ `✅ Application FastAPI démarrée avec succès!`

**Accès :**
- API Docs : http://localhost:8000
- WebSocket : ws://localhost:8000/ws/telemetry
- Latest Data : http://localhost:8000/telemetry/latest

---

### 2. Démarrer le Frontend

```bash
cd digital-twin-car-dashboard
pnpm dev
```

**Accès :**
- Dashboard : http://localhost:3000/dashboard
- Analytics : http://localhost:3000/analytics

---

## 🧪 Tests

### Test 1 : Vérifier le Backend

```bash
# Tester l'endpoint REST
curl http://localhost:8000/telemetry/latest
```

**Résultat attendu :**
```json
{
  "state": "running",
  "data": {
    "vehicle_id": 1,
    "rpm": 2500,
    "vehicle_speed": 65.5,
    ...
  },
  "timestamp": "2025-11-27T16:04:47.234000"
}
```

---

### Test 2 : Tester le WebSocket (Python)

```bash
cd digital_twin_logic/backend
python test_websocket.py
```

**Résultat attendu :**
```
🧪 Test WebSocket - Digital Twin Car
🔌 Tentative de connexion au WebSocket...
✅ Connexion WebSocket établie !
📊 En attente des données...

📨 Message #1 reçu:
   Type: telemetry_update
   État: running
   Timestamp: 2025-11-27T16:04:47.234000
   📊 Données:
      🔧 RPM: 2500
      🚗 Vitesse: 65.5 km/h
      🌡️  Température: 87.3°C
      🔋 Batterie: 13.8V
```

---

### Test 3 : Tester depuis le Frontend

1. Ouvrir http://localhost:3000/dashboard
2. Ouvrir la console (F12)
3. Chercher :
   - `✅ WebSocket connecté`
   - `📊 Données reçues - État: running`

---

## 🔍 Vérification de l'État Offline

### Simuler une voiture éteinte

1. **Arrêter les messages MQTT** (arrêter l'ESP32 ou le simulateur)
2. **Attendre 10 secondes**
3. **Observer :**
   - Backend : `🔴 Voiture OFFLINE - Pas de message depuis 10.0s`
   - Frontend : Badge change de "Running" (vert) à "Offline" (gris)
   - KPIs : Affichent "Last value" en orange
   - Analytics : Message "⚠️ Vehicle offline"

---

## 📊 Monitoring en Temps Réel

### Backend (Logs)

```bash
# Logs à surveiller
✅ Connecté au broker MQTT avec succès!
📩 Message reçu sur wican/rpm: 2500
✓ Mise à jour: rpm = 2500
📡 Données diffusées via WebSocket - État: running

# Après 10s sans message
🔴 Voiture OFFLINE - Pas de message depuis 10.2s
```

---

### Frontend (Console)

```javascript
// Dashboard
✅ WebSocket connecté
📊 Données reçues - État: running { rpm: 2500, ... }

// Analytics
✅ WebSocket Analytics connecté
📊 Données reçues - État: running
```

---

## 🐛 Résolution de Problèmes

### Problème : WebSocket ne se connecte pas

**Solution :**
1. Vérifier que le backend est démarré
2. Vérifier l'URL : `ws://localhost:8000/ws/telemetry`
3. Vérifier CORS dans `main.py`

### Problème : Pas de données reçues

**Solution :**
1. Vérifier que MQTT est connecté (logs backend)
2. Vérifier que l'ESP32 envoie des messages
3. Tester avec `test_websocket.py`

### Problème : État reste "offline"

**Solution :**
1. Vérifier les messages MQTT arrivent
2. Vérifier les logs : `📩 Message reçu sur wican/...`
3. Vérifier le timestamp : doit être < 10s

### Problème : Affiche des zéros au lieu des dernières valeurs

**Solution :**
1. Vérifier que `last_saved_data` est rempli
2. Vérifier le code dans `mqtt_handler.py` ligne ~155
3. Forcer un message MQTT pour initialiser les données

---

## 📈 Flux de Travail Typique

### 1. Développement

```bash
# Terminal 1 : Backend
cd digital_twin_logic/backend
uvicorn app.main:app --reload

# Terminal 2 : Frontend  
cd digital-twin-car-dashboard
pnpm dev

# Terminal 3 : Logs/Tests
cd digital_twin_logic/backend
python test_websocket.py
```

### 2. Production

```bash
# Backend (avec Gunicorn pour multi-workers)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# Frontend (build)
pnpm build
pnpm start
```

---

## 🔒 Configuration Production

### Backend (main.py)

```python
# Modifier CORS pour production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://votre-domaine.com",
        "https://www.votre-domaine.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_WS_URL=wss://api.votre-domaine.com
```

---

## ✅ Checklist de Démarrage

- [ ] Backend démarré et MQTT connecté
- [ ] Frontend démarré
- [ ] WebSocket connecté (voir console)
- [ ] Données reçues en temps réel
- [ ] État "running" affiché
- [ ] KPIs mis à jour automatiquement
- [ ] Graphiques Analytics alimentés
- [ ] Test offline fonctionnel (10s)

---

## 📞 Support

**Logs Backend :**
```bash
tail -f backend.log
```

**Logs Frontend :**
- Console navigateur (F12)
- Network tab pour WebSocket

**Test rapide :**
```bash
# Backend
curl http://localhost:8000/health

# WebSocket
python test_websocket.py
```

---

## 🎉 C'est Prêt !

Votre système WebSocket est **opérationnel** ! 

Profitez des mises à jour en temps réel ! 🚗💨

---

**Dernière mise à jour :** 27 novembre 2025
