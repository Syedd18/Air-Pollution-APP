"use client"

import { useState, useEffect } from "react"

const API_BASE_URL = "http://127.0.0.1:8000"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts"
import { BarChart3, TrendingUp, Calendar, Filter } from "lucide-react"

const AQI_TREND_DATA = [
  { month: "Jan", delhi: 185, mumbai: 95, bangalore: 65 },
  { month: "Feb", delhi: 192, mumbai: 88, bangalore: 72 },
  { month: "Mar", delhi: 178, mumbai: 102, bangalore: 68 },
  { month: "Apr", delhi: 165, mumbai: 85, bangalore: 62 },
  { month: "May", delhi: 198, mumbai: 115, bangalore: 78 },
  { month: "Jun", delhi: 175, mumbai: 92, bangalore: 65 },
]

// Pollutant distribution removed — values were static placeholders and not city-specific.

function computeSeasonalData(series: { date: string; aqi: number }[]) {
  // Seasons mapping (user requested):
  // Winter: Dec(11), Jan(0), Feb(1)
  // Spring: Mar(2), Apr(3), May(4)
  // Summer: Jun(5), Jul(6), Aug(7)
  // Monsoon: Sep(8), Oct(9), Nov(10)
  const buckets: Record<string, number[]> = {
    Winter: [],
    Spring: [],
    Summer: [],
    Monsoon: [],
  }

  series.forEach((row) => {
    const d = new Date(row.date)
    if (isNaN(+d) || typeof row.aqi !== 'number' || !isFinite(row.aqi)) return
    const m = d.getMonth()
    if ([11, 0, 1].includes(m)) buckets.Winter.push(row.aqi)
    else if ([2, 3, 4].includes(m)) buckets.Spring.push(row.aqi)
    else if ([5, 6, 7].includes(m)) buckets.Summer.push(row.aqi)
    else if ([8, 9, 10].includes(m)) buckets.Monsoon.push(row.aqi)
  })

  const seasons = ['Winter', 'Spring', 'Summer', 'Monsoon']
  const result = seasons.map((s) => {
    const arr = buckets[s]
    const avg = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
    return { season: s, aqi: avg }
  })

  // Filter out seasons with null values so chart only shows available data
  return result.filter(r => r.aqi !== null)
}

// Yearly comparison helper (from historical)
function computeYearlyComparison(series: {date: string; aqi: number}[]) {
  const buckets: Record<string, {sum: number; count: number}> = {}
  series.forEach((d) => {
    const year = (d.date || '').slice(0,4)
    if (!year) return
    if (!buckets[year]) buckets[year] = { sum: 0, count: 0 }
    buckets[year].sum += (d.aqi || 0)
    buckets[year].count += 1
  })
  const years = Object.keys(buckets).sort()
  return years.map((y) => ({ year: y, aqi: +(buckets[y].sum / buckets[y].count).toFixed(1) }))
}

// Seasonal patterns helper (from historical)
function computeSeasonalPatterns(series: {date: string; aqi: number}[]) {
  const seasons: Record<string, {months: number[]; sum: number; count: number}> = {
    Winter: { months: [12,1,2], sum: 0, count: 0 },
    Spring: { months: [3,4,5], sum: 0, count: 0 },
    Summer: { months: [6,7,8], sum: 0, count: 0 },
    Monsoon: { months: [9,10,11], sum: 0, count: 0 },
  }
  series.forEach((d) => {
    const m = (d.date || '').slice(5,7)
    const month = Number(m)
    if (!month) return
    Object.entries(seasons).forEach(([name, s]) => {
      if (s.months.includes(month)) {
        s.sum += (d.aqi || 0)
        s.count += 1
      }
    })
  })
  return Object.entries(seasons).map(([name, s]) => ({
    name,
    avg: s.count ? Math.round(s.sum / s.count) : NaN,
  }))
}

export default function AnalyticsPage() {
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [cities, setCities] = useState<string[]>([])
  const [series, setSeries] = useState<{date: string; aqi: number}[]>([])
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/cities`)
        if (res.ok) {
          const data = await res.json()
          setCities(data)
          if (!selectedCity && data.length) setSelectedCity(data[0])
        }
      } catch (err) {
        console.error('Failed to load cities', err)
      }
    }

    fetchCities()
  }, [])

  useEffect(() => {
    // On initial load, fetch data for selected city if present
    if (selectedCity) {
      fetchAnalytics(selectedCity)
    }
  }, [selectedCity])

  const fetchAnalytics = async (city: string) => {
    setLoadingData(true)
    try {
      const res = await fetch(`${API_BASE_URL}/analytics?city=${encodeURIComponent(city)}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      const data = await res.json()
      const arr = (data.dates || []).map((d: string, i: number) => ({ date: d, aqi: data.aqi[i] }))
      setSeries(arr)
    } catch (err) {
      console.error(err)
      setSeries([])
    } finally {
      setLoadingData(false)
    }
  }

  // reduce tick density for long series
  const tickInterval = series.length ? Math.max(0, Math.floor(series.length / 6)) : 0

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Air Quality Analytics</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive analysis of air quality trends and patterns
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">City</label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-56 bg-card border border-border text-foreground z-50">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {cities.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading cities...</div>
                  ) : (
                    cities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Removed time range select — showing all available data from CSV. */}
            <div className="flex items-center">
              <button onClick={() => selectedCity && fetchAnalytics(selectedCity)} disabled={!selectedCity || loadingData} className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50">{loadingData ? 'Loading...' : 'Update Data'}</button>
            </div>
            {(!loadingData && series.length === 0) && (
              <div className="p-4 text-center text-sm text-muted-foreground">No AQI series data available for this city. Click "Update Data" to refresh.</div>
            )}
          </div>

          {/* Summary cards (historical) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold mb-2">{series.length ? (Math.round(series.reduce((s, it) => s + (it.aqi || 0), 0) / series.length)) : 'N/A'}</div>
                <p className="text-sm text-muted-foreground">Current Average</p>
                <p className="text-xs text-muted-foreground uppercase">AQI</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                {(() => {
                  const avgCurrent = series.length ? (series.reduce((sum, item) => sum + (item.aqi || 0), 0) / series.length) : NaN
                  const previous = series.slice(-6)
                  const avgPrev = previous.length ? (previous.reduce((sum, item) => sum + (item.aqi || 0), 0) / previous.length) : NaN
                  const change = (isFinite(avgPrev) && avgPrev !== 0) ? ((avgCurrent - avgPrev) / avgPrev * 100) : NaN
                  return (
                    <div>
                      <div className={`text-2xl font-bold mb-2 ${isFinite(change) && change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {isFinite(change) ? `${Math.abs(change).toFixed(1)}%` : 'N/A'}
                      </div>
                      <p className="text-sm text-muted-foreground">Change from Previous Period</p>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold mb-2">{series.length ? Math.max(...series.map(it => it.aqi || 0)) : 'N/A'}</div>
                <p className="text-sm text-muted-foreground">Peak Value</p>
                <p className="text-xs text-muted-foreground uppercase">AQI</p>
              </CardContent>
            </Card>
          </div>

          {/* Stack charts vertically to avoid cramped visuals */}
          <div className="grid grid-cols-1 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Seasonal Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={420}>
                  {series.length ? (
                    (() => {
                      const seasonal = computeSeasonalData(series)
                      return seasonal.length ? (
                        <BarChart data={seasonal}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="season" tick={{fontSize:12}} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="aqi" fill="#3b82f6" />
                        </BarChart>
                      ) : (
                        <div className="p-6 text-center text-sm text-muted-foreground">Not enough data to compute seasonal patterns for this city.</div>
                      )
                    })()
                  ) : (
                    <div className="p-6 text-center text-sm text-muted-foreground">No data loaded yet. Click "Update Data" to fetch series for the selected city.</div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Historical Trends (Area Chart) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Historical Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={420}>
                {series.length ? (
                  <AreaChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(value) => {
                      const date = new Date(value)
                      return isNaN(+date) ? value : date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
                    }} />
                    <YAxis />
                    <Tooltip labelFormatter={(value) => {
                      const date = new Date(value)
                      return isNaN(+date) ? value : date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                    }} />
                    <Area type="monotone" dataKey="aqi" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">No AQI historical series to display for the selected city.</div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Yearly Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Yearly Comparison</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={computeYearlyComparison(series)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="aqi" stroke="#ef4444" strokeWidth={3} dot={{ fill: "#ef4444", strokeWidth: 2, r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Seasonal Patterns (cards) */}
          <Card>
            <CardHeader>
              <CardTitle>Seasonal Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {computeSeasonalPatterns(series).map((s) => (
                  <div key={s.name} className="text-center p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">{s.name} {s.name === 'Winter' ? '(Dec-Feb)' : s.name === 'Spring' ? '(Mar-May)' : s.name === 'Summer' ? '(Jun-Aug)' : '(Sep-Nov)'}</h3>
                    <p className="text-2xl font-bold mb-1">{Number.isFinite(s.avg) ? s.avg : 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.name === 'Winter' && 'Highest AQI due to cold weather and heating'}
                      {s.name === 'Spring' && 'Dust storms and agricultural burning'}
                      {s.name === 'Summer' && 'Better dispersion with higher temperatures'}
                      {s.name === 'Monsoon' && 'Rain helps wash away pollutants'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pollutant Distribution and Key Insights removed — they were static placeholders and not city-specific. */}

          {/* Statistical Summary removed — placeholder values were not city-specific */}
        </div>
      </main>
    </div>
  )
}