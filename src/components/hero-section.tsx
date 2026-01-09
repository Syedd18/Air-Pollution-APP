"use client"

import { useState, useEffect } from "react"
import { AQIData } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock } from "lucide-react"
import { AnimatedNumber } from "@/components/animated-number"

interface HeroSectionProps {
  aqiData: AQIData | null
  loading: boolean
  location: string
  onLocationChange: (location: string) => void
  onSelectedStationChange?: (station: any | null) => void
}

const API_BASE_URL = "http://127.0.0.1:8000"

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "bg-green-500", colorHex: '#22c55e' }
  if (aqi <= 100) return { label: "Moderate", color: "bg-yellow-500", colorHex: '#f59e0b' }
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", color: "bg-orange-500", colorHex: '#f97316' }
  if (aqi <= 200) return { label: "Unhealthy", color: "bg-red-500", colorHex: '#ef4444' }
  if (aqi <= 300) return { label: "Very Unhealthy", color: "bg-purple-500", colorHex: '#8b5cf6' }
  return { label: "Hazardous", color: "bg-red-900", colorHex: '#7f1d1d' }
}

export function HeroSection({
  aqiData,
  loading,
  location,
  onLocationChange,
  onSelectedStationChange,
}: HeroSectionProps) {
  const [cities, setCities] = useState<string[]>([])
  const [typedCity, setTypedCity] = useState("")
  const [satellite, setSatellite] = useState<any | null>(null)
  const [satLoading, setSatLoading] = useState(false)
  const [stationsLoading, setStationsLoading] = useState(false)
  const [selectedStation, setSelectedStation] = useState<any | null>(null)

  const extractVal = (v: any) => (typeof v === 'object' && v !== null && 'v' in v) ? v.v : v
  const aqiValNumber = aqiData ? Number(extractVal(aqiData.aqi) ?? 0) : 0
  const displayedAqi = selectedStation?.aqi ?? aqiValNumber
  const category = getAQICategory(Number(displayedAqi ?? 0))
  const lastUpdated = selectedStation?.time ?? aqiData?.time

  // Debug logging
  useEffect(() => {
    if (aqiData) {
      console.log('AQI Data:', {
        rawAqi: aqiData.aqi,
        extractedAqi: extractVal(aqiData.aqi),
        aqiValNumber,
        pm10: extractVal(aqiData.components?.pm10),
        fillPercent: (aqiValNumber / 500) * 100
      })
    }
    if (selectedStation) {
      console.log('Selected Station:', {
        name: selectedStation.station_name,
        aqi: selectedStation.aqi,
        components: selectedStation.components,
        pm10: selectedStation.components?.pm10,
        pm25: selectedStation.components?.pm25
      })
    }
  }, [aqiData, aqiValNumber, selectedStation])

  useEffect(() => {
    // Fetch cities from API
    const fetchCities = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/cities`)
        if (response.ok) {
          const citiesData = await response.json()
          setCities(citiesData)
        }
      } catch (error) {
        console.error("Failed to fetch cities:", error)
      }
    }

    fetchCities()
  }, [])

  useEffect(() => {
    // Fetch satellite/weather data for the selected location
    const fetchSatellite = async () => {
      if (!location) return
      setSatLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/satellite/live?city=${encodeURIComponent(location)}`)
        if (res.ok) {
          const data = await res.json()
          setSatellite(data)
        } else {
          setSatellite(null)
        }
      } catch (e) {
        console.error('Failed to fetch satellite data', e)
        setSatellite(null)
      } finally {
        setSatLoading(false)
      }
    }

    fetchSatellite()
  }, [location])


  useEffect(() => {
    // Fetch stations for the selected city and pick the highest-AQI station
    const fetchStations = async () => {
      if (!location) {
        setSelectedStation(null)
        if (typeof onSelectedStationChange === 'function') onSelectedStationChange(null)
        return
      }
      setStationsLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/live/aqi/stations?city=${encodeURIComponent(location)}`)
        if (res.ok) {
          const data = await res.json()
          const stations = data.stations || []
          // Backend returns stations sorted by AQI desc, but be defensive
          let maxStation = null
          for (const s of stations) {
            if (!s || typeof s.aqi !== 'number') continue
            if (!maxStation || (s.aqi > maxStation.aqi)) maxStation = s
          }
          
          // Backend now provides complete components data, no need for additional API call
          setSelectedStation(maxStation)
          if (typeof onSelectedStationChange === 'function') onSelectedStationChange(maxStation)
          console.log('Selected Station:', maxStation)
        } else {
          setSelectedStation(null)
        }
      } catch (e) {
        console.error('Failed to fetch stations', e)
        setSelectedStation(null)
      } finally {
        setStationsLoading(false)
      }
    }

    fetchStations()
  }, [location])

  return (
    <section className="space-y-6">
      <Card className="transition-all duration-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              <div className="h-16 skeleton rounded"></div>
              <div className="h-8 skeleton rounded w-2/3 mx-auto"></div>
              <div className="h-4 skeleton rounded w-1/2 mx-auto"></div>
            </div>
          ) : aqiData ? (
            <div className="w-full bg-gradient-to-b from-muted/30 via-muted/20 to-muted/30 p-4 md:p-6 lg:p-8 rounded-b-2xl relative overflow-hidden border border-border">
              {/* City input - responsive positioning */}
              <div className="mb-6 md:mb-0 md:absolute md:right-4 md:top-4 flex items-center space-x-2">
                <input
                  type="text"
                  aria-label="Type city name"
                  placeholder="Type city name (e.g., Delhi)"
                  className="flex-1 md:w-48 lg:w-56 px-3 py-2 border rounded-md bg-background text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:border-primary/50 text-sm md:text-base"
                  value={typedCity}
                  onChange={(e) => setTypedCity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && typedCity.trim()) {
                      onLocationChange(typedCity.trim())
                    }
                  }}
                />
                <button
                  className="px-3 py-2 rounded-md bg-primary text-white transition-all duration-200 hover:bg-primary/90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                  onClick={() => typedCity.trim() && onLocationChange(typedCity.trim())}
                  disabled={!typedCity.trim()}
                >
                  Go
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                {/* Left: big AQI with circular meter */}
                <div className="md:col-span-4 flex flex-col items-center md:items-start justify-center space-y-3">
                  {/* Circular meter */}
                  <div className="relative w-28 h-14 md:w-32 md:h-16 mb-2">
                    <svg viewBox="0 0 100 50" className="w-full h-full">
                      {/* Background arc */}
                      <path
                        d="M 10 45 A 40 40 0 0 1 90 45"
                        fill="none"
                        className="stroke-muted"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      {/* Colored arc based on AQI */}
                      <path
                        d="M 10 45 A 40 40 0 0 1 90 45"
                        fill="none"
                        stroke={category?.colorHex}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(Math.min(Number(displayedAqi ?? 0), 500) / 500) * 126} 126`}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-end justify-center pb-1">
                      <span className="text-xs font-medium" style={{ color: category?.colorHex }}>AQI</span>
                    </div>
                  </div>
                  <div className="text-5xl md:text-7xl font-extrabold leading-none" style={{ color: category?.colorHex }}>
                    <AnimatedNumber value={Number(displayedAqi ?? 0)} />
                  </div>
                  <div className="text-xs text-muted-foreground text-center md:text-left">
                    Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </div>
                  {selectedStation ? (
                    <div className="text-xs text-muted-foreground text-center md:text-left">Station: {selectedStation.station_name}</div>
                  ) : null}
                </div>

                {/* Center: badge and PM metrics + threshold bar */}
                <div className="md:col-span-5 flex flex-col justify-center items-center space-y-4">
                  <div className="w-full flex justify-center">
                    <div className="px-4 py-2 md:px-6 md:py-3 rounded-lg shadow-sm" style={{ background: category?.colorHex }}>
                      <div className="text-base md:text-xl font-semibold text-white text-center">{category?.label}</div>
                    </div>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-3 md:gap-4 px-2 md:px-4">
                    <div className="text-sm">
                      <div className="text-muted-foreground">PM10 :</div>
                      <div className="text-lg font-medium text-foreground">{selectedStation?.components?.pm10 ?? extractVal(aqiData.components?.pm10) ?? 'N/A'} µg/m³</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-muted-foreground">PM2.5 :</div>
                      <div className="text-lg font-medium text-foreground">{selectedStation?.components?.pm25 ?? extractVal(aqiData.components?.pm25) ?? 'N/A'} µg/m³</div>
                    </div>
                  </div>
                </div>

                {/* Right: Compact weather summary (satellite) */}
                <div className="md:col-span-3 flex items-center justify-center">
                  <div className="w-full max-w-xs bg-card border border-border rounded-lg p-3 md:p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Weather</div>
                        <div className="text-2xl font-semibold mt-1">{satLoading ? '—' : (satellite?.temperature ?? '—')}°C</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{satLoading ? 'Loading' : 'Current'}</div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 text-center text-xs text-muted-foreground">
                      <div>
                        <div className="font-medium">Wind</div>
                        <div>{satellite?.wind_speed !== undefined ? `${satellite.wind_speed} m/s` : 'N/A'}</div>
                      </div>
                      <div>
                        <div className="font-medium">Direction</div>
                        <div>{satellite?.wind_dir ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="font-medium">Source</div>
                        <div className="text-xs text-muted-foreground">Open-Meteo</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground relative min-h-[200px]">
              {/* City input - show even on error */}
              <div className="absolute right-4 top-4 flex items-center space-x-2">
                <input
                  type="text"
                  aria-label="Type city name"
                  placeholder="Type city name (e.g., Delhi)"
                  className="w-56 px-3 py-2 border rounded-md bg-background text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:border-primary/50"
                  value={typedCity}
                  onChange={(e) => setTypedCity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && typedCity.trim()) {
                      onLocationChange(typedCity.trim())
                    }
                  }}
                />
                <button
                  className="px-3 py-2 rounded-md bg-primary text-white transition-all duration-200 hover:bg-primary/90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => typedCity.trim() && onLocationChange(typedCity.trim())}
                  disabled={!typedCity.trim()}
                >
                  Go
                </button>
              </div>
              <div className="pt-12">
                Unable to load AQI data for "{location}". Please try another city.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      
    </section>
  )
}