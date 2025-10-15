"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, TrendingUp, AlertCircle } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface PredictionData {
  time: string
  actual: number
  predicted: number
}

export default function PredictionsPage() {
  const [chartData, setChartData] = useState<PredictionData[]>([])
  const [predictedTemp, setPredictedTemp] = useState(92.5)
  const [confidence, setConfidence] = useState(87.3)
  const [anomalyProb, setAnomalyProb] = useState(12.4)

  useEffect(() => {
    // Generate initial data
    const initialData: PredictionData[] = []
    const now = new Date()

    for (let i = -10; i <= 5; i++) {
      const time = new Date(now.getTime() + i * 60000)
      const baseTemp = 85 + Math.sin(i * 0.3) * 5
      const actual = i <= 0 ? baseTemp + (Math.random() - 0.5) * 3 : null
      const predicted = i >= -2 ? baseTemp + (Math.random() - 0.5) * 2 : null

      initialData.push({
        time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actual: actual !== null ? Number(actual.toFixed(1)) : (null as any),
        predicted: predicted !== null ? Number(predicted.toFixed(1)) : (null as any),
      })
    }

    setChartData(initialData)

    // Update predictions periodically
    const interval = setInterval(() => {
      setChartData((prev) => {
        const newData = [...prev.slice(1)]
        const lastActual = prev[prev.length - 6]?.actual || 85
        const now = new Date()
        const time = new Date(now.getTime() + 6 * 60000)

        newData.push({
          time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actual: Number((lastActual + (Math.random() - 0.5) * 3).toFixed(1)),
          predicted: Number((lastActual + (Math.random() - 0.5) * 2).toFixed(1)),
        })

        return newData
      })

      setPredictedTemp((prev) => Number((prev + (Math.random() - 0.5) * 2).toFixed(1)))
      setConfidence((prev) => Number(Math.max(75, Math.min(95, prev + (Math.random() - 0.5) * 3)).toFixed(1)))
      setAnomalyProb((prev) => Number(Math.max(5, Math.min(25, prev + (Math.random() - 0.5) * 2)).toFixed(1)))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AI Predictions</h1>
          <p className="text-muted-foreground">Advanced forecasting and anomaly detection</p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Predicted Temperature</CardTitle>
              <TrendingUp className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{predictedTemp.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">°C (5 min ahead)</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Model Confidence</CardTitle>
              <Brain className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{confidence.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">% accuracy</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Anomaly Probability</CardTitle>
              <AlertCircle className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{anomalyProb.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">% risk</p>
            </CardContent>
          </Card>
        </div>

        {/* Prediction chart */}
        <Card className="bg-card border-border border-glow">
          <CardHeader>
            <CardTitle className="text-foreground">Temperature Prediction Model</CardTitle>
            <CardDescription className="text-muted-foreground">
              Actual vs Predicted engine temperature over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: "12px" }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} domain={[70, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      borderRadius: "8px",
                      color: "#f9fafb",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#9ca3af" }} />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 4 }}
                    name="Actual Temperature"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "#06b6d4", r: 4 }}
                    name="Predicted Temperature"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Model description */}
        <Card className="bg-card border-border border-glow">
          <CardHeader>
            <CardTitle className="text-foreground">About the Prediction Model</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              This model predicts engine temperature based on current speed, RPM, and voltage using LSTM (Long
              Short-Term Memory) algorithms. The neural network analyzes historical patterns and real-time sensor data
              to forecast temperature trends up to 5 minutes ahead, enabling proactive maintenance and preventing
              potential overheating issues.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
