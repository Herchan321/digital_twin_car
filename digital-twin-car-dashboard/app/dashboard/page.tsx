"use client"

import { useState, useEffect, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { VehicleVisualization } from "@/components/vehicle-visualization"
import { VehicleMap3D } from "@/components/vehicle-map-3d"  // Nouveau composant
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, Play, Pause, Zap, Gauge, Thermometer, Battery, AlertTriangle, MapPin, Map } from "lucide-react"

interface TelemetryData {
  vehicle_id: number
  engine_load?: number
  coolant_temperature?: number
  intake_pressure?: number
  rpm?: number
  vehicle_speed?: number
  intake_air_temp?: number
  maf_airflow?: number
  throttle_position?: number
  fuel_rail_pressure?: number
  control_module_voltage?: number
  latitude?: number
  longitude?: number
  [key: string]: any
}

interface WebSocketMessage {
  type: string
  state: "offline" | "running"
  data: TelemetryData
  timestamp: string
}

export default function DashboardPage() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null)
  const [isLiveMode, setIsLiveMode] = useState(true)
  const [vehicleState, setVehicleState] = useState<"offline" | "running">("offline")
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isMounted, setIsMounted] = useState(false)
  const [alerts, setAlerts] = useState<string[]>([])
  const [prediction, setPrediction] = useState<string>("No issues detected")
  const [showMap, setShowMap] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)

  const vehicleId = "1" 

  useEffect(() => setIsMounted(true), [])

  useEffect(() => {
    // Charger les données initiales via REST API
    async function loadInitialData() {
      try {
        const response = await fetch('http://localhost:8000/telemetry/latest')
        const data = await response.json()
        
        if (data.data) {
          setTelemetry(data.data)
          setVehicleState(data.state)
          setLastUpdate(new Date())
        }
      } catch (error) {
        console.error("❌ Erreur chargement initial:", error)
      }
    }

    loadInitialData() 

    if (!isLiveMode) return

    // Connexion WebSocket pour les mises à jour en temps réel
    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000/ws/telemetry')
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('✅ WebSocket connecté')
    }

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        
        if (message.type === 'telemetry_update') {
          setTelemetry(message.data)
          setVehicleState(message.state)
          setLastUpdate(new Date())
          console.log(`📊 Données reçues - État: ${message.state}`, message.data)
        }
      } catch (error) {
        console.error('Erreur parsing WebSocket:', error)
      }
    }

    ws.onerror = (error) => {
      console.warn('⚠️ WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('🔴 WebSocket déconnecté')
      // Reconnexion automatique après 5 secondes
      if (isLiveMode) {
        setTimeout(() => {
          console.log('🔄 Tentative de reconnexion...')
        }, 5000)
      }
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [isLiveMode, vehicleId])

  const latest = telemetry
  
  // Debug: Afficher les données reçues
  console.log("Latest data:", latest, "State:", vehicleState)

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
              {vehicleState === "running" ? (
                <>
                  <Wifi className="w-5 h-5 text-success" />
                  <span className="text-sm text-success font-medium">Running</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">Offline</span>
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

        {/* Layout avec carte uniquement (Visualisation 3D supprimée) */}
        <div className="grid gap-6 grid-cols-1">
          {/* Carte Google Maps 3D */}
          {showMap && (
            <Card className="bg-card border-border border-glow h-[500px]">
              <CardHeader>
                <CardTitle>Position GPS en Temps Réel</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-full">
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
              <div className="text-3xl font-bold">
                {latest?.vehicle_speed !== undefined && latest?.vehicle_speed !== null 
                  ? latest.vehicle_speed.toFixed(0) 
                  : '--'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">km/h</p>
              {vehicleState === "offline" && <p className="text-xs text-orange-500 mt-1">Last value</p>}
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
              <div className="text-3xl font-bold">
                {latest?.rpm !== undefined && latest?.rpm !== null 
                  ? latest.rpm.toFixed(0) 
                  : '--'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">revolutions/min</p>
              {vehicleState === "offline" && <p className="text-xs text-orange-500 mt-1">Last value</p>}
              <div className="mt-2">{latest?.rpm && getStatusBadge(latest.rpm, { warning: 5000, critical: 5500 })}</div>
            </CardContent>
          </Card>

          {/* Temperature (Coolant) */}
          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Temperature</CardTitle>
              <Thermometer className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {latest?.coolant_temperature !== undefined && latest?.coolant_temperature !== null 
                  ? latest.coolant_temperature.toFixed(1) 
                  : '--'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">°C</p>
              {vehicleState === "offline" && <p className="text-xs text-orange-500 mt-1">Last value</p>}
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
              <div className="text-3xl font-bold">
                {latest?.control_module_voltage !== undefined && latest?.control_module_voltage !== null 
                  ? latest.control_module_voltage.toFixed(2) 
                  : '--'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">V</p>
              {vehicleState === "offline" && <p className="text-xs text-orange-500 mt-1">Last value</p>}
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
              <div className="text-2xl font-bold">
                {latest?.engine_load !== undefined && latest?.engine_load !== null 
                  ? latest.engine_load.toFixed(1) 
                  : '--'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">%</p>
              {vehicleState === "offline" && <p className="text-xs text-orange-500 mt-1">Last value</p>}
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
