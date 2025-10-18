import { create } from "zustand";

// Types pour les données
interface Vehicle {
  id: number;
  name: string;
  vin?: string;
}

interface Telemetry {
  vehicle_id: number;
  lat: number;
  lon: number;
  speed_kmh: number;
  battery_pct: number;
  recorded_at: string;
}

// Store principal
interface VehicleStore {
  vehicles: Vehicle[];
  telemetry: Record<number, Telemetry>; // indexé par vehicle_id
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchVehicles: () => Promise<void>;
  fetchTelemetry: (vehicleId: number) => Promise<void>;
}

// Création du store
export const useVehicleStore = create<VehicleStore>((set, get) => ({
  vehicles: [],
  telemetry: {},
  loading: false,
  error: null,

  fetchVehicles: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("http://localhost:8000/vehicles");
      const data = await response.json();
      set({ vehicles: data });
    } catch (error) {
      set({ error: "Failed to fetch vehicles" });
    } finally {
      set({ loading: false });
    }
  },

  fetchTelemetry: async (vehicleId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/vehicles/${vehicleId}/telemetry`);
      const data = await response.json();
      // On garde la donnée la plus récente
      set((state) => ({
        telemetry: {
          ...state.telemetry,
          [vehicleId]: data[0] // premier résultat = plus récent
        }
      }));
    } catch (error) {
      console.error(`Failed to fetch telemetry for vehicle ${vehicleId}:`, error);
    }
  }
}));