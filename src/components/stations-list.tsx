"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"

const API_BASE_URL = "http://127.0.0.1:8000"

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "bg-green-500", colorHex: '#22c55e' }
  if (aqi <= 100) return { label: "Moderate", color: "bg-yellow-500", colorHex: '#f59e0b' }
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", color: "bg-orange-500", colorHex: '#f97316' }
  if (aqi <= 200) return { label: "Unhealthy", color: "bg-red-500", colorHex: '#ef4444' }
  if (aqi <= 300) return { label: "Very Unhealthy", color: "bg-purple-500", colorHex: '#8b5cf6' }
  return { label: "Hazardous", color: "bg-red-900", colorHex: '#7f1d1d' }
}

interface Station {
  station_name: string
  aqi: number
  category: string
  label: string
  description: string
  uid?: number
  time?: string
  coordinates?: { lat?: number; lng?: number }
}

export function StationsList({ city }: { city: string }) {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStations = async () => {
      if (!city) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE_URL}/live/aqi/stations?city=${encodeURIComponent(city)}`)
        if (res.ok) {
          const data = await res.json()
          setStations((data && (data.stations || data)) || [])
        } else {
          setError("No stations found for this city")
        }
      } catch (err) {
        console.error(err)
        setError("Failed to load stations")
      } finally {
        setLoading(false)
      }
    }

    fetchStations()
  }, [city])

  if (loading) return <div className="text-center py-4">Loading stations...</div>
  if (error) return <div className="text-center text-muted-foreground py-4">{error}</div>
  if (stations.length === 0) return <div className="text-center text-muted-foreground py-4">No stations with data found.</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stations.map((s, i) => (
        <Card key={i} className="hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{s.station_name}</h3>
                <p className="text-sm text-muted-foreground">{s.time || ''}</p>
              </div>
              <Badge className={`${getAQICategory(s.aqi ?? 0).color} text-white`}>
                {s.category}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: getAQICategory(s.aqi ?? 0).colorHex }}>{s.aqi}</div>
              <p className="text-xs text-muted-foreground uppercase">AQI</p>
            </div>

            <div className="mt-3 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">UID</span>
                <span className="font-medium">{s.uid ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{s.coordinates ? `${s.coordinates.lat?.toFixed(3)}, ${s.coordinates.lng?.toFixed(3)}` : ''}</span>
              </div>
              <div className="text-muted-foreground text-sm mt-2">{s.description}</div>
            </div>

            <div className="mt-4">
              <button className="w-full px-3 py-2 rounded-md bg-primary text-white flex items-center justify-center">
                <MapPin className="h-4 w-4 mr-2" /> View on Map
              </button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
