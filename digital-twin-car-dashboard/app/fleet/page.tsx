"use client"

import { useState, useEffect } from "react"
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
  Cpu, Activity, Link2
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
import { DeviceManager } from "@/components/device-manager"
import { AssignmentManager } from "@/components/assignment-manager"
import { getVehicles, getActiveAssignments, type Vehicle } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    loadVehicles()
  }, [])

  const loadVehicles = async () => {
    try {
      setLoading(true)
      const data = await getVehicles()
      setVehicles(data)
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: `Impossible de charger les véhicules: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (id: number) => {
    // TODO: Implement API call to toggle favorite
    setVehicles(vehicles.map(v => ({
      ...v,
      is_favorite: v.id === id ? !v.is_favorite : v.is_favorite
    })))
  }

  const setPrimary = async (id: number) => {
    // TODO: Implement API call to set primary vehicle
    setVehicles(vehicles.map(v => ({
      ...v,
      is_favorite: v.id === id
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

            {loading ? (
              <Card>
                <CardContent className="flex items-center justify-center h-48">
                  <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredVehicles.map((vehicle) => (
                  <Card key={vehicle.id} className={`transition-all hover:shadow-md ${vehicle.is_favorite ? 'border-primary/50 bg-primary/5' : ''}`}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${vehicle.is_favorite ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <Car className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">{vehicle.name}</CardTitle>
                          <CardDescription className="text-xs">{vehicle.vin || "N/A"}</CardDescription>
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
                          <p className="text-muted-foreground text-xs">Marque</p>
                          <p className="font-medium mt-1">{vehicle.make || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Modèle</p>
                          <p className="font-medium mt-1">{vehicle.model || "N/A"}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/50 p-3 flex justify-between items-center">
                      {vehicle.is_favorite ? (
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
            )}
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            {/* Gestion des devices */}
            <DeviceManager onDeviceSelect={(device) => console.log('Selected:', device)} />
            
            {/* Gestion des associations device ↔ véhicule */}
            <AssignmentManager vehicles={vehicles} onRefresh={loadVehicles} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
