"""
Script pour vérifier les données dans Supabase
"""
import os
from dotenv import load_dotenv
from supabase import create_client

# Charger les variables d'environnement
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Variables d'environnement SUPABASE_URL ou SUPABASE_KEY manquantes!")
    print("Vérifiez votre fichier .env")
    exit(1)

# Créer le client Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("🔍 Vérification des données dans Supabase...")
print(f"URL: {SUPABASE_URL}")

# Récupérer les 10 dernières entrées de télémétrie
try:
    response = supabase.table("telemetry") \
        .select("*") \
        .eq("vehicle_id", 1) \
        .order("recorded_at", desc=True) \
        .limit(10) \
        .execute()
    
    data = response.data
    
    if not data or len(data) == 0:
        print("⚠️ Aucune donnée trouvée pour vehicle_id=1")
        print("Vérifiez que le backend MQTT est en cours d'exécution et que l'ESP32 publie des données")
    else:
        print(f"\n✅ {len(data)} enregistrement(s) trouvé(s):\n")
        
        for i, record in enumerate(data, 1):
            print(f"📊 Enregistrement #{i}:")
            print(f"   ID: {record.get('id')}")
            print(f"   🌡️  Température: {record.get('temperature')}°C")
            print(f"   💧 Batterie: {record.get('battery_pct')}%")
            print(f"   🚗 Vitesse: {record.get('speed_kmh')} km/h")
            print(f"   ⏰ Enregistré à: {record.get('recorded_at')}")
            print()
        
        print("\n📌 Dernière donnée (la plus récente):")
        latest = data[0]
        print(f"   Température: {latest.get('temperature')}°C")
        print(f"   Batterie: {latest.get('battery_pct')}%")
        print(f"   Vitesse: {latest.get('speed_kmh')} km/h")
        print(f"   RPM: {latest.get('rpm', 0)}")
        print(f"   Position: {latest.get('latitude')}, {latest.get('longitude')}")

except Exception as e:
    print(f"❌ Erreur lors de la récupération des données: {e}")
