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
  id: number
  vehicle_id?: number
  latitude: number
  longitude: number
  speed_kmh: number
  battery_pct: number
  temperature: number
  rpm?: number
<<<<<<< HEAD
=======
  recorded_at: string
>>>>>>> 33e3db9cc2d5563efae57dfa8c86ee5c6078fb14
}
// Hooks personnalisés pour Supabase
export const useVehicles = async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
.order('recorded_at', { ascending: false })
  
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
    .limit(100) // tu peux augmenter si tu veux plus de données

  if (error) throw error
  return data as Telemetry[]
}


// Realtime subscription pour la télémétrie d’un véhicule
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
    .order('recorded_at', { ascending: true })
    .limit(100)

  if (error) throw error
  return data as Telemetry[]
}
const getVehicleStatus = (data: Telemetry) => {
  if (!data) return "normal"

  if (data.temperature > 100 || data.battery_pct < 11.8) return "critical"
  if (data.temperature > 95 || data.battery_pct < 12 || (data.rpm && data.rpm > 5000)) return "warning"
  return "normal"
}
