"use client"

import { useState, useEffect, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pause, Play } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DataPoint {
  time: string
  value: number
}

type TimeWindow = "5min" | "15min" | "1hour"

export default function AnalyticsPage() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("5min")
  const [isPaused, setIsPaused] = useState(false)
  const [vehicleId, setVehicleId] = useState<number>(1) // ← id du véhicule à suivre

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

    const loadInitial = async () => {
      try {
        const res = await fetch(`http://localhost:8000/analytics/telemetry?vehicle_id=${vehicleId}`)
        if (!res.ok) throw new Error("Erreur lors de la récupération des données")
        const data = await res.json()

        const toPoints = (key: string) =>
          data.map((d: any) => ({
            time: new Date(d.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            value: Number(d[key] ?? 0),
          }))

        if (!isMounted) return
        setSpeedData(toPoints('vehicle_speed'))
        setRpmData(toPoints('rpm'))
        setCoolantTempData(toPoints('coolant_temperature'))
        setEngineLoadData(toPoints('engine_load'))
        setFuelPressureData(toPoints('fuel_rail_pressure'))
        setControlVoltageData(toPoints('control_module_voltage'))
      } catch (error) {
        console.error("Erreur lors du fetch telemetry:", error)
      }
    }

    loadInitial()

    // Open WebSocket connection
    try {
      const url = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000') + '/ws/telemetry'
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connecté')
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg?.type === 'telemetry_insert') {
            const t = msg.data
            if (t.vehicle_id !== vehicleId) return

            const point = (val: any) => ({
              time: new Date(t.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              value: Number(val ?? 0),
            })

            setSpeedData((prev) => [...prev.slice(-59), point(t.vehicle_speed)])
            setRpmData((prev) => [...prev.slice(-59), point(t.rpm)])
            setCoolantTempData((prev) => [...prev.slice(-59), point(t.coolant_temperature)])
            setEngineLoadData((prev) => [...prev.slice(-59), point(t.engine_load)])
            setFuelPressureData((prev) => [...prev.slice(-59), point(t.fuel_rail_pressure)])
            setControlVoltageData((prev) => [...prev.slice(-59), point(t.control_module_voltage)])
          }
        } catch (e) {
          console.error('Invalid WS message', e)
        }
      }

      // Avoid passing raw Error objects to console.error (Next intercepts them)
      ws.onerror = (event) => {
        try {
          const info = event && (event as any).message ? (event as any).message : JSON.stringify(event)
          // use warn to avoid Next treating this as an unhandled error
          console.warn('WS error:', info)
        } catch (err) {
          console.warn('WS error (non-serializable event)')
        }
      }

      ws.onclose = (ev) => {
        console.warn('WebSocket closed', { code: ev?.code, reason: ev?.reason, wasClean: ev?.wasClean })
        // clear ref so reconnection logic can create a fresh socket
        if (wsRef.current === ws) wsRef.current = null
        // simple reconnect after delay if page still mounted and not paused
        try {
          if (!isPaused) {
            setTimeout(() => {
              // create a new socket by re-running the effect: toggle the vehicleId state to trigger? Instead, open a new socket here
              try {
                const url2 = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000') + '/ws/telemetry'
                const newWs = new WebSocket(url2)
                wsRef.current = newWs
                newWs.onopen = () => console.log('WebSocket reconnected')
                newWs.onmessage = ws.onmessage
                newWs.onerror = ws.onerror
                newWs.onclose = ws.onclose
              } catch (e) {
                console.warn('WS reconnect failed', e)
              }
            }, 5000)
          }
        } catch (e) {
          console.warn('Error scheduling WS reconnect', e)
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
  }, [vehicleId])

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
  }) => (
    <Card className="bg-card border-border border-glow">
      <CardHeader>
        <CardTitle className="text-foreground">{title}</CardTitle>
        <CardDescription className="text-muted-foreground">Données télémétriques en temps réel</CardDescription>
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
              />
              <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
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
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6 no-animations">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">📊 Real-Time Vehicle Analytics</h1>
            <p className="text-muted-foreground">Visualisation en direct des données du véhicule</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeWindow} onValueChange={(value) => setTimeWindow(value as TimeWindow)}>
              <SelectTrigger className="w-[140px] bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5min">Dernières 5 min</SelectItem>
                <SelectItem value="15min">Dernières 15 min</SelectItem>
                <SelectItem value="1hour">Dernière heure</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)} className="gap-2 border-border">
              {isPaused ? (
                <>
                  <Play className="w-4 h-4" />
                  Reprendre
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

        {/* Grille des graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <ChartCard title="Vitesse Véhicule (OBD-II)" data={speedData} color="#3b82f6" unit="km/h" />
          <ChartCard title="Régime moteur (RPM)" data={rpmData} color="#06b6d4" unit="rpm" />
          <ChartCard title="Température Liquide Refroidissement" data={coolantTempData} color="#f59e0b" unit="°C" />
          <ChartCard title="Charge Moteur" data={engineLoadData} color="#10b981" unit="%" />
          <ChartCard title="Pression Rail Carburant" data={fuelPressureData} color="#8b5cf6" unit="kPa" />
          <ChartCard title="Tension ECU" data={controlVoltageData} color="#f97316" unit="V" />
        </div>
      </div>
    </DashboardLayout>
  )
}
