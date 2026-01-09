"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatedNumber } from "@/components/animated-number"

interface PollutantCardsProps {
  components: Record<string, any>
}

const pollutantInfo: Record<string, { name: string; unit?: string; description?: string }> = {
  // Particulate matter
  pm25: { name: "PM2.5 — Fine Particulate Matter", unit: "μg/m³", description: "Fine particulate matter (particles with diameter ≤2.5µm)" },
  pm2_5: { name: "PM2.5 — Fine Particulate Matter", unit: "μg/m³", description: "Fine particulate matter (particles with diameter ≤2.5µm)" },
  pm10: { name: "PM10 — Coarse Particulate Matter", unit: "μg/m³", description: "Coarse particulate matter (particles with diameter ≤10µm)" },

  // Gases
  no2: { name: "Nitrogen Dioxide (NO₂)", unit: "ppb", description: "Nitrogen dioxide — common traffic/combustion pollutant" },
  so2: { name: "Sulfur Dioxide (SO₂)", unit: "ppb", description: "Sulfur dioxide — from combustion of sulfur-containing fuels" },
  co: { name: "Carbon Monoxide (CO)", unit: "ppm", description: "Carbon monoxide — produced by incomplete combustion" },
  o3: { name: "Ozone (O₃)", unit: "ppb", description: "Ground-level ozone — a photochemical pollutant" },

  // AQI values
  us_aqi: { name: "US AQI (Open‑Meteo)", unit: "" },
  european_aqi: { name: "EU AQI", unit: "" },

  // Weather / auxiliary
  temperature: { name: "Temperature", unit: "°C" },
  t: { name: "Temperature", unit: "°C" },
  dew: { name: "Dew Point", unit: "°C" },
  h: { name: "Relative Humidity", unit: "%" },
  wind_speed: { name: "Wind Speed", unit: "m/s" },
  w: { name: "Wind Speed", unit: "m/s" },
  wind_dir: { name: "Wind Direction", unit: "°" },
  p: { name: "Pressure", unit: "hPa" },
}

function getPollutantStatus(value: number, pollutant: string) {
  // Simplified thresholds - in real app, use proper EPA/WHO standards
  const thresholds = {
    pm25: { good: 12, moderate: 35, unhealthy: 55 },
    pm10: { good: 54, moderate: 154, unhealthy: 254 },
    no2: { good: 53, moderate: 100, unhealthy: 360 },
    so2: { good: 35, moderate: 75, unhealthy: 185 },
    co: { good: 4.4, moderate: 9.4, unhealthy: 12.4 },
    o3: { good: 54, moderate: 70, unhealthy: 85 },
  }

  const t = thresholds[pollutant as keyof typeof thresholds]
  if (!t) return "unknown"

  if (value <= t.good) return "good"
  if (value <= t.moderate) return "moderate"
  if (value <= t.unhealthy) return "unhealthy"
  return "hazardous"
}

function getStatusColor(status: string) {
  switch (status) {
    case "good": return "text-green-600"
    case "moderate": return "text-yellow-600"
    case "unhealthy": return "text-orange-600"
    case "hazardous": return "text-red-600"
    default: return "text-gray-600"
  }
}

export function PollutantCards({ components }: PollutantCardsProps) {
  const entries = Object.entries(components || {})

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
      {entries.map(([key, value], index) => {
        // value can be { v: number } from WAQI or a plain number from satellite
        const v = typeof value === 'object' && value !== null && 'v' in value ? value.v : value
        const info = pollutantInfo[key] || { name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), unit: '' }

        // Determine status only for pollutant keys we recognize as particulate/gas
        const status = (typeof v === 'number' && (key.startsWith('pm') || ['pm2_5','pm10','no2','so2','co','o3'].includes(key))) ? getPollutantStatus(v, key) : 'unknown'
        const statusColor = getStatusColor(status)

        return (
          <Card 
            key={key} 
            className={`text-center transition-all duration-200 hover:shadow-md hover:-translate-y-1 card-enter ${index < 6 ? `stagger-${Math.min(index, 4)}` : ''}`}
          >
            <CardHeader className="pb-2 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium line-clamp-2">{info.name}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className={`text-xl md:text-2xl font-bold ${statusColor} transition-colors duration-300`}>
                {typeof v === 'number' ? (
                  Number.isInteger(v) ? <AnimatedNumber value={v} /> : <AnimatedNumber value={parseFloat(v.toFixed(1))} />
                ) : String(v ?? 'N/A')}
              </div>
              <div className="text-xs text-muted-foreground">{info.unit}</div>
              <div className="text-xs text-muted-foreground mt-1">{info.description ?? ''}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}