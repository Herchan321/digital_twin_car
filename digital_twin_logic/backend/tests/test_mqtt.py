import pytest
import paho.mqtt.client as mqtt
import json
import time
from app.mqtt_handler import mqtt_handler, MQTT_BROKER, MQTT_PORT

def test_mqtt_publish_subscribe():
    """Test la publication et la souscription MQTT."""
    
    received_messages = []
    
    # Test data including RPM
    test_data = {
        "latitude": 48.8566,
        "longitude": 2.3522,
        "speed_kmh": 60.0,
        "battery_pct": 85.5,
        "temperature": 25.0,
        "rpm": 2500.0
    }
    
    def on_message(client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
            received_messages.append(payload)
        except json.JSONDecodeError:
            print(f"Erreur de décodage JSON: {msg.payload}")
    
    # Configuration du client de test
    client = mqtt.Client(protocol=mqtt.MQTTv5)
    client.on_message = on_message
    
    # Connexion au broker
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        
        # Souscription au topic de test
        test_topic = "test/vehicle/123/telemetry"
        client.subscribe(test_topic)
        
        # Préparation des données de test
        test_data = {
            "temperature": 25.5,
            "battery_level": 85,
            "latitude": 48.8566,
            "longitude": 2.3522
        }
        
        # Publication du message
        client.publish(test_topic, json.dumps(test_data))
        
        # Attendre la réception du message
        time.sleep(2)
        
        # Vérification
        assert len(received_messages) > 0, "Aucun message reçu"
        assert received_messages[0]["temperature"] == test_data["temperature"]
        assert received_messages[0]["battery_level"] == test_data["battery_level"]
        
    finally:
        client.loop_stop()
        client.disconnect()

def test_mqtt_handler():
    """Test le handler MQTT personnalisé"""
    
    # Connexion du handler
    assert mqtt_handler.connect(), "La connexion du handler MQTT a échoué"
    
    # Test de publication
    test_data = {
        "temperature": 30.0,
        "battery_level": 90,
        "latitude": 45.7589,
        "longitude": 4.8422
    }
    
    assert mqtt_handler.publish_telemetry("test123", test_data), "La publication a échoué"
    
    # Déconnexion propre
    mqtt_handler.disconnect()