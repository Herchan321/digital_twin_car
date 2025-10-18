import os
from dotenv import load_dotenv
import paho.mqtt.client as mqtt
import json
from datetime import datetime, UTC

# Load environment variables
load_dotenv()

# MQTT Configuration
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))

class MQTTHandler:
    def __init__(self):
        self.client = mqtt.Client(protocol=mqtt.MQTTv5)
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message

    def connect(self):
        """Connecte le client MQTT au broker"""
        try:
            self.client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.client.loop_start()
            return True
        except Exception as e:
            print(f"Erreur de connexion MQTT: {e}")
            return False

    def disconnect(self):
        """Déconnecte le client MQTT"""
        self.client.loop_stop()
        self.client.disconnect()

    def on_connect(self, client, userdata, flags, rc):
        """Callback appelé lors de la connexion au broker"""
        if rc == 0:
            print("Connecté au broker MQTT")
            # Souscrire aux topics pertinents
            self.client.subscribe("vehicle/+/telemetry")
        else:
            print(f"Échec de connexion au broker MQTT avec code: {rc}")

    def on_message(self, client, userdata, msg):
        """Callback appelé lors de la réception d'un message"""
        try:
            payload = json.loads(msg.payload.decode())
            vehicle_id = msg.topic.split('/')[1]
            
            # Ajouter un timestamp si non présent
            if 'timestamp' not in payload:
                payload['timestamp'] = datetime.now(UTC).isoformat()
                
            # Traiter les données télémétriques ici
            print(f"Données reçues pour le véhicule {vehicle_id}: {payload}")
            
        except json.JSONDecodeError:
            print(f"Erreur de décodage JSON: {msg.payload}")
        except Exception as e:
            print(f"Erreur lors du traitement du message: {e}")

    def publish_telemetry(self, vehicle_id: str, data: dict):
        """Publie des données télémétriques pour un véhicule"""
        topic = f"vehicle/{vehicle_id}/telemetry"
        try:
            if 'timestamp' not in data:
                data['timestamp'] = datetime.now(UTC).isoformat()
            
            message = json.dumps(data)
            self.client.publish(topic, message)
            return True
        except Exception as e:
            print(f"Erreur lors de la publication: {e}")
            return False

# Créer une instance singleton du handler MQTT
mqtt_handler = MQTTHandler()
