"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { Moon, Sun, Wind, MoreHorizontal, Menu, X } from "lucide-react"
import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AuthModal } from "@/components/auth-modal"
import Chatbot from "@/components/chatbot"

export function Navigation() {
  const { theme, setTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Wind className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">SkyLy</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
              Dashboard
            </Link>
            <Link href="/live" className="text-sm font-medium hover:text-primary transition-colors">
              Live AQI
            </Link>
            <Link href="/map" className="text-sm font-medium hover:text-primary transition-colors">
              India Map
            </Link>
            <Link href="/ranking" className="text-sm font-medium hover:text-primary transition-colors">
              City Ranking
            </Link>

            {/* Overflow menu for less-used links */}
            <div className="relative" ref={menuRef}>
              <button
                className="p-1 rounded hover:bg-muted/50"
                onClick={() => setMenuOpen((s) => !s)}
                aria-expanded={menuOpen}
                aria-label="More"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-50">
                  <div className="flex flex-col">
                    <Link href="/analytics" className="px-4 py-2 text-sm hover:bg-muted/40">Analytics</Link>
                    <Link href="/compare" className="px-4 py-2 text-sm hover:bg-muted/40">Compare</Link>
                    <Link href="/nearby" className="px-4 py-2 text-sm hover:bg-muted/40">Nearby</Link>
                    <Link href="/predict" className="px-4 py-2 text-sm hover:bg-muted/40">Predict</Link>
                    <Link href="/insights" className="px-4 py-2 text-sm hover:bg-muted/40">Health Insights</Link>
                    <Link href="/about" className="px-4 py-2 text-sm hover:bg-muted/40">About</Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="hidden md:flex items-center space-x-2">
              <AuthModal />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Chatbot inline />
            </div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-3 animate-in slide-in-from-top duration-200">
            <Link href="/" className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded" onClick={() => setMobileMenuOpen(false)}>
              Dashboard
            </Link>
            <Link href="/live" className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded" onClick={() => setMobileMenuOpen(false)}>
              Live AQI
            </Link>
            <Link href="/map" className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded" onClick={() => setMobileMenuOpen(false)}>
              India Map
            </Link>
            <Link href="/ranking" className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded" onClick={() => setMobileMenuOpen(false)}>
              City Ranking
            </Link>
            <Link href="/analytics" className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded" onClick={() => setMobileMenuOpen(false)}>
              Analytics
            </Link>
            <Link href="/compare" className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded" onClick={() => setMobileMenuOpen(false)}>
              Compare
            </Link>
            <Link href="/nearby" className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded" onClick={() => setMobileMenuOpen(false)}>
              Nearby
            </Link>
            <Link href="/predict" className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded" onClick={() => setMobileMenuOpen(false)}>
              Predict
            </Link>
            <Link href="/insights" className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded" onClick={() => setMobileMenuOpen(false)}>
              Health Insights
            </Link>
            <Link href="/about" className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded" onClick={() => setMobileMenuOpen(false)}>
              About
            </Link>
            <div className="flex items-center justify-center space-x-2 pt-4 border-t">
              <AuthModal />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Chatbot inline />
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}