# app.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from asyncio_mqtt import Client, MqttError
import asyncio
import json

app = FastAPI()

BROKER = "gounane.ovh@broker.emqx.io:1883"
TOPIC = "test/topic"

# ---------- MQTT Listener ----------
async def mqtt_listener():
    async with Client(BROKER) as client:
        await client.subscribe(TOPIC)
        print(f"✅ Abonné à {TOPIC}")
        async with client.unfiltered_messages() as messages:
            async for message in messages:
                decoded = message.payload.decode()
                print(f"📩 Message reçu: {decoded} sur {message.topic}")

                # 👉 ENVOI EN TEMPS RÉEL PAR WEBSOCKET
                await broadcast_data({"topic": message.topic, "value": decoded})


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(mqtt_listener())


# ---------- MQTT Publish ----------
@app.post("/publish")
async def publish_message(payload: dict):
    msg = payload.get("message", "Hello MQTT")
    async with Client(BROKER) as client:
        await client.publish(TOPIC, msg)
    return {"status": "sent", "message": msg}


@app.get("/")
def root():
    return {"message": "FastAPI + MQTT bridge running!"}


# ---------- WEBSOCKET ----------
connected_clients = []

@app.websocket("/ws/data")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.remove(websocket)


# 👉 Fonction pour envoyer les données en temps réel
async def broadcast_data(data):
    for ws in connected_clients:
        await ws.send_text(json.dumps(data))
