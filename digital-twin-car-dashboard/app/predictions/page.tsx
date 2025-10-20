"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { useStore } from "../../lib/store"
import { 
  ResponsiveContainer, LineChart, CartesianGrid, 
  XAxis, YAxis, Tooltip, Legend, Line 
} from 'recharts';

interface PredictionData {
  time: string
  actual: number
  predicted: number
}

interface Prediction {
  vehicle_id: string
  timestamp: string
  estimated_range_km: number
  battery_health_pct: number
  next_maintenance_due: string
  performance_score: number
  estimated_energy_consumption?: number
}

export default function PredictionsPage() {
  const [chartData, setChartData] = useState<PredictionData[]>([])
  const [predictedTemp, setPredictedTemp] = useState(92.5)
  const [confidence, setConfidence] = useState(87.3)
  const [anomalyProb, setAnomalyProb] = useState(12.4)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { selectedVehicle } = useStore()

  const vehicleId = "vehicle1" // Pour simplifier, utilisons un ID fixe

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

  useEffect(() => {
    async function fetchPrediction() {
      setLoading(true)
      setError(null)

      try {
        console.log("Récupération des prédictions pour:", vehicleId)
        // Ajoutez ce log pour déboguer
        console.log("Tentative de connexion à:", `/api/predictions?vehicleId=${vehicleId}`);
        const response = await fetch(`/api/predictions?vehicleId=${vehicleId}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Erreur ${response.status}`)
        }

        const data = await response.json()
        console.log("Données de prédiction reçues:", data)
        setPrediction(data)
      } catch (err) {
        console.error("Erreur:", err)
        setError(err instanceof Error ? err.message : "Erreur inconnue")
      } finally {
        setLoading(false)
      }
    }

    fetchPrediction()
  }, [vehicleId])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AI Predictions</h1>
          <p className="text-muted-foreground">Advanced forecasting and anomaly detection</p>
        </div>


        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Prédictions et Analyses</h1>

          {error && (
            <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">Erreur: {error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : prediction ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Autonomie Estimée</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {prediction.estimated_range_km.toFixed(1)} km
                  </div>
                  <p className="text-xs text-muted-foreground">Basé sur le niveau de batterie actuel</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Santé de la Batterie</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {prediction.battery_health_pct.toFixed(1)}%
                  </div>
                  <Badge
                    variant={
                      prediction.battery_health_pct > 80
                        ? "default"
                        : prediction.battery_health_pct > 60
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {prediction.battery_health_pct > 80
                      ? "Excellent"
                      : prediction.battery_health_pct > 60
                      ? "Bon"
                      : "Attention requise"}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Prochaine Maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Date(prediction.next_maintenance_due).toLocaleDateString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Basé sur l'utilisation actuelle</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Score de Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {prediction.performance_score.toFixed(1)}/100
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                    <div
                      className={`h-2.5 rounded-full ${
                        prediction.performance_score > 80
                          ? "bg-green-600"
                          : prediction.performance_score > 60
                          ? "bg-yellow-400"
                          : "bg-red-600"
                      }`}
                      style={{ width: `${prediction.performance_score}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {prediction.estimated_energy_consumption && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Consommation Estimée</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {prediction.estimated_energy_consumption.toFixed(1)} kWh/100km
                    </div>
                    <p className="text-xs text-muted-foreground">Basé sur votre style de conduite</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Dernière Mise à Jour</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-md font-medium">
                    {new Date(prediction.timestamp).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p>Aucune prédiction disponible.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
