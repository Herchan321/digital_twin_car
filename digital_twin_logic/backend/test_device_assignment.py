"""
Script de test pour vérifier la configuration des devices et assignments

Ce script vérifie:
1. Connexion à Supabase
2. Présence des tables devices et vehicle_device_assignment  
3. Fonctions utilitaires (get_device_by_topic, get_active_vehicle_for_device)
4. État des assignments actifs

Utilisation:
    python test_device_assignment.py
"""
import sys
import os

# Ajouter le répertoire app au path pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database import (
    get_supabase, 
    get_device_by_topic, 
    get_active_vehicle_for_device,
    get_all_active_assignments
)
from dotenv import load_dotenv

load_dotenv()

def test_supabase_connection():
    """Test de connexion à Supabase"""
    print("\n" + "="*70)
    print("TEST 1: Connexion à Supabase")
    print("="*70)
    
    try:
        supabase = get_supabase()
        print("✅ Connexion Supabase OK")
        return True
    except Exception as e:
        print(f"❌ Erreur de connexion Supabase: {e}")
        return False


def test_tables_existence():
    """Vérifier l'existence des tables devices et vehicle_device_assignment"""
    print("\n" + "="*70)
    print("TEST 2: Vérification des tables")
    print("="*70)
    
    supabase = get_supabase()
    
    try:
        # Tester la table devices
        result = supabase.table("devices").select("id").limit(1).execute()
        print("✅ Table 'devices' existe")
        devices_ok = True
    except Exception as e:
        print(f"❌ Table 'devices' non trouvée: {e}")
        devices_ok = False
    
    try:
        # Tester la table vehicle_device_assignment
        result = supabase.table("vehicle_device_assignment").select("id").limit(1).execute()
        print("✅ Table 'vehicle_device_assignment' existe")
        assignments_ok = True
    except Exception as e:
        print(f"❌ Table 'vehicle_device_assignment' non trouvée: {e}")
        assignments_ok = False
    
    try:
        # Vérifier que telemetry a la colonne device_id
        result = supabase.table("telemetry").select("device_id").limit(1).execute()
        print("✅ Table 'telemetry' a la colonne 'device_id'")
        telemetry_ok = True
    except Exception as e:
        print(f"❌ Table 'telemetry' n'a pas la colonne 'device_id': {e}")
        telemetry_ok = False
    
    return devices_ok and assignments_ok and telemetry_ok


def test_list_devices():
    """Lister tous les devices enregistrés"""
    print("\n" + "="*70)
    print("TEST 3: Liste des devices enregistrés")
    print("="*70)
    
    supabase = get_supabase()
    
    try:
        result = supabase.table("devices").select("*").execute()
        
        if result.data:
            print(f"✅ {len(result.data)} device(s) trouvé(s):\n")
            for device in result.data:
                print(f"   • {device['device_code']}")
                print(f"     - ID: {device['id']}")
                print(f"     - Topic MQTT: {device['mqtt_topic']}")
                print(f"     - Status: {device['status']}")
                print(f"     - Description: {device.get('description', 'N/A')}")
                print()
            return True
        else:
            print("⚠️  Aucun device trouvé dans la base de données")
            print("💡 Exécutez d'abord le script SQL CREATE_DEVICE_TABLES.sql")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des devices: {e}")
        return False


def test_device_by_topic():
    """Tester la fonction get_device_by_topic"""
    print("\n" + "="*70)
    print("TEST 4: Fonction get_device_by_topic()")
    print("="*70)
    
    # Tester avec un topic qui devrait exister
    test_topic = "wincan/device1"
    
    print(f"🔍 Recherche du device avec topic: {test_topic}")
    device = get_device_by_topic(test_topic)
    
    if device:
        print(f"✅ Device trouvé: {device['device_code']} (ID: {device['id']})")
        return True
    else:
        print(f"⚠️  Device non trouvé pour le topic: {test_topic}")
        print("💡 Créez un device avec ce topic dans la table 'devices'")
        return False


def test_active_assignments():
    """Lister tous les assignments actifs"""
    print("\n" + "="*70)
    print("TEST 5: Assignments actifs")
    print("="*70)
    
    assignments = get_all_active_assignments()
    
    if assignments:
        print(f"✅ {len(assignments)} assignment(s) actif(s):\n")
        for assignment in assignments:
            print(f"   • Device {assignment.get('device_code')} → Véhicule {assignment.get('vehicle_name')}")
            print(f"     - Vehicle ID: {assignment.get('vehicle_id')}")
            print(f"     - Device ID: {assignment.get('device_id')}")
            print(f"     - Topic MQTT: {assignment.get('mqtt_topic')}")
            print(f"     - Depuis: {assignment.get('assigned_at')}")
            print()
        return True
    else:
        print("⚠️  Aucun assignment actif trouvé")
        print("💡 Créez un assignment dans la table 'vehicle_device_assignment'")
        print("   avec is_active=TRUE")
        return False


def test_vehicle_for_device():
    """Tester la fonction get_active_vehicle_for_device"""
    print("\n" + "="*70)
    print("TEST 6: Fonction get_active_vehicle_for_device()")
    print("="*70)
    
    # D'abord, récupérer un device existant
    supabase = get_supabase()
    result = supabase.table("devices").select("id, device_code").limit(1).execute()
    
    if not result.data:
        print("⚠️  Aucun device dans la BDD pour tester")
        return False
    
    device_id = result.data[0]['id']
    device_code = result.data[0]['device_code']
    
    print(f"🔍 Recherche du véhicule actif pour device: {device_code} (ID: {device_id})")
    
    assignment = get_active_vehicle_for_device(device_id)
    
    if assignment:
        print(f"✅ Véhicule actif trouvé: {assignment['vehicle_name']} (ID: {assignment['vehicle_id']})")
        print(f"   - Assignment ID: {assignment['assignment_id']}")
        print(f"   - VIN: {assignment.get('vehicle_vin', 'N/A')}")
        print(f"   - Assigné depuis: {assignment['assigned_at']}")
        return True
    else:
        print(f"⚠️  Aucun véhicule actif associé au device {device_code}")
        print("💡 Créez un assignment actif pour ce device")
        return False


def main():
    """Exécuter tous les tests"""
    print("\n" + "="*80)
    print(" "*20 + "TEST DE CONFIGURATION DEVICES & ASSIGNMENTS")
    print("="*80)
    
    tests = [
        ("Connexion Supabase", test_supabase_connection),
        ("Tables existantes", test_tables_existence),
        ("Liste des devices", test_list_devices),
        ("Fonction get_device_by_topic", test_device_by_topic),
        ("Assignments actifs", test_active_assignments),
        ("Fonction get_active_vehicle_for_device", test_vehicle_for_device),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Exception durant le test '{test_name}': {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # Résumé
    print("\n" + "="*80)
    print("RÉSUMÉ DES TESTS")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\n{passed}/{total} tests réussis")
    
    if passed == total:
        print("\n🎉 Tous les tests sont passés! Le système est prêt.")
    else:
        print("\n⚠️  Certains tests ont échoué. Vérifiez la configuration.")
        print("💡 Assurez-vous d'avoir exécuté le script CREATE_DEVICE_TABLES.sql")
    
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
