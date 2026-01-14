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
    
    # Champs de base (ancienne version)
    latitude: float
    longitude: float
    speed_kmh: float
    battery_pct: float
    temperature: float
    
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

# ============================================================================
# MODÈLES POUR GESTION DYNAMIQUE DES DEVICES OBD-II
# ============================================================================

class DeviceBase(BaseModel):
    """Modèle de base pour un device OBD-II"""
    device_code: str
    mqtt_topic: str
    description: Optional[str] = None
    status: Optional[str] = "active"  # active, inactive, maintenance

class DeviceCreate(DeviceBase):
    """Modèle pour créer un nouveau device"""
    pass

class Device(DeviceBase):
    """Modèle complet d'un device avec métadonnées"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class VehicleDeviceAssignmentBase(BaseModel):
    """Modèle de base pour l'association véhicule ↔ device"""
    vehicle_id: int
    device_id: int
    is_active: bool = True
    notes: Optional[str] = None

class VehicleDeviceAssignmentCreate(VehicleDeviceAssignmentBase):
    """Modèle pour créer une nouvelle association"""
    pass

class VehicleDeviceAssignment(VehicleDeviceAssignmentBase):
    """Modèle complet d'une association avec historique temporel"""
    id: int
    assigned_at: datetime
    unassigned_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ActiveDeviceAssignment(BaseModel):
    """Vue simplifiée d'un assignment actif avec détails"""
    assignment_id: int
    vehicle_id: int
    vehicle_name: str
    vehicle_vin: Optional[str]
    device_id: int
    device_code: str
    mqtt_topic: str
    device_status: str
    assigned_at: datetime
    notes: Optional[str]

    class Config:
        from_attributes = True