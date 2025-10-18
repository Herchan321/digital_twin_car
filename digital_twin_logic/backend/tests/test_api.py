import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"

def test_api():
    print("Test de l'API Digital Twin Car")
    print("-" * 50)

    try:
        # 1. Récupérer la liste des véhicules
        print("\n1. Récupération des véhicules...")
        response = requests.get(f"{BASE_URL}/vehicles/")
        vehicles = response.json()
        print(f"Nombre de véhicules trouvés : {len(vehicles)}")
        for v in vehicles:
            print(f"- {v['name']} (ID: {v['id']})")

        if not vehicles:
            return

        # Utiliser le premier véhicule pour les tests
        vehicle_id = vehicles[0]['id']

        # 2. Récupérer l'état actuel des véhicules
        print("\n2. État actuel des véhicules...")
        response = requests.get(f"{BASE_URL}/vehicles/status")
        states = response.json()
        print(json.dumps(states, indent=2))

        # 3. Récupérer les statistiques quotidiennes
        print("\n3. Statistiques quotidiennes...")
        response = requests.get(f"{BASE_URL}/analytics/daily-stats")
        stats = response.json()
        print(json.dumps(stats, indent=2))

        # 4. Récupérer les statistiques d'un véhicule
        print(f"\n4. Statistiques du véhicule {vehicle_id}...")
        response = requests.get(f"{BASE_URL}/analytics/vehicle-stats/{vehicle_id}")
        vehicle_stats = response.json()
        print(json.dumps(vehicle_stats, indent=2))

        # 5. Récupérer l'historique d'un véhicule
        print(f"\n5. Historique du véhicule {vehicle_id}...")
        response = requests.get(
            f"{BASE_URL}/analytics/vehicle-history/{vehicle_id}",
            params={
                "start_time": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
                "end_time": datetime.utcnow().isoformat()
            }
        )
        history = response.json()
        print(f"Nombre de points de données : {len(history)}")
        if history:
            print("Dernier point :", json.dumps(history[0], indent=2))

    except Exception as e:
        print(f"Erreur lors du test : {e}")

if __name__ == "__main__":
    test_api()