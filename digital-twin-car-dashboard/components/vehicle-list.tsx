import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Vehicle } from '@/lib/supabase'

interface VehicleCardProps {
  vehicle: Vehicle
  onSelect: (vehicle: Vehicle) => void
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onSelect }) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onSelect(vehicle)}
    >
      <CardHeader>
        <CardTitle>{vehicle.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500">VIN: {vehicle.vin}</p>
      </CardContent>
    </Card>
  )
}

export const VehicleList: React.FC<{
  vehicles: Vehicle[]
  onSelectVehicle: (vehicle: Vehicle) => void
}> = ({ vehicles, onSelectVehicle }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {vehicles.map((vehicle) => (
        <VehicleCard
          key={vehicle.id}
          vehicle={vehicle}
          onSelect={onSelectVehicle}
        />
      ))}
    </div>
  )
}