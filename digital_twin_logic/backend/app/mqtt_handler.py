"""
MQTT Handler pour Digital Twin Car
Écoute les données OBD-II (ESP32) et les stocke dans Supabase
+ Diffusion en temps réel via WebSocket
"""
import json
from datetime import datetime
from typing import Optional
import paho.mqtt.client as mqtt
from .database import get_supabase, get_device_by_topic, get_active_vehicle_for_device
import asyncio
import time
from collections import deque

# Référence vers la boucle asyncio principale (initialisée au démarrage FastAPI)
async_loop: Optional[asyncio.AbstractEventLoop] = None

# === CONFIGURATION MQTT ===
MQTT_BROKER = "109.123.243.44"
MQTT_PORT = 1883
MQTT_USERNAME = "chaari"
MQTT_PASSWORD = "chaari2023"

# === TOUS LES TOPICS OBD-II ===
MQTT_TOPICS = [
    "wincan/#",  # S'abonner à tous les topics wincan (configuration MeatPI)
]

# === Variables globales pour stocker les dernières valeurs ===
latest_data = {
    "vehicle_id": None,  # Résolu dynamiquement depuis vehicle_device_assignment
    "device_id": None,   # ID du device qui envoie les données
    "device_code": None, # Code du device (ex: "device1")
    
    # PIDs essentiels (04-11)
    "engine_load": None,
    "coolant_temperature": None,
    "intake_pressure": None,
    "rpm": None,
    "vehicle_speed": None,
    "intake_air_temp": None,
    "maf_airflow": None,
    "throttle_position": None,
    
    # PIDs étendus
    "monitor_status": None,
    "oxygen_sensors_present_banks": None,
    "obd_standard": None,
    "time_since_engine_start": None,
    "pids_supported_21_40": None,
    "distance_mil_on": None,
    "fuel_rail_pressure": None,
    "oxygen_sensor1_faer": None,
    "oxygen_sensor1_voltage": None,
    "oxygen_sensor2_faer": None,
    "egr_commanded": None,
    "egr_error": None,
    "egr_commanded_error": None,
    "warmups_since_code_clear": None,
    "distance_since_code_clear": None,
    "absolute_barometric_pressure": None,
    "pids_supported_41_60": None,
    "pids_supported_61_80": None,
    "pids_supported_81_a0": None,
    "monitor_status_drive_cycle": None,
    "control_module_voltage": None,
    "relative_throttle_position": None,
    "ambient_air_temperature": None,
    "abs_throttle_position_d": None,
    "abs_throttle_position_e": None,
    "commanded_throttle_actuator": None,
    "max_faer": None,
    "max_oxy_sensor_voltage": None,
    "max_oxy_sensor_current": None,
    "max_intake_pressure": None,
    "engine_coolant_temp1": None,
    "engine_coolant_temp2": None,
    "charge_air_cooler_temp": None,
    "egt_bank1": None,
    "diesel_aftertreatment": None
}

# Buffer circulaire pour l'historique (max 100 points pour les graphiques Analytics)
telemetry_history = deque(maxlen=100)

# Variables pour détecter l'état de la voiture
last_message_time = None
vehicle_state = "offline"  # "offline", "running"
last_saved_data = None  # Pour garder les dernières valeurs quand la voiture s'éteint
last_saved_history = []  # Pour garder l'historique en mode offline
last_save_time = 0  # Pour throttling des sauvegardes BDD (max toutes les 5s)

# Mapping des PIDs OBD-II reçus vers les noms de colonnes de la BDD
# Format reçu: wincan/device1 → {"01-MonitorStatus":0, "04-CalcEngineLoad":79.61, ...}
PID_TO_COLUMN_MAPPING = {
    # PIDs essentiels
    "01-MonitorStatus": "monitor_status",
    "04-CalcEngineLoad": "engine_load",
    "05-EngineCoolantTemp": "coolant_temperature",
    "0B-IntakeManiAbsPress": "intake_pressure",
    "0C-EngineRPM": "rpm",
    "0D-VehicleSpeed": "vehicle_speed",
    "0F-IntakeAirTemperature": "intake_air_temp",
    "10-MAFAirFlowRate": "maf_airflow",
    "11-ThrottlePosition": "throttle_position",
    
    # PIDs étendus
    "13-OxySensorsPresent_2Banks": "oxygen_sensors_present_banks",
    "1C-OBDStandard": "obd_standard",
    "1F-TimeSinceEngStart": "time_since_engine_start",
    "20-PIDsSupported_21_40": "pids_supported_21_40",
    "21-DistanceMILOn": "distance_mil_on",
    "23-FuelRailGaug": "fuel_rail_pressure",
    "24-OxySensor1_FAER": "oxygen_sensor1_faer",
    "24-OxySensor1_Volt": "oxygen_sensor1_voltage",
    "25-OxySensor2_FAER": "oxygen_sensor2_faer",
    "30-WarmUpsSinceCodeClear": "warmups_since_code_clear",
    "31-DistanceSinceCodeClear": "distance_since_code_clear",
    "33-AbsBaroPres": "absolute_barometric_pressure",
    "40-PIDsSupported_41_60": "pids_supported_41_60",
    "41-MonStatusDriveCycle": "monitor_status_drive_cycle",
    "42-ControlModuleVolt": "control_module_voltage",
    "45-RelThrottlePos": "relative_throttle_position",
    "46-AmbientAirTemp": "ambient_air_temperature",
    "49-AbsThrottlePosD": "abs_throttle_position_d",
    "4A-AbsThrottlePosE": "abs_throttle_position_e",
    "4C-CmdThrottleAct": "commanded_throttle_actuator",
    "4F-Max_FAER": "max_faer",
    "4F-Max_OxySensVol": "max_oxy_sensor_voltage",
    "4F-Max_OxySensCrnt": "max_oxy_sensor_current",
    "4F-Max_IntManiAbsPres": "max_intake_pressure",
    "60-PIDsSupported_61_80": "pids_supported_61_80",
    "67-EngineCoolantTemp1": "engine_coolant_temp1",
    "67-EngineCoolantTemp2": "engine_coolant_temp2",
    "69-CmdEGR_EGRError": "egr_commanded_error",
    "77-ChargeAirCoolerTemperature": "charge_air_cooler_temp",
    "78-EGT_Bank1": "egt_bank1",
    "80-PIDsSupported_81_A0": "pids_supported_81_a0",
    "8B-DieselAftertreatment": "diesel_aftertreatment"
}

def on_connect(client, userdata, flags, rc):
    """Callback lors de la connexion au broker MQTT"""
    if rc == 0:
        print("\n" + "="*70)
        print("✅ CONNECTÉ AU BROKER MQTT AVEC SUCCÈS!")
        print("="*70)
        for topic in MQTT_TOPICS:
            client.subscribe(topic)
            print(f"📡 Abonné au topic: {topic}")
        print("="*70 + "\n")
    else:
        print(f"❌ Échec de connexion MQTT, code: {rc}")

def on_message(client, userdata, msg):
    """✅ RÉSOLUTION DYNAMIQUE: Extrait device_id depuis topic → Résout vehicle_id depuis BDD"""
    global last_message_time, vehicle_state, last_saved_data, last_save_time
    
    try:
        topic = msg.topic
        payload = msg.payload.decode('utf-8')
        
        last_message_time = time.time()
        vehicle_state = "running"
        
        print("\n" + "="*70)
        print(f"📩 MESSAGE MQTT REÇU")
        print(f"📍 Topic: {topic}")
        print(f"📦 Payload (tronqué): {payload[:200]}..." if len(payload) > 200 else f"📦 Payload: {payload}")
        print("-"*70)
        
        # ============================================================================
        # ÉTAPE 1: Extraire le device depuis le topic MQTT
        # ============================================================================
        if not topic.startswith("wincan/"):
            print(f"⚠️  TOPIC NON RECONNU: {topic} (attendu: wincan/deviceX)")
            print("="*70 + "\n")
            return
        
        # Récupérer le device depuis la BDD
        device = get_device_by_topic(topic)
        
        if not device:
            print(f"❌ ERREUR: Device non trouvé pour le topic {topic}")
            print("💡 Assurez-vous que le device existe dans la table 'devices'")
            print("="*70 + "\n")
            return
        
        device_id = device['id']
        device_code = device['device_code']
        device_status = device['status']
        
        print(f"🔧 Device: {device_code} (ID: {device_id}) - Status: {device_status}")
        
        # Vérifier si le device est actif
        if device_status != 'active':
            print(f"⚠️  Device {device_code} n'est pas actif (status: {device_status})")
            print("="*70 + "\n")
            return
        
        # ============================================================================
        # ÉTAPE 2: Résoudre dynamiquement le véhicule associé au device
        # ============================================================================
        assignment = get_active_vehicle_for_device(device_id)
        
        if not assignment:
            print(f"❌ ERREUR: Aucun véhicule actif associé au device {device_code}")
            print("💡 Créez une association dans la table 'vehicle_device_assignment' avec is_active=TRUE")
            print("="*70 + "\n")
            return
        
        vehicle_id = assignment['vehicle_id']
        vehicle_name = assignment['vehicle_name']
        
        print(f"🚗 Véhicule: {vehicle_name} (ID: {vehicle_id})")
        print(f"🔗 Association active depuis: {assignment['assigned_at']}")
        
        # Mettre à jour les métadonnées dans latest_data
        latest_data['vehicle_id'] = vehicle_id
        latest_data['device_id'] = device_id
        latest_data['device_code'] = device_code
        
        # ============================================================================
        # ÉTAPE 3: Parser le JSON MQTT avec tous les PIDs
        # ============================================================================
        try:
            data = json.loads(payload)
            print(f"🔓 JSON parsé avec {len(data)} PIDs")
            
            if not isinstance(data, dict):
                print(f"⚠️  Format inattendu: attendu dict, reçu {type(data).__name__}")
                return
            
            # Mettre à jour toutes les valeurs depuis le JSON
            updated_fields = 0
            unmapped_pids = []
            
            for pid_key, value in data.items():
                if pid_key in PID_TO_COLUMN_MAPPING:
                    field_name = PID_TO_COLUMN_MAPPING[pid_key]
                    
                    # Conversion si nécessaire
                    if isinstance(value, str):
                        try:
                            value = float(value) if '.' in value else int(value)
                        except (ValueError, TypeError):
                            pass  # Garder comme texte
                    
                    latest_data[field_name] = value
                    updated_fields += 1
                else:
                    unmapped_pids.append(pid_key)
            
            print(f"✅ {updated_fields} CHAMPS MIS À JOUR")
            
            if unmapped_pids:
                print(f"⚠️  {len(unmapped_pids)} PIDs non mappés: {', '.join(unmapped_pids[:5])}{'...' if len(unmapped_pids) > 5 else ''}")
                print(f"   Ajoutez-les dans PID_TO_COLUMN_MAPPING si nécessaire")
            
            print("-"*70)
            
        except json.JSONDecodeError as e:
            print(f"❌ Erreur parsing JSON: {e}")
            print("="*70 + "\n")
            return
        
        # Vérifier données essentielles
        has_essential_data = (
            latest_data["rpm"] is not None or
            latest_data["vehicle_speed"] is not None or
            latest_data["engine_load"] is not None or
            latest_data["coolant_temperature"] is not None or
            latest_data["control_module_voltage"] is not None
        )
        
        if has_essential_data:
            # ✅ AJOUTER AU BUFFER CIRCULAIRE (pour graphiques Analytics)
            telemetry_point = {
                "timestamp": datetime.utcnow().isoformat(),
                "rpm": latest_data["rpm"],
                "vehicle_speed": latest_data["vehicle_speed"],
                "coolant_temperature": latest_data["coolant_temperature"],
                "engine_load": latest_data["engine_load"],
                "fuel_rail_pressure": latest_data["fuel_rail_pressure"],
                "control_module_voltage": latest_data["control_module_voltage"]
            }
            telemetry_history.append(telemetry_point)
            print(f"📊 Historique: {len(telemetry_history)} points en buffer")
            
            # ✅ THROTTLING: Sauvegarder max toutes les 5s
            current_time = time.time()
            if current_time - last_save_time >= 5:
                print("💾 Sauvegarde en BDD...")
                save_to_database()
                last_save_time = current_time
                last_saved_data = latest_data.copy()
                last_saved_history = list(telemetry_history)  # Sauvegarder l'historique
            
            # Broadcaster immédiatement via WebSocket (avec historique)
            print("📡 Diffusion WebSocket...")
            # Les callbacks paho-mqtt s'exécutent dans un thread séparé.
            # Utiliser run_coroutine_threadsafe avec la boucle asyncio principale
            # qui est initialisée lors de l'événement startup de FastAPI.
            try:
                if async_loop is not None and async_loop.is_running():
                    asyncio.run_coroutine_threadsafe(broadcast_telemetry(), async_loop)
                else:
                    # Tentative de fallback: si on est dans le thread d'événement asyncio
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(broadcast_telemetry())
                    except RuntimeError:
                        print("⚠️ Aucun event loop disponible pour diffuser WebSocket")
            except Exception as e:
                print(f"❌ Erreur planification broadcast: {e}")
            
    except Exception as e:
        print(f"❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()
        print("="*70 + "\n")


async def broadcast_telemetry():
    """Diffuse les données de télémétrie + historique via WebSocket"""
    try:
        from .realtime import manager
        
        telemetry_message = {
            "type": "telemetry_update",
            "state": vehicle_state,
            "data": latest_data.copy(),  # Dernière valeur pour KPIs Dashboard
            "history": list(telemetry_history),  # Historique complet pour graphiques Analytics
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await manager.broadcast(json.dumps(telemetry_message))
        print(f"✅ WebSocket diffusé - {len(manager.active_connections)} clients - {len(telemetry_history)} points historiques - État: {vehicle_state}")
    except Exception as e:
        print(f"❌ Erreur WebSocket: {e}")

def save_to_database():
    """Enregistre les données dans la table telemetry de Supabase"""
    try:
        supabase = get_supabase()
        
        print("\n" + "="*70)
        print("💾 SAUVEGARDE EN BASE DE DONNÉES")
        print("-"*70)
        
        # Vérifier que vehicle_id et device_id sont définis
        if latest_data["vehicle_id"] is None or latest_data["device_id"] is None:
            print("⚠️  Impossible de sauvegarder: vehicle_id ou device_id manquant")
            print("   Vérifiez l'association device ↔ véhicule dans vehicle_device_assignment")
            print("="*70 + "\n")
            return
        
        telemetry_data = {
            "vehicle_id": latest_data["vehicle_id"],
            "device_id": latest_data["device_id"],
            
            # PIDs essentiels
            "engine_load": latest_data["engine_load"],
            "coolant_temperature": latest_data["coolant_temperature"],
            "intake_pressure": latest_data["intake_pressure"],
            "rpm": latest_data["rpm"],
            "vehicle_speed": latest_data["vehicle_speed"],
            "intake_air_temp": latest_data["intake_air_temp"],
            "maf_airflow": latest_data["maf_airflow"],
            "throttle_position": latest_data["throttle_position"],
            
            # PIDs étendus
            "monitor_status": latest_data["monitor_status"],
            "oxygen_sensors_present_banks": latest_data["oxygen_sensors_present_banks"],
            "obd_standard": latest_data["obd_standard"],
            "time_since_engine_start": latest_data["time_since_engine_start"],
            "pids_supported_21_40": latest_data["pids_supported_21_40"],
            "distance_mil_on": latest_data["distance_mil_on"],
            "fuel_rail_pressure": latest_data["fuel_rail_pressure"],
            "oxygen_sensor1_faer": latest_data["oxygen_sensor1_faer"],
            "oxygen_sensor1_voltage": latest_data["oxygen_sensor1_voltage"],
            "oxygen_sensor2_faer": latest_data.get("oxygen_sensor2_faer"),
            "egr_commanded": latest_data["egr_commanded"],
            "egr_error": latest_data["egr_error"],
            "egr_commanded_error": latest_data.get("egr_commanded_error"),
            "warmups_since_code_clear": latest_data["warmups_since_code_clear"],
            "distance_since_code_clear": latest_data["distance_since_code_clear"],
            "absolute_barometric_pressure": latest_data["absolute_barometric_pressure"],
            "pids_supported_41_60": latest_data["pids_supported_41_60"],
            "pids_supported_61_80": latest_data.get("pids_supported_61_80"),
            "pids_supported_81_a0": latest_data.get("pids_supported_81_a0"),
            "monitor_status_drive_cycle": latest_data["monitor_status_drive_cycle"],
            "control_module_voltage": latest_data["control_module_voltage"],
            "relative_throttle_position": latest_data["relative_throttle_position"],
            "ambient_air_temperature": latest_data["ambient_air_temperature"],
            "abs_throttle_position_d": latest_data["abs_throttle_position_d"],
            "abs_throttle_position_e": latest_data["abs_throttle_position_e"],
            "commanded_throttle_actuator": latest_data["commanded_throttle_actuator"],
            "max_faer": latest_data["max_faer"],
            "max_oxy_sensor_voltage": latest_data["max_oxy_sensor_voltage"],
            "max_oxy_sensor_current": latest_data["max_oxy_sensor_current"],
            "max_intake_pressure": latest_data["max_intake_pressure"],
            "engine_coolant_temp1": latest_data.get("engine_coolant_temp1"),
            "engine_coolant_temp2": latest_data.get("engine_coolant_temp2"),
            "charge_air_cooler_temp": latest_data.get("charge_air_cooler_temp"),
            "egt_bank1": latest_data.get("egt_bank1"),
            "diesel_aftertreatment": latest_data.get("diesel_aftertreatment"),
            
            "recorded_at": datetime.utcnow().isoformat()
        }
        
        # Afficher données non-null
        print("📊 Données sauvegardées:")
        for key, val in telemetry_data.items():
            if val is not None and key not in ["vehicle_id", "recorded_at"]:
                print(f"   • {key}: {val}")
        
        result = supabase.table("telemetry").insert(telemetry_data).execute()
        
        print(f"✅ SAUVEGARDE RÉUSSIE! (Device: {latest_data['device_code']} → Véhicule ID: {latest_data['vehicle_id']})")
        print("="*70 + "\n")
        
    except Exception as e:
        print(f"❌ Erreur lors de l'enregistrement en BDD: {e}")
        import traceback
        traceback.print_exc()

def on_disconnect(client, userdata, rc):
    """Callback lors de la déconnexion"""
    if rc != 0:
        print(f"⚠️ Déconnexion inattendue du broker MQTT. Code: {rc}")
        print("🔄 Tentative de reconnexion...")

# === Client MQTT ===
mqtt_client = None

def start_mqtt_client():
    """Démarre le client MQTT"""
    global mqtt_client
    
    mqtt_client = mqtt.Client(client_id="FastAPI_DigitalTwin_OBD2")
    mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    mqtt_client.on_disconnect = on_disconnect
    
    try:
        print("\n" + "="*70)
        print("🚀 DÉMARRAGE CLIENT MQTT")
        print(f"🔌 Broker: {MQTT_BROKER}:{MQTT_PORT}")
        print(f"👤 User: {MQTT_USERNAME}")
        print("="*70)
        
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
        
        print("✅ Client MQTT démarré!")
        print("="*70 + "\n")
        
    except Exception as e:
        print(f"❌ Erreur MQTT: {e}")
        import traceback
        traceback.print_exc()

def stop_mqtt_client():
    """Arrête le client MQTT"""
    global mqtt_client
    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        print("🛑 Client MQTT arrêté")


async def check_vehicle_state():
    """Vérifie périodiquement l'état de la voiture (offline si pas de message depuis 10s)"""
    global vehicle_state, last_message_time, last_saved_history
    from .realtime import manager
    
    while True:
        await asyncio.sleep(5)  # Vérifier toutes les 5 secondes
        
        if last_message_time is None:
            continue
            
        time_since_last_message = time.time() - last_message_time
        
        # Si pas de message depuis plus de 10 secondes, considérer la voiture offline
        if time_since_last_message > 10 and vehicle_state == "running":
            vehicle_state = "offline"
            print(f"🔴 Voiture OFFLINE - Pas de message depuis {time_since_last_message:.1f}s")
            
            # Envoyer l'état offline avec les dernières valeurs ET l'historique complet sauvegardés
            offline_message = {
                "type": "telemetry_update",
                "state": "offline",
                "data": last_saved_data if last_saved_data else latest_data.copy(),
                "history": last_saved_history,  # Historique complet avant extinction
                "timestamp": datetime.utcnow().isoformat()
            }
            await manager.broadcast(json.dumps(offline_message))


def get_latest_data():
    """Retourne les dernières données + historique (pour l'endpoint REST API)"""
    return {
        "state": vehicle_state,
        "data": latest_data.copy() if vehicle_state == "running" else (last_saved_data if last_saved_data else latest_data.copy()),
        "history": list(telemetry_history) if vehicle_state == "running" else last_saved_history,
        "timestamp": datetime.utcnow().isoformat()
    }