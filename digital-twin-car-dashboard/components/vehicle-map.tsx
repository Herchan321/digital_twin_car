"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useVehicleStore } from "@/lib/store";
import { Icon } from "leaflet";

// Fix pour l'icône par défaut de Leaflet dans Next.js
const defaultIcon = new Icon({
  iconUrl: "/images/marker-icon.png",
  iconRetinaUrl: "/images/marker-icon-2x.png",
  shadowUrl: "/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function VehicleMap() {
  const { vehicles, telemetry, fetchVehicles, fetchTelemetry } = useVehicleStore();

  // Charger les données et mettre à jour périodiquement
  useEffect(() => {
    fetchVehicles();
    // Polling toutes les 5 secondes
    const interval = setInterval(() => {
      vehicles.forEach((vehicle) => fetchTelemetry(vehicle.id));
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchVehicles, vehicles]);

  return (
    <MapContainer
      center={[31.630000, -8.008889]} // Marrakech coordinates
      zoom={13}
      className="w-full h-[600px] rounded-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {vehicles.map((vehicle) => {
        const vehicleTelemetry = telemetry[vehicle.id];
        if (!vehicleTelemetry) return null;

        return (
          <Marker
            key={vehicle.id}
            position={[vehicleTelemetry.lat, vehicleTelemetry.lon]}
            icon={defaultIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold">{vehicle.name}</h3>
                <p>Speed: {vehicleTelemetry.speed_kmh} km/h</p>
                <p>Battery: {vehicleTelemetry.battery_pct}%</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}