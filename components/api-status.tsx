"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Loader2, MapPin, MessageSquare, Eye, RefreshCw } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface ApiStatus {
  name: string
  status: "success" | "error" | "loading"
  message: string
  details?: any
  configured?: boolean
  working?: boolean
}

export function ApiStatus() {
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([
    { name: "Chat AI", status: "loading", message: "Checking..." },
    { name: "Image Analysis", status: "loading", message: "Checking..." },
    { name: "Navigation", status: "loading", message: "Checking..." },
  ])
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    checkApiStatuses()
  }, [])

  const checkApiStatuses = async () => {
    setIsRefreshing(true)

    try {
      // Test all APIs in parallel
      const [keysResponse, mapsResponse] = await Promise.all([
        fetch("/api/test-keys")
          .then((res) => res.json())
          .catch(() => ({ error: "Failed to test keys" })),
        fetch("/api/test-maps")
          .then((res) => res.json())
          .catch(() => ({ error: "Failed to test maps" })),
      ])

      // Update Chat AI status
      setApiStatuses((prev) =>
        prev.map((api) =>
          api.name === "Chat AI"
            ? {
                ...api,
                status: keysResponse.chatAI ? "success" : "error",
                message: keysResponse.chatAI
                  ? "AI chat is working perfectly"
                  : keysResponse.deepseek_configured
                    ? `Chat API issue: ${keysResponse.deepseek_error || "Unknown error"}`
                    : "DeepSeek API key not configured",
                configured: keysResponse.deepseek_configured,
                working: keysResponse.chatAI,
              }
            : api,
        ),
      )

      // Update Image Analysis status
      setApiStatuses((prev) =>
        prev.map((api) =>
          api.name === "Image Analysis"
            ? {
                ...api,
                status: keysResponse.imageAnalysis ? "success" : "error",
                message: keysResponse.imageAnalysis
                  ? "Grok 2 Vision 1212 ready and working"
                  : keysResponse.grok_configured
                    ? `Grok Vision API issue: ${keysResponse.grok_error || "Unknown error"}`
                    : "Grok 2 Vision API key not configured",
                configured: keysResponse.grok_configured,
                working: keysResponse.imageAnalysis,
              }
            : api,
        ),
      )

      // Update Navigation status
      let navStatus: "success" | "error" = "error"
      let navMessage = "Navigation not configured"

      if (mapsResponse.anyWorking) {
        navStatus = "success"
        const workingServices = mapsResponse.services?.filter((s: any) => s.working).map((s: any) => s.service) || []
        navMessage = `Navigation ready (${workingServices.join(", ")})`
      } else if (mapsResponse.anyConfigured) {
        navMessage = "Navigation APIs configured but not working properly"
      }

      setApiStatuses((prev) =>
        prev.map((api) =>
          api.name === "Navigation"
            ? {
                ...api,
                status: navStatus,
                message: navMessage,
                details: mapsResponse.services,
                configured: mapsResponse.anyConfigured,
                working: mapsResponse.anyWorking,
              }
            : api,
        ),
      )
    } catch (error) {
      console.error("Failed to check API statuses:", error)
      setApiStatuses((prev) =>
        prev.map((api) => ({
          ...api,
          status: "error",
          message: "Failed to check API status",
        })),
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-400" />
      case "loading":
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">✅ Online</Badge>
      case "error":
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">❌ Offline</Badge>
      case "loading":
        return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">🔄 Checking</Badge>
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">⚠️ Unknown</Badge>
    }
  }

  const getApiIcon = (name: string) => {
    switch (name) {
      case "Chat AI":
        return <MessageSquare className="w-4 h-4 text-blue-400" />
      case "Image Analysis":
        return <Eye className="w-4 h-4 text-purple-400" />
      case "Navigation":
        return <MapPin className="w-4 h-4 text-emerald-400" />
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />
    }
  }

  const allWorking = apiStatuses.every((api) => api.status === "success")
  const someWorking = apiStatuses.some((api) => api.status === "success")

  return (
    <Card
      className={`glass-effect border-slate-700/50 ${
        allWorking ? "border-green-500/30" : someWorking ? "border-yellow-500/30" : "border-red-500/30"
      }`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
            {allWorking ? "🟢" : someWorking ? "🟡" : "🔴"} API Status
          </h3>
          <Button
            onClick={checkApiStatuses}
            disabled={isRefreshing}
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {apiStatuses.map((api) => (
          <div
            key={api.name}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
              api.status === "success"
                ? "bg-green-500/5 border-green-500/20"
                : api.status === "error"
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-slate-800/30 border-slate-700/30"
            }`}
          >
            <div className="flex items-center gap-3">
              {getApiIcon(api.name)}
              <div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(api.status)}
                  <span className="font-medium text-slate-200">{api.name}</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">{api.message}</p>
                {api.details && api.details.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {api.details.map((detail: any, index: number) => (
                      <div key={index} className="text-xs text-slate-500 flex items-center gap-2">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            detail.working ? "bg-green-400" : detail.configured ? "bg-yellow-400" : "bg-red-400"
                          }`}
                        ></div>
                        <span className="font-medium">{detail.service}:</span>
                        <span>{detail.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {getStatusBadge(api.status)}
          </div>
        ))}

        {/* Overall Status Summary */}
        <div
          className={`p-3 rounded-lg border text-center ${
            allWorking
              ? "bg-green-500/10 border-green-500/30 text-green-300"
              : someWorking
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <p className="font-medium">
            {allWorking
              ? "🎉 All systems operational! Your AI assistant is fully ready."
              : someWorking
                ? "⚠️ Some services need attention. Basic functionality available."
                : "❌ Services need configuration. Please check your API keys."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
