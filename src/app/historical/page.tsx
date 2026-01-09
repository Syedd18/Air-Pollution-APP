"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HistoricalPage() {
  const router = useRouter()
  useEffect(() => {
    // Redirect historical -> analytics since analytics now contains historical charts
    router.replace('/analytics')
  }, [router])
  return null
}