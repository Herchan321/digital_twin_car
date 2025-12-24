import { DashboardLayout } from "@/components/dashboard-layout"
import { AlertsDashboard } from "@/components/alerts-dashboard"

export default function AlertsPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertes Véhicule</h1>
          <p className="text-muted-foreground">
            Surveillance et historique des alertes de sécurité et maintenance.
          </p>
        </div>
        <AlertsDashboard />
      </div>
    </DashboardLayout>
  )
}
