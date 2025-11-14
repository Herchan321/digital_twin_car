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
  const [tempData, setTempData] = useState<DataPoint[]>([])
  const [batteryData, setBatteryData] = useState<DataPoint[]>([])
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
        setSpeedData(toPoints('speed_kmh'))
        setRpmData(toPoints('rpm'))
        setTempData(toPoints('temperature'))
        setBatteryData(toPoints('battery_pct'))
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

            setSpeedData((prev) => [...prev.slice(-59), point(t.speed_kmh)])
            setRpmData((prev) => [...prev.slice(-59), point(t.rpm)])
            setTempData((prev) => [...prev.slice(-59), point(t.temperature)])
            setBatteryData((prev) => [...prev.slice(-59), point(t.battery_pct)])
          }
        } catch (e) {
          console.error('Invalid WS message', e)
        }
      }

      ws.onerror = (e) => console.error('WS error', e)
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Vitesse (km/h)" data={speedData} color="#3b82f6" unit="km/h" />
          <ChartCard title="Régime moteur (RPM)" data={rpmData} color="#06b6d4" unit="rpm" />
          <ChartCard title="Température moteur" data={tempData} color="#f59e0b" unit="°C" />
          <ChartCard title="Batterie (%)" data={batteryData} color="#10b981" unit="%" />
        </div>
      </div>
    </DashboardLayout>
  )
}
