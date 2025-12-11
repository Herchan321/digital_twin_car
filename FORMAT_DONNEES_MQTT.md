# 📡 Format des Données MQTT - Digital Twin Car

## 🔍 Format Observé (Image)

D'après l'image fournie, les données MQTT arrivent sous forme de **paires clé-valeur** :

```json
{"41-MonStatusDriveCycle": 0}
{"33-AbsBaroPres": 95}
```

### Structure
- **Clé** : Code PID (ex: `41-MonStatusDriveCycle`, `33-AbsBaroPres`)
- **Valeur** : Valeur numérique ou texte

---

## 🗺️ Mapping MQTT → Base de Données

Le fichier `mqtt_handler.py` contient un mapping complet :

### PIDs Essentiels (04-11)

| Topic MQTT | Nom BDD | Description |
|------------|---------|-------------|
| `wican/engine_load` | `engine_load` | Charge moteur (%) |
| `wican/coolant_temperature` | `coolant_temperature` | Température liquide refroidissement (°C) |
| `wican/intake_pressure` | `intake_pressure` | Pression d'admission (kPa) |
| `wican/rpm` | `rpm` | Régime moteur (tr/min) |
| `wican/vehicle_speed` | `vehicle_speed` | Vitesse véhicule (km/h) |
| `wican/intake_air_temp` | `intake_air_temp` | Température air admission (°C) |
| `wican/maf_airflow` | `maf_airflow` | Débit d'air massique (g/s) |
| `wican/throttle_position` | `throttle_position` | Position papillon (%) |

---

### PIDs Étendus

| Topic MQTT | Nom BDD | Description |
|------------|---------|-------------|
| `wican/monitor_status` | `monitor_status` | État moniteur MIL |
| `wican/oxygen_sensors_present_banks` | `oxygen_sensors_present_banks` | Capteurs O2 présents |
| `wican/obd_standard` | `obd_standard` | Norme OBD |
| `wican/time_since_engine_start` | `time_since_engine_start` | Temps depuis démarrage (s) |
| `wican/pids_supported_21_40` | `pids_supported_21_40` | PIDs supportés 21-40 |
| `wican/distance_mil_on` | `distance_mil_on` | Distance avec MIL allumé (km) |
| `wican/fuel_rail_pressure` | `fuel_rail_pressure` | Pression rail carburant (kPa) |
| `wican/oxygen_sensor1_faer` | `oxygen_sensor1_faer` | Capteur O2 1 - FAER |
| `wican/oxygen_sensor1_voltage` | `oxygen_sensor1_voltage` | Capteur O2 1 - Tension (V) |
| `wican/egr_commanded` | `egr_commanded` | EGR commandé (%) |
| `wican/egr_error` | `egr_error` | Erreur EGR (%) |
| `wican/warmups_since_code_clear` | `warmups_since_code_clear` | Démarrages depuis effacement codes |
| `wican/distance_since_code_clear` | `distance_since_code_clear` | Distance depuis effacement codes (km) |
| `wican/absolute_barometric_pressure` | `absolute_barometric_pressure` | Pression barométrique absolue (kPa) |
| `wican/pids_supported_41_60` | `pids_supported_41_60` | PIDs supportés 41-60 |
| `wican/monitor_status_drive_cycle` | `monitor_status_drive_cycle` | État moniteur cycle conduite |
| `wican/control_module_voltage` | `control_module_voltage` | Tension module contrôle (V) |
| `wican/relative_throttle_position` | `relative_throttle_position` | Position relative papillon (%) |
| `wican/ambient_air_temperature` | `ambient_air_temperature` | Température air ambiant (°C) |
| `wican/abs_throttle_position_d` | `abs_throttle_position_d` | Position absolue papillon D (%) |
| `wican/abs_throttle_position_e` | `abs_throttle_position_e` | Position absolue papillon E (%) |
| `wican/commanded_throttle_actuator` | `commanded_throttle_actuator` | Actionneur papillon commandé (%) |
| `wican/max_faer` | `max_faer` | FAER maximum |
| `wican/max_oxy_sensor_voltage` | `max_oxy_sensor_voltage` | Tension max capteur O2 (V) |
| `wican/max_oxy_sensor_current` | `max_oxy_sensor_current` | Courant max capteur O2 (mA) |
| `wican/max_intake_pressure` | `max_intake_pressure` | Pression admission max (kPa) |

---

## 📊 Exemple de Données Reçues

### Format MQTT (ESP32)
```json
{"wican/rpm": 2500}
{"wican/vehicle_speed": 65.5}
{"wican/coolant_temperature": 87.3}
{"wican/engine_load": 45.2}
{"wican/control_module_voltage": 13.8}
```

### Format Traité (Backend)
```python
latest_data = {
    "vehicle_id": 1,
    "rpm": 2500,
    "vehicle_speed": 65.5,
    "coolant_temperature": 87.3,
    "engine_load": 45.2,
    "control_module_voltage": 13.8,
    ...
}
```

### Format WebSocket (Frontend)
```json
{
  "type": "telemetry_update",
  "state": "running",
  "data": {
    "vehicle_id": 1,
    "rpm": 2500,
    "vehicle_speed": 65.5,
    "coolant_temperature": 87.3,
    "engine_load": 45.2,
    "control_module_voltage": 13.8,
    ...
  },
  "timestamp": "2025-11-27T16:04:47.234000"
}
```

---

## 🔄 Flux de Traitement

### 1. Réception MQTT
```python
def on_message(client, userdata, msg):
    topic = msg.topic  # Ex: "wican/rpm"
    payload = msg.payload.decode('utf-8')  # Ex: "2500"
```

### 2. Mapping
```python
if topic in TOPIC_MAPPING:
    field_name = TOPIC_MAPPING[topic]  # "rpm"
    latest_data[field_name] = float(payload)  # 2500.0
```

### 3. Sauvegarde BDD
```python
telemetry_data = {
    "vehicle_id": 1,
    "rpm": 2500,
    ...
}
supabase.table("telemetry").insert(telemetry_data).execute()
```

### 4. Broadcast WebSocket
```python
telemetry_message = {
    "type": "telemetry_update",
    "state": "running",
    "data": latest_data,
    "timestamp": datetime.utcnow().isoformat()
}
await manager.broadcast(json.dumps(telemetry_message))
```

---

## 🎯 PIDs Utilisés dans le Dashboard

### KPIs Principaux
1. **Speed** : `vehicle_speed` (wican/vehicle_speed)
2. **RPM** : `rpm` (wican/rpm)
3. **Temperature** : `coolant_temperature` (wican/coolant_temperature)
4. **Battery** : `control_module_voltage` (wican/control_module_voltage)
5. **Engine Load** : `engine_load` (wican/engine_load)

### Analytics (Graphiques)
1. **Vitesse Véhicule** : `vehicle_speed`
2. **Régime moteur** : `rpm`
3. **Température Liquide** : `coolant_temperature`
4. **Charge Moteur** : `engine_load`
5. **Pression Rail** : `fuel_rail_pressure`
6. **Tension ECU** : `control_module_voltage`

---

## 🔧 Configuration MQTT

### Broker
```python
MQTT_BROKER = "109.123.243.44"
MQTT_PORT = 1883
MQTT_USERNAME = "chaari"
MQTT_PASSWORD = "chaari2023"
```

### Topics
```python
MQTT_TOPICS = ["wican/#"]  # Tous les topics wican
```

---

## 📝 Ajout de Nouveaux PIDs

### 1. Ajouter dans TOPIC_MAPPING
```python
TOPIC_MAPPING = {
    # Existants...
    "wican/nouveau_pid": "nouveau_champ",
}
```

### 2. Ajouter dans latest_data
```python
latest_data = {
    # Existants...
    "nouveau_champ": None,
}
```

### 3. Ajouter dans save_to_database()
```python
telemetry_data = {
    # Existants...
    "nouveau_champ": latest_data["nouveau_champ"],
}
```

### 4. Ajouter dans la BDD (Supabase)
```sql
ALTER TABLE telemetry 
ADD COLUMN nouveau_champ FLOAT;
```

---

## 🧪 Test MQTT en Local

### Publier un message test
```bash
mosquitto_pub -h 109.123.243.44 \
              -p 1883 \
              -u chaari \
              -P chaari2023 \
              -t "wican/rpm" \
              -m "2500"
```

### S'abonner pour vérifier
```bash
mosquitto_sub -h 109.123.243.44 \
              -p 1883 \
              -u chaari \
              -P chaari2023 \
              -t "wican/#" \
              -v
```

---

## 🎨 Format Visuel (Image)

D'après votre capture d'écran :

```
Topic: wican/StatusDriveCycle  QoS: 0  [Retained]
{"41-MonStatusDriveCycle":0}
2025-11-27 16:04:47:234

Topic: wican/AbsBaroPres  QoS: 0  [Retained]
{"33-AbsBaroPres":95}
```

### Observations
- **QoS: 0** : Livraison au plus une fois
- **Retained** : Dernier message conservé par le broker
- **Format JSON** : Données structurées
- **Timestamp** : Horodatage précis

---

## 🔍 Débogage

### Vérifier les messages reçus
```python
# Dans mqtt_handler.py
print(f"📩 Message reçu sur {topic}: {payload}")
```

### Vérifier le mapping
```python
if topic in TOPIC_MAPPING:
    print(f"✓ Mapping trouvé: {topic} → {TOPIC_MAPPING[topic]}")
else:
    print(f"⚠️  Mapping manquant pour: {topic}")
```

### Vérifier les données
```python
print(f"📊 Latest data: {json.dumps(latest_data, indent=2)}")
```

---

## 📊 Statistiques Typiques

| Métrique | Valeur Normale | Critique |
|----------|----------------|----------|
| RPM | 800-3000 | > 5500 |
| Vitesse | 0-120 km/h | > 130 |
| Température | 80-95°C | > 100 |
| Batterie | 12.5-14.5V | < 11.8 |
| Charge moteur | 20-60% | > 95 |

---

## ✅ Validation des Données

### Règles de Validation
```python
# Dans on_message()
if field_name == "rpm" and value > 7000:
    print("⚠️  RPM anormalement élevé!")
    
if field_name == "coolant_temperature" and value > 110:
    print("🔥 Température critique!")
    
if field_name == "control_module_voltage" and value < 11:
    print("🔋 Batterie critique!")
```

---

## 🎯 Conclusion

Le système MQTT est configuré pour :
- ✅ Recevoir les données OBD-II via WiCAN
- ✅ Mapper automatiquement vers la BDD
- ✅ Diffuser en temps réel via WebSocket
- ✅ Détecter l'état offline automatiquement

**Le format est robuste et extensible !** 🚀

---

**Dernière mise à jour :** 27 novembre 2025
