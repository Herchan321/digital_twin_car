"""
Script exemple pour configurer rapidement des devices de test

Ce script crée:
1. 3 devices (device1, device2, device3)
2. 3 assignments actifs (1 par véhicule)
3. Affiche la configuration finale

Prérequis:
- Tables créées (CREATE_DEVICE_TABLES.sql exécuté)
- Variables d'environnement Supabase configurées
- Au moins 3 véhicules dans la table 'cars'

Usage:
    python setup_test_devices.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database import get_supabase
from datetime import datetime

def main():
    print("\n" + "="*80)
    print(" "*25 + "CONFIGURATION DEVICES DE TEST")
    print("="*80 + "\n")
    
    supabase = get_supabase()
    
    # ========================================================================
    # ÉTAPE 1: Créer les devices
    # ========================================================================
    print("📦 ÉTAPE 1: Création des devices...")
    print("-"*80)
    
    devices_data = [
        {
            "device_code": "device1",
            "mqtt_topic": "wincan/device1",
            "description": "ESP32 MeatPI Principal - Voiture de test 1",
            "status": "active"
        },
        {
            "device_code": "device2",
            "mqtt_topic": "wincan/device2",
            "description": "ESP32 MeatPI Secondaire - Voiture de test 2",
            "status": "active"
        },
        {
            "device_code": "device3",
            "mqtt_topic": "wincan/device3",
            "description": "ESP32 MeatPI Test - Voiture de test 3",
            "status": "inactive"
        }
    ]
    
    created_devices = []
    
    for device_data in devices_data:
        try:
            # Vérifier si le device existe déjà
            existing = supabase.table("devices").select("*").eq("device_code", device_data["device_code"]).execute()
            
            if existing.data:
                print(f"   ℹ️  Device '{device_data['device_code']}' existe déjà (ID: {existing.data[0]['id']})")
                created_devices.append(existing.data[0])
            else:
                result = supabase.table("devices").insert(device_data).execute()
                print(f"   ✅ Device '{device_data['device_code']}' créé (ID: {result.data[0]['id']})")
                created_devices.append(result.data[0])
                
        except Exception as e:
            print(f"   ❌ Erreur création device '{device_data['device_code']}': {e}")
    
    print(f"\n   📊 Total: {len(created_devices)} devices disponibles\n")
    
    # ========================================================================
    # ÉTAPE 2: Récupérer les véhicules disponibles
    # ========================================================================
    print("🚗 ÉTAPE 2: Récupération des véhicules...")
    print("-"*80)
    
    try:
        vehicles = supabase.table("cars").select("id, name, vin").limit(3).execute()
        
        if not vehicles.data or len(vehicles.data) < 3:
            print("   ⚠️  Pas assez de véhicules dans la table 'cars'")
            print("   💡 Créez au moins 3 véhicules avant d'exécuter ce script")
            return
        
        print(f"   ✅ {len(vehicles.data)} véhicules trouvés:")
        for v in vehicles.data:
            print(f"      • {v['name']} (ID: {v['id']}, VIN: {v.get('vin', 'N/A')})")
        print()
        
    except Exception as e:
        print(f"   ❌ Erreur récupération véhicules: {e}")
        return
    
    # ========================================================================
    # ÉTAPE 3: Créer les assignments
    # ========================================================================
    print("🔗 ÉTAPE 3: Création des assignments...")
    print("-"*80)
    
    assignments_created = 0
    
    for i, device in enumerate(created_devices[:2]):  # Seulement device1 et device2 (device3 inactif)
        vehicle = vehicles.data[i]
        
        try:
            # Vérifier s'il existe déjà un assignment actif
            existing = supabase.table("vehicle_device_assignment").select("*").eq(
                "device_id", device['id']
            ).eq("is_active", True).execute()
            
            if existing.data:
                print(f"   ℹ️  Assignment actif existe déjà: {device['device_code']} → {vehicle['name']}")
                assignments_created += 1
            else:
                assignment_data = {
                    "vehicle_id": vehicle['id'],
                    "device_id": device['id'],
                    "is_active": True,
                    "notes": f"Configuration automatique - Test setup {datetime.now().strftime('%Y-%m-%d')}"
                }
                
                result = supabase.table("vehicle_device_assignment").insert(assignment_data).execute()
                print(f"   ✅ Assignment créé: {device['device_code']} → {vehicle['name']}")
                assignments_created += 1
                
        except Exception as e:
            print(f"   ❌ Erreur création assignment: {e}")
    
    print(f"\n   📊 Total: {assignments_created} assignments actifs\n")
    
    # ========================================================================
    # ÉTAPE 4: Afficher la configuration finale
    # ========================================================================
    print("📋 ÉTAPE 4: Configuration finale")
    print("="*80)
    
    try:
        # Récupérer tous les assignments actifs
        active_assignments = supabase.table("vehicle_device_assignment").select(
            "id, vehicle_id, device_id, is_active, assigned_at, cars(name, vin), devices(device_code, mqtt_topic)"
        ).eq("is_active", True).execute()
        
        if active_assignments.data:
            print(f"\n✅ {len(active_assignments.data)} ASSIGNMENT(S) ACTIF(S):\n")
            
            for assignment in active_assignments.data:
                device = assignment.get('devices', {})
                vehicle = assignment.get('cars', {})
                
                print(f"   🔌 Device: {device.get('device_code')} ({device.get('mqtt_topic')})")
                print(f"      ↓")
                print(f"   🚗 Véhicule: {vehicle.get('name')} (VIN: {vehicle.get('vin', 'N/A')})")
                print(f"      • Assigné depuis: {assignment.get('assigned_at')}")
                print(f"      • Assignment ID: {assignment.get('id')}")
                print()
        else:
            print("\n⚠️  Aucun assignment actif trouvé\n")
        
    except Exception as e:
        print(f"\n❌ Erreur affichage configuration: {e}\n")
    
    # ========================================================================
    # ÉTAPE 5: Instructions finales
    # ========================================================================
    print("="*80)
    print("🎉 CONFIGURATION TERMINÉE !")
    print("="*80)
    print("\n📝 PROCHAINES ÉTAPES:\n")
    print("   1. Vérifier la configuration:")
    print("      → python test_device_assignment.py")
    print()
    print("   2. Redémarrer le backend FastAPI:")
    print("      → uvicorn app.main:app --reload")
    print()
    print("   3. Publier un message MQTT test sur wincan/device1")
    print("      → Les logs devraient afficher:")
    print("         🔧 Device: device1 (ID: X)")
    print("         🚗 Véhicule: [Nom] (ID: Y)")
    print("         ✅ SAUVEGARDE RÉUSSIE! (Device: device1 → Véhicule ID: Y)")
    print()
    print("   4. Voir les données en BDD:")
    print("      SELECT * FROM v_active_device_assignments;")
    print()
    print("="*80 + "\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Opération annulée par l'utilisateur\n")
    except Exception as e:
        print(f"\n\n❌ ERREUR CRITIQUE: {e}\n")
        import traceback
        traceback.print_exc()
