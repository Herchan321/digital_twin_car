"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Database, RefreshCw, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type Theme = "dark" | "light"
type DataSource = "simulation" | "mqtt"
type RefreshRate = "1" | "2" | "5" | "10"

export default function SettingsPage() {
  const { toast } = useToast()
  const [theme, setTheme] = useState<Theme>("dark")
  const [dataSource, setDataSource] = useState<DataSource>("simulation")
  const [refreshRate, setRefreshRate] = useState<RefreshRate>("2")
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    // Load settings from localStorage
    const savedTheme = localStorage.getItem("theme") as Theme
    const savedDataSource = localStorage.getItem("dataSource") as DataSource
    const savedRefreshRate = localStorage.getItem("refreshRate") as RefreshRate

    if (savedTheme) setTheme(savedTheme)
    if (savedDataSource) setDataSource(savedDataSource)
    if (savedRefreshRate) setRefreshRate(savedRefreshRate)
  }, [])

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? "light" : "dark"
    setTheme(newTheme)
    setHasChanges(true)
  }

  const handleDataSourceChange = (value: DataSource) => {
    setDataSource(value)
    setHasChanges(true)
  }

  const handleRefreshRateChange = (value: RefreshRate) => {
    setRefreshRate(value)
    setHasChanges(true)
  }

  const handleSave = () => {
    localStorage.setItem("theme", theme)
    localStorage.setItem("dataSource", dataSource)
    localStorage.setItem("refreshRate", refreshRate)

    // Apply theme (in a real app, this would update the document class)
    if (theme === "light") {
      document.documentElement.classList.add("light")
    } else {
      document.documentElement.classList.remove("light")
    }

    setHasChanges(false)
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    })
  }

  const handleReset = () => {
    setTheme("dark")
    setDataSource("simulation")
    setRefreshRate("2")
    setHasChanges(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Customize your dashboard preferences</p>
        </div>

        {/* Appearance settings */}
        <Card className="bg-card border-border border-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Appearance
            </CardTitle>
            <CardDescription className="text-muted-foreground">Customize the visual theme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme" className="text-foreground">
                  Light Mode
                </Label>
                <p className="text-sm text-muted-foreground">Switch between dark and light themes</p>
              </div>
              <Switch id="theme" checked={theme === "light"} onCheckedChange={handleThemeChange} />
            </div>
          </CardContent>
        </Card>

        {/* Data source settings */}
        <Card className="bg-card border-border border-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Database className="w-5 h-5" />
              Data Source
            </CardTitle>
            <CardDescription className="text-muted-foreground">Configure data input method</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dataSource" className="text-foreground">
                Source Type
              </Label>
              <Select value={dataSource} onValueChange={handleDataSourceChange}>
                <SelectTrigger id="dataSource" className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulation">Simulation Mode</SelectItem>
                  <SelectItem value="mqtt">Real MQTT Connection</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {dataSource === "simulation"
                  ? "Using simulated data for demonstration purposes"
                  : "Connect to real vehicle via MQTT protocol"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Refresh rate settings */}
        <Card className="bg-card border-border border-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <RefreshCw className="w-5 h-5" />
              Refresh Rate
            </CardTitle>
            <CardDescription className="text-muted-foreground">Set data update frequency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refreshRate" className="text-foreground">
                Update Interval
              </Label>
              <Select value={refreshRate} onValueChange={handleRefreshRateChange}>
                <SelectTrigger id="refreshRate" className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 second</SelectItem>
                  <SelectItem value="2">2 seconds</SelectItem>
                  <SelectItem value="5">5 seconds</SelectItem>
                  <SelectItem value="10">10 seconds</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Lower values provide more real-time data but may increase resource usage
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="bg-primary hover:bg-primary/90 text-primary-foreground glow-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          <Button variant="outline" onClick={handleReset} className="border-border bg-transparent">
            Reset to Defaults
          </Button>
        </div>

        {hasChanges && (
          <p className="text-sm text-warning">You have unsaved changes. Click "Save Changes" to apply them.</p>
        )}
      </div>
    </DashboardLayout>
  )
}
