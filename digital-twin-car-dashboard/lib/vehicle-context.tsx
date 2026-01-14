"use client"

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { getVehicles, type Vehicle } from './supabase'

interface VehicleContextType {
  vehicles: Vehicle[]
  selectedVehicle: Vehicle | null
  setSelectedVehicle: (vehicle: Vehicle | null) => void
  isLoading: boolean
  refreshVehicles: () => Promise<void>
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined)

export function VehicleProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadVehicles = async () => {
    try {
      setIsLoading(true)
      const data = await getVehicles()
      setVehicles(data)
      
      // Si un véhicule était sélectionné, le retrouver dans les nouvelles données
      if (selectedVehicle) {
        const updatedVehicle = data.find(v => v.id === selectedVehicle.id)
        if (updatedVehicle) {
          setSelectedVehicle(updatedVehicle)
        } else {
          // Le véhicule n'existe plus, sélectionner le premier disponible
          setSelectedVehicle(data[0] || null)
        }
      } else {
        // Première fois : sélectionner le premier véhicule actif ou le premier
        const activeVehicle = data.find(v => v.status === 'active')
        setSelectedVehicle(activeVehicle || data[0] || null)
      }
    } catch (error) {
      console.error('Erreur chargement véhicules:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVehicles()
  }, [])

  const refreshVehicles = async () => {
    await loadVehicles()
  }

  return (
    <VehicleContext.Provider 
      value={{ 
        vehicles, 
        selectedVehicle, 
        setSelectedVehicle, 
        isLoading,
        refreshVehicles
      }}
    >
      {children}
    </VehicleContext.Provider>
  )
}

export function useVehicle() {
  const context = useContext(VehicleContext)
  if (context === undefined) {
    throw new Error('useVehicle doit être utilisé dans un VehicleProvider')
  }
  return context
}
