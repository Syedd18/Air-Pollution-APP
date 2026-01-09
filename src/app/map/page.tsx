"use client"

import dynamic from "next/dynamic"
import { Navigation } from "@/components/navigation"

// Dynamically import map to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/map-component"), { ssr: false })

export default function MapPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="space-y-6 md:space-y-8">
          <div className="text-center space-y-2 md:space-y-4">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">India AQI Map</h1>
            <p className="text-sm md:text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Interactive map showing real-time air quality across major Indian cities
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:gap-8">
            <MapComponent />
          </div>
        </div>
      </main>
    </div>
  )
}