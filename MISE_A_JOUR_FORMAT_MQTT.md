# 🔄 MISE À JOUR: FORMAT MQTT UNIFIÉ

## 📋 Résumé
Le WinCAN device envoie maintenant **toutes les données OBD-II dans un seul message JSON** sur le topic `wincan/device1` au lieu de messages séparés par topic.

## ✅ Changements effectués

### 1. **Fichier: `mqtt_handler.py`**

#### A. Nouveau mapping PID → Colonne BDD
```python
PID_TO_COLUMN_MAPPING = {
    "01-MonitorStatus": "monitor_status",
    "04-CalcEngineLoad": "engine_load",
    "05-EngineCoolantTemp": "coolant_temperature",
    # ... 47 PIDs au total
}
```

#### B. Fonction `on_message()` modifiée
- ✅ Parse le JSON complet avec tous les PIDs
- ✅ Extrait le `device_id` du topic (ex: `wincan/device1` → `device1`)
- ✅ Met à jour toutes les valeurs reçues en une seule fois
- ✅ Affiche les PIDs non mappés pour débogage

#### C. Variables globales mises à jour
- Ajout de **9 nouvelles colonnes** pour les PIDs supplémentaires
- Ajout de `.get()` pour compatibilité avec anciennes données

#### D. Fonction `save_to_database()` mise à jour
- Sauvegarde des 9 nouvelles colonnes

## 🗄️ Modifications base de données Supabase

### **Nouvelles colonnes à ajouter:**
Exécuter le script SQL `SUPABASE_UPDATE_COLUMNS.sql` dans Supabase:

```sql
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS oxygen_sensor2_faer FLOAT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS egr_commanded_error FLOAT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS pids_supported_61_80 INTEGER;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS pids_supported_81_a0 INTEGER;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS engine_coolant_temp1 FLOAT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS engine_coolant_temp2 FLOAT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS charge_air_cooler_temp FLOAT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS egt_bank1 FLOAT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS diesel_aftertreatment INTEGER;
```

## 📊 Mapping des PIDs reçus

| PID Reçu | Nom Colonne BDD | Description |
|----------|-----------------|-------------|
| `01-MonitorStatus` | `monitor_status` | Statut moniteur OBD |
| `04-CalcEngineLoad` | `engine_load` | Charge moteur (%) |
| `05-EngineCoolantTemp` | `coolant_temperature` | Température liquide refroidissement |
| `0B-IntakeManiAbsPress` | `intake_pressure` | Pression collecteur admission |
| `0C-EngineRPM` | `rpm` | Tours/minute moteur |
| `0D-VehicleSpeed` | `vehicle_speed` | Vitesse véhicule (km/h) |
| `0F-IntakeAirTemperature` | `intake_air_temp` | Température air admission |
| `10-MAFAirFlowRate` | `maf_airflow` | Débit massique d'air |
| `11-ThrottlePosition` | `throttle_position` | Position papillon (%) |
| `13-OxySensorsPresent_2Banks` | `oxygen_sensors_present_banks` | Capteurs O2 présents |
| `1C-OBDStandard` | `obd_standard` | Norme OBD supportée |
| `1F-TimeSinceEngStart` | `time_since_engine_start` | Temps depuis démarrage (s) |
| `23-FuelRailGaug` | `fuel_rail_pressure` | Pression rampe carburant |
| `24-OxySensor1_FAER` | `oxygen_sensor1_faer` | O2 Sensor 1 FAER |
| `24-OxySensor1_Volt` | `oxygen_sensor1_voltage` | O2 Sensor 1 Voltage |
| `25-OxySensor2_FAER` | `oxygen_sensor2_faer` | O2 Sensor 2 FAER ⭐ NOUVEAU |
| `42-ControlModuleVolt` | `control_module_voltage` | Tension module contrôle |
| `46-AmbientAirTemp` | `ambient_air_temperature` | Température air ambiant |
| `67-EngineCoolantTemp1` | `engine_coolant_temp1` | Température coolant 1 ⭐ NOUVEAU |
| `67-EngineCoolantTemp2` | `engine_coolant_temp2` | Température coolant 2 ⭐ NOUVEAU |
| `69-CmdEGR_EGRError` | `egr_commanded_error` | EGR commandé + erreur ⭐ NOUVEAU |
| `77-ChargeAirCoolerTemperature` | `charge_air_cooler_temp` | Temp. refroidisseur air ⭐ NOUVEAU |
| `78-EGT_Bank1` | `egt_bank1` | Temp. gaz échappement Bank 1 ⭐ NOUVEAU |
| `8B-DieselAftertreatment` | `diesel_aftertreatment` | Système post-traitement diesel ⭐ NOUVEAU |
| ... | ... | ... |

## 🔧 Exemple de message reçu

**Topic:** `wincan/device1`

**Payload:**
```json
{
  "01-MonitorStatus": 0,
  "04-CalcEngineLoad": 79.61,
  "05-EngineCoolantTemp": 87,
  "0B-IntakeManiAbsPress": 114,
  "0C-EngineRPM": 1047,
  "0D-VehicleSpeed": 27,
  "0F-IntakeAirTemperature": 31,
  "10-MAFAirFlowRate": 11.09,
  "11-ThrottlePosition": 79.22,
  "42-ControlModuleVolt": 14.02,
  "67-EngineCoolantTemp1": 87,
  "67-EngineCoolantTemp2": -40
}
```

## 🚀 Comment redémarrer le système

### 1. Mettre à jour Supabase
```bash
# Ouvrir Supabase Dashboard → SQL Editor
# Copier/coller le contenu de SUPABASE_UPDATE_COLUMNS.sql
# Exécuter le script
```

### 2. Redémarrer le backend Python
```bash
cd digital_twin_logic/backend
uvicorn app.main:app --reload
```

### 3. Vérifier les logs
Le backend affichera maintenant:
```
======================================================================
📩 MESSAGE MQTT REÇU
📍 Topic: wincan/device1
📦 Payload (tronqué): {"01-MonitorStatus":0,"04-CalcEngineLoad":79.61,...
----------------------------------------------------------------------
🔧 Device ID: device1
🔓 JSON parsé avec 47 PIDs
✅ 47 CHAMPS MIS À JOUR
----------------------------------------------------------------------
```

## 📡 Multi-device support

Le système supporte maintenant plusieurs devices:
- `wincan/device1` → Device 1
- `wincan/device2` → Device 2
- `wincan/device3` → Device 3

Le `device_id` est automatiquement extrait du topic.

## ✅ Avantages du nouveau format

1. **Performance:** 1 seul message MQTT au lieu de 47 messages séparés
2. **Atomicité:** Toutes les valeurs sont mises à jour en même temps
3. **Multi-device:** Facile de différencier plusieurs véhicules
4. **Simplicité:** Configuration MeatPI plus simple (1 seul topic)
5. **Fiabilité:** Moins de risques de pertes de messages

## 🔍 Débogage

Si les données ne sont toujours pas reçues:

1. **Vérifier le broker MQTT:**
   ```bash
   mosquitto_sub -h 109.123.243.44 -p 1883 -u chaari -P chaari2023 -t "wincan/#" -v
   ```

2. **Vérifier les logs backend:**
   - Le message "✅ X CHAMPS MIS À JOUR" devrait apparaître
   - Si "⚠️ PIDs non mappés" apparaît, ajouter les PIDs manquants

3. **Vérifier Supabase:**
   ```sql
   SELECT * FROM telemetry ORDER BY recorded_at DESC LIMIT 10;
   ```

4. **Vérifier WebSocket (console navigateur):**
   ```javascript
   // Devrait afficher les données en temps réel
   console.log("Données télémétrie:", telemetry_data);
   ```

## 📝 Notes importantes

- Les colonnes existantes sont **conservées** pour compatibilité
- Toutes les nouvelles colonnes sont **NULLABLE**
- Le throttling de 5 secondes pour la BDD est maintenu
- Le broadcast WebSocket reste immédiat
- L'historique (buffer circulaire de 100 points) fonctionne toujours

## 🆘 Support

Si le problème persiste, vérifier:
1. Le topic exact envoyé par MeatPI (`wincan/device1` vs `wincan/deviceX`)
2. Le format exact du JSON (utiliser `mosquitto_sub` pour capturer)
3. Les erreurs dans les logs Python
4. Les erreurs dans la console Supabase
