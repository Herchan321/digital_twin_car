"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { VehicleVisualization } from "@/components/vehicle-visualization"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Gauge, Thermometer, Battery, Zap, Wifi, WifiOff, Play, Pause, AlertTriangle } from "lucide-react"

type VehicleStatus = "normal" | "warning" | "critical"

interface VehicleData {
  speed: number
  rpm: number
  temperature: number
  battery: number
  status: VehicleStatus
}

interface Alert {
  id: number
  message: string
  type: "warning" | "critical"
  timestamp: string
}

export default function DashboardPage() {
  const [vehicleData, setVehicleData] = useState<VehicleData>({
    speed: 65,
    rpm: 2500,
    temperature: 85,
    battery: 12.6,
    status: "normal",
  })

  const [isConnected, setIsConnected] = useState(true)
  const [isLiveMode, setIsLiveMode] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isMounted, setIsMounted] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: 1, message: "Engine temperature slightly elevated", type: "warning", timestamp: "2 min ago" },
  ])

  // Fix hydration mismatch for time display
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isLiveMode) return

    const interval = setInterval(() => {
      setVehicleData((prev) => {
        const newSpeed = Math.max(0, Math.min(120, prev.speed + (Math.random() - 0.5) * 10))
        const newRpm = Math.max(800, Math.min(6000, prev.rpm + (Math.random() - 0.5) * 500))
        const newTemp = Math.max(70, Math.min(110, prev.temperature + (Math.random() - 0.5) * 5))
        const newBattery = Math.max(11.5, Math.min(14.5, prev.battery + (Math.random() - 0.5) * 0.2))

        let newStatus: VehicleStatus = "normal"
        if (newTemp > 100 || newBattery < 11.8) {
          newStatus = "critical"
        } else if (newTemp > 95 || newBattery < 12.0 || newRpm > 5000) {
          newStatus = "warning"
        }

        return {
          speed: newSpeed,
          rpm: newRpm,
          temperature: newTemp,
          battery: newBattery,
          status: newStatus,
        }
      })
      setLastUpdate(new Date())
    }, 2000)

    return () => clearInterval(interval)
  }, [isLiveMode])

  const getStatusBadge = (value: number, thresholds: { warning: number; critical: number }, reverse = false) => {
    if (reverse) {
      if (value < thresholds.critical)
        return <Badge className="bg-destructive text-destructive-foreground">Critical</Badge>
      if (value < thresholds.warning) return <Badge className="bg-warning text-warning-foreground">Warning</Badge>
      return <Badge className="bg-success text-success-foreground">Normal</Badge>
    } else {
      if (value > thresholds.critical)
        return <Badge className="bg-destructive text-destructive-foreground">Critical</Badge>
      if (value > thresholds.warning) return <Badge className="bg-warning text-warning-foreground">Warning</Badge>
      return <Badge className="bg-success text-success-foreground">Normal</Badge>
    }
  }

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLiveMode(!isLiveMode)}
              className="gap-2 border-border"
            >
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

        {/* Last update timestamp */}
        <div className="text-sm text-muted-foreground">
          Last update: {isMounted ? lastUpdate.toLocaleTimeString() : '--:--:--'}
        </div>

        {/* Vehicle visualization */}
        <Card className="bg-card border-border border-glow">
          <CardContent className="p-6">
            <VehicleVisualization data={vehicleData} />
          </CardContent>
        </Card>

        {/* Metrics cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Speed</CardTitle>
              <Zap className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{vehicleData.speed.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground mt-1">km/h</p>
              <div className="mt-2">{getStatusBadge(vehicleData.speed, { warning: 100, critical: 110 })}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">RPM</CardTitle>
              <Gauge className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{vehicleData.rpm.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground mt-1">revolutions/min</p>
              <div className="mt-2">{getStatusBadge(vehicleData.rpm, { warning: 5000, critical: 5500 })}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Temperature</CardTitle>
              <Thermometer className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{vehicleData.temperature.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">°C</p>
              <div className="mt-2">{getStatusBadge(vehicleData.temperature, { warning: 95, critical: 100 })}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Battery</CardTitle>
              <Battery className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{vehicleData.battery.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">V</p>
              <div className="mt-2">{getStatusBadge(vehicleData.battery, { warning: 12.0, critical: 11.8 }, true)}</div>
            </CardContent>
          </Card>
        </div>

        {/* System alerts */}
        <Card className="bg-card border-border border-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-warning" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alerts at this time</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary border border-border"
                  >
                    <AlertTriangle
                      className={`w-5 h-5 mt-0.5 ${alert.type === "critical" ? "text-destructive" : "text-warning"}`}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
