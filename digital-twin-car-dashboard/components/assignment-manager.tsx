"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Link2, Unlink, Plus, Car, Cpu, Activity, AlertCircle, History } from "lucide-react"
import {
  Device,
  Vehicle,
  ActiveDeviceAssignment,
  getDevices,
  getActiveAssignments,
  createAssignment,
  deactivateAssignment,
  getDeviceHistory,
} from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface AssignmentManagerProps {
  vehicles: any[]
  onRefresh?: () => void
}

export function AssignmentManager({ vehicles, onRefresh }: AssignmentManagerProps) {
  const [assignments, setAssignments] = useState<ActiveDeviceAssignment[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<ActiveDeviceAssignment | null>(null)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [deviceHistory, setDeviceHistory] = useState<any[]>([])
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingAssignment, setPendingAssignment] = useState<{vehicleId: number, deviceId: number, notes?: string, existingAssignment?: ActiveDeviceAssignment} | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [assignmentsData, devicesData] = await Promise.all([
        getActiveAssignments(),
        getDevices(),
      ])
      setAssignments(assignmentsData)
      setDevices(devicesData)
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: `Impossible de charger les données: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const vehicleId = parseInt(formData.get("vehicle_id") as string)
    const deviceId = parseInt(formData.get("device_id") as string)
    const notes = formData.get("notes") as string || undefined

    // Vérifier si le véhicule a déjà un device actif
    const existingAssignment = assignments.find(a => a.vehicle_id === vehicleId)
    
    if (existingAssignment) {
      // Stocker les données et ouvrir la popup de confirmation
      setPendingAssignment({ vehicleId, deviceId, notes, existingAssignment })
      setConfirmDialogOpen(true)
      return
    }

    // Pas de conflit, procéder directement
    await performAssignment(vehicleId, deviceId, notes)
  }

  const performAssignment = async (vehicleId: number, deviceId: number, notes?: string, existingAssignment?: ActiveDeviceAssignment) => {
    try {
      await createAssignment({
        vehicle_id: vehicleId,
        device_id: deviceId,
        is_active: true,
        notes: notes,
      })

      await loadData()
      setIsAssignDialogOpen(false)
      setConfirmDialogOpen(false)
      setPendingAssignment(null)
      onRefresh?.()

      toast({
        title: "Association créée",
        description: existingAssignment 
          ? `Le device a été associé au véhicule. L'ancien device "${existingAssignment.device_code}" a été débranché.`
          : "Le device a été associé au véhicule avec succès.",
      })
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: `Erreur lors de l'association: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleConfirmAssignment = async () => {
    if (!pendingAssignment) return
    
    await performAssignment(
      pendingAssignment.vehicleId, 
      pendingAssignment.deviceId, 
      pendingAssignment.notes,
      pendingAssignment.existingAssignment
    )
  }

  const handleDeactivateAssignment = async (assignment: ActiveDeviceAssignment) => {
    if (!confirm(`Êtes-vous sûr de vouloir débrancher le device ${assignment.device_code} du véhicule ${assignment.vehicle_name} ?`)) {
      return
    }

    try {
      await deactivateAssignment(assignment.assignment_id)
      await loadData()
      onRefresh?.()

      toast({
        title: "Device débranché",
        description: `Le device ${assignment.device_code} a été débranché.`,
      })
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: `Erreur lors du débranchement: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const showDeviceHistory = async (deviceId: number) => {
    try {
      const history = await getDeviceHistory(deviceId, 5)
      setDeviceHistory(history)
      setHistoryDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: `Impossible de charger l'historique: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // Devices non assignés
  const unassignedDevices = devices.filter(
    (device) => device.status === 'active' && !assignments.some((a) => a.device_id === device.id)
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Assignments actifs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Associations Actives</CardTitle>
              <CardDescription>
                {assignments.length} device(s) actuellement branché(s)
              </CardDescription>
            </div>
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={unassignedDevices.length === 0 || vehicles.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Associer device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateAssignment}>
                  <DialogHeader>
                    <DialogTitle>Associer un device à un véhicule</DialogTitle>
                    <DialogDescription>
                      Branchez un device OBD-II sur un véhicule. L'ancien assignment sera automatiquement désactivé.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="device_id">Device *</Label>
                      <Select name="device_id" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un device" />
                        </SelectTrigger>
                        <SelectContent>
                          {unassignedDevices.map((device) => (
                            <SelectItem key={device.id} value={device.id.toString()}>
                              {device.device_code} ({device.mqtt_topic})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="vehicle_id">Véhicule *</Label>
                      <Select name="vehicle_id" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un véhicule" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                              {vehicle.name} {vehicle.vin && `(${vehicle.vin})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="notes">Notes (optionnel)</Label>
                      <textarea
                        id="notes"
                        name="notes"
                        placeholder="Ex: Transféré depuis véhicule X"
                        rows={3}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">Associer</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Aucune association active</p>
              <Button
                variant="link"
                onClick={() => setIsAssignDialogOpen(true)}
                disabled={unassignedDevices.length === 0 || vehicles.length === 0}
                className="mt-2"
              >
                Créer une association
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.assignment_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                        <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold">{assignment.device_code}</p>
                        <p className="text-xs text-muted-foreground font-mono">{assignment.mqtt_topic}</p>
                      </div>
                    </div>

                    <Link2 className="h-5 w-5 text-muted-foreground" />

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded">
                        <Car className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold">{assignment.vehicle_name}</p>
                        {assignment.vehicle_vin && (
                          <p className="text-xs text-muted-foreground">VIN: {assignment.vehicle_vin}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <Badge variant="default" className="bg-green-500">Actif</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Depuis {format(new Date(assignment.assigned_at), "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => showDeviceHistory(assignment.device_id)}
                      title="Voir l'historique"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeactivateAssignment(assignment)}
                      title="Débrancher"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Devices non assignés */}
      {unassignedDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Devices Disponibles</CardTitle>
            <CardDescription>
              {unassignedDevices.length} device(s) non assigné(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {unassignedDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <Cpu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{device.device_code}</p>
                    <p className="text-xs text-muted-foreground font-mono">{device.mqtt_topic}</p>
                  </div>
                  <Badge variant="secondary">Disponible</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog historique */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historique des branchements</DialogTitle>
            <DialogDescription>
              Historique des associations du device
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {deviceHistory.map((item, index) => (
              <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-muted rounded">
                  {item.is_active ? (
                    <Link2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Unlink className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{item.cars?.name}</p>
                    {item.is_active && <Badge variant="default" className="text-xs">Actif</Badge>}
                  </div>
                  {item.cars?.vin && (
                    <p className="text-sm text-muted-foreground">VIN: {item.cars.vin}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigné: {format(new Date(item.assigned_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                  </p>
                  {item.unassigned_at && (
                    <p className="text-xs text-muted-foreground">
                      Désassigné: {format(new Date(item.unassigned_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation remplacement */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <DialogTitle className="text-xl">Attention!</DialogTitle>
            </div>
            <DialogDescription className="text-base space-y-3 pt-2">
              {pendingAssignment?.existingAssignment && (
                <>
                  <p>
                    Le véhicule <span className="font-semibold text-foreground">"{pendingAssignment.existingAssignment.vehicle_name}"</span> a déjà le device <span className="font-semibold text-foreground">"{pendingAssignment.existingAssignment.device_code}"</span> branché.
                  </p>
                  <p className="text-orange-600 dark:text-orange-400 font-medium">
                    Si vous continuez, l'ancien device sera automatiquement débranché et remplacé par le nouveau.
                  </p>
                  <p className="text-sm">
                    Voulez-vous continuer?
                  </p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false)
                setPendingAssignment(null)
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleConfirmAssignment}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Oui, continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
