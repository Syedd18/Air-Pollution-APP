"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { HeroSection } from "@/components/hero-section"
import { PollutantCards } from "@/components/pollutant-cards"
import { StationsList } from "@/components/stations-list"
import { Card, CardContent } from "@/components/ui/card"
import { AQIData } from "@/types"
import { useAuth } from "@/contexts/auth-context"

const API_BASE_URL = "http://127.0.0.1:8000"

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "bg-green-500", colorHex: '#22c55e' }
  if (aqi <= 100) return { label: "Moderate", color: "bg-yellow-500", colorHex: '#f59e0b' }
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", color: "bg-orange-500", colorHex: '#f97316' }
  if (aqi <= 200) return { label: "Unhealthy", color: "bg-red-500", colorHex: '#ef4444' }
  if (aqi <= 300) return { label: "Very Unhealthy", color: "bg-purple-500", colorHex: '#8b5cf6' }
  return { label: "Hazardous", color: "bg-red-900", colorHex: '#7f1d1d' }
}

export default function LiveAQIPage() {
  const [aqiData, setAqiData] = useState<AQIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState("Delhi")
  const [autoDetect, setAutoDetect] = useState(false)
  const [showPollutants, setShowPollutants] = useState(true)
  const { isAuthenticated, token } = useAuth()
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoritesLoading, setFavoritesLoading] = useState(false)

  useEffect(() => {
    if (autoDetect) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // In a real app, you'd reverse geocode to get city name
        },
        () => {
          // Fallback to default location
        }
      )
    }
  }, [autoDetect])

  const [satellite, setSatellite] = useState<any | null>(null)
  const [showStations, setShowStations] = useState(false)
  const [showSatellite, setShowSatellite] = useState(false)
  const [selectedStation, setSelectedStation] = useState<any | null>(null)

  useEffect(() => {
    const fetchAqiData = async () => {
      try {
        const liveRes = await fetch(`${API_BASE_URL}/live/aqi?city=${encodeURIComponent(location)}`)

        if (liveRes.ok) {
          const data = await liveRes.json()
          setAqiData(data)
        } else {
          setAqiData(null)
        }
      } catch (error) {
        console.error("Failed to fetch AQI data:", error)
        setAqiData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchAqiData()
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAqiData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [location])

  const handleToggleSatellite = async () => {
    if (showSatellite) {
      setShowSatellite(false)
      setSatellite(null)
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}/satellite/live?city=${encodeURIComponent(location)}`)
      if (res.ok) {
        setSatellite(await res.json())
        setShowSatellite(true)
      }
    } catch (err) {
      console.error('Satellite fetch failed', err)
    }
  }

  const handleToggleStations = () => setShowStations(s => !s)

  const handleLocateMe = () => {
    // enable auto-detect flow and attempt to get position
    setAutoDetect(true)
    if (navigator.geolocation) {
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            // Reverse geocode using Nominatim (OpenStreetMap)
            const { latitude, longitude } = pos.coords
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            if (res.ok) {
              const data = await res.json()
              // Extract city from address
              const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || 'Delhi'
              console.log('Detected location:', city)
              setLocation(city)
            } else {
              console.warn('Reverse geocode failed')
              setLoading(false)
            }
          } catch (err) {
            console.error('Geocoding error:', err)
            setLoading(false)
          }
        },
        (err) => {
          console.warn('Locate failed', err)
          setLoading(false)
        }
      )
    }
  }

  useEffect(() => {
    const checkFavorite = async () => {
      if (!isAuthenticated || !token || !aqiData) return
      try {
        const res = await fetch(`${API_BASE_URL}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          const normalize = (s: string | undefined) => {
            if (!s) return ''
            const parts = s.split(',').map(p => p.trim()).filter(Boolean)
            // drop trailing country token like 'India'
            const knownCountries = ['india']
            while (parts.length > 1 && knownCountries.includes(parts[parts.length - 1].toLowerCase())) parts.pop()
            // prefer the most specific segment (usually the last part, e.g., 'Delhi')
            return (parts.length ? parts[parts.length - 1].toLowerCase() : '')
          }
          const target = normalize(aqiData.city ?? location)
          setIsFavorite(data.favorites?.some((f: any) => normalize(f.city) === target) ?? false)
        }
      } catch (err) {
        console.error('Failed to check favorites', err)
      }
    }
    checkFavorite()
  }, [isAuthenticated, token, aqiData])

  const toggleFavorite = async () => {
    if (!isAuthenticated || !token || !aqiData) return
    setFavoritesLoading(true)
    try {
      // Optimistic UI: toggle local state immediately for snappy response
      const prev = isFavorite
      setIsFavorite(!prev)
      const method = prev ? 'DELETE' : 'POST'
      // Use the normalized `location` (user-visible city) when calling the API
      const res = await fetch(`${API_BASE_URL}/api/favorites/${encodeURIComponent(location)}`, { method, headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        // revert on failure
        setIsFavorite(prev)
        console.error('Failed to toggle favorite, server responded with', res.status)
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err)
    } finally {
      setFavoritesLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8">
        <div className="rounded-2xl overflow-hidden shadow-lg border border-border bg-card">
          <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-2xl font-semibold text-foreground truncate">Real-time Air Quality Index (AQI)</h2>
              <a className="text-primary underline text-sm md:text-base" href="#">{location}, India</a>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">Last Updated: {aqiData ? new Date(aqiData.time).toLocaleString() : 'Loading...'}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none px-3 py-2 text-xs md:text-sm border border-border rounded-md bg-background text-foreground hover:bg-accent" onClick={handleLocateMe}>Locate me</button>
              <button className="flex-1 sm:flex-none px-3 py-2 text-xs md:text-sm border border-border rounded-md bg-background text-foreground hover:bg-accent" onClick={toggleFavorite} disabled={!isAuthenticated || favoritesLoading}>
                {isFavorite ? 'Remove' : 'Add Favorite'}
              </button>
            </div>
          </div>

          <HeroSection
            aqiData={aqiData}
            loading={loading}
            location={location}
            onLocationChange={setLocation}
            onSelectedStationChange={setSelectedStation}
          />
        </div>

        {aqiData && (
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-base md:text-lg font-medium">Pollutant Values</h3>
              <label className="flex items-center space-x-2 text-xs md:text-sm">
                <input
                  type="checkbox"
                  checked={showPollutants}
                  onChange={(e) => setShowPollutants(e.target.checked)}
                  className="rounded"
                />
                <span>Show pollutant details</span>
              </label>
            </div>
            {showPollutants && (
              <div className="space-y-4">
                {/* WAQI / Station pollutant values (prefer selected station, fallback to city feed) */}
                <div>
                  <h4 className="text-sm font-medium mb-3">WAQI Pollutant Measurements</h4>
                  <PollutantCards components={(selectedStation?.components) || (aqiData?.components) || {}} />
                </div>

                {/* Satellite / model pollutant values (optional) */}
                {showSatellite && satellite && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Satellite Model (Open‑Meteo) Measurements</h4>
                    {(() => {
                      const satComp: Record<string, any> = {}
                      if (typeof satellite.pm2_5 !== 'undefined') satComp.pm2_5 = satellite.pm2_5
                      if (typeof satellite.pm10 !== 'undefined') satComp.pm10 = satellite.pm10
                      if (typeof satellite.nitrogen_dioxide !== 'undefined') satComp.no2 = satellite.nitrogen_dioxide
                      if (typeof satellite.ozone !== 'undefined') satComp.o3 = satellite.ozone
                      if (typeof satellite.sulphur_dioxide !== 'undefined') satComp.so2 = satellite.sulphur_dioxide
                      if (typeof satellite.carbon_monoxide !== 'undefined') satComp.co = satellite.carbon_monoxide
                      if (typeof satellite.us_aqi !== 'undefined') satComp.us_aqi = satellite.us_aqi
                      if (typeof satellite.european_aqi !== 'undefined') satComp.european_aqi = satellite.european_aqi
                      // include weather fields for display
                      if (typeof satellite.temperature !== 'undefined') satComp.temperature = satellite.temperature
                      if (typeof satellite.dew !== 'undefined') satComp.dew = satellite.dew
                      if (typeof satellite.h !== 'undefined') satComp.h = satellite.h
                      if (typeof satellite.wind_speed !== 'undefined') satComp.wind_speed = satellite.wind_speed
                      if (typeof satellite.p !== 'undefined') satComp.p = satellite.p
                      if (typeof satellite.wind_dir !== 'undefined') satComp.wind_dir = satellite.wind_dir

                      return <PollutantCards components={satComp} />
                    })()}
                  </div>
                )}
              </div>
            )}
            {showPollutants && showSatellite && satellite && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Satellite Model (Open-Meteo)</h3>
                      <div className="text-xs text-muted-foreground">Latest</div>
                    </div>
                    {satellite.us_aqi === null && satellite.pm2_5 === null && satellite.pm10 === null ? (
                      <div className="mt-3 text-center text-muted-foreground py-4">
                        No satellite data available for this location
                      </div>
                    ) : (
                      <>
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">US AQI</div>
                            {typeof satellite.us_aqi !== 'undefined' && satellite.us_aqi !== null ? (
                              (() => {
                                const v = Number(satellite.us_aqi)
                                const cat = getAQICategory(isNaN(v) ? 0 : v)
                                return (
                                  <div className={`px-2 py-1 rounded-full text-xs text-white ${cat.color}`}>{cat.label}</div>
                                )
                              })()
                            ) : null}
                          </div>
                          <div className="text-lg font-semibold" style={{ color: (satellite?.us_aqi != null) ? getAQICategory(Number(satellite.us_aqi)).colorHex : undefined }}>{satellite.us_aqi ?? 'N/A'}</div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                          <div>
                            <div className="text-xs">PM2.5</div>
                            <div className="font-medium text-foreground">{(satellite.pm2_5 !== null && satellite.pm2_5 !== undefined) ? satellite.pm2_5 : 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-xs">PM10</div>
                            <div className="font-medium text-foreground">{(satellite.pm10 !== null && satellite.pm10 !== undefined) ? satellite.pm10 : 'N/A'}</div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Weather</h3>
                      <div className="text-xs text-muted-foreground">Current</div>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm text-muted-foreground">Temperature</div>
                      <div className="text-lg font-semibold">{satellite.temperature ?? 'N/A'}°C</div>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm text-muted-foreground">Wind</div>
                      <div className="text-lg font-semibold">{satellite.wind_speed ? `${satellite.wind_speed} m/s` : 'N/A'}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">City Info</h3>
                      <div className="text-xs text-muted-foreground">Coords</div>
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      <div>Lat: <span className="text-foreground font-medium">{satellite.lat ?? 'N/A'}</span></div>
                      <div>Lng: <span className="text-foreground font-medium">{satellite.lng ?? 'N/A'}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Stations in {location}</h2>
                <div className="flex items-center space-x-2">
                  <button
                    className="px-3 py-1 rounded-md bg-primary text-white"
                    onClick={() => setShowStations((s) => !s)}
                  >
                    {showStations ? 'Hide Stations' : 'Show Stations'}
                  </button>
                  <button
                    className="px-3 py-1 rounded-md border"
                    onClick={handleToggleSatellite}
                  >
                    {showSatellite ? 'Hide Satellite Data' : 'Show Satellite Data'}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {showStations && <StationsList city={location} />}
              </div>
            </div>
          </div>
        )}

        <div className="py-6 text-center text-sm text-muted-foreground">
          Powered by Syed Muhammad Rizvi and Ishan Singh
        </div>
      </main>
    </div>
  )
}