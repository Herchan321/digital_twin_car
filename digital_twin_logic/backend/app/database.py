import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional, Dict, Any
import logging

# Charger les variables d'environnement
load_dotenv()

# Configuration Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Créer le client Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Logger pour traçabilité
logger = logging.getLogger(__name__)

# Fonction pour obtenir le client Supabase
def get_supabase() -> Client:
    return supabase

# ============================================================================
# FONCTIONS UTILITAIRES POUR GESTION DYNAMIQUE DES DEVICES
# ============================================================================

def get_device_by_topic(mqtt_topic: str) -> Optional[Dict[str, Any]]:
    """
    Récupère un device depuis son topic MQTT.
    
    Args:
        mqtt_topic: Topic MQTT complet (ex: "wincan/device1")
        
    Returns:
        Dict contenant les infos du device, ou None si non trouvé
        
    Example:
        >>> device = get_device_by_topic("wincan/device1")
        >>> print(device['device_code'])  # "device1"
    """
    try:
        result = supabase.table("devices").select("*").eq("mqtt_topic", mqtt_topic).execute()
        
        if result.data and len(result.data) > 0:
            device = result.data[0]
            logger.info(f"✅ Device trouvé: {device['device_code']} (ID: {device['id']}) - Status: {device['status']}")
            return device
        else:
            logger.warning(f"⚠️  Aucun device trouvé pour le topic: {mqtt_topic}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Erreur lors de la récupération du device pour topic {mqtt_topic}: {e}")
        return None


def get_active_vehicle_for_device(device_id: int) -> Optional[Dict[str, Any]]:
    """
    Récupère le véhicule actuellement associé à un device (is_active = True).
    
    Args:
        device_id: ID du device dans la table devices
        
    Returns:
        Dict contenant l'assignment actif avec détails véhicule, ou None si aucune association active
        
    Example:
        >>> assignment = get_active_vehicle_for_device(1)
        >>> print(assignment['vehicle_id'])  # 5
        >>> print(assignment['vehicle_name'])  # "Tesla Model 3"
    """
    try:
        # Requête avec jointure pour récupérer aussi les infos du véhicule
        result = supabase.table("vehicle_device_assignment").select(
            "id, vehicle_id, device_id, is_active, assigned_at, notes, vehicles(id, name, vin, status)"
        ).eq("device_id", device_id).eq("is_active", True).execute()
        
        if result.data and len(result.data) > 0:
            assignment = result.data[0]
            vehicle = assignment.get('vehicles', {})
            
            logger.info(
                f"✅ Assignment actif trouvé: Device {device_id} → Véhicule {vehicle.get('name', 'N/A')} "
                f"(ID: {assignment['vehicle_id']}) depuis {assignment['assigned_at']}"
            )
            
            # Enrichir l'objet assignment avec les données du véhicule
            return {
                "assignment_id": assignment["id"],
                "vehicle_id": assignment["vehicle_id"],
                "device_id": assignment["device_id"],
                "is_active": assignment["is_active"],
                "assigned_at": assignment["assigned_at"],
                "notes": assignment.get("notes"),
                "vehicle_name": vehicle.get("name"),
                "vehicle_vin": vehicle.get("vin"),
                "vehicle_status": vehicle.get("status")
            }
        else:
            logger.warning(f"⚠️  Aucun assignment actif trouvé pour le device ID: {device_id}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Erreur lors de la récupération de l'assignment actif pour device {device_id}: {e}")
        return None


def get_all_active_assignments() -> list[Dict[str, Any]]:
    """
    Récupère tous les assignments actifs (pour monitoring/debug).
    
    Returns:
        Liste des assignments actifs avec détails véhicule et device
    """
    try:
        result = supabase.table("v_active_device_assignments").select("*").execute()
        
        if result.data:
            logger.info(f"📊 {len(result.data)} assignment(s) actif(s) trouvé(s)")
            return result.data
        else:
            logger.info("ℹ️  Aucun assignment actif")
            return []
            
    except Exception as e:
        logger.error(f"❌ Erreur lors de la récupération des assignments actifs: {e}")
        return []


