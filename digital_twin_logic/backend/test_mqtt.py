"""
Script de test pour vérifier la connexion MQTT
"""
import paho.mqtt.client as mqtt
import time

# Configuration
MQTT_BROKER = "109.123.243.44"
MQTT_PORT = 1883
MQTT_USERNAME = "chaari"
MQTT_PASSWORD = "chaari2023"
MQTT_TOPICS = [
    "DIGITALTWIN/temperature",
    "DIGITALTWIN/humidity"
]

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Connecté au broker MQTT avec succès!")
        for topic in MQTT_TOPICS:
            client.subscribe(topic)
            print(f"📡 Abonné au topic: {topic}")
    else:
        print(f"❌ Échec de connexion, code: {rc}")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode('utf-8')
    print(f"📩 Message reçu sur {topic}: {payload}")

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"⚠️ Déconnexion inattendue. Code: {rc}")

if __name__ == "__main__":
    print("🔌 Test de connexion MQTT...")
    print(f"Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"Username: {MQTT_USERNAME}")
    
    client = mqtt.Client(client_id="TestMQTT_Client")
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        print("🔄 En attente de messages... (Ctrl+C pour arrêter)")
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n🛑 Arrêt du test...")
        client.disconnect()
        print("✅ Test terminé!")
    except Exception as e:
        print(f"❌ Erreur: {e}")
