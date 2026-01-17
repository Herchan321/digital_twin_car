"""
API Router pour la gestion des Devices et Assignments

Endpoints:
- GET /devices - Liste tous les devices
- POST /devices - Créer un nouveau device
- GET /devices/{device_id} - Détails d'un device
- PUT /devices/{device_id} - Modifier un device
- DELETE /devices/{device_id} - Supprimer un device

- GET /assignments/active - Liste des assignments actifs
- POST /assignments - Créer un nouvel assignment
- PUT /assignments/{assignment_id}/deactivate - Désactiver un assignment
"""
from fastapi import APIRouter, HTTPException, status
from typing import List
from datetime import datetime
from ..database import get_supabase, get_device_by_topic, get_active_vehicle_for_device, get_all_active_assignments
from ..models import (
    Device, DeviceCreate,
    VehicleDeviceAssignment, VehicleDeviceAssignmentCreate,
    ActiveDeviceAssignment
)

router = APIRouter(prefix="/api", tags=["devices"])

# ============================================================================
# ENDPOINTS DEVICES
# ============================================================================

@router.get("/devices", response_model=List[Device])
async def list_devices(status: str = None):
    """
    Liste tous les devices OBD-II.
    
    Query params:
        status: Filtrer par status (active, inactive, maintenance)
    """
    try:
        supabase = get_supabase()
        query = supabase.table("devices").select("*")
        
        if status:
            query = query.eq("status", status)
        
        result = query.execute()
        return result.data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des devices: {str(e)}"
        )


@router.post("/devices", response_model=Device, status_code=status.HTTP_201_CREATED)
async def create_device(device: DeviceCreate):
    """
    Créer un nouveau device OBD-II.
    
    Body:
        device_code: Identifiant unique (ex: "device1")
        mqtt_topic: Topic MQTT complet (ex: "wincan/device1")
        description: Description optionnelle
        status: active (default), inactive, maintenance
    """
    try:
        supabase = get_supabase()
        
        # Vérifier que le device_code n'existe pas déjà
        existing = supabase.table("devices").select("id").eq("device_code", device.device_code).execute()
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Device avec le code '{device.device_code}' existe déjà"
            )
        
        # Vérifier que le mqtt_topic n'existe pas déjà
        existing = supabase.table("devices").select("id").eq("mqtt_topic", device.mqtt_topic).execute()
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Device avec le topic '{device.mqtt_topic}' existe déjà"
            )
        
        # Créer le device
        result = supabase.table("devices").insert(device.dict()).execute()
        
        if result.data:
            return result.data[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de la création du device"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création du device: {str(e)}"
        )


@router.get("/devices/{device_id}", response_model=Device)
async def get_device(device_id: int):
    """Récupérer les détails d'un device spécifique."""
    try:
        supabase = get_supabase()
        result = supabase.table("devices").select("*").eq("id", device_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device ID {device_id} non trouvé"
            )
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération du device: {str(e)}"
        )


@router.put("/devices/{device_id}", response_model=Device)
async def update_device(device_id: int, device: DeviceCreate):
    """
    Modifier un device existant.
    
    Permet de changer:
    - description
    - status (active, inactive, maintenance)
    
    Note: device_code et mqtt_topic ne peuvent pas être modifiés
          (car ils sont des clés uniques critiques)
    """
    try:
        supabase = get_supabase()
        
        # Vérifier que le device existe
        existing = supabase.table("devices").select("*").eq("id", device_id).execute()
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device ID {device_id} non trouvé"
            )
        
        # Mettre à jour uniquement description et status
        update_data = {
            "description": device.description,
            "status": device.status,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("devices").update(update_data).eq("id", device_id).execute()
        
        if result.data:
            return result.data[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de la mise à jour du device"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise à jour du device: {str(e)}"
        )


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(device_id: int):
    """
    Supprimer un device.
    
    Attention: Supprime aussi tous les assignments associés (CASCADE).
    Les télémétries existantes auront device_id=NULL.
    """
    try:
        supabase = get_supabase()
        
        # Vérifier que le device existe
        existing = supabase.table("devices").select("id").eq("id", device_id).execute()
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device ID {device_id} non trouvé"
            )
        
        # Supprimer le device (CASCADE sur assignments)
        supabase.table("devices").delete().eq("id", device_id).execute()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression du device: {str(e)}"
        )


# ============================================================================
# ENDPOINTS ASSIGNMENTS
# ============================================================================

@router.get("/assignments/active")
async def list_active_assignments():
    """
    Liste tous les assignments actifs (device → véhicule).
    
    Retourne les détails complets: device, véhicule, dates, etc.
    """
    try:
        assignments = get_all_active_assignments()
        return {
            "count": len(assignments),
            "assignments": assignments
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des assignments: {str(e)}"
        )


@router.get("/assignments/device/{device_id}")
async def get_device_assignment(device_id: int):
    """
    Récupérer l'assignment actif d'un device spécifique.
    
    Retourne les détails du véhicule associé, ou 404 si aucun assignment actif.
    """
    try:
        assignment = get_active_vehicle_for_device(device_id)
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aucun assignment actif pour le device ID {device_id}"
            )
        
        return assignment
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération de l'assignment: {str(e)}"
        )


@router.post("/assignments", response_model=VehicleDeviceAssignment, status_code=status.HTTP_201_CREATED)
async def create_assignment(assignment: VehicleDeviceAssignmentCreate):
    """
    Créer un nouvel assignment device → véhicule.
    
    Body:
        vehicle_id: ID du véhicule
        device_id: ID du device
        is_active: TRUE (default) pour activer immédiatement
        notes: Notes optionnelles
    
    Note: Si is_active=TRUE, l'ancien assignment actif du device sera
          automatiquement désactivé (via trigger SQL).
    """
    try:
        supabase = get_supabase()
        
        # Vérifier que le véhicule existe
        vehicle = supabase.table("cars").select("id, name").eq("id", assignment.vehicle_id).execute()
        if not vehicle.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Véhicule ID {assignment.vehicle_id} non trouvé"
            )
        
        # Vérifier que le device existe
        device = supabase.table("devices").select("id, device_code, status").eq("id", assignment.device_id).execute()
        if not device.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device ID {assignment.device_id} non trouvé"
            )
        
        # Vérifier que le device est actif
        if device.data[0]['status'] != 'active':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Device {device.data[0]['device_code']} n'est pas actif (status: {device.data[0]['status']})"
            )
        
        # Créer l'assignment
        result = supabase.table("vehicle_device_assignment").insert(assignment.dict()).execute()
        
        if result.data:
            return result.data[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de la création de l'assignment"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création de l'assignment: {str(e)}"
        )


@router.put("/assignments/{assignment_id}/deactivate")
async def deactivate_assignment(assignment_id: int):
    """
    Désactiver un assignment (débrancher un device).
    
    Met is_active=FALSE et enregistre unassigned_at=NOW().
    """
    try:
        supabase = get_supabase()
        
        # Vérifier que l'assignment existe et est actif
        existing = supabase.table("vehicle_device_assignment").select("*").eq("id", assignment_id).execute()
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment ID {assignment_id} non trouvé"
            )
        
        if not existing.data[0]['is_active']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Assignment ID {assignment_id} est déjà désactivé"
            )
        
        # Désactiver l'assignment
        update_data = {
            "is_active": False,
            "unassigned_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("vehicle_device_assignment").update(update_data).eq("id", assignment_id).execute()
        
        if result.data:
            return {
                "message": "Assignment désactivé avec succès",
                "assignment": result.data[0]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de la désactivation de l'assignment"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la désactivation de l'assignment: {str(e)}"
        )


@router.get("/assignments/history/device/{device_id}")
async def get_device_history(device_id: int, limit: int = 10):
    """
    Récupérer l'historique complet des assignments d'un device.
    
    Utile pour tracer tous les véhicules sur lesquels le device a été branché.
    
    Query params:
        limit: Nombre max de résultats (default: 10)
    """
    try:
        supabase = get_supabase()
        
        # Vérifier que le device existe
        device = supabase.table("devices").select("device_code").eq("id", device_id).execute()
        if not device.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device ID {device_id} non trouvé"
            )
        
        # Récupérer l'historique avec jointure sur cars
        result = supabase.table("vehicle_device_assignment").select(
            "id, vehicle_id, is_active, assigned_at, unassigned_at, notes, cars(id, name, vin)"
        ).eq("device_id", device_id).order("assigned_at", desc=True).limit(limit).execute()
        
        return {
            "device_id": device_id,
            "device_code": device.data[0]['device_code'],
            "history_count": len(result.data),
            "history": result.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération de l'historique: {str(e)}"
        )


@router.get("/assignments/history/vehicle/{vehicle_id}")
async def get_vehicle_history(vehicle_id: int, limit: int = 10):
    """
    Récupérer l'historique complet des devices branchés sur un véhicule.
    
    Utile pour tracer tous les devices utilisés sur un véhicule.
    
    Query params:
        limit: Nombre max de résultats (default: 10)
    """
    try:
        supabase = get_supabase()
        
        # Vérifier que le véhicule existe
        vehicle = supabase.table("cars").select("name").eq("id", vehicle_id).execute()
        if not vehicle.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Véhicule ID {vehicle_id} non trouvé"
            )
        
        # Récupérer l'historique avec jointure sur devices
        result = supabase.table("vehicle_device_assignment").select(
            "id, device_id, is_active, assigned_at, unassigned_at, notes, devices(id, device_code, mqtt_topic)"
        ).eq("vehicle_id", vehicle_id).order("assigned_at", desc=True).limit(limit).execute()
        
        return {
            "vehicle_id": vehicle_id,
            "vehicle_name": vehicle.data[0]['name'],
            "history_count": len(result.data),
            "history": result.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération de l'historique: {str(e)}"
        )
