"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

export function BrowserSupport() {
  const [speechSupport, setSpeechSupport] = useState<{
    recognition: boolean
    synthesis: boolean
  } | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const recognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
      const synthesis = !!window.speechSynthesis

      setSpeechSupport({
        recognition,
        synthesis,
      })
    }
  }, [])

  if (!speechSupport) return null

  const hasIssues = !speechSupport.recognition || !speechSupport.synthesis

  if (!hasIssues) return null

  const speechRecognition = speechSupport.recognition
  const textToSpeech = speechSupport.synthesis

  return (
    <Card className="glass-effect border-slate-700/50 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 mt-1">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-200 mb-2">Browser Compatibility Notice</h3>
            <div className="space-y-2 text-sm text-slate-300">
              {speechRecognition ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span>Speech Recognition: Supported</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400"></div>
                  <span>Speech Recognition: Not Supported</span>
                </div>
              )}
              {textToSpeech ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span>Text-to-Speech: Supported</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400"></div>
                  <span>Text-to-Speech: Not Supported</span>
                </div>
              )}
            </div>
            {!speechSupport.recognition && (
              <p className="mt-2 text-sm text-yellow-100">
                For full voice functionality, please use Chrome or Edge browsers.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
