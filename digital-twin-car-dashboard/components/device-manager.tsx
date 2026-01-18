"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Cpu, Plus, Settings, Trash2, MoreVertical, Activity, AlertCircle } from "lucide-react"
import { Device, getDevices, createDevice, updateDevice, deleteDevice } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface DeviceManagerProps {
  onDeviceSelect?: (device: Device) => void
}

export function DeviceManager({ onDeviceSelect }: DeviceManagerProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null)
  const { toast } = useToast()

  // Charger les devices au montage
  useEffect(() => {
    loadDevices()
  }, [])

  const loadDevices = async () => {
    try {
      setLoading(true)
      const data = await getDevices()
      setDevices(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Unable to load devices: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDevice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      const newDevice = await createDevice({
        device_code: formData.get("device_code") as string,
        mqtt_topic: formData.get("mqtt_topic") as string,
        description: formData.get("description") as string,
        status: formData.get("status") as string || "active",
      })

      setDevices([newDevice, ...devices])
      setIsCreateDialogOpen(false)
      
      toast({
        title: "Device created",
        description: `The device ${newDevice.device_code} has been created successfully.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error during creation: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleUpdateDevice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedDevice) return

    const formData = new FormData(e.currentTarget)

    try {
      const updatedDevice = await updateDevice(selectedDevice.id, {
        description: formData.get("description") as string,
        status: formData.get("status") as string as any,
      })

      setDevices(devices.map(d => d.id === updatedDevice.id ? updatedDevice : d))
      setIsEditDialogOpen(false)
      setSelectedDevice(null)

      toast({
        title: "Device mis à jour",
        description: `Le device ${updatedDevice.device_code} a été modifié.`,
      })
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: `Erreur lors de la mise à jour: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const openDeleteDialog = (device: Device) => {
    setDeviceToDelete(device)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return

    try {
      await deleteDevice(deviceToDelete.id)
      setDevices(devices.filter(d => d.id !== deviceToDelete.id))
      setIsDeleteDialogOpen(false)
      setDeviceToDelete(null)

      toast({
        title: "Device deleted",
        description: `The device ${deviceToDelete.device_code} has been deleted successfully.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error during deletion: ${error.message}`,
        variant: "destructive",
      })
      setIsDeleteDialogOpen(false)
      setDeviceToDelete(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'maintenance':
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Maintenance</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">OBD-II Devices</h3>
          <p className="text-sm text-muted-foreground">
            {devices.length} device(s) registered
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add a device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateDevice}>
              <DialogHeader>
                <DialogTitle>Add a new device</DialogTitle>
                <DialogDescription>
                  Register a new OBD-II device (ESP32 MeatPI).
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="device_code">Device code *</Label>
                  <Input
                    id="device_code"
                    name="device_code"
                    placeholder="Ex: device1"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier (e.g.: device1, device2...)
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mqtt_topic">MQTT Topic *</Label>
                  <Input
                    id="mqtt_topic"
                    name="mqtt_topic"
                    placeholder="Ex: wincan/device1"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Full MQTT topic (must match the code)
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Ex: ESP32 MeatPI Primary"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue="active">
                    <SelectTrigger>
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
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {devices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No device registered</p>
            <Button
              variant="link"
              onClick={() => setIsCreateDialogOpen(true)}
              className="mt-2"
            >
              Create your first device
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {devices.map((device) => (
            <Card key={device.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <Cpu className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{device.device_code}</h4>
                        {getStatusBadge(device.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Topic: <span className="font-mono">{device.mqtt_topic}</span>
                      </p>
                      {device.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {device.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedDevice(device)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {onDeviceSelect && (
                        <DropdownMenuItem onClick={() => onDeviceSelect(device)}>
                          <Activity className="mr-2 h-4 w-4" />
                          View assignments
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(device)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de modification */}
      {selectedDevice && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <form onSubmit={handleUpdateDevice}>
              <DialogHeader>
                <DialogTitle>Edit device</DialogTitle>
                <DialogDescription>
                  Modify device parameters {selectedDevice.device_code}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Device code</Label>
                  <Input value={selectedDevice.device_code} disabled />
                  <p className="text-xs text-muted-foreground">The code cannot be modified</p>
                </div>
                <div className="grid gap-2">
                  <Label>MQTT Topic</Label>
                  <Input value={selectedDevice.mqtt_topic} disabled />
                  <p className="text-xs text-muted-foreground">The topic cannot be modified</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_description">Description</Label>
                  <Input
                    id="edit_description"
                    name="description"
                    defaultValue={selectedDevice.description || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_status">Status</Label>
                  <Select name="status" defaultValue={selectedDevice.status}>
                    <SelectTrigger>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false)
                    setSelectedDevice(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Device
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the device <strong>{deviceToDelete?.device_code}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 my-4">
            <p className="text-sm text-amber-700 dark:text-amber-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              All data associated with this device will be permanently deleted.
            </p>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeviceToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDeleteDevice}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
