"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Wind } from "lucide-react"
import "leaflet/dist/leaflet.css"

const API_BASE_URL = "http://127.0.0.1:8000"

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "#16a34a" }
  if (aqi <= 100) return { label: "Moderate", color: "#eab308" }
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", color: "#fb923c" }
  if (aqi <= 200) return { label: "Unhealthy", color: "#ef4444" }
  if (aqi <= 300) return { label: "Very Unhealthy", color: "#8b5cf6" }
  return { label: "Hazardous", color: "#7f1d1d" }
}

export default function MapComponent() {
  const [cities, setCities] = useState<any[]>([])
  const [maxStationMap, setMaxStationMap] = useState<Record<string, { aqi: number | null; station?: string }>>({})
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCities = async () => {
      try {
        setMapError(null)
        const res = await fetch(`${API_BASE_URL}/cities/available`)
        if (!res.ok) {
          setMapError(`Server returned ${res.status} while fetching cities`)
          return
        }
        const data = await res.json()
        const normalized = (data.cities || []).map((c: any) => {
          const lat = Number.isFinite(Number(c.lat)) ? Number(c.lat) : null
          const lng = Number.isFinite(Number(c.lng)) ? Number(c.lng) : null
          const aqi = Number.isFinite(Number(c.aqi)) ? Number(c.aqi) : null
          return { name: c.name, lat, lng, aqi }
        })
        if (!normalized.length) {
          setMapError('No city coordinates returned from server')
        }
        setCities(normalized)
      } catch (err: any) {
        console.error('Failed to load map cities', err)
        setMapError(err?.message || String(err))
      }
    }

    fetchCities()
  }, [])

  // After we have cities, fetch station lists per city and remember the station with highest AQI
  useEffect(() => {
    if (!cities || cities.length === 0) return

    const controller = new AbortController()

    const fetchStationsForCities = async () => {
      try {
        const promises = cities.map(async (city: any) => {
          if (!city?.name) return [city?.name, { aqi: null, station: undefined }]
          try {
            const url = `${API_BASE_URL}/live/aqi/stations?city=${encodeURIComponent(city.name)}`
            const res = await fetch(url, { signal: controller.signal })
            if (!res.ok) return [city.name, { aqi: null, station: undefined }]
            const data = await res.json()
            const stations = data.stations || data || []
            let max = null
            let maxStationName: string | undefined = undefined
            for (const s of stations) {
              const a = Number.isFinite(Number(s.aqi)) ? Number(s.aqi) : (s.aqi && typeof s.aqi === 'object' && 'v' in s.aqi ? Number(s.aqi.v) : null)
              if (typeof a === 'number' && (max === null || a > max)) {
                max = a
                maxStationName = s.station_name || s.name || s.station || s.location || undefined
              }
            }
            return [city.name, { aqi: max, station: maxStationName }]
          } catch (err) {
            return [city.name, { aqi: null, station: undefined }]
          }
        })

        const results = await Promise.all(promises)
        const map: Record<string, { aqi: number | null; station?: string }> = {}
        for (const [name, info] of results) {
          if (typeof name === 'string') map[name] = info as any
        }
        setMaxStationMap(map)
      } catch (err) {
        // silent
      }
    }

    fetchStationsForCities()
    return () => controller.abort()
  }, [cities])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <span>Air Quality Map</span>
        </CardTitle>
        {mapError && (
          <div className="ml-auto text-right text-sm text-red-600">
            <div>{mapError}</div>
            <button className="mt-2 px-2 py-1 border rounded text-xs" onClick={() => {
              // retry: clear error and refetch cities
              setMapError(null)
              setCities([])
              // small timeout to ensure state update
              setTimeout(() => {
                ;(async () => {
                  try {
                    const res = await fetch(`${API_BASE_URL}/cities/available`)
                    if (!res.ok) { setMapError(`Server returned ${res.status} while fetching cities`); return }
                    const data = await res.json()
                    const normalized = (data.cities || []).map((c: any) => ({ name: c.name, lat: Number(c.lat), lng: Number(c.lng), aqi: Number(c.aqi) }))
                    setCities(normalized)
                    setMapError(null)
                  } catch (e:any) { setMapError(e?.message || String(e)) }
                })()
              }, 100)
            }}>Retry</button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-96 rounded-lg overflow-hidden">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {cities.filter((city:any) => typeof city.lat === 'number' && typeof city.lng === 'number').map((city: any) => {
              // Prefer the highest-station AQI for this city if available
              const stationInfo = maxStationMap[city.name]
              const aqi = (stationInfo && typeof stationInfo.aqi === 'number') ? stationInfo.aqi : (typeof city.aqi === 'number' ? city.aqi : null)
              const color = aqi !== null ? getAQICategory(aqi).color : '#999999'
              const radius = Math.max(6, Math.min(14, (aqi ?? 20) / 10))
              return (
                <CircleMarker key={city.name} center={[city.lat, city.lng]} radius={radius} pathOptions={{ color, fillColor: color, fillOpacity: 0.8 }}>
                      <Popup>
                      <div className="p-2">
                        <h3 className="font-semibold text-neutral-800 dark:text-neutral-50">{city.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Wind className="h-4 w-4" />
                          <span>AQI: {aqi ?? 'N/A'}</span>
                          <Badge className="text-white text-xs" style={{ backgroundColor: color }}>
                            {aqi !== null ? getAQICategory(aqi).label : 'No data'}
                          </Badge>
                        </div>
                        {stationInfo && stationInfo.station && (
                          <div className="text-sm text-muted-foreground mt-2">Station: {stationInfo.station}</div>
                        )}
                      </div>
                    </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>

          {/* Legend (moved inside map, bottom-right and theme-aware) */}
          <div className="absolute bottom-4 right-4 z-50 bg-white/90 dark:bg-slate-800/90 text-neutral-900 dark:text-neutral-100 p-2 rounded-md shadow-lg backdrop-blur-sm max-w-xs">
            <div className="text-sm font-medium mb-1">AQI Legend</div>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div className="flex items-center space-x-2"><span className="w-4 h-4 block" style={{ backgroundColor: getAQICategory(25).color }}></span><span>Good</span></div>
              <div className="flex items-center space-x-2"><span className="w-4 h-4 block" style={{ backgroundColor: getAQICategory(75).color }}></span><span>Moderate</span></div>
              <div className="flex items-center space-x-2"><span className="w-4 h-4 block" style={{ backgroundColor: getAQICategory(125).color }}></span><span>Unhealthy</span></div>
              <div className="flex items-center space-x-2"><span className="w-4 h-4 block" style={{ backgroundColor: getAQICategory(250).color }}></span><span>Very Unhealthy / Hazardous</span></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}