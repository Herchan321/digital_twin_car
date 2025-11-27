"""
MQTT Handler pour Digital Twin Car
Écoute les données OBD-II (ESP32) et les stocke dans Supabase
"""
import json
from datetime import datetime
from typing import Optional
import paho.mqtt.client as mqtt
from .database import get_supabase

# === CONFIGURATION MQTT ===
MQTT_BROKER = "109.123.243.44"
MQTT_PORT = 1883
MQTT_USERNAME = "chaari"
MQTT_PASSWORD = "chaari2023"

# === TOUS LES TOPICS OBD-II ===
MQTT_TOPICS = [
    # PIDs essentiels (04-11)
    "wican/#",  # S'abonner à tous les topics wican
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

# Mapping des topics wican vers les noms de colonnes de la BDD
TOPIC_MAPPING = {
    # PIDs essentiels
    "wican/engine_load": "engine_load",
    "wican/coolant_temperature": "coolant_temperature",
    "wican/intake_pressure": "intake_pressure",
    "wican/rpm": "rpm",
    "wican/vehicle_speed": "vehicle_speed",
    "wican/intake_air_temp": "intake_air_temp",
    "wican/maf_airflow": "maf_airflow",
    "wican/throttle_position": "throttle_position",
    
    # PIDs étendus
    "wican/monitor_status": "monitor_status",
    "wican/oxygen_sensors_present_banks": "oxygen_sensors_present_banks",
    "wican/obd_standard": "obd_standard",
    "wican/time_since_engine_start": "time_since_engine_start",
    "wican/pids_supported_21_40": "pids_supported_21_40",
    "wican/distance_mil_on": "distance_mil_on",
    "wican/fuel_rail_pressure": "fuel_rail_pressure",
    "wican/oxygen_sensor1_faer": "oxygen_sensor1_faer",
    "wican/oxygen_sensor1_voltage": "oxygen_sensor1_voltage",
    "wican/egr_commanded": "egr_commanded",
    "wican/egr_error": "egr_error",
    "wican/warmups_since_code_clear": "warmups_since_code_clear",
    "wican/distance_since_code_clear": "distance_since_code_clear",
    "wican/absolute_barometric_pressure": "absolute_barometric_pressure",
    "wican/pids_supported_41_60": "pids_supported_41_60",
    "wican/monitor_status_drive_cycle": "monitor_status_drive_cycle",
    "wican/control_module_voltage": "control_module_voltage",
    "wican/relative_throttle_position": "relative_throttle_position",
    "wican/ambient_air_temperature": "ambient_air_temperature",
    "wican/abs_throttle_position_d": "abs_throttle_position_d",
    "wican/abs_throttle_position_e": "abs_throttle_position_e",
    "wican/commanded_throttle_actuator": "commanded_throttle_actuator",
    "wican/max_faer": "max_faer",
    "wican/max_oxy_sensor_voltage": "max_oxy_sensor_voltage",
    "wican/max_oxy_sensor_current": "max_oxy_sensor_current",
    "wican/max_intake_pressure": "max_intake_pressure"
}

def on_connect(client, userdata, flags, rc):
    """Callback lors de la connexion au broker MQTT"""
    if rc == 0:
        print("✅ Connecté au broker MQTT avec succès!")
        # S'abonner aux topics
        for topic in MQTT_TOPICS:
            client.subscribe(topic)
            print(f"📡 Abonné au topic: {topic}")
    else:
        print(f"❌ Échec de connexion MQTT, code: {rc}")

def on_message(client, userdata, msg):
    """Callback lors de la réception d'un message MQTT"""
    try:
        topic = msg.topic
        payload = msg.payload.decode('utf-8')
        
        print(f"📩 Message reçu sur {topic}: {payload}")
        
        # Vérifier si le topic est dans notre mapping
        if topic in TOPIC_MAPPING:
            field_name = TOPIC_MAPPING[topic]
            
            # Mettre à jour les données
            try:
                # Essayer de convertir en float
                latest_data[field_name] = float(payload)
            except ValueError:
                try:
                    # Essayer de convertir en int
                    latest_data[field_name] = int(payload)
                except ValueError:
                    # Sinon garder comme texte
                    latest_data[field_name] = payload
            
            print(f"✓ Mise à jour: {field_name} = {latest_data[field_name]}")
        
        # Vérifier si on a au moins quelques valeurs essentielles avant de sauvegarder
        has_essential_data = (
            latest_data["rpm"] is not None or
            latest_data["vehicle_speed"] is not None or
            latest_data["engine_load"] is not None
        )
        
        if has_essential_data:
            save_to_database()
            
    except Exception as e:
        print(f"❌ Erreur lors du traitement du message: {e}")
        import traceback
        traceback.print_exc()

def save_to_database():
    """Enregistre les données dans la table telemetry de Supabase"""
    try:
        supabase = get_supabase()
        
        # Préparer les données pour l'insertion (toutes les colonnes)
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
        
        # Insérer dans Supabase
        result = supabase.table("telemetry").insert(telemetry_data).execute()
        
        print(f"✅ Données OBD-II sauvegardées:")
        if latest_data["rpm"]:
            print(f"   🔧 RPM: {latest_data['rpm']}")
        if latest_data["vehicle_speed"]:
            print(f"   🚗 Vitesse: {latest_data['vehicle_speed']} km/h")
        if latest_data["engine_load"]:
            print(f"   ⚙️  Charge moteur: {latest_data['engine_load']}%")
        if latest_data["fuel_rail_pressure"]:
            print(f"   ⛽ Pression rail: {latest_data['fuel_rail_pressure']} kPa")
        
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
    
    # Définir les callbacks
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    mqtt_client.on_disconnect = on_disconnect
    
    try:
        print(f"🔌 Connexion au broker MQTT {MQTT_BROKER}:{MQTT_PORT}...")
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        
        # Démarrer la boucle dans un thread séparé
        mqtt_client.loop_start()
        print("✅ Client MQTT OBD-II démarré!")
        
    except Exception as e:
        print(f"❌ Erreur lors du démarrage du client MQTT: {e}")

def stop_mqtt_client():
    """Arrête le client MQTT"""
    global mqtt_client
    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        print("🛑 Client MQTT arrêté")