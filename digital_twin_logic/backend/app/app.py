# app.py
from fastapi import FastAPI
from asyncio_mqtt import Client, MqttError
import asyncio

app = FastAPI()

BROKER = "gounane.ovh@broker.emqx.io:1883"   # ou l’adresse de ton serveur MQTTX (ex: localhost)
TOPIC = "test/topic"

# --- Tâche asynchrone MQTT ---
async def mqtt_listener():
    async with Client(BROKER) as client:
        await client.subscribe(TOPIC)
        print(f"✅ Abonné à {TOPIC}")
        async with client.unfiltered_messages() as messages:
            async for message in messages:
                print(f"📩 Message reçu: {message.payload.decode()} sur {message.topic}")

# --- Lancer MQTT en arrière-plan ---
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(mqtt_listener())

# --- Endpoint FastAPI pour publier un message MQTT ---
@app.post("/publish")
async def publish_message(payload: dict):
    msg = payload.get("message", "Hello MQTT")
    async with Client(BROKER) as client:
        await client.publish(TOPIC, msg)
    return {"status": "sent", "message": msg}

# --- Pour tester ---
@app.get("/")
def root():
    return {"message": "FastAPI + MQTT bridge running!"}
