"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendData } from "@/types"

interface AQITrendChartProps {
  location: string
}

const API_BASE_URL = "http://127.0.0.1:8000"

export function AQITrendChart({ location }: AQITrendChartProps) {
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        // For demo purposes, generate mock trend data
        // In real app, fetch from /api/historical/yearly-comparison/{city} or similar
        const mockData: TrendData[] = []
        const now = new Date()
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)
          mockData.push({
            date: date.toISOString().split('T')[0],
            aqi: Math.floor(Math.random() * 100) + 20
          })
        }
        setTrendData(mockData)
      } catch (error) {
        console.error("Failed to fetch trend data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrendData()
  }, [location])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AQI Trend (7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AQI Trend (7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value: number | undefined) => [value || 0, "AQI"]}
            />
            <Line
              type="monotone"
              dataKey="aqi"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}