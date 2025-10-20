import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Telemetry } from '@/lib/supabase'
import { Badge } from './ui/badge'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

// Fonction pour calculer l'état dynamique
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

interface TelemetryChartProps {
  data: Telemetry[]
  title: string
  dataKey: 'battery_pct' | 'temperature'
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ data, title, dataKey }) => {
  const chartData = {
    labels: data.map(d => new Date(d.recorded_at).toLocaleTimeString()),
    datasets: [
      {
        label: title,
        data: data.map(d => d[dataKey]),
        borderColor: dataKey === 'battery_pct' ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)',
        tension: 0.1
      }
    ]
  }

  // Déterminer le badge sur la dernière valeur
  const latestValue = data.length > 0 ? data[data.length - 1][dataKey] : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Line
          data={chartData}
          options={{
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                suggestedMax: dataKey === 'battery_pct' ? 100 : 50
              }
            }
          }}
        />
        {latestValue !== null && (
          <div className="mt-2">
            Status:{' '}
            {getStatusBadge(
              latestValue,
              {
                warning: dataKey === 'battery_pct' ? 12 : 95,
                critical: dataKey === 'battery_pct' ? 11.8 : 100
              },
              dataKey === 'battery_pct'
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

