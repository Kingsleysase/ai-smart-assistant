"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

interface ApiStatus {
  deepseek_configured: boolean
  openai_configured: boolean
  deepseek_key_preview: string
  openai_key_preview: string
}

export function ApiStatus() {
  const [status, setStatus] = useState<ApiStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/test-keys")
      .then((res) => res.json())
      .then((data) => {
        setStatus(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Failed to check API status:", error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <Card className="glass-effect border-slate-700/50 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span className="text-slate-300">Checking API configuration...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) return null

  const allConfigured = status.deepseek_configured && status.openai_configured

  return (
    <Card
      className={`glass-effect border-slate-700/50 shadow-lg ${allConfigured ? "border-emerald-500/30" : "border-amber-500/30"}`}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2 text-slate-200">
            {allConfigured ? (
              <div className="p-1 rounded-lg bg-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
            ) : (
              <div className="p-1 rounded-lg bg-amber-500/20">
                <XCircle className="w-5 h-5 text-amber-400" />
              </div>
            )}
            API Configuration Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${status.deepseek_configured ? "bg-emerald-400" : "bg-red-400"}`}
              ></div>
              <span className="text-slate-300">Chat (DeepSeek): {status.deepseek_key_preview}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${status.openai_configured ? "bg-emerald-400" : "bg-red-400"}`}
              ></div>
              <span className="text-slate-300">Image Analysis (GPT-4o): {status.openai_key_preview}</span>
            </div>
          </div>
          {allConfigured ? (
            <p className="text-emerald-400 text-sm font-medium">✅ All APIs configured and ready!</p>
          ) : (
            <p className="text-amber-400 text-sm font-medium">⚠️ Some APIs need configuration</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
