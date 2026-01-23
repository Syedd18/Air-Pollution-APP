"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: number
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  loginWithGoogle: () => Promise<void>
  loginWithPhone: (phone: string) => Promise<{ needsOtp: boolean }>
  verifyOtp: (phone: string, otp: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Default to local backend if env var is not set to avoid calling the Next host
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
const api = (path: string) => `${API_BASE_URL}${path}`

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Load auth state from localStorage
    const loadAuthState = () => {
      const storedToken = localStorage.getItem('auth_token')
      const storedUser = localStorage.getItem('user_data')

      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    }

    loadAuthState()

    // Listen for storage changes (e.g., from OAuth callback)
    window.addEventListener('storage', loadAuthState)
    return () => window.removeEventListener('storage', loadAuthState)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(api('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
        const data = await response.json()
        setToken(data.access_token)
        setUser(data.user)

        localStorage.setItem('auth_token', data.access_token)
        localStorage.setItem('user_data', JSON.stringify(data.user))
        return true
      }
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      console.error('Login failed:', response.status, errorData)
      alert(`Login failed: ${JSON.stringify(errorData.detail || errorData)}`)
      return false
    } catch (error) {
      console.error('Login error:', error)
      alert(`Network error: ${error}`)
      return false
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(api('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })

      if (response.ok) {
        const data = await response.json()
        setToken(data.access_token)
        setUser(data.user)

        localStorage.setItem('auth_token', data.access_token)
        localStorage.setItem('user_data', JSON.stringify(data.user))
        return true
      }
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      console.error('Register failed:', response.status, errorData)
      alert(`Register failed: ${JSON.stringify(errorData.detail || errorData)}`)
      return false
    } catch (error) {
      console.error('Register error:', error)
      alert(`Network error during registration: ${error}`)
      return false
    }
  }

  const loginWithGoogle = async (): Promise<void> => {
    const supabase = await import('@/lib/supabaseClient').then(m => m.default)
    if (!supabase) {
      alert('Supabase client not configured')
      return
    }
    const client = supabase()
    if (!client) {
      alert('Supabase client not configured')
      return
    }
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) {
      console.error('Google login error:', error)
      alert(`Google login failed: ${error.message}`)
    }
  }

  const loginWithPhone = async (phone: string): Promise<{ needsOtp: boolean }> => {
    const supabase = await import('@/lib/supabaseClient').then(m => m.default)
    if (!supabase) {
      alert('Supabase client not configured')
      return { needsOtp: false }
    }
    const client = supabase()
    if (!client) {
      alert('Supabase client not configured')
      return { needsOtp: false }
    }
    const { error } = await client.auth.signInWithOtp({ phone })
    if (error) {
      console.error('Phone login error:', error)
      alert(`Phone login failed: ${error.message}`)
      return { needsOtp: false }
    }
    return { needsOtp: true }
  }

  const verifyOtp = async (phone: string, otp: string): Promise<boolean> => {
    const supabase = await import('@/lib/supabaseClient').then(m => m.default)
    if (!supabase) {
      alert('Supabase client not configured')
      return false
    }
    const client = supabase()
    if (!client) {
      alert('Supabase client not configured')
      return false
    }
    const { data, error } = await client.auth.verifyOtp({ phone, token: otp, type: 'sms' })
    if (error) {
      console.error('OTP verification error:', error)
      alert(`OTP verification failed: ${error.message}`)
      return false
    }
    if (data.user && data.session) {
      // Create local user via backend
      const response = await fetch(api('/api/auth/supabase-callback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          access_token: data.session.access_token,
          user: data.user
        })
      })
      if (response.ok) {
        const backendData = await response.json()
        setToken(backendData.access_token || data.session.access_token)
        setUser(backendData.user)
        localStorage.setItem('auth_token', backendData.access_token || data.session.access_token)
        localStorage.setItem('user_data', JSON.stringify(backendData.user))
        return true
      }
    }
    return false
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
  }

  const value = {
    user,
    token,
    login,
    register,
    loginWithGoogle,
    loginWithPhone,
    verifyOtp,
    logout,
    isAuthenticated: !!user && !!token
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
