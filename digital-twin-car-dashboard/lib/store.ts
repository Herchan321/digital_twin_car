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
  initRealtime: () => void;
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
  ,

  initRealtime: () => {
    // Single shared websocket for real-time updates
    if (typeof window === 'undefined') return
    if ((window as any).__VEHICLE_WS_INIT) return
    try {
      const base = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000')
      const ws = new WebSocket(`${base}/ws/telemetry`)
      ws.onopen = () => console.log('vehicle store websocket connected')
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg?.type === 'telemetry_insert') {
            const t = msg.data as Telemetry
            const vid = Number(t.vehicle_id)
            // update latest telemetry for vehicle
            set((state) => ({
              telemetry: {
                ...state.telemetry,
                [vid]: {
                  vehicle_id: vid,
                  lat: Number((t.latitude ?? t.lat ?? 0)),
                  lon: Number((t.longitude ?? t.lon ?? 0)),
                  speed_kmh: Number(t.speed_kmh ?? 0),
                  battery_pct: Number(t.battery_pct ?? 0),
                  recorded_at: t.recorded_at ?? new Date().toISOString(),
                }
              }
            }))
          }
        } catch (e) {
          console.error('Invalid realtime message', e)
        }
      }
      ws.onclose = () => console.log('vehicle store websocket closed')
      ws.onerror = (e) => console.error('vehicle store websocket error', e)
      ;(window as any).__VEHICLE_WS = ws
      ;(window as any).__VEHICLE_WS_INIT = true
    } catch (e) {
      console.error('Failed to init realtime websocket', e)
    }
  }
}));

// Store secondaire
interface StoreState {
  selectedVehicle: Vehicle | null;
  vehicles: Vehicle[];
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
}

export const useStore = create<StoreState>((set) => ({
  selectedVehicle: null,
  vehicles: [],
  setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
  setVehicles: (vehicles) => set({ vehicles }),
}));