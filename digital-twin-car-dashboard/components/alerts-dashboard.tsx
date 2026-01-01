"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, CheckCircle2, Info, Search, XCircle, Filter } from "lucide-react"
import { useVehicleStore } from "@/lib/store"

// Types pour les alertes
type AlertSeverity = "critical" | "warning" | "info" | "success"
type AlertStatus = "active" | "resolved" | "acknowledged"

interface Alert {
  id: string
  vehicleId: string
  vehicleName: string
  code: string
  message: string
  severity: AlertSeverity
  status: AlertStatus
  timestamp: string
  category: "engine" | "battery" | "security" | "maintenance"
}

// Données simulées
const MOCK_ALERTS: Alert[] = [
  {
    id: "ALT-001",
    vehicleId: "1",
    vehicleName: "Peugeot 208",
    code: "P0300",
    message: "Ratés d'allumage détectés (Cylindre aléatoire)",
    severity: "critical",
    status: "active",
    timestamp: "2023-12-23T10:30:00",
    category: "engine"
  },
  {
    id: "ALT-002",
    vehicleId: "1",
    vehicleName: "Peugeot 208",
    code: "BAT-LOW",
    message: "Tension batterie faible (11.8V)",
    severity: "warning",
    status: "active",
    timestamp: "2023-12-23T09:15:00",
    category: "battery"
  },
  {
    id: "ALT-003",
    vehicleId: "2",
    vehicleName: "Renault Clio",
    code: "OIL-SERV",
    message: "Vidange recommandée prochainement",
    severity: "info",
    status: "acknowledged",
    timestamp: "2023-12-22T14:20:00",
    category: "maintenance"
  },
  {
    id: "ALT-004",
    vehicleId: "3",
    vehicleName: "Citroën C3",
    code: "SEC-DOOR",
    message: "Portière arrière gauche mal fermée",
    severity: "warning",
    status: "resolved",
    timestamp: "2023-12-22T18:45:00",
    category: "security"
  },
  {
    id: "ALT-005",
    vehicleId: "1",
    vehicleName: "Peugeot 208",
    code: "TEMP-HIGH",
    message: "Température liquide refroidissement élevée (105°C)",
    severity: "critical",
    status: "resolved",
    timestamp: "2023-12-21T16:10:00",
    category: "engine"
  }
]

export function AlertsDashboard() {
  const { vehicles, fetchVehicles } = useVehicleStore()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Charger les véhicules au montage
  useEffect(() => {
    fetchVehicles()
  }, [])

  // Charger les anomalies pour chaque véhicule
  useEffect(() => {
    const fetchAllAnomalies = async () => {
      if (vehicles.length === 0) {
        // Si pas de véhicules, on essaie de charger les données simulées pour vehicle1
        // pour que l'interface ne soit pas vide lors de la démo
        try {
           const res = await fetch(`/api/predictions?vehicleId=vehicle1`)
           if (res.ok) {
             const data = await res.json()
             if (data.anomalies) {
               const mappedAlerts = data.anomalies.map((anomaly: any) => ({
                 id: `ANOM-${anomaly.id}-${Date.now()}`,
                 vehicleId: "vehicle1",
                 vehicleName: "Peugeot 208 (Demo)",
                 code: anomaly.component.toUpperCase().substring(0, 3) + "-001",
                 message: anomaly.message,
                 severity: anomaly.type,
                 status: "active",
                 timestamp: new Date().toISOString(),
                 category: mapComponentToCategory(anomaly.component)
               }))
               setAlerts(mappedAlerts)
             }
           }
        } catch (e) {
          console.error("Error fetching demo alerts", e)
        }
        setLoading(false)
        return
      }

      setLoading(true)
      const allAlerts: Alert[] = []

      for (const vehicle of vehicles) {
        try {
          const res = await fetch(`/api/predictions?vehicleId=${vehicle.id}`)
          if (res.ok) {
            const data = await res.json()
            if (data.anomalies && Array.isArray(data.anomalies)) {
              const vehicleAlerts = data.anomalies.map((anomaly: any) => ({
                id: `ANOM-${vehicle.id}-${anomaly.id}`,
                vehicleId: vehicle.id.toString(),
                vehicleName: vehicle.name || `Vehicle ${vehicle.id}`,
                code: anomaly.component.toUpperCase().substring(0, 3) + "-DET",
                message: anomaly.message,
                severity: anomaly.type,
                status: "active", // Par défaut active car détectée en temps réel
                timestamp: new Date().toISOString(), // Timestamp actuel car temps réel
                category: mapComponentToCategory(anomaly.component)
              }))
              allAlerts.push(...vehicleAlerts)
            }
          }
        } catch (error) {
          console.error(`Failed to fetch anomalies for vehicle ${vehicle.id}`, error)
        }
      }
      
      setAlerts(allAlerts)
      setLoading(false)
    }

    fetchAllAnomalies()
  }, [vehicles])

  const mapComponentToCategory = (component: string): "engine" | "battery" | "security" | "maintenance" => {
    const c = component.toLowerCase()
    if (c.includes("battery") || c.includes("voltage")) return "battery"
    if (c.includes("engine") || c.includes("cooling") || c.includes("oil")) return "engine"
    if (c.includes("door") || c.includes("security")) return "security"
    return "maintenance"
  }

  // Filtrage des alertes
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = 
      alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.vehicleName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter
    const matchesStatus = statusFilter === "all" || alert.status === statusFilter

    return matchesSearch && matchesSeverity && matchesStatus
  })

  // Statistiques
  const stats = {
    total: MOCK_ALERTS.length,
    critical: MOCK_ALERTS.filter(a => a.severity === "critical" && a.status === "active").length,
    warning: MOCK_ALERTS.filter(a => a.severity === "warning" && a.status === "active").length,
    resolved: MOCK_ALERTS.filter(a => a.status === "resolved").length
  }

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical": return "text-red-500 bg-red-500/10 border-red-500/20"
      case "warning": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
      case "info": return "text-blue-500 bg-blue-500/10 border-blue-500/20"
      case "success": return "text-green-500 bg-green-500/10 border-green-500/20"
      default: return "text-gray-500 bg-gray-500/10 border-gray-500/20"
    }
  }

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical": return <XCircle className="h-5 w-5" />
      case "warning": return <AlertTriangle className="h-5 w-5" />
      case "info": return <Info className="h-5 w-5" />
      case "success": return <CheckCircle2 className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Cartes de statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertes Actives</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total - stats.resolved}</div>
            <p className="text-xs text-muted-foreground">
              Sur {stats.total} alertes totales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critiques</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">
              Nécessitent une attention immédiate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avertissements</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.warning}</div>
            <p className="text-xs text-muted-foreground">
              À surveiller
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Résolues</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">
              Problèmes traités
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et Recherche */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une alerte..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[150px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Sévérité" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes sévérités</SelectItem>
              <SelectItem value="critical">Critique</SelectItem>
              <SelectItem value="warning">Avertissement</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="resolved">Résolue</SelectItem>
              <SelectItem value="acknowledged">Acquittée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Liste des alertes */}
      <div className="grid gap-4">
        {filteredAlerts.map((alert) => (
          <Card key={alert.id} className="overflow-hidden transition-all hover:shadow-md">
            <div className="flex items-center p-4 gap-4">
              <div className={`p-3 rounded-full ${getSeverityColor(alert.severity)} bg-opacity-10`}>
                {getSeverityIcon(alert.severity)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{alert.message}</h3>
                  <Badge variant="outline" className="text-xs">
                    {alert.code}
                  </Badge>
                  {alert.status === "active" && (
                    <Badge className="bg-red-500 hover:bg-red-600">Active</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Car className="h-3 w-3" />
                    {alert.vehicleName}
                  </span>
                  <span>•</span>
                  <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  <span>•</span>
                  <span className="capitalize">{alert.category}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {alert.status === "active" && (
                  <Button variant="outline" size="sm">
                    Acquitter
                  </Button>
                )}
                <Button variant="ghost" size="sm">
                  Détails
                </Button>
              </div>
            </div>
          </Card>
        ))}
        
        {filteredAlerts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Aucune alerte trouvée correspondant à vos critères.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Car(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  )
}
