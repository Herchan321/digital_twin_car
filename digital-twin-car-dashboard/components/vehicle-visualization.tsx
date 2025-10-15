"use client"

import { useEffect, useState } from "react"
import { Battery, Gauge, Thermometer, Zap } from "lucide-react"

type VehicleStatus = "normal" | "warning" | "critical"

interface VehicleData {
  speed: number
  rpm: number
  temperature: number
  battery: number
  status: VehicleStatus
}

export function VehicleVisualization({ data }: { data: VehicleData }) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((prev) => !prev)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: VehicleStatus) => {
    switch (status) {
      case "normal":
        return "text-success"
      case "warning":
        return "text-warning"
      case "critical":
        return "text-destructive"
      default:
        return "text-success"
    }
  }

  const getCarColor = (status: VehicleStatus) => {
    switch (status) {
      case "normal":
        return "#10b981"
      case "warning":
        return "#f59e0b"
      case "critical":
        return "#ef4444"
      default:
        return "#10b981"
    }
  }

  return (
    <div className="relative w-full h-[400px] flex items-center justify-center">
      {/* Animated background circles */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`absolute w-64 h-64 rounded-full border-2 border-primary/20 transition-all duration-2000 ${
            pulse ? "scale-100 opacity-100" : "scale-110 opacity-0"
          }`}
        />
        <div
          className={`absolute w-80 h-80 rounded-full border-2 border-accent/20 transition-all duration-2000 ${
            pulse ? "scale-110 opacity-0" : "scale-100 opacity-100"
          }`}
        />
      </div>

      {/* Car SVG */}
      <div className="relative z-10">
        <svg width="200" height="120" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Car body */}
          <path
            d="M40 70 L50 50 L70 40 L130 40 L150 50 L160 70 L160 90 L40 90 Z"
            fill={getCarColor(data.status)}
            stroke={getCarColor(data.status)}
            strokeWidth="2"
            className="transition-all duration-500"
          />
          {/* Windows */}
          <path
            d="M60 50 L75 42 L125 42 L140 50 L130 60 L70 60 Z"
            fill="rgba(59, 130, 246, 0.3)"
            stroke="#3b82f6"
            strokeWidth="1"
          />
          {/* Wheels */}
          <circle cx="65" cy="90" r="12" fill="#1f2937" stroke={getCarColor(data.status)} strokeWidth="2" />
          <circle cx="135" cy="90" r="12" fill="#1f2937" stroke={getCarColor(data.status)} strokeWidth="2" />
          {/* Headlights */}
          <circle cx="155" cy="65" r="4" fill="#fbbf24" className="animate-pulse" />
          <circle cx="155" cy="75" r="4" fill="#fbbf24" className="animate-pulse" />
        </svg>
      </div>

      {/* Floating icons around the car */}
      <div className="absolute top-8 left-1/4 animate-bounce">
        <div className="bg-card border border-primary/30 rounded-lg p-2 border-glow">
          <Zap className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="absolute top-8 right-1/4 animate-bounce" style={{ animationDelay: "0.5s" }}>
        <div className="bg-card border border-accent/30 rounded-lg p-2 border-glow">
          <Thermometer className="w-5 h-5 text-accent" />
        </div>
      </div>

      <div className="absolute bottom-8 left-1/4 animate-bounce" style={{ animationDelay: "1s" }}>
        <div className="bg-card border border-warning/30 rounded-lg p-2 border-glow">
          <Gauge className="w-5 h-5 text-warning" />
        </div>
      </div>

      <div className="absolute bottom-8 right-1/4 animate-bounce" style={{ animationDelay: "1.5s" }}>
        <div className="bg-card border border-success/30 rounded-lg p-2 border-glow">
          <Battery className="w-5 h-5 text-success" />
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 border-glow">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(data.status)} animate-pulse`} />
          <span className="text-sm font-medium text-foreground capitalize">{data.status}</span>
        </div>
      </div>
    </div>
  )
}
