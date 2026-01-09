"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Info } from "lucide-react"

const API_BASE_URL = "http://127.0.0.1:8000"

// Will fetch available cities and their AQI from backend (/cities/available)
// and build ranking data dynamically.

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", badge: "bg-green-500 dark:bg-green-600 text-white", text: "text-green-600 dark:text-green-300" }
  if (aqi <= 100) return { label: "Moderate", badge: "bg-yellow-400 dark:bg-yellow-500 text-black dark:text-black", text: "text-yellow-500 dark:text-yellow-300" }
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", badge: "bg-orange-400 dark:bg-orange-500 text-white", text: "text-orange-500 dark:text-orange-300" }
  if (aqi <= 200) return { label: "Unhealthy", badge: "bg-red-500 dark:bg-red-600 text-white", text: "text-red-600 dark:text-red-400" }
  if (aqi <= 300) return { label: "Very Unhealthy", badge: "bg-purple-500 dark:bg-purple-600 text-white", text: "text-purple-600 dark:text-purple-400" }
  return { label: "Hazardous", badge: "bg-red-900 dark:bg-red-700 text-white", text: "text-red-800 dark:text-red-400" }
}


export default function RankingPage() {
  const [showInfo, setShowInfo] = useState(false)
    const [sortBy, setSortBy] = useState<"rank" | "high" | "low">("rank")
  const [filter, setFilter] = useState<"all" | "good" | "moderate" | "unhealthy">("all")
  const [citiesData, setCitiesData] = useState<any[]>([])

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/cities/available`)
        if (!res.ok) return
        const data = await res.json()
        // data.cities is array of {name, lat, lng, aqi}
        const base = (data.cities || []).map((c: any) => {
          const aqi = Number.isFinite(Number(c.aqi)) ? Number(c.aqi) : null
          const lat = Number.isFinite(Number(c.lat)) ? Number(c.lat) : null
          const lng = Number.isFinite(Number(c.lng)) ? Number(c.lng) : null
          return { name: c.name, aqi, lat, lng }
        })

        // For each city, fetch its stations and determine the station with highest AQI
        const controller = new AbortController()
        try {
          const promises = base.map(async (city: any) => {
            try {
              const url = `${API_BASE_URL}/live/aqi/stations?city=${encodeURIComponent(city.name)}`
              const res2 = await fetch(url, { signal: controller.signal })
              if (!res2.ok) return { ...city, maxAqi: city.aqi, station: undefined }
              const d = await res2.json()
              const stations = d.stations || d || []
              let max = null
              let stationName: string | undefined = undefined
              for (const s of stations) {
                const a = Number.isFinite(Number(s.aqi)) ? Number(s.aqi) : (s.aqi && typeof s.aqi === 'object' && 'v' in s.aqi ? Number(s.aqi.v) : null)
                if (typeof a === 'number' && (max === null || a > max)) {
                  max = a
                  // backend returns station_name; fall back to other fields if absent
                  stationName = s.station_name || s.station || s.name || s.location || s.uid || undefined
                }
              }
              return { ...city, maxAqi: max ?? city.aqi, station: stationName, stationAqi: max ?? null }
            } catch (err) {
              return { ...city, maxAqi: city.aqi, station: undefined }
            }
          })

          const results = await Promise.all(promises)
          // sort by descending maxAqi (nulls last)
          results.sort((a: any, b: any) => {
            const aa = (typeof a.maxAqi === 'number') ? a.maxAqi : -Infinity
            const bb = (typeof b.maxAqi === 'number') ? b.maxAqi : -Infinity
            return bb - aa
          })
          const withRank = results.map((c: any, idx: number) => ({ ...c, rank: idx + 1 }))
          setCitiesData(withRank)
        } finally {
          controller.abort()
        }
      } catch (err) {
        console.error('Failed to fetch ranking data', err)
      }
    }
    fetchCities()
  }, [])

  // Exclude cities with missing AQI (using station maxAqi if available) from the ranking list
  const filteredCities = citiesData.filter(city => {
    // Exclude known out-of-scope city (Salem from other dataset)
    if (city.name && city.name.toString().toLowerCase() === 'salem') return false
    const effective = (typeof city.maxAqi === 'number') ? city.maxAqi : city.aqi
    if (effective === null || effective === undefined) return false
    if (filter === "all") return true
    const category = getAQICategory(effective).label.toLowerCase()
    return category.includes(filter)
  })

  const sortedCities = [...filteredCities].sort((a, b) => {
    if (sortBy === 'rank') return a.rank - b.rank
    const aVal = (typeof a.maxAqi === 'number') ? a.maxAqi : a.aqi ?? -Infinity
    const bVal = (typeof b.maxAqi === 'number') ? b.maxAqi : b.aqi ?? -Infinity
    if (sortBy === 'high') return bVal - aVal
    if (sortBy === 'low') return aVal - bVal
    return a.rank - b.rank
  })

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="space-y-6 md:space-y-8">
          <div className="text-center space-y-2 md:space-y-4">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">City AQI Rankings</h1>
            <p className="text-sm md:text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Real-time ranking of Indian cities by air quality index
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center flex-wrap px-2">
            <div className="flex gap-2 justify-center">
              <Button variant={"default"} size="sm" className="text-xs md:text-sm">Rank</Button>
            </div>
              <div className="flex gap-2 justify-center">
                <Button
                  variant={sortBy === 'high' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('high')}
                  className="text-xs md:text-sm"
                >
                  High → Low
                </Button>
                <Button
                  variant={sortBy === 'low' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('low')}
                  className="text-xs md:text-sm"
                >
                  Low → High
                </Button>
              </div>

            <div className="flex gap-2 justify-center flex-wrap">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
                size="sm"
                className="text-xs md:text-sm"
              >
                All
              </Button>
              <Button
                variant={filter === "good" ? "default" : "outline"}
                onClick={() => setFilter("good")}
                size="sm"
                className="text-xs md:text-sm"
              >
                Good
              </Button>
              <Button
                variant={filter === "moderate" ? "default" : "outline"}
                onClick={() => setFilter("moderate")}
                size="sm"
                className="text-xs md:text-sm"
              >
                Moderate
              </Button>
              <Button
                variant={filter === "unhealthy" ? "default" : "outline"}
                onClick={() => setFilter("unhealthy")}
                size="sm"
                className="text-xs md:text-sm"
              >
                Unhealthy
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="px-4 md:px-6">
              <CardTitle className="relative flex items-center space-x-2 text-base md:text-lg">
                <Trophy className="h-4 w-4 md:h-5 md:w-5" />
                <span>City Rankings</span>
                <button
                  aria-label="Ranking info"
                  onClick={() => setShowInfo(s => !s)}
                  className="ml-2 p-1 rounded hover:bg-muted"
                >
                  <Info className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </button>
                {showInfo && (
                  <div className="absolute top-full left-0 mt-2 z-50">
                    <div className="absolute -top-2 left-4 w-3 h-3 rotate-45 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700" />
                    <div
                      role="dialog"
                      aria-label="Ranking info"
                      className="w-64 md:w-72 p-3 rounded-md shadow-lg bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-50 dark:border-neutral-700 text-xs md:text-sm"
                    >
                      <div>Ranking uses the city's highest-station AQI</div>
                    </div>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-3 md:space-y-4">
                {sortedCities.map((city, index) => {
                  const effective = (typeof city.maxAqi === 'number') ? city.maxAqi : city.aqi
                  const category = getAQICategory(effective)
                  const isTopThree = index < 3

                  return (
                    <div
                      key={city.name}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 rounded-lg border transition-colors gap-3 ${
                        isTopThree ? "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950" : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                        <div className={`flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full flex-shrink-0 text-sm md:text-base ${
                          isTopThree ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-white" : "bg-muted text-muted-foreground dark:bg-neutral-800 dark:text-white"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate">{city.name}</h3>
                          {city.station && (
                            <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-300 mt-1 truncate">Station: {city.station}{city.stationAqi ? ` — ${city.stationAqi}` : ''}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        <Badge className={`${category.badge} text-xs md:text-sm px-2 md:px-3`}>{category.label}</Badge>
                        <span className={`text-sm md:text-base font-medium ${category.text}`}>{effective ?? 'N/A'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <Card>
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {citiesData.filter(city => { const e = (typeof city.maxAqi === 'number') ? city.maxAqi : city.aqi; return typeof e === 'number' && e <= 50 }).length}
                </div>
                <p className="text-sm text-muted-foreground">Cities with Good AQI</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-yellow-600 mb-2">
                  {citiesData.filter(city => { const e = (typeof city.maxAqi === 'number') ? city.maxAqi : city.aqi; return typeof e === 'number' && e > 50 && e <= 100 }).length}
                </div>
                <p className="text-sm text-muted-foreground">Cities with Moderate AQI</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-red-600 mb-2">
                  {citiesData.filter(city => { const e = (typeof city.maxAqi === 'number') ? city.maxAqi : city.aqi; return typeof e === 'number' && e > 100 }).length}
                </div>
                <p className="text-sm text-muted-foreground">Cities with Poor AQI</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}