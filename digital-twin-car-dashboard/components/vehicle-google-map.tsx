"use client"

import { useEffect, useRef, useState } from "react"

interface VehicleMapProps {
  latitude: number
  longitude: number
  speed: number
  temperature: number
  battery: number
  status: "normal" | "warning" | "critical"
}

export function VehicleGoogleMap({ latitude, longitude, speed, temperature, battery, status }: VehicleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [marker, setMarker] = useState<google.maps.Marker | null>(null)
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Charger le script Google Maps
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsLoaded(true)
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      script.async = true
      script.defer = true
      script.onload = () => setIsLoaded(true)
      document.head.appendChild(script)
    }

    loadGoogleMaps()
  }, [])

  // Initialiser Google Maps
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return

    try {
      const newMap = new google.maps.Map(mapRef.current, {
        center: { lat: latitude, lng: longitude },
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      })
      setMap(newMap)

      // Créer le marker
      const newMarker = new google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: newMap,
        title: "Vehicle Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: getStatusColor(status),
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        },
        animation: google.maps.Animation.DROP
      })
      setMarker(newMarker)

      // Créer l'InfoWindow
      const newInfoWindow = new google.maps.InfoWindow({
        content: getInfoWindowContent(speed, temperature, battery, status)
      })
      setInfoWindow(newInfoWindow)

      // Ouvrir l'InfoWindow au clic sur le marker
      newMarker.addListener("click", () => {
        newInfoWindow.open(newMap, newMarker)
      })

      // Ouvrir l'InfoWindow par défaut
      newInfoWindow.open(newMap, newMarker)
    } catch (error) {
      console.error("Erreur lors du chargement de Google Maps:", error)
    }
  }, [isLoaded, latitude, longitude, speed, temperature, battery, status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mettre à jour la position et les infos du marker
  useEffect(() => {
    if (map && marker && infoWindow) {
      const newPosition = { lat: latitude, lng: longitude }
      
      // Animer le déplacement du marker
      marker.setPosition(newPosition)
      map.panTo(newPosition)

      // Mettre à jour la couleur selon le statut
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: getStatusColor(status),
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2
      })

      // Mettre à jour le contenu de l'InfoWindow
      infoWindow.setContent(getInfoWindowContent(speed, temperature, battery, status))
    }
  }, [latitude, longitude, speed, temperature, battery, status, map, marker, infoWindow])

  const getStatusColor = (status: "normal" | "warning" | "critical") => {
    switch (status) {
      case "normal":
        return "#10b981" // green
      case "warning":
        return "#f59e0b" // orange
      case "critical":
        return "#ef4444" // red
      default:
        return "#10b981"
    }
  }

  const getInfoWindowContent = (speed: number, temp: number, batt: number, status: string) => {
    const statusColor = getStatusColor(status as "normal" | "warning" | "critical")
    
    return `
      <div style="padding: 10px; min-width: 200px; font-family: system-ui, -apple-system, sans-serif;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
          🚗 Vehicle IoT
        </h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px; background: #f3f4f6; border-radius: 6px;">
            <span style="font-size: 13px; color: #6b7280;">⚡ Speed:</span>
            <strong style="font-size: 14px; color: #1f2937;">${speed.toFixed(0)} km/h</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px; background: #f3f4f6; border-radius: 6px;">
            <span style="font-size: 13px; color: #6b7280;">🌡️ Temp:</span>
            <strong style="font-size: 14px; color: #1f2937;">${temp.toFixed(1)}°C</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px; background: #f3f4f6; border-radius: 6px;">
            <span style="font-size: 13px; color: #6b7280;">🔋 Battery:</span>
            <strong style="font-size: 14px; color: #1f2937;">${batt.toFixed(2)}V</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px; background: ${statusColor}15; border-radius: 6px; border: 1px solid ${statusColor};">
            <span style="font-size: 13px; color: #6b7280;">Status:</span>
            <strong style="font-size: 14px; color: ${statusColor}; text-transform: capitalize;">${status}</strong>
          </div>
        </div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af;">
          📍 ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
        </div>
      </div>
    `
  }

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden border border-border">
      <div ref={mapRef} className="w-full h-full" />
      {!map && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  )
}
