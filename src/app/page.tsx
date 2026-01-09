"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Heart, MapPin, TrendingUp, TrendingDown, Activity, Users, Star, Trash2 } from "lucide-react"

const API_BASE_URL = "http://127.0.0.1:8000"

interface Favorite {
  city: string
  aqi: number
  time: string
  station?: string
  stationAqi?: number | null
}

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "bg-green-500" }
  if (aqi <= 100) return { label: "Moderate", color: "bg-yellow-500" }
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", color: "bg-orange-500" }
  if (aqi <= 200) return { label: "Unhealthy", color: "bg-red-500" }
  if (aqi <= 300) return { label: "Very Unhealthy", color: "bg-purple-500" }
  return { label: "Hazardous", color: "bg-red-900" }
}

export default function Dashboard() {
  const { isAuthenticated, token, user } = useAuth()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [stats, setStats] = useState({
    totalCities: 0,
    goodCities: 0,
    badCities: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated && token) {
      loadDashboard()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, token])

  const loadDashboard = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()

        // Enrich favorites with per-city highest-station AQI where available
        const promises = (data.favorites || []).map(async (fav: Favorite) => {
          try {
            const url = `${API_BASE_URL}/live/aqi/stations?city=${encodeURIComponent(fav.city)}`
            const res2 = await fetch(url)

            if (res2.ok) {
              const d = await res2.json()
              const stations = d.stations || d || []
              
              console.log(`Dashboard: ${fav.city} stations:`, stations.map((s: any) => ({ name: s.station_name, aqi: s.aqi, type: typeof s.aqi })))
              
              // Find the station with highest AQI (same logic as Live AQI page)
              let maxStation = null
              for (const s of stations) {
                const aqiNum = typeof s.aqi === 'number' ? s.aqi : Number(s.aqi)
                if (!s || isNaN(aqiNum)) continue
                if (!maxStation || (aqiNum > (typeof maxStation.aqi === 'number' ? maxStation.aqi : Number(maxStation.aqi)))) {
                  maxStation = s
                }
              }
              
              console.log(`Dashboard: ${fav.city} selected station:`, maxStation?.station_name, 'AQI:', maxStation?.aqi)
              
              if (maxStation) {
                return { 
                  ...fav, 
                  aqi: typeof maxStation.aqi === 'number' ? maxStation.aqi : Number(maxStation.aqi), 
                  station: maxStation.station_name || maxStation.name || 'Unknown', 
                  stationAqi: typeof maxStation.aqi === 'number' ? maxStation.aqi : Number(maxStation.aqi), 
                  time: maxStation.time || fav.time 
                }
              }
            }
            
            // Fallback: try city-level AQI if station lookup fails
            try {
              const resCity = await fetch(`${API_BASE_URL}/live/aqi?city=${encodeURIComponent(fav.city)}`)
              if (resCity.ok) {
                const cd = await resCity.json()
                const a = (cd && typeof cd.aqi !== 'undefined' && cd.aqi !== null && cd.aqi !== '-') ? Number(cd.aqi) : null
                return { ...fav, aqi: Number.isFinite(a as number) ? a : fav.aqi, station: undefined, stationAqi: Number.isFinite(a as number) ? a : null, time: cd?.time ?? fav.time }
              }
            } catch (e) {
              // ignore
            }

            return fav
          } catch (err) {
            return fav
          }
        })

        const enriched = await Promise.all(promises)
        setFavorites(enriched)

        // Calculate stats using enriched AQI values
        const totalCities = enriched.length
        const goodCities = enriched.filter((fav: Favorite) => (typeof fav.aqi === 'number') && fav.aqi <= 50).length
        // Count cities with concerning AQI: Unhealthy for Sensitive Groups (>100) and worse
        const badCities = enriched.filter((fav: Favorite) => (typeof fav.aqi === 'number') && fav.aqi > 100).length

        setStats({
          totalCities,
          goodCities,
          badCities
        })
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (cityName: string) => {
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites/${encodeURIComponent(cityName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        loadDashboard() // Reload dashboard
      }
    } catch (error) {
      console.error("Failed to remove favorite:", error)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container mx-auto px-4 py-16 animate-fade-in">
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">Welcome to SkyLy</h1>
              <p className="text-xl text-muted-foreground">
                Monitor air quality, track your favorite cities, and get personalized health insights.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <Card className="card-enter hover:shadow-md transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <Activity className="h-12 w-12 text-primary mx-auto mb-4 transition-transform duration-200 hover:scale-110" />
                  <h3 className="font-semibold mb-2">Real-time Monitoring</h3>
                  <p className="text-sm text-muted-foreground">
                    Live AQI data from monitoring stations across India
                  </p>
                </CardContent>
              </Card>

              <Card className="card-enter stagger-1 hover:shadow-md transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <Star className="h-12 w-12 text-primary mx-auto mb-4 transition-transform duration-200 hover:scale-110" />
                  <h3 className="font-semibold mb-2">Personal Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    Save favorite cities and track air quality trends
                  </p>
                </CardContent>
              </Card>

              <Card className="card-enter stagger-2 hover:shadow-md transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-primary mx-auto mb-4 transition-transform duration-200 hover:scale-110" />
                  <h3 className="font-semibold mb-2">Health Insights</h3>
                  <p className="text-sm text-muted-foreground">
                    Get personalized recommendations based on AQI levels
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12">
              <p className="text-muted-foreground mb-4">
                Sign in to access your personal dashboard and start monitoring air quality.
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">My Dashboard</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Welcome back, {user?.name}! Monitor your favorite cities and stay informed about air quality.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-enter hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary/10 rounded-full transition-colors duration-200 hover:bg-primary/20">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalCities}</p>
                    <p className="text-sm text-muted-foreground">Cities Tracked</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enter stagger-1 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-500/10 rounded-full transition-colors duration-200 hover:bg-green-500/20">
                    <TrendingDown className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.goodCities}</p>
                    <p className="text-sm text-muted-foreground">Good AQI Cities</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enter stagger-2 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-red-500/10 rounded-full transition-colors duration-200 hover:bg-red-500/20">
                    <TrendingUp className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.badCities}</p>
                    <p className="text-sm text-muted-foreground">Poor AQI Cities</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Favorites List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="h-5 w-5" />
                <span>Favorite Cities</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading favorites...</p>
                </div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No favorite cities yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add cities to your favorites from the Live AQI page to track them here.
                  </p>
                  <a href="/live" className="inline-block px-4 py-2 rounded-md bg-primary text-white">Browse Cities</a>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {favorites.map((favorite) => {
                    const category = getAQICategory(favorite.aqi)
                    const getDisplayCity = (fullName: string | undefined) => {
                      if (!fullName) return ''
                      const parts = fullName.split(',').map(p => p.trim()).filter(Boolean)
                      const knownCountries = ['india']
                      // remove trailing country tokens
                      while (parts.length > 1 && knownCountries.includes(parts[parts.length - 1].toLowerCase())) {
                        parts.pop()
                      }
                      // prefer last part (city) when available
                      return parts[parts.length - 1] || fullName
                    }
                    const displayCity = getDisplayCity(favorite.city)
                    const parseUpdated = (t: any) => {
                      if (!t && t !== 0) return null
                      // numeric timestamps may be seconds or milliseconds
                      if (typeof t === 'number') return isFinite(t) ? new Date(t) : null
                      const s = String(t).trim()
                      if (/^\d+$/.test(s)) {
                        const n = Number(s)
                        // if it looks like seconds (<= 10 digits) convert to ms
                        return isFinite(n) ? (s.length <= 10 ? new Date(n * 1000) : new Date(n)) : null
                      }
                      const d = new Date(s)
                      return isFinite(d.getTime()) ? d : null
                    }
                    const updatedDate = parseUpdated(favorite.time)
                    const updatedText = updatedDate ? updatedDate.toLocaleString() : '—'
                    return (
                      <Card key={favorite.city} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">{displayCity}</h3>
                              {favorite.station && (
                                <p className="text-sm text-muted-foreground">Station: {favorite.station}{favorite.stationAqi ? ` — ${favorite.stationAqi}` : ''}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFavorite(favorite.city)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold">{favorite.aqi}</span>
                              <Badge className={`${category.color} text-white`}>
                                {category.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Updated: {updatedText}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
