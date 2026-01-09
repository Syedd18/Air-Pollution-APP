"use client"

import { useState, useEffect } from "react"

const API_BASE_URL = "http://127.0.0.1:8000"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Scale, TrendingUp, TrendingDown, Minus } from "lucide-react"

const CITY_DATA = {
  Delhi: {
    current: { aqi: 185, pm25: 125, pm10: 180, no2: 45 },
    trend: [
      { month: "Jan", aqi: 185 },
      { month: "Feb", aqi: 192 },
      { month: "Mar", aqi: 178 },
      { month: "Apr", aqi: 165 },
      { month: "May", aqi: 198 },
      { month: "Jun", aqi: 175 },
    ]
  },
  Mumbai: {
    current: { aqi: 95, pm25: 65, pm10: 95, no2: 25 },
    trend: [
      { month: "Jan", aqi: 95 },
      { month: "Feb", aqi: 88 },
      { month: "Mar", aqi: 102 },
      { month: "Apr", aqi: 85 },
      { month: "May", aqi: 115 },
      { month: "Jun", aqi: 92 },
    ]
  },
  Bangalore: {
    current: { aqi: 65, pm25: 45, pm10: 75, no2: 15 },
    trend: [
      { month: "Jan", aqi: 65 },
      { month: "Feb", aqi: 72 },
      { month: "Mar", aqi: 68 },
      { month: "Apr", aqi: 62 },
      { month: "May", aqi: 78 },
      { month: "Jun", aqi: 65 },
    ]
  },
  Chennai: {
    current: { aqi: 78, pm25: 55, pm10: 85, no2: 20 },
    trend: [
      { month: "Jan", aqi: 78 },
      { month: "Feb", aqi: 82 },
      { month: "Mar", aqi: 75 },
      { month: "Apr", aqi: 72 },
      { month: "May", aqi: 85 },
      { month: "Jun", aqi: 78 },
    ]
  },
  Kolkata: {
    current: { aqi: 142, pm25: 95, pm10: 135, no2: 35 },
    trend: [
      { month: "Jan", aqi: 142 },
      { month: "Feb", aqi: 148 },
      { month: "Mar", aqi: 135 },
      { month: "Apr", aqi: 128 },
      { month: "May", aqi: 155 },
      { month: "Jun", aqi: 142 },
    ]
  }
}

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "bg-green-500" }
  if (aqi <= 100) return { label: "Moderate", color: "bg-yellow-500" }
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", color: "bg-orange-500" }
  if (aqi <= 200) return { label: "Unhealthy", color: "bg-red-500" }
  if (aqi <= 300) return { label: "Very Unhealthy", color: "bg-purple-500" }
  return { label: "Hazardous", color: "bg-red-900" }
}

export default function ComparePage() {
  const [city1, setCity1] = useState<string>('')
  const [city2, setCity2] = useState<string>('')
  const [compareBy, setCompareBy] = useState("aqi")
  const [cities, setCities] = useState<string[]>([])
  const [data1, setData1] = useState<any>(null)
  const [data2, setData2] = useState<any>(null)

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/cities`)
        if (res.ok) {
          const data = await res.json()
          setCities(data)
          if (!city1 && data.length) setCity1(data[0])
          if (!city2 && data.length) setCity2(data[1] || data[0])
        }
      } catch (err) {
        console.error('Failed to fetch cities for compare', err)
      }
    }
    fetchCities()
  }, [])

  const [trend1, setTrend1] = useState<{date:string; aqi:number}[]>([])
  const [trend2, setTrend2] = useState<{date:string; aqi:number}[]>([])

  const getPm25Value = (liveData: any, cityKey: string) => {
    // Try known shapes from backend WAQI/live and fall back to sample CITY_DATA
    try {
      const comps = liveData?.components || liveData?.iaqi || {}
      if (comps) {
        // WAQI often nests as { pm25: { v: 12 } }
        const pm = comps.pm25
        if (pm && typeof pm === 'object' && pm.v != null) return pm.v
        if (pm != null && typeof pm === 'number') return pm
      }
      if (liveData?.current && liveData.current.pm25 != null) return liveData.current.pm25
    } catch (e) {
      // ignore and fallback
    }
    return CITY_DATA[cityKey as keyof typeof CITY_DATA]?.current.pm25 ?? 'N/A'
  }

  const updateCompare = async () => {
    if (!(city1 && city2)) return

    // Fetch highest-station info from WAQI for both cities (prefer stations endpoint)
    try {
      // city1 stations
      try {
        const s1 = await fetch(`${API_BASE_URL}/live/aqi/stations?city=${encodeURIComponent(city1)}`)
        if (s1.ok) {
          const js = await s1.json()
          const top = js.stations?.[0]
          if (top) {
            setData1({
              aqi: top.aqi,
              station: top.station_name,
              time: top.time,
              uid: top.uid,
              coordinates: top.coordinates,
              rawStation: top,
            })
          }
        } else {
          // fallback to city-level live
          const r = await fetch(`${API_BASE_URL}/live/aqi?city=${encodeURIComponent(city1)}`)
          if (r.ok) setData1(await r.json())
        }
      } catch (e) {
        console.error('city1 station fetch failed', e)
      }

      // Also fetch city-level live for components (PM2.5 etc.) if available
      try {
        const comp = await fetch(`${API_BASE_URL}/live/aqi?city=${encodeURIComponent(city1)}`)
        if (comp.ok) {
          const cd = await comp.json()
          setData1(prev => ({ ...(prev || {}), components: cd.components || cd.iaqi || cd }))
        }
      } catch (e) { /* non-fatal */ }

      // city2 stations
      try {
        const s2 = await fetch(`${API_BASE_URL}/live/aqi/stations?city=${encodeURIComponent(city2)}`)
        if (s2.ok) {
          const js2 = await s2.json()
          const top2 = js2.stations?.[0]
          if (top2) {
            setData2({
              aqi: top2.aqi,
              station: top2.station_name,
              time: top2.time,
              uid: top2.uid,
              coordinates: top2.coordinates,
              rawStation: top2,
            })
          }
        } else {
          const r2 = await fetch(`${API_BASE_URL}/live/aqi?city=${encodeURIComponent(city2)}`)
          if (r2.ok) setData2(await r2.json())
        }
      } catch (e) {
        console.error('city2 station fetch failed', e)
      }

      try {
        const comp2 = await fetch(`${API_BASE_URL}/live/aqi?city=${encodeURIComponent(city2)}`)
        if (comp2.ok) {
          const cd2 = await comp2.json()
          setData2(prev => ({ ...(prev || {}), components: cd2.components || cd2.iaqi || cd2 }))
        }
      } catch (e) { /* non-fatal */ }

      // Fetch last 1 year CSV-based historical series from backend compare endpoint
      try {
        const compRes = await fetch(`${API_BASE_URL}/compare?city1=${encodeURIComponent(city1)}&city2=${encodeURIComponent(city2)}`)
        if (compRes.ok) {
          const compJson = await compRes.json()
          setTrend1((compJson.city1?.dates || []).map((dt:string,i:number)=>({date:dt, aqi: compJson.city1.aqi[i]})))
          setTrend2((compJson.city2?.dates || []).map((dt:string,i:number)=>({date:dt, aqi: compJson.city2.aqi[i]})))
        } else {
          // fallback per-city analytics
          const a1 = await fetch(`${API_BASE_URL}/analytics?city=${encodeURIComponent(city1)}`)
          if (a1.ok) { const d = await a1.json(); setTrend1((d.dates || []).map((dt:string,i:number)=>({date:dt, aqi: d.aqi[i]}))) }
          const a2 = await fetch(`${API_BASE_URL}/analytics?city=${encodeURIComponent(city2)}`)
          if (a2.ok) { const d2 = await a2.json(); setTrend2((d2.dates || []).map((dt:string,i:number)=>({date:dt, aqi: d2.aqi[i]}))) }
        }
      } catch (e) { console.error('compare fetch failed', e) }

    } catch (err) {
      console.error('updateCompare failed', err)
    }
  }

  // Auto-update when selected cities change
  useEffect(() => {
    if (city1 && city2) {
      updateCompare()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city1, city2])

  const comparisonData = (() => {
    const len = Math.max(trend1.length, trend2.length)
    return Array.from({length: len}).map((_, i) => ({
      date: trend1[i]?.date ?? trend2[i]?.date ?? `#${i+1}`,
      [city1 ?? 'city1']: trend1[i]?.aqi ?? null,
      [city2 ?? 'city2']: trend2[i]?.aqi ?? null
    }))
  })()

  const pollutantComparison = (() => {
    const a1 = data1 ? (data1.aqi ?? null) : (CITY_DATA[city1 as keyof typeof CITY_DATA]?.current.aqi ?? null)
    const a2 = data2 ? (data2.aqi ?? null) : (CITY_DATA[city2 as keyof typeof CITY_DATA]?.current.aqi ?? null)
    return [
      { pollutant: "AQI", [city1 ?? 'city1']: a1, [city2 ?? 'city2']: a2 },
    ]
  })()

  const getDifference = (val1: number, val2: number) => {
    const diff = val1 - val2
    const percent = (val2 === 0 || !isFinite(val2)) ? 0 : Math.abs((diff / val2) * 100)
    return { diff, percent, isHigher: diff > 0 }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">City Comparison</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Compare air quality between different Indian cities
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Select value={city1} onValueChange={setCity1}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select first city" />
              </SelectTrigger>
              <SelectContent>
                {cities.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading cities...</div>
                ) : (
                  cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <div className="flex items-center justify-center">
              <Scale className="h-6 w-6 text-muted-foreground" />
            </div>

            <Select value={city2} onValueChange={setCity2}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select second city" />
              </SelectTrigger>
              <SelectContent>
                {cities.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading cities...</div>
                ) : (
                  cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center">
            <Button onClick={updateCompare} disabled={!(city1 && city2)} className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50">
              Update
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Current AQI Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="font-medium">{city1}</span>
                    </div>
                    <div className="text-right">
                      {(() => {
                    const aqi1 = data1?.aqi ?? CITY_DATA[city1 as keyof typeof CITY_DATA]?.current.aqi ?? null
                    return (
                      <>
                        <div className="text-2xl font-bold">{aqi1 ?? 'N/A'}</div>
                        <Badge className={`${aqi1 ? getAQICategory(aqi1).color : 'bg-muted'} text-white`}>
                          {aqi1 ? getAQICategory(aqi1).label : 'Unknown'}
                        </Badge>
                      </>
                    )
                  })()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="font-medium">{city2}</span>
                    </div>
                    <div className="text-right">
                  {(() => {
                    const aqi2 = data2?.aqi ?? CITY_DATA[city2 as keyof typeof CITY_DATA]?.current.aqi ?? null
                    return (
                      <>
                        <div className="text-2xl font-bold">{aqi2 ?? 'N/A'}</div>
                        <Badge className={`${aqi2 ? getAQICategory(aqi2).color : 'bg-muted'} text-white`}>
                          {aqi2 ? getAQICategory(aqi2).label : 'Unknown'}
                        </Badge>
                      </>
                    )
                  })()}
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      {(() => {
                        const a1 = data1?.aqi ?? CITY_DATA[city1 as keyof typeof CITY_DATA]?.current.aqi ?? null
                        const a2 = data2?.aqi ?? CITY_DATA[city2 as keyof typeof CITY_DATA]?.current.aqi ?? null
                        if (a1 !== null && a2 !== null) {
                          if (a1 > a2) return (<><TrendingUp className="h-5 w-5 text-red-500" /><span className="font-medium">{city1} has {getDifference(a1, a2).percent.toFixed(1)}% higher AQI</span></>)
                          if (a2 > a1) return (<><TrendingDown className="h-5 w-5 text-green-500" /><span className="font-medium">{city2} has {getDifference(a2, a1).percent.toFixed(1)}% higher AQI</span></>)
                        }
                        return (<><Minus className="h-5 w-5 text-gray-500" /><span className="font-medium">Both cities have similar AQI levels</span></>)
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pollutant Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pollutantComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="pollutant" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey={city1} fill="#3b82f6" name={city1} />
                    <Bar dataKey={city2} fill="#22c55e" name={city2} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Trend Comparison (Last 1 Year)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey={city1}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name={city1}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey={city2}
                    stroke="#22c55e"
                    strokeWidth={3}
                    name={city2}
                    dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{city1} Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Average AQI</span>
                  <span className="font-medium">
                    {trend1 && trend1.length ? ((trend1.reduce((sum: number, item: any) => sum + (item.aqi || 0), 0) / trend1.length).toFixed(1)) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Peak AQI</span>
                  <span className="font-medium">{trend1 && trend1.length ? Math.max(...trend1.map((item: any) => item.aqi || 0)) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lowest AQI</span>
                  <span className="font-medium">{trend1 && trend1.length ? Math.min(...trend1.map((item: any) => item.aqi || 0)) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>PM2.5 Level</span>
                  <span className="font-medium">{getPm25Value(data1, city1)} μg/m³</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{city2} Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Average AQI</span>
                  <span className="font-medium">
                    {trend2 && trend2.length ? ((trend2.reduce((sum: number, item: any) => sum + (item.aqi || 0), 0) / trend2.length).toFixed(1)) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Peak AQI</span>
                  <span className="font-medium">{trend2 && trend2.length ? Math.max(...trend2.map((item: any) => item.aqi || 0)) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lowest AQI</span>
                  <span className="font-medium">{trend2 && trend2.length ? Math.min(...trend2.map((item: any) => item.aqi || 0)) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>PM2.5 Level</span>
                  <span className="font-medium">{getPm25Value(data2, city2)} μg/m³</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}