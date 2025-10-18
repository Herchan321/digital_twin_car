import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types pour les données
export interface Vehicle {
  id: string
  name: string
  vin: string
  created_at: string
  updated_at: string
}

export interface Telemetry {
  id: string
  vehicle_id: string
  timestamp: string
  latitude: number
  longitude: number
  battery_level: number
  temperature: number
  created_at: string
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