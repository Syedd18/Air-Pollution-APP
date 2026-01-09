"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Sparkles } from "lucide-react"

const API_BASE_URL = "http://127.0.0.1:8000"

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "bg-green-500", text: "text-green-500" }
  if (aqi <= 100) return { label: "Moderate", color: "bg-yellow-500", text: "text-yellow-500" }
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", color: "bg-orange-500", text: "text-orange-500" }
  if (aqi <= 200) return { label: "Unhealthy", color: "bg-red-500", text: "text-red-500" }
  if (aqi <= 300) return { label: "Very Unhealthy", color: "bg-purple-500", text: "text-purple-500" }
  return { label: "Hazardous", color: "bg-red-900", text: "text-red-900" }
}

export default function PredictPage() {
  const [pm25, setPm25] = useState<string>("")
  const [pm10, setPm10] = useState<string>("")
  const [no2, setNo2] = useState<string>("")
  const [so2, setSo2] = useState<string>("")
  const [co, setCo] = useState<string>("")
  const [o3, setO3] = useState<string>("")
  const [predicted, setPredicted] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePredict = async () => {
    if (!pm25 && !pm10 && !no2 && !so2 && !co && !o3) {
      alert("Please enter at least one pollutant value")
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        pm25: pm25 || "0",
        pm10: pm10 || "0",
        no2: no2 || "0",
        so2: so2 || "0",
        co: co || "0",
        o3: o3 || "0",
      })
      const res = await fetch(`${API_BASE_URL}/predict?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPredicted(data.predicted_aqi)
      } else {
        alert("Prediction failed. Please try again.")
      }
    } catch (err) {
      console.error("Prediction error:", err)
      alert("Error connecting to server")
    } finally {
      setLoading(false)
    }
  }

  const category = predicted ? getAQICategory(predicted) : null

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-6 md:py-12">
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
          {/* Header */}
          <div className="text-center space-y-2 md:space-y-3">
            <div className="flex items-center justify-center space-x-2 mb-2 md:mb-4">
              <Brain className="h-8 w-8 md:h-10 md:w-10 text-primary" />
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">AQI Predictor</h1>
            </div>
            <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Enter pollutant values to predict Air Quality Index using our AI model
            </p>
          </div>

          {/* Input Form */}
          <Card className="shadow-lg">
            <CardHeader className="px-4 md:px-6">
              <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <span>Enter Pollutant Values</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">PM2.5 (μg/m³)</label>
                  <input
                    type="number"
                    value={pm25}
                    onChange={(e) => setPm25(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">PM10 (μg/m³)</label>
                  <input
                    type="number"
                    value={pm10}
                    onChange={(e) => setPm10(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">NO₂ (ppb)</label>
                  <input
                    type="number"
                    value={no2}
                    onChange={(e) => setNo2(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SO₂ (ppb)</label>
                  <input
                    type="number"
                    value={so2}
                    onChange={(e) => setSo2(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CO (ppm)</label>
                  <input
                    type="number"
                    value={co}
                    onChange={(e) => setCo(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">O₃ (ppb)</label>
                  <input
                    type="number"
                    value={o3}
                    onChange={(e) => setO3(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                </div>
              </div>

              <div className="flex justify-center mt-6 md:mt-8">
                <button
                  onClick={handlePredict}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 md:px-8 py-2.5 md:py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm md:text-base"
                >
                  <Brain className="h-4 w-4 md:h-5 md:w-5" />
                  <span>{loading ? "Calculating..." : "Predict AQI"}</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Prediction Result */}
          {predicted !== null && (
            <Card className="shadow-xl border-2 border-primary/20 animate-in fade-in duration-500">
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-center text-lg md:text-xl lg:text-2xl">Prediction Result</CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="flex flex-col items-center space-y-4 md:space-y-6 py-4 md:py-8">
                  <div className="text-center space-y-3 md:space-y-4">
                    <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-wide">
                      Predicted AQI
                    </p>
                    <div className={`text-6xl md:text-7xl lg:text-8xl font-bold ${category?.text}`}>
                      {predicted}
                    </div>
                    <Badge className={`${category?.color} text-white text-base md:text-lg px-4 md:px-6 py-1.5 md:py-2`}>
                      {category?.label}
                    </Badge>
                  </div>

                  <div className="w-full max-w-md pt-4 md:pt-6 border-t">
                    <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Model Used:</span>
                        <span className="font-semibold">XGBoost Regressor</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className="font-semibold">High</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}