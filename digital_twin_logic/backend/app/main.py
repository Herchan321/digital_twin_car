from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from .database import get_supabase
from .routers import vehicles, telemetry, predictions
from .mqtt_handler import start_mqtt_client, stop_mqtt_client
from .realtime import manager
from fastapi import WebSocket, WebSocketDisconnect

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
    allow_origins=["http://localhost:3000"],  # URL de votre frontend Next.js
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routers
app.include_router(vehicles.router, tags=["vehicles"])
app.include_router(telemetry.router, prefix="/analytics", tags=["analytics"])
app.include_router(predictions.router, tags=["predictions"])


# WebSocket endpoint pour telemetry
@app.websocket('/ws/telemetry')
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # keep connection open; clients typically won't send messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)

# === ÉVÉNEMENTS DE DÉMARRAGE ET D'ARRÊT ===
@app.on_event("startup")
async def on_startup():
    """Démarrer le client MQTT au démarrage de l'application"""
    print("🚀 Démarrage de l'application FastAPI...")
    start_mqtt_client()
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