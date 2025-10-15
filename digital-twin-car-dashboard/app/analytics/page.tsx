"use client"

import { useState, useEffect } from "react"
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

  const [speedData, setSpeedData] = useState<DataPoint[]>([])
  const [rpmData, setRpmData] = useState<DataPoint[]>([])
  const [tempData, setTempData] = useState<DataPoint[]>([])
  const [batteryData, setBatteryData] = useState<DataPoint[]>([])

  const getDataPointsCount = (window: TimeWindow) => {
    switch (window) {
      case "5min":
        return 30
      case "15min":
        return 45
      case "1hour":
        return 60
      default:
        return 30
    }
  }

  useEffect(() => {
    const pointsCount = getDataPointsCount(timeWindow)

    // Initialize data
    const initData = (baseValue: number, variance: number): DataPoint[] => {
      const data: DataPoint[] = []
      const now = new Date()

      for (let i = 0; i < pointsCount; i++) {
        const time = new Date(now.getTime() - (pointsCount - i) * 2000)
        data.push({
          time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          value: Number((baseValue + (Math.random() - 0.5) * variance).toFixed(2)),
        })
      }
      return data
    }

    setSpeedData(initData(65, 20))
    setRpmData(initData(2500, 1000))
    setTempData(initData(85, 10))
    setBatteryData(initData(12.6, 0.5))
  }, [timeWindow])

  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })

      setSpeedData((prev) => {
        const newData = [...prev.slice(1)]
        const lastValue = prev[prev.length - 1]?.value || 65
        newData.push({
          time: timeStr,
          value: Number(Math.max(0, Math.min(120, lastValue + (Math.random() - 0.5) * 10)).toFixed(2)),
        })
        return newData
      })

      setRpmData((prev) => {
        const newData = [...prev.slice(1)]
        const lastValue = prev[prev.length - 1]?.value || 2500
        newData.push({
          time: timeStr,
          value: Number(Math.max(800, Math.min(6000, lastValue + (Math.random() - 0.5) * 500)).toFixed(2)),
        })
        return newData
      })

      setTempData((prev) => {
        const newData = [...prev.slice(1)]
        const lastValue = prev[prev.length - 1]?.value || 85
        newData.push({
          time: timeStr,
          value: Number(Math.max(70, Math.min(110, lastValue + (Math.random() - 0.5) * 5)).toFixed(2)),
        })
        return newData
      })

      setBatteryData((prev) => {
        const newData = [...prev.slice(1)]
        const lastValue = prev[prev.length - 1]?.value || 12.6
        newData.push({
          time: timeStr,
          value: Number(Math.max(11.5, Math.min(14.5, lastValue + (Math.random() - 0.5) * 0.2)).toFixed(2)),
        })
        return newData
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [isPaused])

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
        <CardDescription className="text-muted-foreground">Real-time monitoring</CardDescription>
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
                tickFormatter={(value) => {
                  const parts = value.split(":")
                  return `${parts[0]}:${parts[1]}`
                }}
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
              />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Real-Time Analytics</h1>
            <p className="text-muted-foreground">Live vehicle data monitoring and visualization</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeWindow} onValueChange={(value) => setTimeWindow(value as TimeWindow)}>
              <SelectTrigger className="w-[140px] bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5min">Last 5 min</SelectItem>
                <SelectItem value="15min">Last 15 min</SelectItem>
                <SelectItem value="1hour">Last 1 hour</SelectItem>
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

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Speed" data={speedData} color="#3b82f6" unit="km/h" />
          <ChartCard title="RPM" data={rpmData} color="#06b6d4" unit="rpm" />
          <ChartCard title="Temperature" data={tempData} color="#f59e0b" unit="°C" />
          <ChartCard title="Battery Voltage" data={batteryData} color="#10b981" unit="V" />
        </div>
      </div>
    </DashboardLayout>
  )
}
