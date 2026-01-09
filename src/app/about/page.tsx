"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wind, Database, Shield, Users } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">About SkyLy</h1>
            <p className="text-muted-foreground">
              Empowering communities with real-time air quality information
            </p>
          </div>

          <Card>
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <Wind className="h-16 w-16 text-primary mx-auto" />
                <h2 className="text-2xl font-semibold">Our Mission</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  SkyLy is dedicated to providing accurate, real-time air quality information
                  to help individuals and communities make informed decisions about their health and environment.
                  We believe that access to clean air is a fundamental right, and we're committed to
                  transparency and education in air quality monitoring.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-primary" />
                  <span>Data Sources</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We aggregate data from trusted sources including government monitoring stations,
                  satellite observations, and international air quality networks to provide
                  comprehensive coverage.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Reliability</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Our platform uses industry-standard methodologies and undergoes regular
                  validation to ensure accuracy and reliability of air quality information.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Community</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We're building a community of environmentally conscious individuals
                  working together to improve air quality and protect public health.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Data Collection</h3>
                  <p className="text-sm text-muted-foreground">
                    We collect air quality data from multiple sources including ground-based
                    monitoring stations, satellite imagery, and predictive models.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Real-time Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Data is processed in real-time using advanced algorithms to calculate
                    AQI values and provide instant updates.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Health Insights</h3>
                  <p className="text-sm text-muted-foreground">
                    We provide personalized health recommendations based on current
                    air quality conditions and individual sensitivity.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Community Action</h3>
                  <p className="text-sm text-muted-foreground">
                    Our platform empowers communities to take action by providing
                    tools for monitoring and improving local air quality.
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