"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Car, Plus, Settings, Trash2, Smartphone, 
  CheckCircle2, Star, MoreVertical, Search,
  Cpu, Activity
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock data
const MOCK_VEHICLES = [
  { id: 1, name: "Peugeot 208", vin: "VF3...", type: "Compact", status: "active", favorite: true, deviceId: "OBD-001" },
  { id: 2, name: "Renault Clio", vin: "VF1...", type: "Compact", status: "maintenance", favorite: false, deviceId: "OBD-002" },
  { id: 3, name: "Citroën C3", vin: "VF7...", type: "SUV", status: "inactive", favorite: false, deviceId: null },
]

const MOCK_DEVICES = [
  { id: "OBD-001", name: "ELM327 WiFi", status: "connected", vehicleId: 1 },
  { id: "OBD-002", name: "Vgate iCar", status: "disconnected", vehicleId: 2 },
  { id: "OBD-003", name: "Generic OBD", status: "available", vehicleId: null },
]

export default function FleetPage() {
  const [vehicles, setVehicles] = useState(MOCK_VEHICLES)
  const [devices, setDevices] = useState(MOCK_DEVICES)
  const [searchTerm, setSearchTerm] = useState("")

  const toggleFavorite = (id: number) => {
    setVehicles(vehicles.map(v => ({
      ...v,
      favorite: v.id === id ? !v.favorite : v.favorite // Or allow multiple favorites? Usually one primary.
      // If single favorite: favorite: v.id === id
    })))
  }

  const setPrimary = (id: number) => {
    setVehicles(vehicles.map(v => ({
      ...v,
      favorite: v.id === id
    })))
  }

  const filteredVehicles = vehicles.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.vin.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestion de Flotte</h1>
            <p className="text-muted-foreground">
              Gérez vos véhicules et vos boîtiers OBD-II connectés.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Ajouter un véhicule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau véhicule</DialogTitle>
                <DialogDescription>
                  Entrez les informations du véhicule pour l'ajouter à votre flotte.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Nom</Label>
                  <Input id="name" placeholder="Ex: Peugeot 308" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="vin" className="text-right">VIN</Label>
                  <Input id="vin" placeholder="Numéro de série" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">Type</Label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedan">Berline</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="compact">Compacte</SelectItem>
                      <SelectItem value="truck">Utilitaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="vehicles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="vehicles" className="gap-2">
              <Car className="h-4 w-4" /> Véhicules
            </TabsTrigger>
            <TabsTrigger value="devices" className="gap-2">
              <Cpu className="h-4 w-4" /> Appareils OBD
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher un véhicule..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredVehicles.map((vehicle) => (
                <Card key={vehicle.id} className={`transition-all hover:shadow-md ${vehicle.favorite ? 'border-primary/50 bg-primary/5' : ''}`}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${vehicle.favorite ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <Car className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">{vehicle.name}</CardTitle>
                        <CardDescription className="text-xs">{vehicle.vin}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setPrimary(vehicle.id)}>
                          <Star className="mr-2 h-4 w-4" /> Définir comme favori
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="mr-2 h-4 w-4" /> Configurer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Statut</p>
                        <Badge variant={vehicle.status === 'active' ? 'default' : 'secondary'} className="mt-1 capitalize">
                          {vehicle.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Appareil connecté</p>
                        <div className="flex items-center gap-1 mt-1 font-medium">
                          <Cpu className="h-3 w-3" />
                          {vehicle.deviceId || "Aucun"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/50 p-3 flex justify-between items-center">
                    {vehicle.favorite ? (
                      <span className="text-xs font-medium text-primary flex items-center gap-1">
                        <Star className="h-3 w-3 fill-primary" /> Véhicule principal
                      </span>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setPrimary(vehicle.id)}>
                        Définir comme principal
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      Voir Dashboard
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              
              {/* Add Card */}
              <Dialog>
                <DialogTrigger asChild>
                  <Card className="flex flex-col items-center justify-center border-dashed cursor-pointer hover:bg-accent/50 transition-colors min-h-[200px]">
                    <div className="p-4 rounded-full bg-muted mb-3">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-muted-foreground">Ajouter un véhicule</p>
                  </Card>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter un nouveau véhicule</DialogTitle>
                    <DialogDescription>
                      Entrez les informations du véhicule pour l'ajouter à votre flotte.
                    </DialogDescription>
                  </DialogHeader>
                  {/* Form content duplicated for simplicity in this view */}
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name-2" className="text-right">Nom</Label>
                      <Input id="name-2" placeholder="Ex: Peugeot 308" className="col-span-3" />
                    </div>
                    {/* ... other fields */}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Appareils OBD-II</CardTitle>
                <CardDescription>
                  Gérez vos boîtiers de diagnostic connectés.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {devices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          <Cpu className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{device.name}</h4>
                          <p className="text-sm text-muted-foreground">ID: {device.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge variant={device.status === 'connected' ? 'default' : 'outline'}>
                            {device.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {device.vehicleId ? `Lié à: Véhicule #${device.vehicleId}` : "Non assigné"}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Associer un nouvel appareil
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
