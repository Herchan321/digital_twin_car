"""
Test simple pour publier des données MQTT de test
"""
import paho.mqtt.client as mqtt
import time
import random

# Configuration
MQTT_BROKER = "109.123.243.44"
MQTT_PORT = 1883
MQTT_USERNAME = "chaari"
MQTT_PASSWORD = "chaari2023"

def publish_test_data():
    client = mqtt.Client(client_id="TestPublisher")
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    
    try:
        print(f"🔌 Connexion à {MQTT_BROKER}:{MQTT_PORT}...")
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        
        print("✅ Connecté! Publication de données de test...\n")
        
        for i in range(5):
            # Générer des données aléatoires
            temperature = round(20 + random.uniform(0, 10), 2)
            humidity = round(40 + random.uniform(0, 30), 2)
            
            # Publier température
            client.publish("DIGITALTWIN/temperature", str(temperature))
            print(f"📤 {i+1}. Température publiée: {temperature}°C")
            
            time.sleep(0.5)
            
            # Publier humidité
            client.publish("DIGITALTWIN/humidity", str(humidity))
            print(f"📤 {i+1}. Humidité publiée: {humidity}%")
            
            print(f"   ⏰ Attente de 5 secondes...\n")
            time.sleep(5)
        
        client.disconnect()
        print("✅ Test terminé!")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    print("🧪 Test de publication MQTT")
    print("=" * 50)
    publish_test_data()
