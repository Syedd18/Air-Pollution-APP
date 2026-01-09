"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation as NavigationIcon, RefreshCw, AlertCircle } from "lucide-react"

// Stations will be fetched dynamically from backend based on user coordinates

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "bg-green-500" }
  if (aqi <= 100) return { label: "Moderate", color: "bg-yellow-500" }
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", color: "bg-orange-500" }
  if (aqi <= 200) return { label: "Unhealthy", color: "bg-red-500" }
  if (aqi <= 300) return { label: "Very Unhealthy", color: "bg-purple-500" }
  return { label: "Hazardous", color: "bg-red-900" }
}

export default function NearbyPage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [stations, setStations] = useState<any[]>([])
  const [stationsError, setStationsError] = useState<string | null>(null)
  const [radiusKm, setRadiusKm] = useState(15)
  const API_BASE_URL = "http://127.0.0.1:8000"

  function haversineDistance(lat1:number, lon1:number, lat2:number, lon2:number) {
    const toRad = (x:number) => (x * Math.PI) / 180
    const R = 6371 // km
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const fetchNearbyStations = async (lat:number, lng:number, rKm?: number) => {
    console.log('🔄 fetchNearbyStations CALLED with:', { lat, lng, rKm, currentRadius: radiusKm })
    try {
      setStationsError(null)
      let cities: any[] = []

      // Use /cities/all directly - it's much faster than /satellite/map
      try {
        console.log('🌐 Fetching cities from:', `${API_BASE_URL}/cities/all`)
        const allRes = await fetch(`${API_BASE_URL}/cities/all`)
        console.log('📡 cities/all response status:', allRes.status, allRes.ok)
        if (allRes.ok) {
          const allJson = await allRes.json()
          console.log('✅ cities/all response:', allJson)
          const raw = allJson.cities || allJson
          cities = (raw || []).map((c:any) => ({ city: c.name || c.city || c, lat: c.lat, lng: c.lng })).filter((c:any) => c.lat != null && c.lng != null)
        }
      } catch (e) {
        console.warn('⚠️ cities/all fetch failed', e)
      }

      if (!cities || cities.length === 0) {
        setStations([])
        setStationsError('No city coordinates available from server')
        return
      }
      
      console.log('Total cities loaded:', cities.length)
      console.log('User location:', lat, lng)
      
      // cities is array with city, lat, lng
      const effectiveRadius = typeof rKm === 'number' ? rKm : radiusKm
      // Use 3x radius for city search to catch stations in cities whose center is far but have nearby stations
      const citySearchRadius = effectiveRadius * 3
      const nearbyCities = cities.filter((c:any) => {
        if (!c.lat || !c.lng) return false
        const d = haversineDistance(lat, lng, c.lat, c.lng)
        return d <= citySearchRadius
      })
      
      console.log('Searching cities within', citySearchRadius, 'km (3x', effectiveRadius, 'km):', nearbyCities.length, nearbyCities.map((c:any) => c.city))

      // Fetch stations for each nearby city
      const stationPromises = nearbyCities.map(async (c:any) => {
        try {
          const r = await fetch(`${API_BASE_URL}/live/aqi/stations?city=${encodeURIComponent(c.city)}`)
          if (!r.ok) return []
          const data = await r.json()
          return (data.stations || [])
        } catch (e) {
          console.error(`failed to fetch stations for ${c.city}`, e)
          return []
        }
      })

      const results = await Promise.all(stationPromises)
      const merged = results.flat()
      console.log('Total stations fetched:', merged.length)

      // Keep only stations with valid coordinates and numeric AQI
      const validStations = merged.filter((s:any) => {
        const latS = s?.coordinates?.lat
        const lngS = s?.coordinates?.lng
        const aqiVal = s?.aqi ?? s?.aqi_value
        const isValid = latS != null && lngS != null && aqiVal != null && !isNaN(Number(aqiVal))
        if (!isValid && s.station_name) {
          console.log('Filtered out station:', s.station_name, { lat: latS, lng: lngS, aqi: aqiVal })
        }
        return isValid
      })
      console.log('Valid stations after filtering:', validStations.length)

      // Add distance from user, deduplicate by uid or station_name, and sort by distance
      const seen = new Set()
      const withDistance = validStations.map((s:any) => {
        const dist = haversineDistance(lat, lng, s.coordinates.lat, s.coordinates.lng)
        return { ...s, distance: Number(dist.toFixed(2)) }
      }).filter((s:any) => {
        const key = s.uid ?? s.station_name ?? `${s.coordinates.lat}-${s.coordinates.lng}`
        if (seen.has(key)) return false
        seen.add(key)
        return s.distance <= effectiveRadius
      }).sort((a:any,b:any) => {
        // First sort by distance (ascending)
        const distDiff = a.distance - b.distance
        if (Math.abs(distDiff) > 0.5) return distDiff // If distance difference > 0.5km, sort by distance
        // For nearby stations (within 0.5km), sort by AQI (descending) to show worse air quality first
        return (b.aqi ?? b.aqi_value ?? 0) - (a.aqi ?? a.aqi_value ?? 0)
      })
      
      console.log('Final stations after dedup and distance filter:', withDistance.length)

      if (!withDistance || withDistance.length === 0) {
        setStations([])
        setStationsError('No stations found within the selected radius')
      } else {
        setStations(withDistance)
        setStationsError(null)
      }
    } catch (err) {
      console.error(err)
      setStationsError('Failed to fetch nearby stations')
    }
  }

  const getUserLocation = () => {
    console.log('📍 getUserLocation CALLED')
    setIsLoadingLocation(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported by browser')
      setLocationError("Geolocation is not supported by this browser")
      setIsLoadingLocation(false)
      return
    }

    console.log('🌍 Requesting geolocation permission...')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log('✅ Geolocation success:', position.coords)
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setUserLocation(coords)
        setIsLoadingLocation(false)
        console.log('🚀 Calling fetchNearbyStations with coords:', coords)
        await fetchNearbyStations(coords.lat, coords.lng)
      },
      (error) => {
        console.error('❌ Geolocation error:', error)
        let errorMessage = "Unable to retrieve your location"
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user. Using Delhi as default location."
            console.log('⚠️ Permission denied, using Delhi fallback')
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable. Using Delhi as default location."
            console.log('⚠️ Position unavailable, using Delhi fallback')
            break
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Using Delhi as default location."
            console.log('⚠️ Timeout, using Delhi fallback')
            break
        }
        // Fallback to Delhi coordinates
        const delhiCoords = { lat: 28.6139, lng: 77.2090 }
        console.log('🏙️ Setting fallback location:', delhiCoords)
        setUserLocation(delhiCoords)
        setLocationError(errorMessage)
        setIsLoadingLocation(false)
        console.log('🚀 Calling fetchNearbyStations with Delhi coords')
        fetchNearbyStations(delhiCoords.lat, delhiCoords.lng)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  const refreshStations = () => {
    if (userLocation) {
      fetchNearbyStations(userLocation.lat, userLocation.lng)
    }
  }

  useEffect(() => {
    console.log('🎬 Component mounted, calling getUserLocation')
    getUserLocation()
  }, [])

  useEffect(() => {
    console.log('🔄 userLocation or radiusKm changed:', { userLocation, radiusKm })
    if (userLocation) {
      console.log('🚀 Triggering fetchNearbyStations from useEffect with radius:', radiusKm)
      fetchNearbyStations(userLocation.lat, userLocation.lng, radiusKm)
    }
  }, [userLocation, radiusKm])

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Nearby Stations</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find air quality monitoring stations near your location
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <NavigationIcon className="h-5 w-5" />
                  <span>Your Location</span>
                </div>
                <Button
                  onClick={getUserLocation}
                  disabled={isLoadingLocation}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingLocation ? 'animate-spin' : ''}`} />
                  {isLoadingLocation ? 'Getting Location...' : 'Refresh Location'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationError ? (
                <div className="flex items-center space-x-3 p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">Location Error</p>
                    <p className="text-sm text-red-600 dark:text-red-300">{locationError}</p>
                  </div>
                </div>
              ) : userLocation ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Current Location Detected</p>
                      <p className="text-sm text-muted-foreground">
                        {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Showing air quality stations within {radiusKm}km of your location
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Detecting your location...</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Nearby Stations</h2>
            <Button onClick={refreshStations} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stationsError ? (
              <div className="col-span-full text-center text-muted-foreground py-6">{stationsError}</div>
            ) : stations.length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground py-6">No stations with data found.</div>
            ) : stations.map((station:any, idx) => {
              const aqiVal = station.aqi ?? station.aqi_value ?? 0
              const category = getAQICategory(aqiVal)
              return (
                <Card key={idx} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{station.station_name || station.name}</h3>
                        <p className="text-sm text-muted-foreground">{station.city || station.location || ''}</p>
                      </div>
                      <Badge className={`${category.color} text-white`}>
                        {category.label}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary mb-1">
                        {aqiVal}
                      </div>
                      <p className="text-xs text-muted-foreground uppercase">AQI</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Distance:</span>
                        <span className="font-medium">{station.distance} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">UID:</span>
                        <span className="font-medium">{station.uid ?? 'N/A'}</span>
                      </div>
                    </div>

                    <Button className="w-full" variant="outline">
                      <MapPin className="h-4 w-4 mr-2" />
                      View on Map
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Location Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-detect Location</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically find stations near you
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Enable
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Search Radius</p>
                    <p className="text-sm text-muted-foreground">
                      Maximum distance for nearby stations
                    </p>
                  </div>
                  <select className="px-3 py-1 border border-border rounded text-sm" value={radiusKm} onChange={(e) => {
                    const v = Number(e.target.value)
                    setRadiusKm(v)
                    if (userLocation) fetchNearbyStations(userLocation.lat, userLocation.lng, v)
                  }}>
                    <option value={5}>5 km</option>
                    <option value={10}>10 km</option>
                    <option value={15}>15 km</option>
                    <option value={25}>25 km</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Real-time Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Get instant notifications for AQI changes
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}