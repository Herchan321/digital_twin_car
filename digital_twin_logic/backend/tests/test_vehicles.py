import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_supabase

client = TestClient(app)

@pytest.fixture
def supabase():
    return get_supabase()

def test_create_vehicle():
    """Test la création d'un véhicule via l'API."""
    vehicle_data = {
        "name": "Test Vehicle",
        "vin": "TEST123456789"
    }
    response = client.post("/api/vehicles/", json=vehicle_data)
    assert response.status_code == 200
    created_vehicle = response.json()
    assert created_vehicle["name"] == vehicle_data["name"]
    assert created_vehicle["vin"] == vehicle_data["vin"]
    
    # Nettoyer après le test
    supabase = get_supabase()
    supabase.table("vehicles").delete().eq("vin", vehicle_data["vin"]).execute()

def test_get_vehicles():
    """Test la récupération de la liste des véhicules."""
    response = client.get("/api/vehicles/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_vehicle_telemetry():
    """Test l'envoi et la réception des données télémétriques."""
    # Créer un véhicule de test
    vehicle_data = {
        "name": "Telemetry Test Vehicle",
        "vin": "TELEMETRY123"
    }
    create_response = client.post("/api/vehicles/", json=vehicle_data)
    vehicle_id = create_response.json()["id"]
    
    # Envoyer des données télémétriques
    telemetry_data = {
        "vehicle_id": vehicle_id,
        "timestamp": "2025-10-18T10:00:00Z",
        "latitude": 48.8566,
        "longitude": 2.3522,
        "battery_level": 85,
        "temperature": 25.5
    }
    
    response = client.post("/api/telemetry/", json=telemetry_data)
    assert response.status_code == 200
    
    # Vérifier les données télémétriques
    response = client.get(f"/api/telemetry/{vehicle_id}")
    assert response.status_code == 200
    telemetry = response.json()
    assert len(telemetry) > 0
    
    # Nettoyer après le test
    supabase = get_supabase()
    supabase.table("vehicles").delete().eq("id", vehicle_id).execute()
    supabase.table("telemetry").delete().eq("vehicle_id", vehicle_id).execute()