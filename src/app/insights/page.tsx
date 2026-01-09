"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, Shield, Activity, AlertTriangle } from "lucide-react"

const healthInsights = [
  {
    category: "General Population",
    icon: Heart,
    insights: [
      "AQI below 50 is considered good for everyone",
      "Limit outdoor activities when AQI exceeds 100",
      "Wear masks during high pollution episodes",
      "Keep indoor air clean with proper ventilation"
    ]
  },
  {
    category: "Sensitive Groups",
    icon: Shield,
    insights: [
      "Children and elderly are more vulnerable",
      "People with respiratory conditions should be cautious",
      "Pregnant women should avoid polluted areas",
      "Those with heart conditions need extra care"
    ]
  },
  {
    category: "Daily Activities",
    icon: Activity,
    insights: [
      "Exercise indoors when AQI is poor",
      "Avoid morning walks during winter pollution",
      "Use air purifiers for sensitive individuals",
      "Monitor local AQI forecasts regularly"
    ]
  },
  {
    category: "Health Risks",
    icon: AlertTriangle,
    insights: [
      "Long-term exposure increases respiratory diseases",
      "Cardiovascular problems from poor air quality",
      "Reduced lung function in children",
      "Increased risk of premature death"
    ]
  }
]

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">Health Insights</h1>
            <p className="text-muted-foreground">
              Understanding air quality impacts on health and well-being
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {healthInsights.map((category) => {
              const Icon = category.icon
              return (
                <Card key={category.category}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <span>{category.category}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.insights.map((insight, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>AQI Health Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Badge className="bg-green-500 text-white">Good (0-50)</Badge>
                  <p className="text-sm text-muted-foreground">
                    Air quality is satisfactory, and air pollution poses little or no risk.
                  </p>
                </div>
                <div className="space-y-2">
                  <Badge className="bg-yellow-500 text-white">Moderate (51-100)</Badge>
                  <p className="text-sm text-muted-foreground">
                    Air quality is acceptable. However, there may be a risk for some people.
                  </p>
                </div>
                <div className="space-y-2">
                  <Badge className="bg-orange-500 text-white">Unhealthy (101-150)</Badge>
                  <p className="text-sm text-muted-foreground">
                    Members of sensitive groups may experience health effects.
                  </p>
                </div>
                <div className="space-y-2">
                  <Badge className="bg-red-500 text-white">Very Unhealthy (151+)</Badge>
                  <p className="text-sm text-muted-foreground">
                    Everyone may begin to experience health effects.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}