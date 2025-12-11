"""
MQTT Handler pour Digital Twin Car
Écoute les données OBD-II (ESP32) et les stocke dans Supabase
+ Diffusion en temps réel via WebSocket
"""
import json
from datetime import datetime
from typing import Optional
import paho.mqtt.client as mqtt
from .database import get_supabase
import asyncio
import time
from collections import deque

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
    "vehicle_id": 1,
    
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
    "egr_commanded": None,
    "egr_error": None,
    "warmups_since_code_clear": None,
    "distance_since_code_clear": None,
    "absolute_barometric_pressure": None,
    "pids_supported_41_60": None,
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
    "max_intake_pressure": None
}

# Buffer circulaire pour l'historique (max 100 points pour les graphiques Analytics)
telemetry_history = deque(maxlen=100)

# Variables pour détecter l'état de la voiture
last_message_time = None
vehicle_state = "offline"  # "offline", "running"
last_saved_data = None  # Pour garder les dernières valeurs quand la voiture s'éteint
last_saved_history = []  # Pour garder l'historique en mode offline
last_save_time = 0  # Pour throttling des sauvegardes BDD (max toutes les 5s)

# Mapping des topics wincan (MeatPI) vers les noms de colonnes de la BDD
# Format reçu: wincan/vehicle_speed → {"0D-VehicleSpeed":0}
TOPIC_MAPPING = {
    # PIDs essentiels
    "wincan/engine_load": "engine_load",
    "wincan/coolant_temperature": "coolant_temperature",
    "wincan/intake_pressure": "intake_pressure",
    "wincan/rpm": "rpm",
    "wincan/vehicle_speed": "vehicle_speed",
    "wincan/intake_air_temp": "intake_air_temp",
    "wincan/maf_airflow": "maf_airflow",
    "wincan/throttle_position": "throttle_position",
    
    # PIDs étendus
    "wincan/monitor_status": "monitor_status",
    "wincan/oxygen_sensors_present_banks": "oxygen_sensors_present_banks",
    "wincan/obd_standard": "obd_standard",
    "wincan/time_since_engine_start": "time_since_engine_start",
    "wincan/pids_supported_21_40": "pids_supported_21_40",
    "wincan/distance_mil_on": "distance_mil_on",
    "wincan/fuel_rail_pressure": "fuel_rail_pressure",
    "wincan/oxygen_sensor1_faer": "oxygen_sensor1_faer",
    "wincan/oxygen_sensor1_voltage": "oxygen_sensor1_voltage",
    "wincan/egr_commanded": "egr_commanded",
    "wincan/egr_error": "egr_error",
    "wincan/warmups_since_code_clear": "warmups_since_code_clear",
    "wincan/distance_since_code_clear": "distance_since_code_clear",
    "wincan/absolute_barometric_pressure": "absolute_barometric_pressure",
    "wincan/pids_supported_41_60": "pids_supported_41_60",
    "wincan/monitor_status_drive_cycle": "monitor_status_drive_cycle",
    "wincan/control_module_voltage": "control_module_voltage",
    "wincan/relative_throttle_position": "relative_throttle_position",
    "wincan/ambient_air_temperature": "ambient_air_temperature",
    "wincan/abs_throttle_position_d": "abs_throttle_position_d",
    "wincan/abs_throttle_position_e": "abs_throttle_position_e",
    "wincan/commanded_throttle_actuator": "commanded_throttle_actuator",
    "wincan/max_faer": "max_faer",
    "wincan/max_oxy_sensor_voltage": "max_oxy_sensor_voltage",
    "wincan/max_oxy_sensor_current": "max_oxy_sensor_current",
    "wincan/max_intake_pressure": "max_intake_pressure"
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
    """✅ CORRIGÉ: Parse le JSON {"PID-Name": value} de MeatPI"""
    global last_message_time, vehicle_state, last_saved_data, last_save_time
    
    try:
        topic = msg.topic
        payload = msg.payload.decode('utf-8')
        
        last_message_time = time.time()
        vehicle_state = "running"
        
        print("\n" + "="*70)
        print(f"📩 MESSAGE MQTT REÇU")
        print(f"📍 Topic: {topic}")
        print(f"📦 Payload: {payload}")
        print("-"*70)
        
        if topic in TOPIC_MAPPING:
            field_name = TOPIC_MAPPING[topic]
            
            # ✅ CORRECTION PRINCIPALE: Parser le JSON d'abord
            try:
                # Essayer de parser comme JSON: {"0D-VehicleSpeed":0}
                data = json.loads(payload)
                print(f"🔓 JSON parsé: {data}")
                
                if isinstance(data, dict) and len(data) > 0:
                    # Extraire la première (et unique) paire clé-valeur
                    json_key = list(data.keys())[0]  # Ex: "0D-VehicleSpeed"
                    value = data[json_key]  # Ex: 0
                    
                    print(f"🔑 Clé JSON: {json_key}")
                    print(f"💎 Valeur: {value} (type: {type(value).__name__})")
                    
                    # Conversion si nécessaire
                    if isinstance(value, str):
                        try:
                            value = float(value) if '.' in value else int(value)
                            print(f"🔢 Converti en: {value}")
                        except (ValueError, TypeError):
                            print(f"📝 Gardé comme texte: {value}")
                    
                    latest_data[field_name] = value
                    print(f"✅ DONNÉE MISE À JOUR: {field_name} = {value}")
                    print("="*70 + "\n")
                    
            except json.JSONDecodeError:
                # Fallback: valeur brute (si pas JSON)
                print(f"📝 Pas de JSON, traitement valeur brute")
                try:
                    value = float(payload) if '.' in payload else int(payload)
                except (ValueError, TypeError):
                    value = payload
                
                latest_data[field_name] = value
                print(f"✅ MISE À JOUR: {field_name} = {value}")
                print("="*70 + "\n")
        else:
            print(f"⚠️  TOPIC NON MAPPÉ: {topic}")
            print(f"   Ajoutez: \"{topic}\": \"nom_champ_bdd\",")
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
            asyncio.create_task(broadcast_telemetry())
            
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
        
        telemetry_data = {
            "vehicle_id": latest_data["vehicle_id"],
            
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
            "egr_commanded": latest_data["egr_commanded"],
            "egr_error": latest_data["egr_error"],
            "warmups_since_code_clear": latest_data["warmups_since_code_clear"],
            "distance_since_code_clear": latest_data["distance_since_code_clear"],
            "absolute_barometric_pressure": latest_data["absolute_barometric_pressure"],
            "pids_supported_41_60": latest_data["pids_supported_41_60"],
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
            
            "recorded_at": datetime.utcnow().isoformat()
        }
        
        # Afficher données non-null
        print("📊 Données sauvegardées:")
        for key, val in telemetry_data.items():
            if val is not None and key not in ["vehicle_id", "recorded_at"]:
                print(f"   • {key}: {val}")
        
        result = supabase.table("telemetry").insert(telemetry_data).execute()
        
        print("✅ SAUVEGARDE RÉUSSIE!")
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