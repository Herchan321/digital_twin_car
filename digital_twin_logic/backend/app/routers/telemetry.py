from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timedelta
from ..database import get_supabase
from ..models import Telemetry, TelemetryCreate

router = APIRouter()

@router.get("/daily-stats")
async def get_daily_stats(days: int = 7, supabase=Depends(get_supabase)):
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        response = supabase.rpc('get_daily_stats', {
            'start_date': start_date
        }).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/vehicle-stats/{vehicle_id}")
async def get_vehicle_stats(vehicle_id: int, supabase=Depends(get_supabase)):
    try:
        response = supabase.rpc('get_vehicle_stats', {
            'v_id': vehicle_id
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Vehicle not found or no data available")
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/vehicle-rpm-stats/{vehicle_id}")
async def get_vehicle_rpm_stats(vehicle_id: int, supabase=Depends(get_supabase)):
    """
    Get RPM statistics for a specific vehicle
    """
    try:
        response = supabase.rpc('get_vehicle_rpm_stats', {
            'v_id': vehicle_id
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Vehicle not found or no RPM data available")
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/vehicle-history/{vehicle_id}")
async def get_vehicle_history(
    vehicle_id: int,
    start_time: datetime = None,
    end_time: datetime = None,
    interval: str = '1 hour',
    supabase=Depends(get_supabase)
):
    try:
        if not start_time:
            start_time = datetime.utcnow() - timedelta(days=1)
        if not end_time:
            end_time = datetime.utcnow()

        query = supabase.table('telemetry')\
            .select('*')\
            .eq('vehicle_id', vehicle_id)\
            .gte('recorded_at', start_time.isoformat())\
            .lte('recorded_at', end_time.isoformat())\
            .order('recorded_at', desc=True)
        
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
