"use client"

import { useState, useEffect, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pause, Play, Wifi, WifiOff, AlertTriangle } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useVehicle } from "@/lib/vehicle-context"

interface DataPoint {
  time: string
  value: number
}

interface TelemetryData {
  vehicle_id: number
  engine_load?: number
  coolant_temperature?: number
  rpm?: number
  vehicle_speed?: number
  fuel_rail_pressure?: number
  control_module_voltage?: number
  [key: string]: any
}

interface HistoryPoint {
  timestamp: string
  rpm?: number
  vehicle_speed?: number
  coolant_temperature?: number
  engine_load?: number
  fuel_rail_pressure?: number
  control_module_voltage?: number
}

interface WebSocketMessage {
  type: string
  state: "offline" | "running"
  data: TelemetryData
  history?: HistoryPoint[]
  timestamp: string
}

type TimeWindow = "5min" | "15min" | "1hour"

export default function AnalyticsPage() {
  const { selectedVehicle } = useVehicle()
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("5min")
  const [isPaused, setIsPaused] = useState(false)
  const vehicleId = selectedVehicle?.id || 1
  const [vehicleState, setVehicleState] = useState<"offline" | "running">("offline")

  const [speedData, setSpeedData] = useState<DataPoint[]>([])
  const [rpmData, setRpmData] = useState<DataPoint[]>([])
  const [coolantTempData, setCoolantTempData] = useState<DataPoint[]>([])
  const [engineLoadData, setEngineLoadData] = useState<DataPoint[]>([])
  const [fuelPressureData, setFuelPressureData] = useState<DataPoint[]>([])
  const [controlVoltageData, setControlVoltageData] = useState<DataPoint[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  // Initial load and WebSocket updates
  useEffect(() => {
    let isMounted = true

    // 🔄 Réinitialiser tous les graphiques quand on change de véhicule
    console.log(`🔄 Changement de véhicule: ${vehicleId}`)
    setSpeedData([])
    setRpmData([])
    setCoolantTempData([])
    setEngineLoadData([])
    setFuelPressureData([])
    setControlVoltageData([])
    setVehicleState("offline")

    // Connexion WebSocket pour les mises à jour en temps réel
    try {
      const url = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000/ws/telemetry')
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log(`✅ WebSocket Analytics connecté pour véhicule ${vehicleId}`)
      }

      ws.onmessage = (ev) => {
        if (isPaused) return // Ne pas mettre à jour si en pause
        
        try {
          const message: WebSocketMessage = JSON.parse(ev.data)
          
          if (message.type === 'telemetry_update') {
            const t = message.data
            
            // ✅ FILTRER par vehicle_id - CRITIQUE pour éviter mélange des données
            if (t.vehicle_id !== vehicleId) {
              console.log(`🔄 Données ignorées: vehicle ${t.vehicle_id} !== ${vehicleId}`)
              return
            }

            console.log(`✅ Données acceptées pour véhicule ${vehicleId}`)
            setVehicleState(message.state)

            // ✅ UTILISER L'HISTORIQUE SI DISPONIBLE (100 points du backend)
            if (message.history && message.history.length > 0) {
              console.log(`📊 Historique reçu: ${message.history.length} points`)
              
              // Convertir l'historique en format graphique
              const historyData = message.history.map(point => ({
                time: new Date(point.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                }),
                speed: Number(point.vehicle_speed ?? 0),
                rpm: Number(point.rpm ?? 0),
                coolantTemp: Number(point.coolant_temperature ?? 0),
                engineLoad: Number(point.engine_load ?? 0),
                fuelPressure: Number(point.fuel_rail_pressure ?? 0),
                controlVoltage: Number(point.control_module_voltage ?? 0)
              }))

              // Mettre à jour tous les graphiques avec l'historique complet
              setSpeedData(historyData.map(p => ({ time: p.time, value: p.speed })))
              setRpmData(historyData.map(p => ({ time: p.time, value: p.rpm })))
              setCoolantTempData(historyData.map(p => ({ time: p.time, value: p.coolantTemp })))
              setEngineLoadData(historyData.map(p => ({ time: p.time, value: p.engineLoad })))
              setFuelPressureData(historyData.map(p => ({ time: p.time, value: p.fuelPressure })))
              setControlVoltageData(historyData.map(p => ({ time: p.time, value: p.controlVoltage })))
            } else {
              // Fallback: ajouter point par point (ancien comportement)
              const now = new Date()
              const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

              const point = (val: any) => ({
                time: timeStr,
                value: Number(val ?? 0),
              })

              // Garder seulement les 100 derniers points (défilement style trading)
              setSpeedData((prev) => [...prev.slice(-99), point(t.vehicle_speed)])
              setRpmData((prev) => [...prev.slice(-99), point(t.rpm)])
              setCoolantTempData((prev) => [...prev.slice(-99), point(t.coolant_temperature)])
              setEngineLoadData((prev) => [...prev.slice(-99), point(t.engine_load)])
              setFuelPressureData((prev) => [...prev.slice(-99), point(t.fuel_rail_pressure)])
              setControlVoltageData((prev) => [...prev.slice(-99), point(t.control_module_voltage)])
            }
          }
        } catch (e) {
          console.error('Invalid WS message', e)
        }
      }

      ws.onerror = (event) => {
        console.warn('⚠️ WS error')
      }

      ws.onclose = (ev) => {
        console.warn('🔴 WebSocket Analytics fermé')
        if (wsRef.current === ws) wsRef.current = null
        
        // Reconnexion automatique si pas en pause
        if (!isPaused && isMounted) {
          setTimeout(() => {
            console.log('🔄 Reconnexion Analytics...')
          }, 5000)
        }
      }
    } catch (e) {
      console.error('Cannot open websocket', e)
    }

    return () => {
      isMounted = false
      if (wsRef.current) {
        try { wsRef.current.close() } catch {}
      }
    }
  }, [vehicleId, isPaused])

  const ChartCard = ({
    title,
    data,
    color,
    unit,
  }: {
    title: string
    data: DataPoint[]
    color: string
    unit: string
  }) => {
    // Obtenir la dernière valeur pour l'affichage
    const lastValue = data.length > 0 ? data[data.length - 1].value : 0

    return (
      <Card className="bg-card border-border border-glow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">{title}</CardTitle>
              <CardDescription className="text-muted-foreground">Real-time</CardDescription>
            </div>
            {/* Afficher la dernière valeur à droite */}
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color }}>
                {lastValue.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">{unit}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="time"
                  stroke="#6b7280"
                  style={{ fontSize: "10px" }}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#6b7280" 
                  style={{ fontSize: "12px" }}
                  tick={{ fill: '#6b7280' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: "8px",
                    color: "#f9fafb",
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, title]}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  animationDuration={0}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Indicateur du nombre de points */}
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {data.length} points • Automatic scrolling
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <DashboardLayout>
      {!selectedVehicle ? (
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                No vehicle selected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Please select a vehicle from the sidebar to display its real-time analytics.
              </p>
              <Button onClick={() => window.location.href = '/fleet'} className="w-full">
                Manage fleet
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 no-animations">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                📊 Analytics - {selectedVehicle.name}
              </h1>
              <p className="text-muted-foreground">Real-time vehicle data visualization</p>
              {selectedVehicle.vin && (
                <p className="text-sm text-muted-foreground">VIN: {selectedVehicle.vin}</p>
              )}
            </div>
          <div className="flex items-center gap-3">
            {/* Indicateur d'état */}
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
            
            <Select value={timeWindow} onValueChange={(value) => setTimeWindow(value as TimeWindow)}>
              <SelectTrigger className="w-[140px] bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5min">Last 5 min</SelectItem>
                <SelectItem value="15min">Last 15 min</SelectItem>
                <SelectItem value="1hour">Last hour</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)} className="gap-2 border-border">
              {isPaused ? (
                <>
                  <Play className="w-4 h-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Note sur l'état offline */}
        {vehicleState === "offline" && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <p className="text-orange-500 text-sm">
              ⚠️ Vehicle offline - Displaying last received values
            </p>
          </div>
        )}

        {/* Grille des graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <ChartCard title="Vehicle Speed (OBD-II)" data={speedData} color="#3b82f6" unit="km/h" />
          <ChartCard title="Engine Speed (RPM)" data={rpmData} color="#06b6d4" unit="rpm" />
          <ChartCard title="Coolant Temperature" data={coolantTempData} color="#f59e0b" unit="°C" />
          <ChartCard title="Engine Load" data={engineLoadData} color="#10b981" unit="%" />
          <ChartCard title="Fuel Rail Pressure" data={fuelPressureData} color="#8b5cf6" unit="kPa" />
          <ChartCard title="ECU Voltage" data={controlVoltageData} color="#f97316" unit="V" />
        </div>
      </div>
      )}
    </DashboardLayout>
  )
}
