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
