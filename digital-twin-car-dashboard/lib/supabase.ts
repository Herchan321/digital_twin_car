import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()

// Types pour les données
export interface Vehicle {
  id: string
  name: string
  model: string
  year: number
  latitude?: number
  longitude?: number
  speed_kmh?: number
  battery_pct?: number
  temperature?: number
  rpm?: number
  last_updated?: string
}

export interface Telemetry {
  id: string
  vehicle_id: string
  timestamp: string
  latitude: number
  longitude: number
  speed_kmh: number
  battery_pct: number
  temperature: number
  rpm?: number
}

// Hooks personnalisés pour Supabase
export const useVehicles = async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false })
  
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

export const useVehicleTelemetry = async (vehicleId: string) => {
  const { data, error } = await supabase
    .from('telemetry')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('timestamp', { ascending: false })
    .limit(100)
  
  if (error) throw error
  return data as Telemetry[]
}

export const useRealtimeTelemetry = (vehicleId: string, onUpdate: (telemetry: Telemetry) => void) => {
  supabase
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