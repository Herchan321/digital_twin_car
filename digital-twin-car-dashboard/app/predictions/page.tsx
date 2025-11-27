"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { DashboardLayout } from "../../components/dashboard-layout"

// Interface pour les données de prédiction
interface PredictionData {
  time: string
  actual: number | null
  predicted: number | null
}

interface Prediction {
  vehicle_id: string
  timestamp: string
  estimated_range_km: number
  battery_health_pct: number
  next_maintenance_due: string
  performance_score: number
  estimated_energy_consumption?: number
  // Nouvelles données OBD-II
  engine_efficiency?: number
  coolant_health_score?: number
  fuel_system_health?: number
  predicted_failures?: string[]
}

export default function PredictionsPage() {
  const [chartData, setChartData] = useState<PredictionData[]>([])
  const [predictedTemp, setPredictedTemp] = useState(92.5)
  const [confidence, setConfidence] = useState(87.3)
  const [anomalyProb, setAnomalyProb] = useState(12.4)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const vehicleId = "vehicle1" // Pour simplifier, utilisons un ID fixe

  // Génération de données de graphique
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

  // Récupération ou simulation des données de prédiction
  useEffect(() => {
    async function fetchPrediction() {
      setLoading(true);
      setError(null);
      
      try {
        // Simulation de données au lieu d'appeler l'API
        const simulatedData = {
          vehicle_id: "vehicle1",
          timestamp: new Date().toISOString(),
          estimated_range_km: 350.5,
          battery_health_pct: 92.8,
          next_maintenance_due: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
          performance_score: 88.7,
          estimated_energy_consumption: 15.3,
          // Nouvelles données basées sur OBD-II
          engine_efficiency: 94.2,
          coolant_health_score: 89.5,
          fuel_system_health: 91.8,
          predicted_failures: ["Filtre à air à remplacer dans 2 semaines", "Capteur O2 dégradation légère"]
        };
        
        // Attente simulée pour imiter une requête API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("Données simulées:", simulatedData);
        setPrediction(simulatedData);
      } catch (err) {
        console.error("Erreur:", err);
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    
    fetchPrediction();
  }, [])

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
                      {prediction.estimated_energy_consumption.toFixed(1)} L/100km
                    </div>
                    <p className="text-xs text-muted-foreground">Basé sur votre style de conduite</p>
                  </CardContent>
                </Card>
              )}

              {/* Nouvelles cartes OBD-II */}
              {prediction.engine_efficiency && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Efficacité Moteur</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {prediction.engine_efficiency.toFixed(1)}%
                    </div>
                    <Badge variant={prediction.engine_efficiency > 90 ? "default" : "secondary"}>
                      {prediction.engine_efficiency > 90 ? "Optimal" : "Bon"}
                    </Badge>
                  </CardContent>
                </Card>
              )}

              {prediction.coolant_health_score && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Santé Système Refroidissement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {prediction.coolant_health_score.toFixed(1)}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                      <div
                        className={`h-2.5 rounded-full ${
                          prediction.coolant_health_score > 85
                            ? "bg-green-600"
                            : prediction.coolant_health_score > 70
                            ? "bg-yellow-400"
                            : "bg-red-600"
                        }`}
                        style={{ width: `${prediction.coolant_health_score}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {prediction.fuel_system_health && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Santé Système Carburant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {prediction.fuel_system_health.toFixed(1)}%
                    </div>
                    <Badge
                      variant={
                        prediction.fuel_system_health > 85
                          ? "default"
                          : prediction.fuel_system_health > 70
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {prediction.fuel_system_health > 85
                        ? "Excellent"
                        : prediction.fuel_system_health > 70
                        ? "Bon"
                        : "Attention"}
                    </Badge>
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
            <p>Aucune donnée de prédiction disponible.</p>
          )}

          {/* Section des alertes prédictives */}
          {prediction?.predicted_failures && prediction.predicted_failures.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">🔮 Alertes Prédictives</h2>
              <div className="space-y-3">
                {prediction.predicted_failures.map((failure, index) => (
                  <Card key={index} className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">Prévention</Badge>
                        <p className="text-sm font-medium">{failure}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

