from fastapi import APIRouter, Depends, HTTPException
from typing import List
from ..database import get_supabase
from ..realtime import manager
from ..models import Vehicle, VehicleCreate, Telemetry, TelemetryCreate, VehicleState

router = APIRouter()

@router.post("/vehicles/", response_model=Vehicle)
async def create_vehicle(vehicle: VehicleCreate, supabase=Depends(get_supabase)):
    try:
        response = supabase.table('vehicles').insert({
            "name": vehicle.name,
            "vin": vehicle.vin,
            "status": vehicle.status
        }).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/vehicles/", response_model=List[Vehicle])
async def get_vehicles(supabase=Depends(get_supabase)):
    try:
        response = supabase.table('vehicles').select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/vehicles/status", response_model=List[VehicleState])
async def get_vehicles_status(supabase=Depends(get_supabase)):
    try:
        response = supabase.rpc('get_vehicles_last_state').execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/vehicles/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(vehicle_id: int, supabase=Depends(get_supabase)):
    try:
        response = supabase.table('vehicles').select("*").eq("id", vehicle_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/vehicles/{vehicle_id}/telemetry", response_model=Telemetry)
async def create_telemetry(
    vehicle_id: int, 
    telemetry: TelemetryCreate, 
    supabase=Depends(get_supabase)
):
    try:
        # Vérifier si le véhicule existe
        vehicle_check = supabase.table('vehicles').select("id").eq("id", vehicle_id).execute()
        if not vehicle_check.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        response = supabase.table('telemetry').insert({
            "vehicle_id": vehicle_id,
            "latitude": telemetry.latitude,
            "longitude": telemetry.longitude,
            "speed_kmh": telemetry.speed_kmh,
            "battery_pct": telemetry.battery_pct,
            "temperature": telemetry.temperature
        }).execute()
        inserted = response.data[0]
        # Broadcast the new telemetry to connected WebSocket clients
        try:
            import json
            await manager.broadcast(json.dumps({
                "type": "telemetry_insert",
                "data": inserted
            }))
        except Exception:
            # If broadcasting fails, ignore (do not break insertion)
            pass
        return inserted
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/vehicles/{vehicle_id}/telemetry", response_model=List[Telemetry])
async def get_vehicle_telemetry(
    vehicle_id: int,
    limit: int = 10,
    supabase=Depends(get_supabase)
):
    try:
        response = supabase.table('telemetry')\
            .select("*")\
            .eq("vehicle_id", vehicle_id)\
            .order("recorded_at", desc=True)\
            .limit(limit)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
