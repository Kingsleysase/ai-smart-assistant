"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, MicOff, Upload, Volume2, VolumeX, MessageSquare, Brain, Zap, Shield, Sparkles, Eye } from 'lucide-react'
import { cn } from "@/lib/utils"
import { BrowserSupport } from "@/components/browser-support"
import { ApiStatus } from "@/components/api-status"
import { ObjectDetection } from "@/components/object-detection"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
}

interface SpeechRecognitionType extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognitionType, ev: Event) => any) | null
  onend: ((this: SpeechRecognitionType, ev: Event) => any) | null
  onerror: ((this: SpeechRecognitionType, ev: any) => any) | null
  onresult: ((this: SpeechRecognitionType, ev: any) => any) | null
}

export default function SmartAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [activeMode, setActiveMode] = useState("chat")

  const recognitionRef = useRef<SpeechRecognitionType | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()

        if (recognitionRef.current) {
          recognitionRef.current.continuous = false
          recognitionRef.current.interimResults = true
          recognitionRef.current.lang = "en-US"

          recognitionRef.current.onstart = () => {
            setIsListening(true)
            setCurrentTranscript("")
          }

          recognitionRef.current.onresult = (event) => {
            let transcript = ""
            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript
            }
            setCurrentTranscript(transcript)

            if (event.results[event.results.length - 1].isFinal) {
              handleUserMessage(transcript)
            }
          }

          recognitionRef.current.onend = () => {
            setIsListening(false)
            setCurrentTranscript("")
          }

          recognitionRef.current.onerror = (event) => {
            console.error("Speech recognition error:", event.error)
            setIsListening(false)
            setCurrentTranscript("")
            speak("Sorry, I had trouble hearing you. Please try again.")
          }
        }
      }
    }

    setTimeout(() => {
      speak(
        "Welcome to your AI Smart Assistant! I can help you with conversations, analyze images, and detect objects in real-time using your camera. When you use object detection, I will automatically announce what I see. Try saying 'What's in front of me?' for object detection, or click the microphone to get started.",
      )
    }, 2000)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const speak = (text: string) => {
    if (!speechEnabled || !("speechSynthesis" in window)) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error("Error starting speech recognition:", error)
        speak("Sorry, I cannot access the microphone. Please check your browser permissions.")
      }
    } else if (!recognitionRef.current) {
      speak("Sorry, speech recognition is not supported in your browser. Please try using Chrome or Edge.")
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  const handleUserMessage = async (content: string) => {
    if (!content.trim()) return

    // Check for object detection commands
    const lowerContent = content.toLowerCase()
    if (
      lowerContent.includes("what's in front") ||
      lowerContent.includes("what do you see") ||
      lowerContent.includes("detect objects") ||
      lowerContent.includes("what can you see") ||
      lowerContent.includes("look around")
    ) {
      setActiveMode("detection")
      speak("Switching to object detection mode. I'll automatically announce what I see in front of you.")
      return
    }

    // Continue with regular chat
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsProcessing(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content.trim() }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (speechEnabled) {
        speak(data.response)
      }
    } catch (error) {
      console.error("Error:", error)
      const errorMessage = "Sorry, I encountered an error. Please try again."
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: errorMessage,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      speak(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      speak("Please upload a valid image file.")
      return
    }

    setIsProcessing(true)
    speak("Analyzing your image, please wait...")

    try {
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to analyze image")

      const data = await response.json()

      const assistantMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: `Image Analysis: ${data.description}`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      speak(data.description)
    } catch (error) {
      console.error("Error analyzing image:", error)
      const errorMessage = "Sorry, I could not analyze the image. Please try again."
      speak(errorMessage)
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-925 via-slate-900 to-slate-875 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)] pointer-events-none" />

      <div className="relative z-10 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <header className="text-center mb-12 animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                <Brain className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                AI Smart Assistant
              </h1>
            </div>
            <p className="text-xl text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
              Voice-enabled AI assistant with real-time object detection capabilities
            </p>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Real-time Processing</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>Privacy Focused</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>AI Powered</span>
              </div>
            </div>
          </header>

          {/* Status Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <BrowserSupport />
            <ApiStatus />
          </div>

          {/* Main Control Panel */}
          <Card className="glass-effect border-slate-700/50 mb-8 shadow-2xl">
            <CardHeader className="pb-4">
              <h2 className="text-2xl font-semibold text-center text-slate-200">Voice Controls</h2>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Primary Voice Button */}
                <div className="md:col-span-2 lg:col-span-1">
                  <Button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isProcessing}
                    size="lg"
                    className={cn(
                      "w-full h-20 text-lg font-semibold transition-all duration-300 shadow-lg",
                      isListening
                        ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 animate-pulse-glow text-white"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-500/25",
                    )}
                    aria-label={isListening ? "Stop listening" : "Start voice input"}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-6 h-6 mr-3" />
                        Stop Listening
                      </>
                    ) : (
                      <>
                        <Mic className="w-6 h-6 mr-3" />
                        Start Voice
                      </>
                    )}
                  </Button>
                </div>

                {/* Speech Toggle */}
                <Button
                  onClick={() => {
                    setSpeechEnabled(!speechEnabled)
                    if (isSpeaking) stopSpeaking()
                  }}
                  size="lg"
                  className={cn(
                    "h-20 text-lg font-semibold transition-all duration-300 shadow-lg text-white",
                    speechEnabled
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-500/25"
                      : "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800",
                  )}
                  aria-label={speechEnabled ? "Disable speech" : "Enable speech"}
                >
                  {speechEnabled ? (
                    <>
                      <Volume2 className="w-6 h-6 mr-3" />
                      Speech On
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-6 h-6 mr-3" />
                      Speech Off
                    </>
                  )}
                </Button>

                {/* Image Upload */}
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  size="lg"
                  className="h-20 text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/25 transition-all duration-300"
                  aria-label="Upload image for analysis"
                >
                  <Upload className="w-6 h-6 mr-3" />
                  Analyze Image
                </Button>

                {/* Stop Speaking (conditional) */}
                {isSpeaking && (
                  <Button
                    onClick={stopSpeaking}
                    size="lg"
                    className="h-20 text-lg font-semibold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg shadow-amber-500/25 transition-all duration-300"
                    aria-label="Stop speaking"
                  >
                    Stop Speaking
                  </Button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  aria-label="Image file input"
                />
              </div>

              {/* Status Display */}
              <div className="text-center">
                {isListening && (
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 animate-fade-in">
                    <p className="text-blue-300 text-lg font-medium" aria-live="polite">
                      🎤 Listening...{" "}
                      {currentTranscript && <span className="text-blue-200 italic">"{currentTranscript}"</span>}
                    </p>
                  </div>
                )}
                {isProcessing && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-fade-in">
                    <p className="text-amber-300 text-lg font-medium" aria-live="polite">
                      🤔 Processing your request...
                    </p>
                  </div>
                )}
                {isSpeaking && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 animate-fade-in">
                    <p className="text-emerald-300 text-lg font-medium" aria-live="polite">
                      🔊 Speaking...
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Feature Tabs */}
          <Tabs value={activeMode} onValueChange={setActiveMode} className="mb-8">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700/50">
              <TabsTrigger
                value="chat"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="detection"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300"
              >
                <Eye className="w-4 h-4 mr-2" />
                Object Detection
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-6">
              {/* Chat Interface */}
              <Card className="glass-effect border-slate-700/50 shadow-2xl">
                <CardHeader className="border-b border-slate-700/50">
                  <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-blue-400" />
                    Conversation
                  </h2>
                </CardHeader>
                <CardContent className="p-0">
                  <div
                    className="h-96 overflow-y-auto p-6 space-y-4 custom-scrollbar"
                    role="log"
                    aria-label="Conversation history"
                  >
                    {messages.length === 0 ? (
                      <div className="text-center text-slate-400 py-16">
                        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 inline-block mb-4">
                          <MessageSquare className="w-12 h-12 opacity-50" />
                        </div>
                        <p className="text-xl font-medium">Ready to assist you</p>
                        <p className="text-slate-500 mt-2">
                          Start by speaking, or try voice commands like "What's in front of me?"
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "p-4 rounded-2xl max-w-4xl transition-all duration-300 animate-fade-in",
                            message.type === "user"
                              ? "bg-gradient-to-r from-blue-600/20 to-blue-700/20 border border-blue-500/30 ml-8"
                              : "bg-gradient-to-r from-slate-700/50 to-slate-800/50 border border-slate-600/30 mr-8",
                          )}
                          role="article"
                          aria-label={`${message.type === "user" ? "Your message" : "Assistant response"}`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className={cn(
                                "font-semibold text-sm px-3 py-1 rounded-full",
                                message.type === "user"
                                  ? "bg-blue-500/20 text-blue-300"
                                  : "bg-emerald-500/20 text-emerald-300",
                              )}
                            >
                              {message.type === "user" ? "You" : "Assistant"}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                          <p className="text-lg leading-relaxed text-slate-200">{message.content}</p>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detection" className="mt-6">
              <ObjectDetection onSpeak={speak} isEnabled={speechEnabled} />
            </TabsContent>
          </Tabs>

          {/* Instructions */}
          <Card className="glass-effect border-slate-700/50 shadow-2xl">
            <CardHeader>
              <h2 className="text-2xl font-semibold text-slate-200">How to Use</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-200 text-lg">💬 Chat Features</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30 mt-1">
                        <Mic className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-200 mb-1">Voice Input</h4>
                        <p className="text-slate-400 text-sm">Click "Start Voice" and speak your question</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30 mt-1">
                        <Upload className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-200 mb-1">Image Analysis</h4>
                        <p className="text-slate-400 text-sm">Upload images for AI descriptions</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-200 text-lg">👁️ Object Detection</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30 mt-1">
                        <Eye className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-200 mb-1">Real-time Detection</h4>
                        <p className="text-slate-400 text-sm">Say "What's in front of me?" or use the detection tab</p>
                      </div>
                    </div>
                    <div className="text-slate-400 text-sm">
                      <p>• Continuous scanning of your environment</p>
                      <p>• Automatic voice announcements</p>
                      <p>• Detects people, vehicles, objects</p>
                      <p>• Works with camera permissions</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <h4 className="font-semibold text-blue-300 mb-2">🎙️ Voice Commands</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-300">
                  <p>• "What's in front of me?" - Object detection</p>
                  <p>• "What do you see?" - Camera analysis</p>
                  <p>• "Detect objects" - Start scanning</p>
                  <p>• "Look around" - Environmental scan</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
