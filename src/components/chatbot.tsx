"use client"

import { useState } from "react"
import { Send, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

const API_BASE_URL = "http://127.0.0.1:8000"

interface ChatbotProps {
  inline?: boolean
}

export default function Chatbot({ inline = false }: ChatbotProps) {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{role: string; text: string}[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const sendMessage = async (msg: string) => {
    if (!msg) return
    const userMsg = { role: 'user', text: msg }
    setMessages((m) => [...m, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/api/chatbot/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ query: msg })
      })

      if (!res.ok) throw new Error('Chatbot query failed')
      const data = await res.json()
      const botMsg = { role: 'bot', text: data.response || 'No response' }
      setMessages((m) => [...m, botMsg])
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: 'Error: failed to get response' }])
    } finally {
      setLoading(false)
    }
  }

  // Render inline small button (for nav) or floating launcher (default)
  return (
    <div>
      {inline ? (
        <div className="relative">
          <button
            aria-label="Open chatbot"
            onClick={() => setOpen((s) => !s)}
            className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-primary text-white hover:shadow-md"
          >
            {open ? <X className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Chat</span>
          </button>

          {open && (
            <div className="fixed top-16 right-6 z-50 w-80 min-w-[18rem] max-w-full bg-card border rounded-lg shadow-lg overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between">
                <h3 className="font-semibold">AI Assistant</h3>
                <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground">✕</button>
              </div>
              <div className="p-3 h-64 overflow-y-auto space-y-3 bg-background">
                {messages.length === 0 && <div className="text-sm text-muted-foreground">Ask me about AQI, comparisons, or forecasts.</div>}
                {messages.map((m, i) => (
                  <div key={i} className={`p-2 rounded ${m.role === 'user' ? 'bg-primary/10 self-end' : 'bg-muted'}`}>
                    <div className="text-sm">{m.text}</div>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
                className="p-3 border-t flex gap-2"
              >
                <input
                  className="flex-1 px-3 py-2 border rounded"
                  placeholder="Ask about a city or AQI..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit" disabled={loading} className="px-3 py-2 bg-primary text-white rounded">
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            aria-label="Open chatbot"
            onClick={() => setOpen((s) => !s)}
            className="fixed bottom-6 right-6 z-50 rounded-full bg-primary p-3 text-white shadow-lg"
          >
            {open ? <X className="h-5 w-5" /> : <Send className="h-5 w-5" />}
          </button>

          {open && (
            <div className="fixed bottom-20 right-6 z-50 w-96 max-w-full bg-card border rounded-lg shadow-lg overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between">
                <h3 className="font-semibold">AI Assistant</h3>
                <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground">✕</button>
              </div>
              <div className="p-3 h-64 overflow-y-auto space-y-3 bg-background">
                {messages.length === 0 && <div className="text-sm text-muted-foreground">Ask me about AQI, comparisons, or forecasts.</div>}
                {messages.map((m, i) => (
                  <div key={i} className={`p-2 rounded ${m.role === 'user' ? 'bg-primary/10 self-end' : 'bg-muted'}`}>
                    <div className="text-sm">{m.text}</div>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
                className="p-3 border-t flex gap-2"
              >
                <input
                  className="flex-1 px-3 py-2 border rounded"
                  placeholder="Ask about a city or AQI..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit" disabled={loading} className="px-3 py-2 bg-primary text-white rounded">
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
