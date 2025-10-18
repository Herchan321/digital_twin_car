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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface TelemetryChartProps {
  data: Telemetry[]
  title: string
  dataKey: 'battery_level' | 'temperature'
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  data,
  title,
  dataKey
}) => {
  const chartData = {
    labels: data.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: title,
        data: data.map(d => d[dataKey]),
        borderColor: dataKey === 'battery_level' ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)',
        tension: 0.1
      }
    ]
  }

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
                suggestedMax: dataKey === 'battery_level' ? 100 : 50
              }
            }
          }}
        />
      </CardContent>
    </Card>
  )
}

export const TelemetryDashboard: React.FC<{
  telemetry: Telemetry[]
}> = ({ telemetry }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <TelemetryChart
        data={telemetry}
        title="Niveau de batterie (%)"
        dataKey="battery_level"
      />
      <TelemetryChart
        data={telemetry}
        title="Température (°C)"
        dataKey="temperature"
      />
    </div>
  )
}