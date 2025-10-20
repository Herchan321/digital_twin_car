from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class VehicleBase(BaseModel):
    name: str
    vin: Optional[str] = None
    status: Optional[str] = "active"

class VehicleCreate(VehicleBase):
    pass

class Vehicle(VehicleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TelemetryBase(BaseModel):
    vehicle_id: int
    latitude: float
    longitude: float
    speed_kmh: float
    battery_pct: float
    temperature: float
    rpm: Optional[float] = None

class TelemetryCreate(TelemetryBase):
    pass

class Telemetry(TelemetryBase):
    id: int
    recorded_at: datetime

    class Config:
        from_attributes = True

class VehicleState(BaseModel):
    vehicle_id: int
    vehicle_name: str
    last_latitude: float
    last_longitude: float
    last_speed: float
    last_battery: float
    last_temperature: float
    last_rpm: Optional[float] = None
    last_update: datetime
    
class PredictionRequest(BaseModel):
    """Requête pour générer des prédictions pour un véhicule."""
    vehicle_id: str
    # Données optionnelles qui peuvent améliorer les prédictions
    current_battery_pct: Optional[float] = None
    avg_speed_kmh: Optional[float] = None
    temperature_celsius: Optional[float] = None
    total_kilometers: Optional[float] = None
    last_maintenance_date: Optional[str] = None

class PredictionResponse(BaseModel):
    """Réponse contenant les prédictions générées."""
    vehicle_id: str
    timestamp: str
    estimated_range_km: float
    battery_health_pct: float
    next_maintenance_due: str
    performance_score: float
    estimated_energy_consumption: Optional[float] = None