"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts"
import { 
  Activity, AlertTriangle, Battery, Droplet, Gauge, Leaf, 
  Thermometer, TrendingUp, User, AlertCircle, CheckCircle2
} from "lucide-react"
import { useVehicle } from "@/lib/vehicle-context"

// --- Mock Data ---

const ENGINE_TEMP_PREDICTION = [
  { time: "Now", temp: 85, limit: 100 },
  { time: "+5m", temp: 87, limit: 100 },
  { time: "+10m", temp: 89, limit: 100 },
  { time: "+15m", temp: 92, limit: 100 },
  { time: "+20m", temp: 94, limit: 100 },
  { time: "+25m", temp: 93, limit: 100 },
  { time: "+30m", temp: 91, limit: 100 },
  { time: "+35m", temp: 89, limit: 100 },
  { time: "+40m", temp: 88, limit: 100 },
  { time: "+45m", temp: 87, limit: 100 },
]

const FUEL_CONSUMPTION_DATA = [
  { day: "Mon", actual: 6.5, predicted: 6.4 },
  { day: "Tue", actual: 6.8, predicted: 6.6 },
  { day: "Wed", actual: 7.2, predicted: 6.8 },
  { day: "Thu", actual: 6.9, predicted: 6.7 },
  { day: "Fri", actual: 7.5, predicted: 7.0 },
  { day: "Sat", actual: 5.8, predicted: 6.0 },
  { day: "Sun", actual: 5.5, predicted: 5.8 },
]

const DRIVER_PROFILE_DATA = [
  { subject: 'Acceleration', A: 85, fullMark: 100 },
  { subject: 'Braking', A: 78, fullMark: 100 },
  { subject: 'Cornering', A: 90, fullMark: 100 },
  { subject: 'Speeding', A: 65, fullMark: 100 },
  { subject: 'Eco', A: 70, fullMark: 100 },
  { subject: 'Consistency', A: 88, fullMark: 100 },
]

const ANOMALIES = [
  { id: 1, type: "warning", component: "Fuel Injector", probability: "High (85%)", time: "Next 500km", message: "Irregular injection pattern detected" },
  { id: 2, type: "critical", component: "Battery", probability: "Medium (45%)", time: "Next 2 weeks", message: "Voltage drop during startup increasing" },
  { id: 3, type: "info", component: "Tire Pressure", probability: "Low (15%)", time: "Next 1000km", message: "Slow leak suspected in rear left" },
]

export default function PredictionsPage() {
  const { selectedVehicle } = useVehicle()
  const [driverScore, setDriverScore] = useState(78)
  const [breakdownProb, setBreakdownProb] = useState(12)
  const [ecoScore, setEcoScore] = useState(82)

  // Animation effect for scores
  useEffect(() => {
    const interval = setInterval(() => {
      setBreakdownProb(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.5) * 2)))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AI Predictions & Insights {selectedVehicle ? `- ${selectedVehicle.name}` : ''}
          </h1>
          <p className="text-muted-foreground">
            Advanced analytics powered by machine learning models.
          </p>
          {selectedVehicle?.vin && (
            <p className="text-sm text-muted-foreground">VIN: {selectedVehicle.vin}</p>
          )}
        </div>

        {/* Top Row: Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 1. Driver Type */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Driver Type</CardTitle>
              <User className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">Balanced</div>
              <p className="text-xs text-muted-foreground">
                Moderate acceleration, safe braking
              </p>
              <div className="mt-3 h-2 w-full bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-[60%]" />
              </div>
            </CardContent>
          </Card>

          {/* 2. Driving Score */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Driving Score</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold">{driverScore}/100</div>
                <span className="text-xs text-green-600 font-medium">+2.5% vs last week</span>
              </div>
              <Progress value={driverScore} className="mt-3" />
            </CardContent>
          </Card>

          {/* 4. Breakdown Probability */}
          <Card className={`${breakdownProb > 20 ? 'border-red-200 bg-red-50 dark:bg-red-950/10' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Breakdown Risk</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${breakdownProb > 20 ? 'text-red-600' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{breakdownProb.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Probability in next 48h
              </p>
              <Progress value={breakdownProb} className={`mt-3 ${breakdownProb > 20 ? 'bg-red-200' : ''}`} indicatorClassName={breakdownProb > 20 ? 'bg-red-600' : ''} />
            </CardContent>
          </Card>

          {/* 7. Eco-driving */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eco Score</CardTitle>
              <Leaf className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ecoScore}/100</div>
              <p className="text-xs text-muted-foreground">
                Fuel efficiency rating
              </p>
              <Progress value={ecoScore} className="mt-3" indicatorClassName="bg-emerald-600" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          
          {/* 5. Future Engine Temperature */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Future Engine Temperature</CardTitle>
              <CardDescription>
                AI forecast for the next 45 minutes based on current load and ambient conditions.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ENGINE_TEMP_PREDICTION}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs" />
                    <YAxis domain={[60, 110]} className="text-xs" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                      itemStyle={{ color: 'var(--foreground)' }}
                    />
                    <Area type="monotone" dataKey="temp" stroke="#f97316" fillOpacity={1} fill="url(#colorTemp)" name="Temperature (°C)" />
                    <Line type="monotone" dataKey="limit" stroke="#ef4444" strokeDasharray="5 5" name="Critical Limit" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Driver Profile Radar */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Driver Profile Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of driving habits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={DRIVER_PROFILE_DATA}>
                    <PolarGrid className="stroke-muted" />
                    <PolarAngleAxis dataKey="subject" className="text-xs font-medium" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name="Driver"
                      dataKey="A"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          
          {/* 3. Fuel Consumption */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Fuel Consumption Analysis</CardTitle>
              <CardDescription>
                Actual vs Predicted consumption (L/100km).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={FUEL_CONSUMPTION_DATA}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                    />
                    <Legend />
                    <Bar dataKey="actual" name="Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="predicted" name="Predicted" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 6. Anomaly Detection */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Anomaly Detection</CardTitle>
              <CardDescription>
                Potential issues detected by predictive maintenance models.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ANOMALIES.map((anomaly) => (
                  <div key={anomaly.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                    <div className={`p-2 rounded-full ${
                      anomaly.type === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/20' :
                      anomaly.type === 'warning' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20' :
                      'bg-blue-100 text-blue-600 dark:bg-blue-900/20'
                    }`}>
                      {anomaly.type === 'critical' ? <AlertCircle className="h-5 w-5" /> :
                       anomaly.type === 'warning' ? <AlertTriangle className="h-5 w-5" /> :
                       <Activity className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium leading-none">{anomaly.component}</p>
                        <Badge variant={anomaly.type === 'critical' ? 'destructive' : 'secondary'}>
                          {anomaly.probability}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {anomaly.message}
                      </p>
                      <div className="flex items-center pt-2 text-xs text-muted-foreground">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Predicted occurrence: <span className="font-medium ml-1">{anomaly.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="flex items-center justify-center p-4 border border-dashed rounded-lg text-muted-foreground text-sm">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  All other systems operating within normal parameters
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

