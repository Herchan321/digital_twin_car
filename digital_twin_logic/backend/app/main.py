from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paho.mqtt import client as mqtt
import json
import os
from datetime import datetime
from typing import List
from dotenv import load_dotenv
from .database import get_supabase
from .routers import vehicles, telemetry, predictions

# Load environment variables
load_dotenv()

# MQTT Config
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))

# FastAPI app
app = FastAPI(
    title="Digital Twin Car API",
    description="""
    API pour le système de jumeau numérique de véhicules.
    
    Fonctionnalités:
    * 🚗 Gestion des véhicules
    * 📍 Suivi en temps réel
    * 📊 Analyse des données télémétriques
    * 🔋 État de la batterie
    * 🌡️ Surveillance de la température
    """,
    version="1.0.0",
    docs_url="/",
    redoc_url="/docs"
)

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # URL de votre frontend Next.js
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routers
app.include_router(vehicles.router, tags=["vehicles"])
app.include_router(telemetry.router, prefix="/analytics", tags=["analytics"])
app.include_router(predictions.router, tags=["predictions"])

# MQTT Client setup
def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT broker with result code {rc}")
    client.subscribe("vehicles/+/telemetry")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        # Extraire vehicle_id du topic
        vehicle_id = int(msg.topic.split('/')[1])
        
        # Préparer les données de télémétrie
        telemetry_data = {
            "vehicle_id": vehicle_id,
            "latitude": payload.get("lat"),
            "longitude": payload.get("lon"),
            "speed_kmh": payload.get("speed_kmh"),
            "battery_pct": payload.get("battery_pct"),
            "temperature": payload.get("temperature", 25.0)  # valeur par défaut
        }
        
        # Insérer dans Supabase
        supabase = get_supabase()
        response = supabase.table('telemetry').insert(telemetry_data).execute()
        print(f"Stored telemetry for vehicle {vehicle_id}")
    except Exception as e:
        print(f"Error processing MQTT message: {e}")

def start_mqtt_client():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_forever()
    except Exception as e:
        print(f"Failed to connect to MQTT broker: {e}")

@app.on_event("startup")
async def on_startup():
    # Démarrer le client MQTT dans un thread séparé
    import threading
    mqtt_thread = threading.Thread(target=start_mqtt_client, daemon=True)
    mqtt_thread.start()

# Ajouter cette importation avec vos autres importations
from .routers import telemetry, vehicles, predictions

# Plus loin dans le code, où vous incluez les routeurs:
app.include_router(telemetry.router)
app.include_router(vehicles.router)
app.include_router(predictions.router)  # Ajoutez cette ligne