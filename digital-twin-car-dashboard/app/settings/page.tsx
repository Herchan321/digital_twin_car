"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Moon, Sun } from "lucide-react"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Ensure hydration match
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
        <DashboardLayout>
             <div className="space-y-6 max-w-3xl">
                <div>
                     <h1 className="text-3xl font-bold text-foreground mb-2">Paramètres</h1>
                </div>
             </div>
        </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Paramètres</h1>
          <p className="text-muted-foreground">Personnalisez vos préférences d'affichage</p>
        </div>

        {/* Appearance settings */}
        <Card className="bg-card border-border border-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              {theme === "dark" || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Apparence
            </CardTitle>
            <CardDescription className="text-muted-foreground">Choisissez le thème visuel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme" className="text-foreground">
                  Mode Clair
                </Label>
                <p className="text-sm text-muted-foreground">Activer le mode clair pour l'interface</p>
              </div>
              <Switch
                id="theme"
                checked={theme === "light"}
                onCheckedChange={(checked) => setTheme(checked ? "light" : "dark")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
