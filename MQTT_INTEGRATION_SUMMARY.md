# 🎯 Résumé de l'intégration MQTT - Digital Twin Car

## ✅ Ce qui a été fait

### 1. **Fichier `mqtt_handler.py` créé**
   - Chemin: `digital_twin_logic/backend/app/mqtt_handler.py`
   - Fonctions:
     - `start_mqtt_client()`: Démarre le client MQTT
     - `stop_mqtt_client()`: Arrête le client MQTT
     - `on_connect()`: Callback de connexion au broker
     - `on_message()`: Callback de réception des messages
     - `save_to_database()`: Enregistre les données dans Supabase

### 2. **Fichier `main.py` modifié**
   - Import du handler MQTT
   - Événement `startup`: Démarre le client MQTT au démarrage de FastAPI
   - Événement `shutdown`: Arrête proprement le client MQTT
   - Endpoint `/health`: Vérification de l'état du serveur

### 3. **Configuration**
   - Broker MQTT: `109.123.243.44:1883`
   - Username: `chaari`
   - Password: `chaari2023`
   - Topics écoutés:
     - `DIGITALTWIN/temperature`
     - `DIGITALTWIN/humidity`

## 🔄 Flux de données

```
ESP32 (DHT11)
    ↓ Publie sur MQTT
MQTT Broker (109.123.243.44)
    ↓ Souscription
FastAPI (mqtt_handler.py)
    ↓ Traitement
Supabase (table telemetry)
    ↓ Lecture
Dashboard Next.js
```

## 📝 Structure des données stockées

```json
{
  "vehicle_id": 1,
  "latitude": 31.6346,
  "longitude": -8.0027,
  "speed_kmh": 0.0,
  "battery_pct": 100.0,
  "temperature": 24.5,  // ← Valeur du DHT11
  "rpm": 0.0,
  "recorded_at": "2025-11-07T18:30:00Z"
}
```

## 🚀 Comment démarrer

### 1. Installer les dépendances

```bash
cd digital_twin_car/digital_twin_logic/backend
pip install -r requirements.txt
```

### 2. Démarrer le serveur FastAPI

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Vérifier les logs

Vous devriez voir:
```
✅ Connecté au broker MQTT avec succès!
📡 Abonné au topic: DIGITALTWIN/temperature
📡 Abonné au topic: DIGITALTWIN/humidity
```

### 4. Lancer votre ESP32

Le code Arduino que vous avez fourni va automatiquement:
1. Se connecter au WiFi
2. Se connecter au broker MQTT
3. Publier les données du DHT11 toutes les 5 secondes

### 5. Vérifier les données

Les logs afficheront:
```
📩 Message reçu sur DIGITALTWIN/temperature: 24.50
📩 Message reçu sur DIGITALTWIN/humidity: 65.20
✅ Données sauvegardées dans la BDD:
   🌡️  Température: 24.5°C
   💧 Humidité: 65.2%
   🚗 Vehicle ID: 1
```

## 🔧 Personnalisation

### Changer l'ID du véhicule

Dans `mqtt_handler.py`, ligne 24:
```python
"vehicle_id": 1,  # Changez ici
```

### Ajouter d'autres topics MQTT

Dans `mqtt_handler.py`, lignes 16-19:
```python
MQTT_TOPICS = [
    "DIGITALTWIN/temperature",
    "DIGITALTWIN/humidity",
    "DIGITALTWIN/speed",  # Nouveau topic
]
```

Puis modifiez `on_message()` pour traiter le nouveau topic.

## 📊 Visualisation

Une fois les données stockées, elles apparaîtront automatiquement dans:
- **Dashboard**: http://localhost:3000/dashboard
- **Analytics**: http://localhost:3000/analytics

## 🐛 Problèmes connus

### Erreur "ValueError: 'not' is not a valid parameter name"

**Cause**: Incompatibilité entre FastAPI et Pydantic avec Python 3.13

**Solution**:
```bash
pip install --upgrade "fastapi>=0.115.0" "pydantic>=2.10.0"
```

### Le serveur ne se connecte pas au MQTT

1. Vérifiez que le broker est accessible
2. Vérifiez les credentials
3. Vérifiez le pare-feu

## 📚 Documentation complète

Voir `MQTT_SETUP.md` pour plus de détails.

## ✨ Prochaines étapes

1. Tester la connexion MQTT avec l'ESP32
2. Vérifier que les données apparaissent dans le dashboard
3. Remplacer progressivement les valeurs par défaut (speed, rpm, etc.) par de vraies données de capteurs automobiles
