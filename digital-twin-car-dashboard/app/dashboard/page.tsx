"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { VehicleVisualization } from "@/components/vehicle-visualization"
import { VehicleMap3D } from "@/components/vehicle-map-3d"  // Nouveau composant
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, Play, Pause, Zap, Gauge, Thermometer, Battery, AlertTriangle, MapPin, Map } from "lucide-react"
import { Telemetry, getVehicleTelemetry, subscribeVehicleTelemetry } from "@/lib/supabase"

export default function DashboardPage() {
  const [telemetry, setTelemetry] = useState<Telemetry[]>([])
  const [isLiveMode, setIsLiveMode] = useState(true)
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isMounted, setIsMounted] = useState(false)
  const [alerts, setAlerts] = useState<string[]>([])
  const [prediction, setPrediction] = useState<string>("No issues detected")
  const [showMap, setShowMap] = useState(true) // Nouvel état pour afficher/masquer la carte

  const vehicleId = "1" 

  useEffect(() => setIsMounted(true), [])

  useEffect(() => {
    async function loadData() {
      try {
        console.log("🔄 Chargement des données pour vehicle_id:", vehicleId)
        const data = await getVehicleTelemetry(vehicleId)
        console.log("📊 Données reçues:", data.length, "enregistrements")
        if (data.length > 0) {
          console.log("📌 Dernière donnée:", data[data.length - 1])
        }
        setTelemetry(data)
        setIsConnected(true)
        setLastUpdate(new Date())
      } catch (error) {
        console.error("❌ Erreur:", error)
        setIsConnected(false)
      }
    }

    loadData()

    if (!isLiveMode) return

    // Souscription Realtime pour les mises à jour instantanées (par Supabase)
    const subscription = subscribeVehicleTelemetry(vehicleId, (newData) => {
      setTelemetry((prev) => [...prev, newData])
      setLastUpdate(new Date())
    })

    return () => {
      subscription && subscription.unsubscribe()
    }
  }, [isLiveMode, vehicleId])

  const latest = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null
  
  // Debug: Afficher les données reçues
  console.log("Latest data:", latest)

  // Badge status
  const getStatusBadge = (value: number, thresholds: { warning: number; critical: number }, reverse = false) => {
    if (reverse) {
      if (value < thresholds.critical) return <Badge className="bg-destructive text-destructive-foreground">Critical</Badge>
      if (value < thresholds.warning) return <Badge className="bg-warning text-warning-foreground">Warning</Badge>
      return <Badge className="bg-success text-success-foreground">Normal</Badge>
    } else {
      if (value > thresholds.critical) return <Badge className="bg-destructive text-destructive-foreground">Critical</Badge>
      if (value > thresholds.warning) return <Badge className="bg-warning text-warning-foreground">Warning</Badge>
      return <Badge className="bg-success text-success-foreground">Normal</Badge>
    }
  }

useEffect(() => {
  if (!latest) return

  const newAlerts: string[] = []

  // Utiliser les données OBD-II du mqtt_handler
  if (latest.coolant_temperature && latest.coolant_temperature > 100) newAlerts.push("⚠️ Température critique !")
  else if (latest.coolant_temperature && latest.coolant_temperature > 95) newAlerts.push("⚠️ Température élevée.")

  if (latest.control_module_voltage && latest.control_module_voltage < 11.8) newAlerts.push("⚠️ Batterie critique !")
  else if (latest.control_module_voltage && latest.control_module_voltage < 12) newAlerts.push("⚠️ Batterie faible.")

  if (latest.rpm && latest.rpm > 5500) newAlerts.push("⚠️ RPM critique !")
  else if (latest.rpm && latest.rpm > 5000) newAlerts.push("⚠️ RPM élevé.")

  if (latest.vehicle_speed && latest.vehicle_speed > 110) newAlerts.push("⚠️ Vitesse critique !")
  else if (latest.vehicle_speed && latest.vehicle_speed > 100) newAlerts.push("⚠️ Vitesse élevée.")

  if (newAlerts.length === 0) {
    setAlerts([" No issues detected"])
    setPrediction("✅ System stable - no issues predicted")
  } else {
    setAlerts(newAlerts)

    if (latest.coolant_temperature && latest.coolant_temperature > 98 && latest.control_module_voltage && latest.control_module_voltage < 12)
      setPrediction("⚠️ Risk of overheating and power loss predicted soon")
    else if (latest.coolant_temperature && latest.coolant_temperature > 95)
      setPrediction("⚠️ Possible overheating in the next minutes")
    else if (latest.control_module_voltage && latest.control_module_voltage < 12)
      setPrediction("⚡ Battery may drop below critical soon")
    else
      setPrediction("⚠️ Check vehicle systems soon")
  }
}, [latest])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Vehicle Digital Twin Visualization</h1>
            <p className="text-muted-foreground">Real-time monitoring and status overview</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="w-5 h-5 text-success" />
                  <span className="text-sm text-success font-medium">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">Disconnected</span>
                </>
              )}
            </div>
            
            {/* Nouveau bouton pour basculer la vue carte */}
            <Button variant="outline" size="sm" onClick={() => setShowMap(!showMap)}>
              <Map className="w-4 h-4" />
              {showMap ? 'Masquer Carte' : 'Afficher Carte'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={() => setIsLiveMode(!isLiveMode)}>
              {isLiveMode ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Resume
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Last update */}
        <div className="text-sm text-muted-foreground">
          Last update: {isMounted ? lastUpdate.toLocaleTimeString() : "--:--:--"}
        </div>

        {/* Layout avec carte et visualisation côte à côte */}
        <div className={`grid gap-6 ${showMap ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          {/* Visualisation du véhicule existante */}
          <Card className="bg-card border-border border-glow">
            <CardHeader>
              <CardTitle>Visualisation 3D du Véhicule</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <VehicleVisualization data={{
                speed: latest?.vehicle_speed || 50,
                battery: latest?.control_module_voltage || 12.5,
                temperature: latest?.coolant_temperature || 85,
                rpm: latest?.rpm || 1500,
                status: "normal"
              }} />
            </CardContent>
          </Card>

          {/* Carte Google Maps 3D */}
          {showMap && (
            <Card className="bg-card border-border border-glow">
              <CardHeader>
                <CardTitle>Position GPS en Temps Réel</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <VehicleMap3D 
                  telemetryData={{
                    speed_kmh: latest?.vehicle_speed || 50,
                    temperature: latest?.coolant_temperature || 85,
                    battery_pct: latest?.control_module_voltage || 12.5,
                    rpm: latest?.rpm || 1500
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* KPIs cards avec données OBD-II du mqtt_handler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Speed OBD-II */}
          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Speed</CardTitle>
              <Zap className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{latest?.vehicle_speed ? latest.vehicle_speed.toFixed(0) : '--'}</div>
              <p className="text-xs text-muted-foreground mt-1">km/h</p>
              <div className="mt-2">{latest?.vehicle_speed && getStatusBadge(latest.vehicle_speed, { warning: 100, critical: 110 })}</div>
            </CardContent>
          </Card>

          {/* RPM */}
          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">RPM</CardTitle>
              <Gauge className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{latest && latest.rpm !== null && latest.rpm !== undefined ? latest.rpm.toFixed(0) : '0'}</div>
              <p className="text-xs text-muted-foreground mt-1">revolutions/min</p>
              <div className="mt-2">{latest && latest.rpm !== null && latest.rpm !== undefined && getStatusBadge(latest.rpm, { warning: 5000, critical: 5500 })}</div>
            </CardContent>
          </Card>

          {/* Temperature (Coolant) */}
          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Temperature</CardTitle>
              <Thermometer className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{latest?.coolant_temperature ? latest.coolant_temperature.toFixed(1) : '--'}</div>
              <p className="text-xs text-muted-foreground mt-1">°C</p>
              <div className="mt-2">{latest?.coolant_temperature && getStatusBadge(latest.coolant_temperature, { warning: 95, critical: 100 })}</div>
            </CardContent>
          </Card>

          {/* Battery (Control Module Voltage) */}
          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Battery</CardTitle>
              <Battery className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{latest?.control_module_voltage ? latest.control_module_voltage.toFixed(2) : '--'}</div>
              <p className="text-xs text-muted-foreground mt-1">V</p>
              <div className="mt-2">{latest?.control_module_voltage && getStatusBadge(latest.control_module_voltage, { warning: 12, critical: 11.8 }, true)}</div>
            </CardContent>
          </Card>

          {/* Engine Load */}
          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Engine Load</CardTitle>
              <Gauge className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest?.engine_load ? latest.engine_load.toFixed(1) : '--'}</div>
              <p className="text-xs text-muted-foreground mt-1">%</p>
              <div className="mt-2">{latest?.engine_load && getStatusBadge(latest.engine_load, { warning: 85, critical: 95 })}</div>
            </CardContent>
          </Card>
        </div>

        {/* Carte Position GPS */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Position GPS</CardTitle>
              <MapPin className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {latest?.latitude && latest?.longitude ? `${latest.latitude.toFixed(4)}, ${latest.longitude.toFixed(4)}` : "36.8065, 10.1815 (Par défaut)"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Coordonnées GPS</p>
            </CardContent>
          </Card>
        </div>
<div
  className={`mt-4 p-4 border rounded space-y-2 transition-colors duration-300 ${
    alerts.length === 0 && prediction.includes("✅")
      ? "bg-red-50 border-red-300"
      : "bg-green-50 border-green-300"
  }`}
>
  <h2
    className={`font-semibold ${
      alerts.length === 0 && prediction.includes("✅")
        ? "text-red-800"
        : "text-green-800"
    }`}
  >
    System Alerts:
  </h2>



  <div
    className={`mt-2 text-sm font-medium ${
      prediction.includes("✅") ? "text-green-700" : "text-red-700"
    }`}
  >
    {prediction}
  </div>
</div>





      </div>
    </DashboardLayout>
  )
}
