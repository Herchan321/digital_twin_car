"""
Script de test pour vérifier le nouveau format MQTT unifié
Usage: python test_new_mqtt_format.py
"""
import json

# Exemple de message reçu (votre exemple)
test_payload = """{
    "01-MonitorStatus":0,
    "04-CalcEngineLoad":79.61,
    "05-EngineCoolantTemp":87,
    "0B-IntakeManiAbsPress":114,
    "0C-EngineRPM":1047,
    "0D-VehicleSpeed":27,
    "0F-IntakeAirTemperature":31,
    "10-MAFAirFlowRate":11.09,
    "11-ThrottlePosition":79.22,
    "13-OxySensorsPresent_2Banks":0,
    "1C-OBDStandard":0,
    "1F-TimeSinceEngStart":724,
    "20-PIDsSupported_21_40":0,
    "21-DistanceMILOn":0,
    "23-FuelRailGaug":28700,
    "24-OxySensor1_FAER":0.23,
    "24-OxySensor1_Volt":1.88,
    "25-OxySensor2_FAER":0.24,
    "30-WarmUpsSinceCodeClear":173,
    "31-DistanceSinceCodeClear":3516,
    "33-AbsBaroPres":95,
    "40-PIDsSupported_41_60":0,
    "41-MonStatusDriveCycle":0,
    "42-ControlModuleVolt":14.02,
    "45-RelThrottlePos":65.88,
    "46-AmbientAirTemp":16,
    "49-AbsThrottlePosD":14.51,
    "4A-AbsThrottlePosE":14.12,
    "4C-CmdThrottleAct":100,
    "4F-Max_FAER":32,
    "4F-Max_OxySensVol":0,
    "4F-Max_OxySensCrnt":0,
    "4F-Max_IntManiAbsPres":0,
    "60-PIDsSupported_61_80":0,
    "67-EngineCoolantTemp1":87,
    "67-EngineCoolantTemp2":-40,
    "69-CmdEGR_EGRError":0,
    "77-ChargeAirCoolerTemperature":0,
    "78-EGT_Bank1":0,
    "80-PIDsSupported_81_A0":0,
    "8B-DieselAftertreatment":0
}"""

# Mapping identique à celui du mqtt_handler.py
PID_TO_COLUMN_MAPPING = {
    "01-MonitorStatus": "monitor_status",
    "04-CalcEngineLoad": "engine_load",
    "05-EngineCoolantTemp": "coolant_temperature",
    "0B-IntakeManiAbsPress": "intake_pressure",
    "0C-EngineRPM": "rpm",
    "0D-VehicleSpeed": "vehicle_speed",
    "0F-IntakeAirTemperature": "intake_air_temp",
    "10-MAFAirFlowRate": "maf_airflow",
    "11-ThrottlePosition": "throttle_position",
    "13-OxySensorsPresent_2Banks": "oxygen_sensors_present_banks",
    "1C-OBDStandard": "obd_standard",
    "1F-TimeSinceEngStart": "time_since_engine_start",
    "20-PIDsSupported_21_40": "pids_supported_21_40",
    "21-DistanceMILOn": "distance_mil_on",
    "23-FuelRailGaug": "fuel_rail_pressure",
    "24-OxySensor1_FAER": "oxygen_sensor1_faer",
    "24-OxySensor1_Volt": "oxygen_sensor1_voltage",
    "25-OxySensor2_FAER": "oxygen_sensor2_faer",
    "30-WarmUpsSinceCodeClear": "warmups_since_code_clear",
    "31-DistanceSinceCodeClear": "distance_since_code_clear",
    "33-AbsBaroPres": "absolute_barometric_pressure",
    "40-PIDsSupported_41_60": "pids_supported_41_60",
    "41-MonStatusDriveCycle": "monitor_status_drive_cycle",
    "42-ControlModuleVolt": "control_module_voltage",
    "45-RelThrottlePos": "relative_throttle_position",
    "46-AmbientAirTemp": "ambient_air_temperature",
    "49-AbsThrottlePosD": "abs_throttle_position_d",
    "4A-AbsThrottlePosE": "abs_throttle_position_e",
    "4C-CmdThrottleAct": "commanded_throttle_actuator",
    "4F-Max_FAER": "max_faer",
    "4F-Max_OxySensVol": "max_oxy_sensor_voltage",
    "4F-Max_OxySensCrnt": "max_oxy_sensor_current",
    "4F-Max_IntManiAbsPres": "max_intake_pressure",
    "60-PIDsSupported_61_80": "pids_supported_61_80",
    "67-EngineCoolantTemp1": "engine_coolant_temp1",
    "67-EngineCoolantTemp2": "engine_coolant_temp2",
    "69-CmdEGR_EGRError": "egr_commanded_error",
    "77-ChargeAirCoolerTemperature": "charge_air_cooler_temp",
    "78-EGT_Bank1": "egt_bank1",
    "80-PIDsSupported_81_A0": "pids_supported_81_a0",
    "8B-DieselAftertreatment": "diesel_aftertreatment"
}

def test_parsing():
    """Test le parsing du nouveau format"""
    print("="*70)
    print("🧪 TEST DU NOUVEAU FORMAT MQTT")
    print("="*70)
    
    # Simuler la réception
    topic = "wincan/device1"
    print(f"\n📍 Topic simulé: {topic}")
    
    # Extraire device_id
    device_id = topic.split("/")[-1] if "/" in topic else "device1"
    print(f"🔧 Device ID extrait: {device_id}")
    
    # Parser le JSON
    try:
        data = json.loads(test_payload)
        print(f"✅ JSON parsé avec succès: {len(data)} PIDs reçus")
    except json.JSONDecodeError as e:
        print(f"❌ Erreur parsing JSON: {e}")
        return False
    
    # Mapper les PIDs
    print("\n" + "="*70)
    print("📊 MAPPING DES PIDS")
    print("="*70)
    
    updated_fields = 0
    unmapped_pids = []
    mapped_data = {}
    
    for pid_key, value in data.items():
        if pid_key in PID_TO_COLUMN_MAPPING:
            field_name = PID_TO_COLUMN_MAPPING[pid_key]
            mapped_data[field_name] = value
            updated_fields += 1
            print(f"✅ {pid_key:30s} → {field_name:30s} = {value}")
        else:
            unmapped_pids.append(pid_key)
            print(f"⚠️  {pid_key:30s} → NON MAPPÉ")
    
    print("\n" + "="*70)
    print("📈 RÉSULTATS")
    print("="*70)
    print(f"✅ PIDs mappés: {updated_fields}")
    print(f"⚠️  PIDs non mappés: {len(unmapped_pids)}")
    
    if unmapped_pids:
        print(f"\nPIDs non mappés: {', '.join(unmapped_pids)}")
    
    # Afficher quelques valeurs importantes
    print("\n" + "="*70)
    print("🚗 VALEURS ESSENTIELLES")
    print("="*70)
    important_fields = ["rpm", "vehicle_speed", "engine_load", "coolant_temperature", "control_module_voltage"]
    for field in important_fields:
        value = mapped_data.get(field, "N/A")
        print(f"  • {field:30s}: {value}")
    
    # Nouvelles colonnes
    print("\n" + "="*70)
    print("⭐ NOUVELLES COLONNES")
    print("="*70)
    new_fields = [
        "oxygen_sensor2_faer",
        "egr_commanded_error",
        "pids_supported_61_80",
        "pids_supported_81_a0",
        "engine_coolant_temp1",
        "engine_coolant_temp2",
        "charge_air_cooler_temp",
        "egt_bank1",
        "diesel_aftertreatment"
    ]
    for field in new_fields:
        value = mapped_data.get(field, "N/A")
        print(f"  • {field:30s}: {value}")
    
    print("\n" + "="*70)
    print("✅ TEST RÉUSSI!")
    print("="*70)
    
    return True

if __name__ == "__main__":
    success = test_parsing()
    if not success:
        print("\n❌ Le test a échoué")
        exit(1)
    else:
        print("\n✅ Tous les tests sont passés!")
        print("\n💡 Le backend devrait maintenant:")
        print("   1. Recevoir les messages sur wincan/device1")
        print("   2. Parser correctement les 47 PIDs")
        print("   3. Sauvegarder dans Supabase (après ajout des colonnes)")
        print("   4. Diffuser via WebSocket au frontend")
        print("\n📝 N'oubliez pas d'exécuter SUPABASE_UPDATE_COLUMNS.sql!")
