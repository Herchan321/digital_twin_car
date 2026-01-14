from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from .database import get_supabase
from .routers import vehicles, telemetry, predictions, devices
from .mqtt_handler import start_mqtt_client, stop_mqtt_client, check_vehicle_state, get_latest_data
from .realtime import manager
from fastapi import WebSocket, WebSocketDisconnect
import asyncio

# Load environment variables
load_dotenv()

# FastAPI app
app = FastAPI(
    title="Digital Twin Car API",
    description="""
    API pour le système de jumeau numérique de véhicules.
    
    Fonctionnalités:
    * 🚗 Gestion des véhicules
    * 📍 Suivi en temps réel via MQTT
    * 📊 Analyse des données télémétriques
    * 🔋 État de la batterie
    * 🌡️ Surveillance de la température (DHT11)
    """,
    version="1.0.0",
    docs_url="/",
    redoc_url="/docs"
)

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Développement local
        "https://gounane.ovh",        # Production HTTPS
        "http://gounane.ovh",         # Production HTTP
        "http://api.gounane.ovh",     # Sous-domaine API
        "https://api.gounane.ovh",    # Sous-domaine API HTTPS
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routers
app.include_router(vehicles.router, tags=["vehicles"])
app.include_router(telemetry.router, prefix="/analytics", tags=["analytics"])
app.include_router(predictions.router, tags=["predictions"])
app.include_router(devices.router, prefix="/api", tags=["devices"])


# WebSocket endpoint pour telemetry
@app.websocket('/ws/telemetry')
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Envoyer immédiatement les dernières données disponibles
        import json
        initial_data = get_latest_data()
        await websocket.send_text(json.dumps(initial_data))
        
        while True:
            # keep connection open; clients typically won't send messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)


# Endpoint REST pour obtenir les dernières données
@app.get("/telemetry/latest")
def get_latest_telemetry(vehicle_id: int = 1):
    """Retourne les dernières données de télémétrie pour un véhicule spécifique
    
    Args:
        vehicle_id: ID du véhicule (défaut: 1)
    """
    return get_latest_data(vehicle_id)


# === ÉVÉNEMENTS DE DÉMARRAGE ET D'ARRÊT ===
@app.on_event("startup")
async def on_startup():
    """Démarrer le client MQTT au démarrage de l'application"""
    print("🚀 Démarrage de l'application FastAPI...")
    # Enregistrer la boucle asyncio principale pour que les callbacks MQTT
    # (qui tournent dans un thread séparé) puissent planifier des coroutines
    # de manière thread-safe via run_coroutine_threadsafe.
    from . import mqtt_handler as mqtt_handler_module
    mqtt_handler_module.async_loop = asyncio.get_running_loop()
    start_mqtt_client()
    
    # Démarrer la tâche de vérification de l'état de la voiture
    asyncio.create_task(check_vehicle_state())
    
    print("✅ Application FastAPI démarrée avec succès!")

@app.on_event("shutdown")
async def on_shutdown():
    """Arrêter proprement le client MQTT lors de l'arrêt"""
    print("🛑 Arrêt de l'application...")
    stop_mqtt_client()
    print("✅ Application arrêtée proprement!")

@app.get("/health")
def health_check():
    """Endpoint de vérification de santé"""
    return {
        "status": "healthy",
        "mqtt": "connected",
        "message": "Digital Twin Car API is running"
    }