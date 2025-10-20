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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed_kmh: Optional[float] = None
    battery_pct: Optional[float] = None
    temperature: Optional[float] = None
    rpm: Optional[float] = None
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
