"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

interface HealthRecommendationsProps {
  aqi: number
}

function getHealthRecommendations(aqi: number) {
  if (aqi <= 50) {
    return {
      level: "good",
      title: "Air Quality is Good",
      description: "Air quality is satisfactory, and air pollution poses little or no risk.",
      actions: [
        "Enjoy outdoor activities",
        "Open windows for fresh air",
        "No special precautions needed"
      ],
      icon: CheckCircle,
      color: "text-green-600"
    }
  } else if (aqi <= 100) {
    return {
      level: "moderate",
      title: "Air Quality is Moderate",
      description: "Air quality is acceptable. However, there may be a risk for some people.",
      actions: [
        "People with respiratory issues should consider limiting prolonged outdoor exertion",
        "Keep windows closed during peak pollution hours",
        "Consider using air purifiers indoors"
      ],
      icon: AlertTriangle,
      color: "text-yellow-600"
    }
  } else if (aqi <= 150) {
    return {
      level: "unhealthy-sensitive",
      title: "Unhealthy for Sensitive Groups",
      description: "Members of sensitive groups may experience health effects.",
      actions: [
        "Sensitive individuals should avoid prolonged outdoor activities",
        "Wear masks when outdoors",
        "Keep indoor air clean with air purifiers",
        "Stay hydrated and monitor symptoms"
      ],
      icon: AlertTriangle,
      color: "text-orange-600"
    }
  } else {
    return {
      level: "unhealthy",
      title: "Air Quality is Unhealthy",
      description: "Everyone may begin to experience health effects.",
      actions: [
        "Avoid prolonged outdoor activities",
        "Wear N95 masks when outdoors",
        "Keep windows and doors closed",
        "Use air purifiers and HVAC filters",
        "Stay indoors as much as possible"
      ],
      icon: XCircle,
      color: "text-red-600"
    }
  }
}

export function HealthRecommendations({ aqi }: HealthRecommendationsProps) {
  const recommendations = getHealthRecommendations(aqi)
  const Icon = recommendations.icon

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Heart className="h-5 w-5" />
          <span>Health Recommendations</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Icon className={`h-6 w-6 ${recommendations.color}`} />
          <Badge variant="outline" className={recommendations.color}>
            {recommendations.title}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          {recommendations.description}
        </p>

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Recommended Actions:</h4>
          <ul className="space-y-1">
            {recommendations.actions.map((action, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                <span className="text-primary mt-1">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}