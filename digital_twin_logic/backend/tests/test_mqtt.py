import pytest
import paho.mqtt.client as mqtt
import json
import time
from app.mqtt_handler import MQTT_BROKER, MQTT_PORT

@pytest.fixture
def mqtt_client():
    client = mqtt.Client()
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()
    yield client
    client.loop_stop()
    client.disconnect()

def test_mqtt_publish_subscribe(mqtt_client):
    """Test la publication et la souscription MQTT."""
    
    received_messages = []
    
    def on_message(client, userdata, message):
        received_messages.append(json.loads(message.payload.decode()))
    
    # S'abonner au topic de test
    test_topic = "test/vehicle/telemetry"
    mqtt_client.subscribe(test_topic)
    mqtt_client.on_message = on_message
    
    # Publier un message de test
    test_data = {
        "vehicle_id": "TEST123",
        "latitude": 48.8566,
        "longitude": 2.3522,
        "battery_level": 85
    }
    
    mqtt_client.publish(test_topic, json.dumps(test_data))
    
    # Attendre la réception du message
    time.sleep(1)
    
    assert len(received_messages) == 1
    assert received_messages[0]["vehicle_id"] == test_data["vehicle_id"]
    assert received_messages[0]["battery_level"] == test_data["battery_level"]