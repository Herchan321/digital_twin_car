"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AlertsDashboard } from "@/components/alerts-dashboard"
import { useVehicle } from "@/lib/vehicle-context"

export default function AlertsPage() {
  const { selectedVehicle } = useVehicle()
  
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Alertes Véhicule {selectedVehicle ? `- ${selectedVehicle.name}` : ''}
          </h1>
          <p className="text-muted-foreground">
            Surveillance et historique des alertes de sécurité et maintenance.
          </p>
          {selectedVehicle?.vin && (
            <p className="text-sm text-muted-foreground">VIN: {selectedVehicle.vin}</p>
          )}
        </div>
        <AlertsDashboard />
      </div>
    </DashboardLayout>
  )
}
