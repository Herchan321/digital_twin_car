"use client"

import { useEffect, useRef, useState } from 'react'

interface TraccarPosition {
  id: number
  deviceId: number
  latitude: number
  longitude: number
  speed: number
  course: number
  altitude: number
  deviceTime: string
  address?: string
  attributes?: {
    ignition?: boolean
    battery?: number
    fuel?: number
    distance?: number
    totalDistance?: number
  }
}

interface VehicleMap3DProps {
  telemetryData?: {
    speed_kmh: number
    temperature: number
    battery_pct: number
    rpm: number
  }
}

interface GeolocationData {
  lat: number
  lng: number
  accuracy: number
}

export function VehicleMap3D({ telemetryData }: VehicleMap3DProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  
  // États pour Traccar
  const [traccarPosition, setTraccarPosition] = useState<TraccarPosition | null>(null)
  const [isTraccarConnected, setIsTraccarConnected] = useState(false)
  const [useTraccar, setUseTraccar] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Configuration Traccar
  const TRACCAR_URL = 'https://gps.gounane.ovh'
  const TRACCAR_EMAIL = 'hassaneboukhal@gmail.com'
  const TRACCAR_PASSWORD = 'Boukhal123'
  const DEVICE_ID = 51680098

  // Position de fallback (géolocalisation du navigateur)
  const [location, setLocation] = useState<GeolocationData | null>(null)

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || !window.google) return
      if (!location) return

      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat: location.lat, lng: location.lng },
        zoom: 18,
        mapTypeId: 'satellite',
        tilt: 45,
      })

      // Créer un marqueur personnalisé pour le véhicule
      const markerInstance = new window.google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: mapInstance,
        title: isTraccarConnected 
          ? `Véhicule Traccar (Device ${DEVICE_ID})` 
          : 'Position de fallback',
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: isTraccarConnected ? '#22c55e' : '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 1.5,
          anchor: new window.google.maps.Point(12, 24)
        }
      })

      setMap(mapInstance)
      setMarker(markerInstance)
      setIsLoaded(true)
    }

    if (window.google && window.google.maps) {
      initMap()
    } else {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      script.async = true
      script.defer = true
      script.onload = initMap
      document.head.appendChild(script)
    }
  }, [location])

  // Fonction pour récupérer la position depuis Traccar
  const fetchTraccarPosition = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔑 Tentative de connexion Traccar...')
      
      // Authentification avec Traccar
      const credentials = btoa(`${TRACCAR_EMAIL}:${TRACCAR_PASSWORD}`)
      
      // D'abord, récupérer la liste des devices disponibles
      console.log('📱 Récupération des devices...')
      const devicesResponse = await fetch(`${TRACCAR_URL}/api/devices`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        }
      })

      if (!devicesResponse.ok) {
        const errorText = await devicesResponse.text()
        console.error('❌ Erreur devices:', devicesResponse.status, errorText)
        throw new Error(`Impossible de récupérer les devices: ${devicesResponse.status}`)
      }

      const devices = await devicesResponse.json()
      console.log('📱 Devices disponibles:', devices)
      
      if (devices.length === 0) {
        throw new Error('Aucun device trouvé sur ce compte Traccar')
      }

      // Chercher le device spécifié ou utiliser le premier disponible
      const targetDevice = devices.find((d: any) => d.id === DEVICE_ID) || devices[0]
      const deviceIdToUse = targetDevice.id
      
      console.log('🎯 Device utilisé:', targetDevice)
      console.log('URL positions:', `${TRACCAR_URL}/api/positions?deviceId=${deviceIdToUse}`)
      
      // Récupérer les positions du device
      const response = await fetch(`${TRACCAR_URL}/api/positions?deviceId=${deviceIdToUse}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erreur positions:', response.status, errorText)
        throw new Error(`Erreur positions: ${response.status} - ${errorText}`)
      }

      const positions = await response.json()
      console.log('🌍 Positions Traccar reçues:', positions)

      if (positions && positions.length > 0) {
        const latestPosition = positions[0]
        setTraccarPosition(latestPosition)
        setIsTraccarConnected(true)
        
        // Mettre à jour la position pour la carte
        setLocation({
          lat: latestPosition.latitude,
          lng: latestPosition.longitude,
          accuracy: latestPosition.accuracy || 10
        })
        
        console.log('✅ Position Traccar mise à jour:', {
          lat: latestPosition.latitude,
          lng: latestPosition.longitude,
          device: latestPosition.deviceId,
          time: latestPosition.deviceTime
        })
      } else {
        console.warn('⚠️ Aucune position trouvée pour ce device')
        
        // Utiliser la dernière position connue du device si disponible
        if (targetDevice.lastUpdate && targetDevice.latitude && targetDevice.longitude) {
          console.log('📍 Utilisation de la dernière position connue du device')
          setLocation({
            lat: targetDevice.latitude,
            lng: targetDevice.longitude,
            accuracy: 100
          })
          setIsTraccarConnected(true)
        } else {
          // Position par défaut si aucune position disponible
          console.log('🌍 Utilisation de position par défaut (Casablanca)')
          setLocation({
            lat: 33.5731, // Casablanca, Maroc
            lng: -7.5898,
            accuracy: 1000
          })
        }
        
        throw new Error(`Device ${deviceIdToUse} n'a pas de positions récentes dans l'API positions`)
      }
    } catch (error) {
      console.error('❌ Erreur Traccar:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion Traccar'
      setError(`Traccar: ${errorMessage}`)
      setIsTraccarConnected(false)
      
      // Fallback sur géolocalisation PC si Traccar échoue
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            })
            setUseTraccar(false)
          },
          (err) => setError("Impossible de récupérer la position"),
          { enableHighAccuracy: true }
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Lancer la récupération Traccar au démarrage
  useEffect(() => {
    fetchTraccarPosition()
    
    // Mettre à jour toutes les 10 secondes
    const interval = setInterval(fetchTraccarPosition, 10000)
    
    return () => clearInterval(interval)
  }, [])

  // Mettre à jour le marker si la position change
  useEffect(() => {
    if (map && marker && location) {
      const latLng = new window.google.maps.LatLng(location.lat, location.lng)
      marker.setPosition(latLng)
      map.setCenter(latLng)
    }
  }, [location, map, marker])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" style={{ minHeight: '400px' }} />
      
      {/* Indicateur de statut Traccar */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md border">
        {/* <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${
            isTraccarConnected ? 'bg-green-500' : 'bg-red-500'
          } animate-pulse`}></div>
          <span className="font-medium">
            {isTraccarConnected ? `Traccar Device ${DEVICE_ID}` : 'Fallback GPS'}
          </span>
        </div> */}
        {/* {traccarPosition && (
          <div className="text-xs text-gray-600 mt-1">
            Dernière mise à jour: {new Date(traccarPosition.deviceTime).toLocaleTimeString()}
          </div>
        )} */}
      </div>

      {/* Données télémétrie overlay
      {telemetryData && isLoaded && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md border">
          <div className="text-sm space-y-1">
            <div>🏁 {telemetryData.speed_kmh.toFixed(0)} km/h</div>
            <div>🌡️ {telemetryData.temperature.toFixed(1)}°C</div>
            <div>🔋 {telemetryData.battery_pct.toFixed(2)}V</div>
            <div>⚙️ {telemetryData.rpm} RPM</div>
          </div>
        </div>
      )} */}
      
      {error && (
        <div className="absolute bottom-4 left-4 bg-red-100 text-red-700 p-2 rounded">
          ❌ {error}
        </div>
      )}
      
      {isLoading && (
        <div className="absolute bottom-4 right-4 bg-blue-100 text-blue-700 p-2 rounded flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          Connexion Traccar...
        </div>
      )}
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <div className="text-sm text-gray-600">Chargement de la carte...</div>
          </div>
        </div>
      )}
    </div>
  )
}
