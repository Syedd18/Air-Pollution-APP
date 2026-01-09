export interface AQIData {
  city: string
  aqi: number
  dominant_pollutant: string
  components: Record<string, { v: number }>
  time: string
}

export interface HealthRecommendation {
  level: 'good' | 'moderate' | 'unhealthy' | 'very-unhealthy' | 'hazardous'
  title: string
  description: string
  actions: string[]
}

export interface TrendData {
  date: string
  aqi: number
}