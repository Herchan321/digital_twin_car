"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { VehicleGoogleMap } from "@/components/vehicle-google-map"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, Play, Pause, Zap, Gauge, Thermometer, Battery, AlertTriangle, MapPin } from "lucide-react"
import { Telemetry, getVehicleTelemetry, subscribeVehicleTelemetry } from "@/lib/supabase"

export default function DashboardPage() {
  const [telemetry, setTelemetry] = useState<Telemetry[]>([])
  const [isLiveMode, setIsLiveMode] = useState(true)
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isMounted, setIsMounted] = useState(false)
  const [alerts, setAlerts] = useState<string[]>([])
  const [prediction, setPrediction] = useState<string>("No issues detected")

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

    // Polling régulier toutes les 3 secondes pour récupérer les nouvelles données
    const pollInterval = setInterval(() => {
      loadData()
    }, 1000)

    // Souscription Realtime pour les mises à jour instantanées (optionnel)
    const subscription = subscribeVehicleTelemetry(vehicleId, (newData) => {
      setTelemetry((prev) => [...prev, newData])
      setLastUpdate(new Date())
    })

    return () => {
      clearInterval(pollInterval)
      subscription && subscription.unsubscribe()
    }
  }, [isLiveMode, vehicleId])

  const latest = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null

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

  if (latest.temperature > 100) newAlerts.push("⚠️ Température critique !")
  else if (latest.temperature > 95) newAlerts.push("⚠️ Température élevée.")

  if (latest.battery_pct < 11.8) newAlerts.push("⚠️ Batterie critique !")
  else if (latest.battery_pct < 12) newAlerts.push("⚠️ Batterie faible.")

  if (latest.rpm && latest.rpm > 5500) newAlerts.push("⚠️ RPM critique !")
  else if (latest.rpm && latest.rpm > 5000) newAlerts.push("⚠️ RPM élevé.")

  if (latest.speed_kmh > 110) newAlerts.push("⚠️ Vitesse critique !")
  else if (latest.speed_kmh > 100) newAlerts.push("⚠️ Vitesse élevée.")

  if (newAlerts.length === 0) {
    setAlerts([" No issues detected"])
    setPrediction("✅ System stable - no issues predicted")
  } else {
    setAlerts(newAlerts)

    if (latest.temperature > 98 && latest.battery_pct < 12)
      setPrediction("⚠️ Risk of overheating and power loss predicted soon")
    else if (latest.temperature > 95)
      setPrediction("⚠️ Possible overheating in the next minutes")
    else if (latest.battery_pct < 12)
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

        {/* Vehicle visualization */}
        <Card className="bg-card border-border border-glow">
          <CardContent className="p-6">
            {latest && <VehicleGoogleMap 
              latitude={latest.latitude}
              longitude={latest.longitude}
              speed={latest.speed_kmh}
              temperature={latest.temperature}
              battery={latest.battery_pct}
              status={latest.temperature > 100 || latest.battery_pct < 11.8 || (latest.rpm ?? 0) > 5500 
                ? "critical" 
                : latest.temperature > 95 || latest.battery_pct < 12 || (latest.rpm ?? 0) > 5000
                ? "warning"
                : "normal"
              }
            />}
          </CardContent>
        </Card>

        {/* KPIs cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Speed */}
          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Speed</CardTitle>
              <Zap className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{latest ? latest.speed_kmh.toFixed(0) : '--'}</div>
              <p className="text-xs text-muted-foreground mt-1">km/h</p>
              <div className="mt-2">{latest && getStatusBadge(latest.speed_kmh, { warning: 100, critical: 110 })}</div>
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

          {/* Temperature */}
          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Temperature</CardTitle>
              <Thermometer className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{latest ? latest.temperature.toFixed(1) : '--'}</div>
              <p className="text-xs text-muted-foreground mt-1">°C</p>
              <div className="mt-2">{latest && getStatusBadge(latest.temperature, { warning: 95, critical: 100 })}</div>
            </CardContent>
          </Card>

          {/* Battery */}
          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Battery</CardTitle>
              <Battery className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{latest ? latest.battery_pct.toFixed(2) : '--'}</div>
              <p className="text-xs text-muted-foreground mt-1">V</p>
              <div className="mt-2">{latest && getStatusBadge(latest.battery_pct, { warning: 12, critical: 11.8 }, true)}</div>
            </CardContent>
          </Card>

          {/* 🌍 Position */}
          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Position</CardTitle>
              <MapPin className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {latest ? `${latest.latitude.toFixed(4)}, ${latest.longitude.toFixed(4)}` : "--"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">GPS coordinates</p>
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
