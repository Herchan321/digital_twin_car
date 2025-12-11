# 🔧 Configuration MeatPI pour Digital Twin Car

## ✅ Corrections Appliquées

### 1. **Topics MQTT: `wincan` au lieu de `wican`**
Le backend écoute maintenant sur `wincan/#` pour correspondre à votre configuration MeatPI.

### 2. **Parsing JSON automatique**
Le code parse maintenant correctement le format `{"PID-Name": value}` envoyé par MeatPI :
```json
{"0D-VehicleSpeed": 0}
{"4F-Max_IntakeManiAbsPres": 0}
{"4A-AbsThrottlePosE": 14.51}
```

### 3. **Throttling des sauvegardes**
Sauvegarde en BDD limitée à **toutes les 5 secondes** (au lieu de chaque message) pour éviter la surcharge.

---

## 📋 Configuration MeatPI Recommandée

### Format des Topics
Dans l'interface MeatPI, configurez vos PIDs avec le format suivant :

| PID | Topic MeatPI | Champ BDD | Exemple Payload |
|-----|--------------|-----------|-----------------|
| 04 | `wincan/engine_load` | `engine_load` | `{"04-EngineLoad":45.2}` |
| 05 | `wincan/coolant_temperature` | `coolant_temperature` | `{"05-CoolantTemp":87.3}` |
| 0C | `wincan/rpm` | `rpm` | `{"0C-Rpm":2500}` |
| 0D | `wincan/vehicle_speed` | `vehicle_speed` | `{"0D-VehicleSpeed":65}` |
| 0F | `wincan/intake_air_temp` | `intake_air_temp` | `{"0F-IntakeAirTemp":25}` |
| 10 | `wincan/maf_airflow` | `maf_airflow` | `{"10-MafAirflow":12.5}` |
| 11 | `wincan/throttle_position` | `throttle_position` | `{"11-ThrottlePos":35}` |
| 23 | `wincan/fuel_rail_pressure` | `fuel_rail_pressure` | `{"23-FuelRailPress":350}` |
| 33 | `wincan/absolute_barometric_pressure` | `absolute_barometric_pressure` | `{"33-AbsBaroPres":95}` |
| 41 | `wincan/monitor_status_drive_cycle` | `monitor_status_drive_cycle` | `{"41-MonitorStatus":0}` |
| 42 | `wincan/control_module_voltage` | `control_module_voltage` | `{"42-ControlVolt":13.8}` |
| 4A | `wincan/abs_throttle_position_e` | `abs_throttle_position_e` | `{"4A-AbsThrottlePosE":14.51}` |
| 4C | `wincan/commanded_throttle_actuator` | `commanded_throttle_actuator` | `{"4C-CmdThrottleAct":100}` |

### PIDs Essentiels (KPIs Dashboard)
Pour que le dashboard fonctionne correctement, configurez **au minimum** ces PIDs :

1. ✅ **RPM** (`wincan/rpm`) - Affichage jauge
2. ✅ **Vitesse** (`wincan/vehicle_speed`) - Affichage numérique
3. ✅ **Température** (`wincan/coolant_temperature`) - Alerte si > 95°C
4. ✅ **Batterie** (`wincan/control_module_voltage`) - Alerte si < 12V
5. ✅ **Charge moteur** (`wincan/engine_load`) - Pourcentage

---

## 🧪 Test de Configuration

### 1. Démarrer le Backend
```bash
cd c:\wamp64\www\DigitalTwin\digital_twin_car\digital_twin_logic\backend
python -m uvicorn app.main:app --reload
```

### 2. Vérifier les Logs
Vous devriez voir :
```
======================================================================
✅ CONNECTÉ AU BROKER MQTT AVEC SUCCÈS!
======================================================================
📡 Abonné au topic: wincan/#
======================================================================

======================================================================
📩 MESSAGE MQTT REÇU
📍 Topic: wincan/vehicle_speed
📦 Payload: {"0D-VehicleSpeed":0}
----------------------------------------------------------------------
🔓 JSON parsé: {'0D-VehicleSpeed': 0}
🔑 Clé JSON: 0D-VehicleSpeed
💎 Valeur: 0 (type: int)
✅ DONNÉE MISE À JOUR: vehicle_speed = 0
======================================================================

💾 Sauvegarde en BDD...
📊 Données sauvegardées:
   • vehicle_speed: 0
✅ SAUVEGARDE RÉUSSIE!
======================================================================

📡 Diffusion WebSocket...
✅ WebSocket diffusé - 1 clients - État: running
```

### 3. Vérifier Supabase
Connectez-vous à votre dashboard Supabase et vérifiez la table `telemetry` :
```sql
SELECT * FROM telemetry ORDER BY recorded_at DESC LIMIT 10;
```

### 4. Tester le Frontend
```bash
cd c:\wamp64\www\DigitalTwin\digital_twin_car\digital-twin-car-dashboard
npm run dev
```

Ouvrez `http://localhost:3000/dashboard` et vérifiez :
- ✅ Badge "Running" affiché
- ✅ KPIs affichent les valeurs reçues
- ✅ Pas de "---" si des données arrivent

---

## 📊 Flux de Données

```
MeatPI/WiCAN (ESP32)
    ↓
    JSON: {"0D-VehicleSpeed":65}
    ↓
MQTT Broker (109.123.243.44:1883)
    ↓
    Topic: wincan/vehicle_speed
    ↓
Backend FastAPI (mqtt_handler.py)
    ├─→ Parse JSON → Extrait valeur 65
    ├─→ Map vers champ BDD "vehicle_speed"
    ├─→ Sauvegarde Supabase (toutes les 5s)
    └─→ Diffusion WebSocket (immédiate)
         ↓
Frontend Next.js (dashboard/analytics)
    ├─→ dashboard/page.tsx (KPIs)
    └─→ analytics/page.tsx (Graphiques)
```

---

## 🔍 Dépannage

### Problème : Aucune donnée affichée
1. Vérifiez les logs backend pour voir si les messages MQTT arrivent
2. Vérifiez que le topic MeatPI commence bien par `wincan/`
3. Vérifiez que le payload est bien au format JSON

### Problème : Données non sauvegardées
1. Vérifiez les credentials Supabase dans `.env`
2. Vérifiez que la table `telemetry` existe avec les bons champs
3. Vérifiez qu'au moins un PID essentiel envoie des données

### Problème : WebSocket non connecté
1. Vérifiez que le backend tourne sur `http://localhost:8000`
2. Vérifiez `NEXT_PUBLIC_WS_URL` dans `.env.local` du frontend
3. Vérifiez les CORS dans `main.py`

---

## 📝 Mapping Complet Backend

Le fichier `mqtt_handler.py` contient maintenant :

- ✅ Abonnement à `wincan/#`
- ✅ 35+ topics mappés vers la BDD
- ✅ Parsing JSON automatique
- ✅ Fallback valeur brute si pas JSON
- ✅ Throttling sauvegarde BDD (5s)
- ✅ Diffusion WebSocket immédiate
- ✅ Détection offline (10s sans message)
- ✅ Logs détaillés pour debug

---

## 🎯 Prochaines Étapes

1. ✅ Tester avec des données réelles de votre voiture
2. ✅ Vérifier que tous les KPIs s'affichent
3. ✅ Vérifier que les graphiques Analytics se remplissent
4. ✅ Ajuster les seuils d'alerte dans `dashboard/page.tsx`

---

**Date de dernière modification** : 2025-11-28  
**Version backend** : 1.0.0  
**Compatible avec** : MeatPI WiCAN, ESP32 OBD-II
