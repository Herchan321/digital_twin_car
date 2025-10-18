'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"

interface RPMData {
    avg_rpm: number
    min_rpm: number
    max_rpm: number
    current_rpm: number
}

export function RPMGauge({ vehicleId }: { vehicleId: number }) {
    const [rpmData, setRPMData] = useState<RPMData | null>(null)

    useEffect(() => {
        const fetchRPMData = async () => {
            try {
                const response = await fetch(`/api/telemetry/vehicle-rpm-stats/${vehicleId}`)
                if (response.ok) {
                    const data = await response.json()
                    setRPMData(data)
                }
            } catch (error) {
                console.error('Error fetching RPM data:', error)
            }
        }

        fetchRPMData()
        const interval = setInterval(fetchRPMData, 5000) // Update every 5 seconds

        return () => clearInterval(interval)
    }, [vehicleId])

    if (!rpmData) {
        return null
    }

    // Fonction pour formater les valeurs RPM
    const formatRPM = (rpm: number) => {
        return `${Math.round(rpm)} RPM`
    }

    // Calculer le pourcentage pour la gauge (supposons que 8000 RPM est le maximum)
    const maxRPM = 8000
    const rpmPercentage = (rpmData.current_rpm / maxRPM) * 100

    return (
        <Card>
            <CardHeader>
                <CardTitle>Engine RPM</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    {/* Gauge visuelle */}
                    <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className="absolute h-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, rpmPercentage)}%` }}
                        />
                    </div>
                    
                    {/* Valeurs RPM */}
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Current</p>
                            <p className="text-2xl font-bold">{formatRPM(rpmData.current_rpm)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Average</p>
                            <p className="text-2xl font-bold">{formatRPM(rpmData.avg_rpm)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Minimum</p>
                            <p className="text-xl font-semibold">{formatRPM(rpmData.min_rpm)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Maximum</p>
                            <p className="text-xl font-semibold">{formatRPM(rpmData.max_rpm)}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}