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
  Cpu, Activity, Link2, AlertTriangle
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
import { getVehicles, createVehicle, getActiveAssignments, supabase, type Vehicle } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useVehicle } from "@/lib/vehicle-context"
import { useToast } from "@/hooks/use-toast"

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)
  
  // Using vehicle context
  const { setSelectedVehicle: setContextSelectedVehicle } = useVehicle()
  const router = useRouter()
  
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [editName, setEditName] = useState("")
  const [editVin, setEditVin] = useState("")
  const [editStatus, setEditStatus] = useState("active")
  const { toast } = useToast()

  const handleViewDashboard = (vehicle: Vehicle) => {
    setContextSelectedVehicle(vehicle)
    router.push('/dashboard')
  }

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
        title: "Error",
        description: `Unable to load vehicles: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (id: number) => {
    try {
      const vehicle = vehicles.find(v => v.id === id)
      if (!vehicle) return

      const { error } = await supabase
        .from('vehicles')
        .update({ is_favorite: !vehicle.is_favorite })
        .eq('id', id)

      if (error) throw error

      await loadVehicles()
      toast({
        title: "Updated",
        description: `Vehicle ${vehicle.is_favorite ? 'removed from' : 'set as'} favorite.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Unable to update favorite status: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const setPrimary = async (id: number) => {
    try {
      // First, set all vehicles to non-favorite
      await supabase
        .from('vehicles')
        .update({ is_favorite: false })
        .neq('id', 0) // Update all vehicles

      // Then set the selected one as favorite
      const { error } = await supabase
        .from('vehicles')
        .update({ is_favorite: true })
        .eq('id', id)

      if (error) throw error

      await loadVehicles()
      
      const vehicle = vehicles.find(v => v.id === id)
      toast({
        title: "Primary vehicle",
        description: `${vehicle?.name} has been set as primary vehicle.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Unable to set primary vehicle: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const openDeleteDialog = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return

    try {
      const id = vehicleToDelete.id
      // First, check if vehicle has active assignments
      const { data: assignments } = await supabase
        .from('device_vehicle_assignments')
        .select('*')
        .eq('vehicle_id', id)
        .eq('is_active', true)

      if (assignments && assignments.length > 0) {
        toast({
          title: "Cannot delete",
          description: "This vehicle has active device associations. Please disconnect them first.",
          variant: "destructive",
        })
        return
      }

      // Delete the vehicle
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadVehicles()
      setIsDeleteDialogOpen(false)
      setVehicleToDelete(null)
      
      toast({
        title: "Vehicle deleted",
        description: `${vehicleToDelete.name} has been successfully removed from your fleet.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Unable to delete vehicle: ${error.message}`,
        variant: "destructive",
      })
      setIsDeleteDialogOpen(false)
      setVehicleToDelete(null)
    }
  }
  const handleCreateVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log('🚀 Formulaire soumis')
    
    const formData = new FormData(e.currentTarget)
    const vehicleData = {
      name: formData.get("name") as string,
      vin: formData.get("vin") as string || null,
      status: 'active' as 'active' | 'inactive' | 'maintenance'
    }
    
    console.log('📝 Données du véhicule:', vehicleData)

    try {
      const newVehicle = await createVehicle(vehicleData)
      
      console.log('✅ Véhicule créé:', newVehicle)

      await loadVehicles()
      setIsAddDialogOpen(false)
      
      toast({
        title: "Vehicle added",
        description: `The vehicle ${newVehicle.name} has been added successfully.`,
      })
    } catch (error: any) {
      console.error('❌ Erreur création véhicule:', error)
      toast({
        title: "Error",
        description: `Unable to add vehicle: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setEditName(vehicle.name)
    setEditVin(vehicle.vin || '')
    setEditStatus(vehicle.status || 'active')
    setIsEditDialogOpen(true)
  }

  const handleUpdateVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log('🔧 Formulaire de configuration soumis')
    
    if (!selectedVehicle) {
      console.error('❌ Aucun véhicule sélectionné')
      return
    }
    
    const vehicleData = {
      name: editName,
      vin: editVin || null,
      status: editStatus as 'active' | 'inactive' | 'maintenance'
    }
    
    console.log('📝 Données de mise à jour:', vehicleData)
    console.log('🎯 ID du véhicule:', selectedVehicle.id)
    
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update(vehicleData)
        .eq('id', selectedVehicle.id)
        .select()
      
      if (error) {
        console.error('❌ Erreur Supabase:', error)
        throw error
      }
      
      console.log('✅ Véhicule mis à jour:', data)
      
      await loadVehicles()
      setIsEditDialogOpen(false)
      setSelectedVehicle(null)
      
      toast({
        title: "Vehicle updated",
        description: `The vehicle ${vehicleData.name} has been modified successfully.`,
      })
    } catch (error: any) {
      console.error('❌ Erreur:', error)
      toast({
        title: "Error",
        description: `Unable to modify vehicle: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const filteredVehicles = vehicles.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.vin && v.vin.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
            <p className="text-muted-foreground">
              Manage your vehicles and connected OBD-II devices.
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add a vehicle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateVehicle}>
                <DialogHeader>
                  <DialogTitle>Add a new vehicle</DialogTitle>
                  <DialogDescription>
                    Enter the vehicle information to add it to your fleet.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name *</Label>
                    <Input id="name" name="name" placeholder="Ex: Peugeot 308" className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="vin" className="text-right">VIN</Label>
                    <Input id="vin" name="vin" placeholder="Serial number" className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog de configuration */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <form onSubmit={handleUpdateVehicle}>
                <DialogHeader>
                  <DialogTitle>Configure vehicle</DialogTitle>
                  <DialogDescription>
                    Modify the information of {selectedVehicle?.name}.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right">Name *</Label>
                    <Input 
                      id="edit-name" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ex: Peugeot 308" 
                      className="col-span-3" 
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-vin" className="text-right">VIN</Label>
                    <Input 
                      id="edit-vin" 
                      value={editVin}
                      onChange={(e) => setEditVin(e.target.value)}
                      placeholder="Serial number" 
                      className="col-span-3" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-status" className="text-right">Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="vehicles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="vehicles" className="gap-2">
              <Car className="h-4 w-4" /> Vehicles
            </TabsTrigger>
            <TabsTrigger value="devices" className="gap-2">
              <Cpu className="h-4 w-4" /> OBD Devices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search a vehicle..." 
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
                            <Star className="mr-2 h-4 w-4" /> Set as favorite
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(vehicle)}>
                            <Settings className="mr-2 h-4 w-4" /> Configure
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => openDeleteDialog(vehicle)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Status</p>
                          <Badge variant={vehicle.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                            {vehicle.status || 'active'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">VIN</p>
                          <p className="font-medium mt-1 text-xs">{vehicle.vin || "N/A"}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/50 p-3 flex justify-between items-center">
                      {vehicle.is_favorite ? (
                        <span className="text-xs font-medium text-primary flex items-center gap-1">
                          <Star className="h-3 w-3 fill-primary" /> Primary vehicle
                        </span>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setPrimary(vehicle.id)}>
                          Set as primary
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleViewDashboard(vehicle)}>
                        View Dashboard
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                
                {/* Add Card */}
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Card className="flex flex-col items-center justify-center border-dashed cursor-pointer hover:bg-accent/50 transition-colors min-h-[200px]">
                      <div className="p-4 rounded-full bg-muted mb-3">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-muted-foreground">Add a vehicle</p>
                    </Card>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleCreateVehicle}>
                      <DialogHeader>
                        <DialogTitle>Add a new vehicle</DialogTitle>
                        <DialogDescription>
                          Enter the vehicle information to add it to your fleet.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">Nom *</Label>
                          <Input id="name" name="name" placeholder="Ex: Peugeot 308" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="vin" className="text-right">VIN</Label>
                          <Input id="vin" name="vin" placeholder="Numéro de série" className="col-span-3" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button type="submit">Enregistrer</Button>
                      </DialogFooter>
                    </form>
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Vehicle
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the vehicle <strong>{vehicleToDelete?.name}</strong>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 my-4">
              <p className="text-sm text-amber-700 dark:text-amber-500 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                All data associated with this vehicle will be permanently deleted.
              </p>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setVehicleToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDeleteVehicle}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Vehicle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
