# 🚗 Digital Twin Car - MQTT Integration

## 📡 Configuration MQTT avec ESP32 et DHT11

Ce document explique comment connecter votre ESP32 avec capteur DHT11 au backend FastAPI via MQTT.

### Architecture du système

```
ESP32 (DHT11) → MQTT Broker → FastAPI Backend → Supabase Database → Next.js Dashboard
```

## 🔧 Configuration

### 1. ESP32 (Code Arduino)

Le code Arduino publie les données sur deux topics MQTT :
- `DIGITALTWIN/temperature` : Température en °C
- `DIGITALTWIN/humidity` : Humidité en %

**Connexions DHT11:**
- VCC → 3.3V (ESP32)
- GND → GND
- DATA → GPIO 21

### 2. Broker MQTT

**Adresse:** `109.123.243.44:1883`

**Authentification:**
- Username: `chaari`
- Password: `chaari2023`

### 3. Backend FastAPI

Le backend écoute automatiquement les topics MQTT et stocke les données dans Supabase.

#### Installation des dépendances

```bash
cd digital_twin_logic/backend
pip install -r requirements.txt
```

#### Démarrage du serveur

```bash
cd digital_twin_logic/backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Le serveur va automatiquement:
1. Se connecter au broker MQTT
2. S'abonner aux topics `DIGITALTWIN/*`
3. Recevoir les données du DHT11
4. Les stocker dans la table `telemetry` de Supabase

## 📊 Structure des données

### Données reçues de l'ESP32
```json
{
  "temperature": 24.5,  // °C
  "humidity": 65.2      // %
}
```

### Données stockées dans Supabase (table `telemetry`)
```json
{
  "id": 1,
  "vehicle_id": 1,
  "latitude": 31.6346,
  "longitude": -8.0027,
  "speed_kmh": 0.0,
  "battery_pct": 100.0,
  "temperature": 24.5,    // Valeur du DHT11
  "rpm": 0.0,
  "recorded_at": "2025-11-07T18:30:00Z"
}
```

## 🔍 Vérification

### 1. Vérifier la connexion MQTT

Dans les logs du serveur FastAPI, vous devriez voir:
```
🔌 Connexion au broker MQTT 109.123.243.44:1883...
✅ Connecté au broker MQTT avec succès!
📡 Abonné au topic: DIGITALTWIN/temperature
📡 Abonné au topic: DIGITALTWIN/humidity
✅ Client MQTT démarré!
```

### 2. Vérifier la réception des données

Quand l'ESP32 publie des données:
```
📩 Message reçu sur DIGITALTWIN/temperature: 24.50
📩 Message reçu sur DIGITALTWIN/humidity: 65.20
✅ Données sauvegardées dans la BDD:
   🌡️  Température: 24.5°C
   💧 Humidité: 65.2%
   🚗 Vehicle ID: 1
```

### 3. Vérifier dans le Dashboard

1. Ouvrez http://localhost:3000/dashboard
2. Vous devriez voir la température du DHT11 s'afficher
3. Les graphiques dans http://localhost:3000/analytics montreront l'historique

## ⚙️ Configuration avancée

### Modifier le véhicule ID

Dans `app/mqtt_handler.py`, ligne 24:
```python
"vehicle_id": 1,  # Changez cette valeur
```

### Modifier les coordonnées par défaut

Dans `app/mqtt_handler.py`, lignes 25-26:
```python
"latitude": 31.6346,   # Votre latitude
"longitude": -8.0027,  # Votre longitude
```

### Ajouter d'autres capteurs

1. Publiez sur de nouveaux topics MQTT
2. Ajoutez les topics dans `MQTT_TOPICS` (ligne 16-19)
3. Modifiez `on_message()` pour traiter les nouvelles données

## 🔗 API Endpoints

- `GET /health` - Vérifier l'état du serveur
- `GET /telemetry?vehicle_id=1&limit=100` - Récupérer les données télémétriques
- `GET /` - Documentation API (Swagger UI)

## 🐛 Dépannage

### Le serveur ne se connecte pas au MQTT

1. Vérifiez que le broker MQTT est accessible:
   ```bash
   ping 109.123.243.44
   ```

2. Vérifiez les credentials dans `mqtt_handler.py`

### Les données ne s'enregistrent pas

1. Vérifiez les logs du serveur
2. Vérifiez la configuration Supabase dans `.env`
3. Vérifiez que la table `telemetry` existe dans Supabase

### L'ESP32 ne publie pas

1. Vérifiez la connexion WiFi de l'ESP32
2. Vérifiez les logs série (115200 baud)
3. Vérifiez le câblage du DHT11

## 📝 Prochaines étapes

Pour remplacer les données simulées par de vraies données de voiture:

1. Connectez des capteurs CAN/OBD-II à l'ESP32
2. Modifiez le code Arduino pour lire:
   - Vitesse (speed_kmh)
   - Batterie (battery_pct)
   - RPM (rpm)
   - GPS (latitude, longitude)
3. Publiez sur de nouveaux topics MQTT
4. Mettez à jour `mqtt_handler.py` pour traiter ces données

## 📚 Ressources

- [Documentation FastAPI](https://fastapi.tiangolo.com/)
- [Documentation Paho MQTT](https://eclipse.dev/paho/index.php?page=clients/python/index.php)
- [Documentation ESP32](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- [Documentation DHT11](https://www.adafruit.com/product/386)
