"""
MQTT Handler pour Digital Twin Car
Écoute les données du capteur DHT11 (ESP32) et les stocke dans Supabase
"""
import json
from datetime import datetime
from typing import Optional
import paho.mqtt.client as mqtt
from .database import get_supabase

# === CONFIGURATION MQTT ===
MQTT_BROKER = "109.123.243.44"  # Adresse de votre broker MQTT
MQTT_PORT = 1883
MQTT_USERNAME = "chaari"
MQTT_PASSWORD = "chaari2023"
MQTT_TOPICS = [
    "DIGITALTWIN/temperature",
    "DIGITALTWIN/humidity"
]

# === Variables globales pour stocker les dernières valeurs ===
latest_data = {
    "temperature": None,
    "humidity": None,
    "vehicle_id": 1,  # ID du véhicule par défaut
    "latitude": 31.6346,   # Coordonnées par défaut (Marrakech)
    "longitude": -8.0027,
    "speed_kmh": 0.0,      # Vitesse par défaut
    "battery_pct": 100.0,  # Batterie par défaut
    "rpm": 0.0             # RPM par défaut
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
        
        # Mettre à jour les données selon le topic
        if topic == "DIGITALTWIN/temperature":
            latest_data["temperature"] = float(payload)
        elif topic == "DIGITALTWIN/humidity":
            latest_data["humidity"] = float(payload)
        
        # Si on a les deux valeurs, enregistrer dans la BDD
        if latest_data["temperature"] is not None and latest_data["humidity"] is not None:
            save_to_database()
            
    except Exception as e:
        print(f"❌ Erreur lors du traitement du message: {e}")

def save_to_database():
    """Enregistre les données dans la table telemetry de Supabase"""
    try:
        supabase = get_supabase()
        
        # Préparer les données pour l'insertion
        telemetry_data = {
            "vehicle_id": latest_data["vehicle_id"],
            "latitude": latest_data["latitude"],
            "longitude": latest_data["longitude"],
            "speed_kmh": latest_data["speed_kmh"],
            "battery_pct": latest_data["battery_pct"],
            "temperature": latest_data["temperature"],
            "rpm": latest_data["rpm"],
            "recorded_at": datetime.utcnow().isoformat()
        }
        
        # Insérer dans Supabase
        result = supabase.table("telemetry").insert(telemetry_data).execute()
        
        print(f"✅ Données sauvegardées dans la BDD:")
        print(f"   🌡️  Température: {latest_data['temperature']}°C")
        print(f"   💧 Humidité: {latest_data['humidity']}%")
        print(f"   🚗 Vehicle ID: {latest_data['vehicle_id']}")
        
        # Réinitialiser les valeurs pour le prochain cycle
        latest_data["temperature"] = None
        latest_data["humidity"] = None
        
    except Exception as e:
        print(f"❌ Erreur lors de l'enregistrement en BDD: {e}")

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
    
    mqtt_client = mqtt.Client(client_id="FastAPI_DigitalTwin")
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
        print("✅ Client MQTT démarré!")
        
    except Exception as e:
        print(f"❌ Erreur lors du démarrage du client MQTT: {e}")

def stop_mqtt_client():
    """Arrête le client MQTT"""
    global mqtt_client
    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        print("🛑 Client MQTT arrêté")
