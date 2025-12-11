"""
Script de test WebSocket pour Digital Twin Car
Permet de vérifier la connexion WebSocket et la réception des données
"""
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws/telemetry"
    
    print("🔌 Tentative de connexion au WebSocket...")
    print(f"📡 URI: {uri}\n")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connexion WebSocket établie !")
            print("📊 En attente des données...\n")
            
            # Recevoir les messages
            message_count = 0
            while True:
                try:
                    message = await websocket.recv()
                    message_count += 1
                    
                    # Parser le JSON
                    data = json.loads(message)
                    
                    print(f"📨 Message #{message_count} reçu:")
                    print(f"   Type: {data.get('type')}")
                    print(f"   État: {data.get('state')}")
                    print(f"   Timestamp: {data.get('timestamp')}")
                    
                    # Afficher quelques valeurs importantes
                    telemetry = data.get('data', {})
                    if telemetry:
                        print(f"   📊 Données:")
                        if telemetry.get('rpm') is not None:
                            print(f"      🔧 RPM: {telemetry['rpm']}")
                        if telemetry.get('vehicle_speed') is not None:
                            print(f"      🚗 Vitesse: {telemetry['vehicle_speed']} km/h")
                        if telemetry.get('coolant_temperature') is not None:
                            print(f"      🌡️  Température: {telemetry['coolant_temperature']}°C")
                        if telemetry.get('control_module_voltage') is not None:
                            print(f"      🔋 Batterie: {telemetry['control_module_voltage']}V")
                        if telemetry.get('engine_load') is not None:
                            print(f"      ⚙️  Charge: {telemetry['engine_load']}%")
                    
                    print("-" * 50)
                    
                except websockets.exceptions.ConnectionClosed:
                    print("❌ Connexion WebSocket fermée")
                    break
                except json.JSONDecodeError:
                    print(f"⚠️  Message non-JSON reçu: {message}")
                    
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        print("\n💡 Assurez-vous que:")
        print("   1. Le backend FastAPI est démarré (uvicorn app.main:app --reload)")
        print("   2. Le port 8000 est accessible")
        print("   3. Le client MQTT est connecté et reçoit des données")

if __name__ == "__main__":
    print("=" * 50)
    print("🧪 Test WebSocket - Digital Twin Car")
    print("=" * 50)
    print()
    
    try:
        asyncio.run(test_websocket())
    except KeyboardInterrupt:
        print("\n\n⏹️  Test arrêté par l'utilisateur")
        print("✅ Connexion fermée proprement")
