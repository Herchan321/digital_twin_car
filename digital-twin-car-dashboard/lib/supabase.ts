import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()

// Types pour les données
export interface Vehicle {
  id: string
  name: string
  model: string
  year: number
  last_updated?: string
}

// ============================================================================
// TYPES POUR GESTION DYNAMIQUE DES DEVICES OBD-II
// ============================================================================

export interface Device {
  id: number
  device_code: string
  mqtt_topic: string
  description?: string
  status: 'active' | 'inactive' | 'maintenance'
  created_at: string
  updated_at: string
}

export interface VehicleDeviceAssignment {
  id: number
  vehicle_id: number
  device_id: number
  is_active: boolean
  assigned_at: string
  unassigned_at?: string
  notes?: string
  created_at: string
}

export interface ActiveDeviceAssignment {
  assignment_id: number
  vehicle_id: number
  vehicle_name: string
  vehicle_vin?: string
  device_id: number
  device_code: string
  mqtt_topic: string
  device_status: string
  assigned_at: string
  notes?: string
}

export interface Telemetry {
  id: number
  vehicle_id?: number
  recorded_at: string
  
  // Champs GPS pour la carte
  latitude?: number
  longitude?: number
  
  // PIDs essentiels (04-11)
  engine_load?: number
  coolant_temperature?: number
  intake_pressure?: number
  rpm?: number
  vehicle_speed?: number
  intake_air_temp?: number
  maf_airflow?: number
  throttle_position?: number
  
  // PIDs étendus
  monitor_status?: string
  oxygen_sensors_present_banks?: number
  obd_standard?: string
  time_since_engine_start?: number
  pids_supported_21_40?: string
  distance_mil_on?: number
  fuel_rail_pressure?: number
  oxygen_sensor1_faer?: number
  oxygen_sensor1_voltage?: number
  egr_commanded?: number
  egr_error?: number
  warmups_since_code_clear?: number
  distance_since_code_clear?: number
  absolute_barometric_pressure?: number
  pids_supported_41_60?: string
  monitor_status_drive_cycle?: string
  control_module_voltage?: number
  relative_throttle_position?: number
  ambient_air_temperature?: number
  abs_throttle_position_d?: number
  abs_throttle_position_e?: number
  commanded_throttle_actuator?: number
  max_faer?: number
  max_oxy_sensor_voltage?: number
  max_oxy_sensor_current?: number
  max_intake_pressure?: number
}

// Hooks personnalisés pour Supabase
export const getVehicles = async (): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Vehicle[]
}

export const useVehicles = async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('last_updated', { ascending: false })
  
  if (error) throw error
  return data as Vehicle[]
}

export const deleteVehicle = async (id: string) => {
  // D'abord supprimer toutes les données télémétriques associées
  const { error: telemetryError } = await supabase
    .from('telemetry')
    .delete()
    .eq('vehicle_id', id)
  
  if (telemetryError) throw telemetryError

  // Ensuite supprimer le véhicule
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  
  return true
}

// Récupérer la télémétrie pour un véhicule
export const useVehicleTelemetry = async (vehicleId: string) => {
  const { data, error } = await supabase
    .from('telemetry')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('recorded_at', { ascending: true })
    .limit(100)

  if (error) throw error
  return data as Telemetry[]
}

// Realtime subscription pour la télémétrie d'un véhicule
export const subscribeVehicleTelemetry = (
  vehicleId: string,
  onUpdate: (newTelemetry: Telemetry) => void
) => {
  return supabase
    .channel('telemetry_updates')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'telemetry',
        filter: `vehicle_id=eq.${vehicleId}`
      },
      (payload) => {
        onUpdate(payload.new as Telemetry)
      }
    )
    .subscribe()
}

export const getVehicleTelemetry = async (vehicleId: string) => {
  const { data, error } = await supabase
    .from('telemetry')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('recorded_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Erreur Supabase:', error)
    throw error
  }
  
  console.log('Données Supabase reçues:', data?.length || 0, 'enregistrements')
  
  return (data || []).reverse() as Telemetry[]
}

// Fonction pour déterminer le statut du véhicule basé sur les données OBD-II
export const getVehicleStatus = (data: Telemetry) => {
  if (!data) return "normal"

  // Conditions critiques
  if (
    (data.coolant_temperature && data.coolant_temperature > 110) ||
    (data.control_module_voltage && data.control_module_voltage < 11.8) ||
    (data.engine_load && data.engine_load > 95)
  ) {
    return "critical"
  }

  // Conditions d'alerte
  if (
    (data.coolant_temperature && data.coolant_temperature > 100) ||
    (data.control_module_voltage && data.control_module_voltage < 12) ||
    (data.rpm && data.rpm > 6000) ||
    (data.engine_load && data.engine_load > 90) ||
    (data.fuel_rail_pressure && data.fuel_rail_pressure < 300) // Pression rail faible
  ) {
    return "warning"
  }

  return "normal"
}

// Fonction pour obtenir les dernières données d'un véhicule
export const getLatestVehicleData = async (vehicleId: string): Promise<Telemetry | null> => {
  const { data, error } = await supabase
    .from('telemetry')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Erreur récupération dernières données:', error)
    return null
  }

  return data as Telemetry
}

// Fonction pour obtenir les statistiques d'un véhicule
export const getVehicleStats = async (vehicleId: string) => {
  const telemetry = await getVehicleTelemetry(vehicleId)
  
  if (!telemetry || telemetry.length === 0) {
    return null
  }

  const latest = telemetry[telemetry.length - 1]
  
  // Calculs statistiques
  const avgSpeed = telemetry
    .filter(t => t.vehicle_speed)
    .reduce((sum, t) => sum + (t.vehicle_speed || 0), 0) / telemetry.length

  const maxRpm = Math.max(...telemetry.filter(t => t.rpm).map(t => t.rpm || 0))
  
  const avgEngineLoad = telemetry
    .filter(t => t.engine_load)
    .reduce((sum, t) => sum + (t.engine_load || 0), 0) / telemetry.length

  return {
    latest,
    stats: {
      avgSpeed: avgSpeed.toFixed(1),
      maxRpm,
      avgEngineLoad: avgEngineLoad.toFixed(1),
      currentFuelPressure: latest.fuel_rail_pressure?.toFixed(1) || 'N/A',
      coolantTemp: latest.coolant_temperature?.toFixed(1) || 'N/A',
      batteryVoltage: latest.control_module_voltage?.toFixed(2) || 'N/A'
    }
  }
}

// ============================================================================
// API FUNCTIONS POUR DEVICES & ASSIGNMENTS
// ============================================================================

// Récupérer tous les devices
export const getDevices = async (): Promise<Device[]> => {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Device[]
}

// Créer un nouveau device
export const createDevice = async (device: {
  device_code: string
  mqtt_topic: string
  description?: string
  status?: string
}): Promise<Device> => {
  const { data, error } = await supabase
    .from('devices')
    .insert([device])
    .select()
    .single()

  if (error) throw error
  return data as Device
}

// Mettre à jour un device
export const updateDevice = async (
  deviceId: number,
  updates: Partial<Device>
): Promise<Device> => {
  const { data, error } = await supabase
    .from('devices')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', deviceId)
    .select()
    .single()

  if (error) throw error
  return data as Device
}

// Supprimer un device
export const deleteDevice = async (deviceId: number): Promise<boolean> => {
  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', deviceId)

  if (error) throw error
  return true
}

// Récupérer tous les assignments actifs
export const getActiveAssignments = async (): Promise<ActiveDeviceAssignment[]> => {
  const { data, error } = await supabase
    .from('v_active_device_assignments')
    .select('*')

  if (error) throw error
  return data as ActiveDeviceAssignment[]
}

// Récupérer l'assignment actif d'un device
export const getDeviceAssignment = async (
  deviceId: number
): Promise<VehicleDeviceAssignment | null> => {
  const { data, error } = await supabase
    .from('vehicle_device_assignment')
    .select('*, cars(id, name, vin)')
    .eq('device_id', deviceId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data as VehicleDeviceAssignment | null
}

// Créer un nouvel assignment (brancher device sur véhicule)
export const createAssignment = async (assignment: {
  vehicle_id: number
  device_id: number
  is_active?: boolean
  notes?: string
}): Promise<VehicleDeviceAssignment> => {
  const { data, error } = await supabase
    .from('vehicle_device_assignment')
    .insert([{ ...assignment, is_active: assignment.is_active ?? true }])
    .select()
    .single()

  if (error) throw error
  return data as VehicleDeviceAssignment
}

// Désactiver un assignment (débrancher device)
export const deactivateAssignment = async (
  assignmentId: number
): Promise<VehicleDeviceAssignment> => {
  const { data, error } = await supabase
    .from('vehicle_device_assignment')
    .update({
      is_active: false,
      unassigned_at: new Date().toISOString()
    })
    .eq('id', assignmentId)
    .select()
    .single()

  if (error) throw error
  return data as VehicleDeviceAssignment
}

// Récupérer l'historique des assignments d'un device
export const getDeviceHistory = async (
  deviceId: number,
  limit: number = 10
): Promise<any[]> => {
  const { data, error } = await supabase
    .from('vehicle_device_assignment')
    .select('*, cars(id, name, vin)')
    .eq('device_id', deviceId)
    .order('assigned_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// Récupérer l'historique des assignments d'un véhicule
export const getVehicleHistory = async (
  vehicleId: number,
  limit: number = 10
): Promise<any[]> => {
  const { data, error } = await supabase
    .from('vehicle_device_assignment')
    .select('*, devices(id, device_code, mqtt_topic)')
    .eq('vehicle_id', vehicleId)
    .order('assigned_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}
