from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from ..database import get_supabase

router = APIRouter()

# ------------------------------
# 📦 MODELS
# ------------------------------
class TelemetryIn(BaseModel):
    vehicle_id: int
    
    # PIDs essentiels (04-11) - du mqtt_handler
    engine_load: Optional[float] = None
    coolant_temperature: Optional[float] = None
    intake_pressure: Optional[float] = None
    rpm: Optional[float] = None
    vehicle_speed: Optional[float] = None
    intake_air_temp: Optional[float] = None
    maf_airflow: Optional[float] = None
    throttle_position: Optional[float] = None
    
    # PIDs étendus - du mqtt_handler
    monitor_status: Optional[str] = None
    oxygen_sensors_present_banks: Optional[int] = None
    obd_standard: Optional[str] = None
    time_since_engine_start: Optional[int] = None
    pids_supported_21_40: Optional[str] = None
    distance_mil_on: Optional[float] = None
    fuel_rail_pressure: Optional[float] = None
    oxygen_sensor1_faer: Optional[float] = None
    oxygen_sensor1_voltage: Optional[float] = None
    egr_commanded: Optional[float] = None
    egr_error: Optional[float] = None
    warmups_since_code_clear: Optional[int] = None
    distance_since_code_clear: Optional[float] = None
    absolute_barometric_pressure: Optional[float] = None
    pids_supported_41_60: Optional[str] = None
    monitor_status_drive_cycle: Optional[str] = None
    control_module_voltage: Optional[float] = None
    relative_throttle_position: Optional[float] = None
    ambient_air_temperature: Optional[float] = None
    abs_throttle_position_d: Optional[float] = None
    abs_throttle_position_e: Optional[float] = None
    commanded_throttle_actuator: Optional[float] = None
    max_faer: Optional[float] = None
    max_oxy_sensor_voltage: Optional[float] = None
    max_oxy_sensor_current: Optional[float] = None
    max_intake_pressure: Optional[float] = None
    
    recorded_at: Optional[datetime] = None

class TelemetryOut(TelemetryIn):
    id: int

# ------------------------------
# 📊 ROUTES
# ------------------------------

@router.get("/telemetry", response_model=List[TelemetryOut])
def get_telemetry(
    vehicle_id: int = Query(..., description="ID du véhicule"),
    limit: int = Query(50, description="Nombre maximum d’enregistrements à retourner"),
    from_date: Optional[datetime] = Query(None, description="Filtrer à partir de cette date"),
    to_date: Optional[datetime] = Query(None, description="Filtrer jusqu’à cette date"),
):
    """📥 Récupérer les données télémétriques filtrées pour un véhicule"""
    try:
        supabase = get_supabase()

        query = supabase.table("telemetry").select("*").eq("vehicle_id", vehicle_id)

        if from_date:
            query = query.gte("recorded_at", from_date.isoformat())
        if to_date:
            query = query.lte("recorded_at", to_date.isoformat())

        res = query.order("recorded_at", desc=True).limit(limit).execute()

        # ✅ Vérification propre des erreurs
        if hasattr(res, "error") and res.error:
            raise HTTPException(status_code=500, detail=str(res.error))

        # ✅ Supabase renvoie souvent un dict avec clé 'data'
        if isinstance(res, dict):
            data = res.get("data", [])
        else:
            data = getattr(res, "data", [])

        if not data:
            return []  # Pas d'erreur → juste vide

        return data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des données : {e}")

@router.get("/telemetry/latest", response_model=TelemetryOut)
def get_latest(vehicle_id: int = Query(..., description="ID du véhicule")):
    """📡 Récupérer la dernière donnée de télémétrie pour un véhicule"""
    try:
        supabase = get_supabase()

        res = (
            supabase.table("telemetry")
            .select("*")
            .eq("vehicle_id", vehicle_id)
            .order("recorded_at", desc=True)
            .limit(1)
            .execute()
        )

        if hasattr(res, "error") and res.error:
            raise HTTPException(status_code=500, detail=str(res.error))

        data = res.data if hasattr(res, "data") else res.get("data", [])
        if not data:
            raise HTTPException(status_code=404, detail="Aucune donnée trouvée pour ce véhicule.")

        return data[0]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de la dernière donnée : {e}")
