# 🚀 Implémentation WebSocket pour Digital Twin Car

## 📋 Résumé des modifications

Cette implémentation ajoute la communication **WebSocket en temps réel** pour remplacer le chargement depuis la base de données pour les KPIs du **Dashboard** et de la page **Analytics**.

---

## 🔧 Modifications Backend (Python/FastAPI)

### 1. `mqtt_handler.py` - Modifications principales

#### Ajout de variables d'état
```python
last_message_time = None
vehicle_state = "offline"  # "offline" ou "running"
last_saved_data = None  # Garde les dernières valeurs quand la voiture s'éteint
```

#### Fonction `on_message()` améliorée
- Détecte l'arrivée de données MQTT
- Met à jour `vehicle_state = "running"`
- Sauvegarde les dernières valeurs dans `last_saved_data`
- **Diffuse via WebSocket** avec `broadcast_telemetry()`

#### Nouvelle fonction `broadcast_telemetry()`
```python
async def broadcast_telemetry():
    """Diffuse les données de télémétrie via WebSocket"""
    telemetry_message = {
        "type": "telemetry_update",
        "state": vehicle_state,  # "running" ou "offline"
        "data": latest_data.copy(),
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast(json.dumps(telemetry_message))
```

#### Nouvelle fonction `check_vehicle_state()`
- Vérifie toutes les 5 secondes
- Si pas de message MQTT depuis **10 secondes** → `vehicle_state = "offline"`
- Envoie un message WebSocket avec les **dernières valeurs sauvegardées**
- Permet d'afficher les dernières valeurs au lieu de 0 quand la voiture est éteinte

#### Nouvelle fonction `get_latest_data()`
```python
def get_latest_data():
    """Retourne les dernières données avec l'état du véhicule"""
    return {
        "state": vehicle_state,
        "data": latest_data.copy() if vehicle_state == "running" else last_saved_data,
        "timestamp": datetime.utcnow().isoformat()
    }
```

---

### 2. `main.py` - Modifications

#### Ajout de l'endpoint WebSocket amélioré
```python
@app.websocket('/ws/telemetry')
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Envoie immédiatement les dernières données au client
        initial_data = get_latest_data()
        await websocket.send_text(json.dumps(initial_data))
        
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
```

#### Nouvel endpoint REST
```python
@app.get("/telemetry/latest")
def get_latest_telemetry():
    """Retourne les dernières données de télémétrie"""
    return get_latest_data()
```

#### Démarrage automatique de la tâche de vérification
```python
@app.on_event("startup")
async def on_startup():
    start_mqtt_client()
    # Démarre la tâche de vérification d'état
    asyncio.create_task(check_vehicle_state())
```

---

## 🎨 Modifications Frontend (Next.js/TypeScript)

### 3. `dashboard/page.tsx` - Refonte complète

#### Types TypeScript ajoutés
```typescript
interface TelemetryData {
  vehicle_id: number
  engine_load?: number
  coolant_temperature?: number
  rpm?: number
  vehicle_speed?: number
  control_module_voltage?: number
  // ... autres champs
}

interface WebSocketMessage {
  type: string
  state: "offline" | "running"
  data: TelemetryData
  timestamp: string
}
```

#### État de la voiture
```typescript
const [vehicleState, setVehicleState] = useState<"offline" | "running">("offline")
```

#### Connexion WebSocket
```typescript
useEffect(() => {
  // Chargement initial via REST
  fetch('http://localhost:8000/telemetry/latest')
  
  // Connexion WebSocket
  const ws = new WebSocket('ws://localhost:8000/ws/telemetry')
  
  ws.onmessage = (event) => {
    const message: WebSocketMessage = JSON.parse(event.data)
    setTelemetry(message.data)
    setVehicleState(message.state)
  }
  
  // Reconnexion automatique après 5s en cas de déconnexion
}, [isLiveMode])
```

#### Affichage KPIs avec indicateur "Last value"
```typescript
<CardContent>
  <div className="text-3xl font-bold">
    {latest?.rpm !== undefined ? latest.rpm.toFixed(0) : '--'}
  </div>
  {vehicleState === "offline" && 
    <p className="text-xs text-orange-500 mt-1">Last value</p>
  }
</CardContent>
```

#### Badge d'état
```typescript
{vehicleState === "running" ? (
  <><Wifi /> Running</>
) : (
  <><WifiOff /> Offline</>
)}
```

---

### 4. `analytics/page.tsx` - Mise à jour temps réel

#### Graphiques en temps réel
```typescript
ws.onmessage = (ev) => {
  const message: WebSocketMessage = JSON.parse(ev.data)
  setVehicleState(message.state)
  
  // Ajouter un point aux graphiques (garder 60 points max)
  setSpeedData((prev) => [...prev.slice(-59), point(message.data.vehicle_speed)])
  setRpmData((prev) => [...prev.slice(-59), point(message.data.rpm)])
  // ... autres graphiques
}
```

#### Pause des graphiques
```typescript
ws.onmessage = (ev) => {
  if (isPaused) return // Ne pas mettre à jour si pause
  // ... traitement
}
```

#### Avertissement offline
```typescript
{vehicleState === "offline" && (
  <div className="bg-orange-500/10 border border-orange-500/30">
    ⚠️ Vehicle offline - Displaying last received values
  </div>
)}
```

---

## 🎯 Fonctionnalités implémentées

### ✅ Détection d'état automatique
- **Running** : Messages MQTT reçus dans les 10 dernières secondes
- **Offline** : Pas de message depuis plus de 10 secondes

### ✅ Conservation des dernières valeurs
- Quand la voiture s'éteint (offline), affiche les **dernières valeurs valides**
- Plus de zéros affichés !

### ✅ Communication temps réel
- **Dashboard** : KPIs mis à jour en temps réel via WebSocket
- **Analytics** : Graphiques mis à jour automatiquement
- **Map** : Continue de fonctionner normalement (non modifiée)

### ✅ Reconnexion automatique
- Si WebSocket se déconnecte → reconnexion après 5 secondes
- Robustesse face aux coupures réseau

### ✅ Chargement initial
- Les clients reçoivent immédiatement les dernières données à la connexion
- Pas d'attente du prochain message MQTT

---

## 📊 Format des données MQTT

D'après votre image, les données arrivent sous forme de **paires clé-valeur** :
```json
{"41-MonStatusDriveCycle": 0}
{"33-AbsBaroPres": 95}
```

Le `mqtt_handler.py` les mappe automatiquement vers les noms de colonnes :
```python
TOPIC_MAPPING = {
    "wican/rpm": "rpm",
    "wican/vehicle_speed": "vehicle_speed",
    "wican/coolant_temperature": "coolant_temperature",
    // ... etc
}
```

---

## 🚀 Comment tester

### 1. Démarrer le backend
```bash
cd digital_twin_logic/backend
uvicorn app.main:app --reload
```

### 2. Démarrer le frontend
```bash
cd digital-twin-car-dashboard
pnpm dev
```

### 3. Observer les logs
- Backend : Vous verrez les messages MQTT et les broadcasts WebSocket
- Frontend : Ouvrez la console pour voir les messages WebSocket reçus

### 4. Simuler offline
- Arrêtez l'envoi de messages MQTT
- Après 10 secondes → état passe à "offline"
- Les dernières valeurs restent affichées

---

## 🔍 Avantages de cette implémentation

✅ **Performance** : Plus besoin de requêtes BDD répétées  
✅ **Temps réel** : Données instantanées via WebSocket  
✅ **État intelligent** : Détection automatique running/offline  
✅ **UX améliorée** : Affichage des dernières valeurs au lieu de 0  
✅ **Robustesse** : Reconnexion automatique  
✅ **Scalabilité** : Support de plusieurs clients simultanés  

---

## 📝 Notes importantes

- Les données de la **Map** continuent d'utiliser le système existant (non modifiées)
- Seuls les **KPIs du Dashboard** et la page **Analytics** utilisent WebSocket
- La base de données continue d'être alimentée pour l'historique
- Format des messages compatible avec le format MQTT existant

---

## 🐛 Debugging

### Vérifier la connexion WebSocket
```javascript
// Dans la console du navigateur
console.log('WebSocket connecté')  // Apparaît à la connexion
```

### Vérifier les messages reçus
```javascript
// Dans ws.onmessage
console.log('Message reçu:', message)
```

### Vérifier l'état backend
```bash
curl http://localhost:8000/telemetry/latest
```

---

## 🎉 Conclusion

Cette implémentation offre une expérience utilisateur fluide avec :
- Mise à jour en **temps réel** des KPIs
- Détection automatique de l'**état de la voiture**
- **Conservation des dernières valeurs** quand offline
- **Performance optimale** sans surcharge de la BDD

Tout est prêt pour la production ! 🚗💨
