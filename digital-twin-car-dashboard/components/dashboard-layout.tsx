"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Car, LayoutDashboard, TrendingUp, BarChart3, Settings, LogOut, Menu, X, UserCircle, AlertTriangle, Truck, ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-provider"
import { ProfilePopup } from "@/components/profile-popup"
import { useVehicle } from "@/lib/vehicle-context"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const { vehicles, selectedVehicle, setSelectedVehicle, isLoading } = useVehicle()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await signOut()
      // Force a complete page reload to /login
      window.location.href = "/login"
    } catch (error) {
      console.error("Error during logout:", error)
      setIsLoggingOut(false)
    }
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/fleet", label: "Ma Flotte", icon: Truck },
    { href: "/predictions", label: "Predictions", icon: TrendingUp },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/alerts", label: "Alertes", icon: AlertTriangle },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="bg-card border-border"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border-glow">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">Digital Twin</h1>
                <p className="text-xs text-muted-foreground">Vehicle IoT</p>
              </div>
            </div>
          </div>

          {/* Vehicle Selector */}
          <div className="px-4 py-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-card/50 border-dashed">
                  <span className="flex items-center gap-2 truncate">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">
                      {selectedVehicle ? selectedVehicle.name : "Sélectionner un véhicule"}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Mes Véhicules</DropdownMenuLabel>
                {vehicles.length > 0 ? (
                  vehicles.map((vehicle) => (
                    <DropdownMenuItem
                      key={vehicle.id}
                      className="gap-2"
                      onClick={() => setSelectedVehicle(vehicle)}
                    >
                      <Car className="h-4 w-4" />
                      <span>{vehicle.name}</span>
                      {selectedVehicle?.id === vehicle.id && (
                        <span className="ml-auto text-xs text-green-500">Actif</span>
                      )}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="gap-2">
                    <span className="text-muted-foreground">Aucun véhicule disponible</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-muted-foreground" onClick={() => router.push('/fleet')}>
                  <Plus className="h-4 w-4" />
                  <span>Gérer la flotte</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground glow-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Profile and Logout buttons */}
          <div className="p-4 border-t border-border space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground bg-transparent"
              onClick={() => setIsProfileOpen(true)}
            >
              <UserCircle className="w-5 h-5" />
              <span>Profile</span>
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground bg-transparent"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm px-6 flex items-center justify-end sticky top-0 z-30">
           <div className="flex items-center gap-4">
             <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push('/fleet')}>
               <Car className="h-4 w-4" />
               <span className="hidden sm:inline">Gérer ma flotte</span>
               <Plus className="h-3 w-3 ml-1 opacity-50" />
             </Button>
           </div>
        </header>
        <div className="p-6 lg:p-8 flex-1">{children}</div>
      </main>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Logout overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-semibold text-gray-800">Signing out...</p>
          </div>
        </div>
      )}

      {/* Profile Popup */}
      <ProfilePopup isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  )
}
