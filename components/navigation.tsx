"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, NavigationIcon, Mic, MicOff, Loader2, AlertCircle, Car, PersonStanding, Bike } from "lucide-react"

interface NavigationProps {
  onSpeak: (text: string) => void
  isEnabled: boolean
}

interface Location {
  latitude: number
  longitude: number
  address?: string
}

interface NavigationResult {
  distance: string
  duration: string
  instructions: string[]
  provider: string
  transportMode: string
}

export function Navigation({ onSpeak, isEnabled }: NavigationProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [destination, setDestination] = useState("")
  const [navigationResult, setNavigationResult] = useState<NavigationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [transportMode, setTransportMode] = useState<"driving" | "walking" | "cycling">("walking")
  const [isNavigating, setIsNavigating] = useState(false)

  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Get user location on component mount
  useEffect(() => {
    getCurrentLocation()
  }, [])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ""
        let interimTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        setTranscript(finalTranscript || interimTranscript)

        // Reset silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
        }

        // Set new silence timer
        silenceTimerRef.current = setTimeout(() => {
          if (finalTranscript.trim()) {
            handleVoiceCommand(finalTranscript.trim())
          }
          stopListening()
        }, 2500) // 2.5 seconds of silence
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setError("Voice recognition error. Please try again.")
        stopListening()
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
    }
  }, [])

  const getCurrentLocation = async () => {
    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation not supported")
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        })
      })

      const location: Location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }

      // Get readable address
      try {
        const address = await reverseGeocode(location.latitude, location.longitude)
        location.address = address
      } catch (err) {
        console.error("Reverse geocoding failed:", err)
      }

      setCurrentLocation(location)
    } catch (err: any) {
      console.error("Location error:", err)
      setError("Location access needed for navigation.")
    }
  }

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_API_KEY}`,
      )

      if (response.ok) {
        const data = await response.json()
        return data.features[0]?.place_name || "Unknown location"
      }
    } catch (err) {
      console.error("Mapbox reverse geocoding failed:", err)
    }

    // Fallback to HERE Maps
    try {
      const response = await fetch(
        `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat},${lng}&apiKey=${process.env.HERE_MAP_API_KEY}`,
      )

      if (response.ok) {
        const data = await response.json()
        return data.items[0]?.address?.label || "Unknown location"
      }
    } catch (err) {
      console.error("HERE reverse geocoding failed:", err)
    }

    return "Unknown location"
  }

  const startListening = () => {
    if (!recognitionRef.current) {
      setError("Voice recognition not supported in this browser.")
      return
    }

    setIsListening(true)
    setTranscript("")
    setError(null)

    try {
      recognitionRef.current.start()
      onSpeak("Where would you like to go?")
    } catch (err) {
      console.error("Failed to start recognition:", err)
      setIsListening(false)
      setError("Failed to start voice recognition.")
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
    setIsListening(false)

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }

  const handleVoiceCommand = async (command: string) => {
    const lowerCommand = command.toLowerCase()

    // Extract destination from voice command
    let extractedDestination = ""

    if (lowerCommand.includes("take me to") || lowerCommand.includes("go to")) {
      extractedDestination = lowerCommand.replace(/.*(?:take me to|go to)\s+/, "").trim()
    } else if (lowerCommand.includes("navigate to") || lowerCommand.includes("directions to")) {
      extractedDestination = lowerCommand.replace(/.*(?:navigate to|directions to)\s+/, "").trim()
    } else if (
      lowerCommand.includes("find") &&
      (lowerCommand.includes("nearest") || lowerCommand.includes("closest"))
    ) {
      extractedDestination = lowerCommand.replace(/.*(?:find|locate)\s+(?:the\s+)?(?:nearest|closest)\s+/, "").trim()
      extractedDestination = "nearest " + extractedDestination
    } else {
      // Assume the entire command is the destination
      extractedDestination = command.trim()
    }

    if (extractedDestination) {
      setDestination(extractedDestination)
      await getDirections(extractedDestination)
    } else {
      onSpeak("I didn't understand the destination. Please try again.")
    }
  }

  const getDirections = async (dest: string) => {
    if (!currentLocation) {
      setError("Current location not available.")
      onSpeak("I need your location first.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: currentLocation,
          destination: dest,
          transportMode,
        }),
      })

      if (!response.ok) {
        throw new Error("Navigation request failed")
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      setNavigationResult(result)
      setIsNavigating(true)

      // Announce navigation result
      const modeText = transportMode === "driving" ? "driving" : transportMode === "cycling" ? "cycling" : "walking"
      onSpeak(`Found route. ${result.distance}, ${result.duration} by ${modeText}. Starting navigation.`)

      // Start turn-by-turn navigation
      setTimeout(() => {
        startTurnByTurnNavigation(result.instructions)
      }, 3000)
    } catch (err: any) {
      console.error("Navigation error:", err)
      setError(err.message)
      onSpeak("Navigation failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const startTurnByTurnNavigation = (instructions: string[]) => {
    if (!instructions || instructions.length === 0) return

    let currentStep = 0

    const announceNextStep = () => {
      if (currentStep < instructions.length && isNavigating) {
        const instruction = instructions[currentStep]
        onSpeak(instruction)
        currentStep++

        // Schedule next instruction (every 15 seconds for demo)
        setTimeout(() => {
          announceNextStep()
        }, 15000)
      } else if (isNavigating) {
        onSpeak("You have arrived at your destination.")
        setIsNavigating(false)
      }
    }

    announceNextStep()
  }

  const stopNavigation = () => {
    setIsNavigating(false)
    setNavigationResult(null)
    onSpeak("Navigation stopped.")
  }

  const quickDestinations = [
    { name: "Hospital", icon: "🏥" },
    { name: "Pharmacy", icon: "💊" },
    { name: "Bank", icon: "🏦" },
    { name: "Market", icon: "🛒" },
    { name: "Restaurant", icon: "🍽️" },
    { name: "Gas Station", icon: "⛽" },
  ]

  const handleQuickDestination = (destination: string) => {
    setDestination(`nearest ${destination.toLowerCase()}`)
    getDirections(`nearest ${destination.toLowerCase()}`)
  }

  return (
    <Card className="glass-effect border-slate-700/50">
      <CardHeader>
        <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
          <NavigationIcon className="w-5 h-5 text-blue-400" />
          Smart Navigation
          {isNavigating && (
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded animate-pulse">NAVIGATING</span>
          )}
        </h3>
      </CardHeader>
      <CardContent className="p-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Current Location */}
          {currentLocation && (
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-600/30">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-green-400" />
                <span className="text-slate-300 font-medium">Current Location:</span>
              </div>
              <p className="text-slate-200 text-sm">
                {currentLocation.address ||
                  `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`}
              </p>
            </div>
          )}

          {/* Transport Mode Selection */}
          <div className="space-y-3">
            <label className="text-slate-300 font-medium">Transport Mode:</label>
            <Select value={transportMode} onValueChange={(value: any) => setTransportMode(value)}>
              <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="walking" className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <PersonStanding className="w-4 h-4" />
                    Walking (Accessible paths)
                  </div>
                </SelectItem>
                <SelectItem value="driving" className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Driving
                  </div>
                </SelectItem>
                <SelectItem value="cycling" className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Bike className="w-4 h-4" />
                    Cycling
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Voice Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading}
                className={`flex-1 h-12 text-lg font-semibold transition-all duration-300 ${
                  isListening
                    ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                } text-white`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5 mr-2" />
                    Stop Listening
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Getting Directions...
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-2" />🎤 Where to?
                  </>
                )}
              </Button>
            </div>

            {transcript && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-blue-300 text-sm">
                  <strong>You said:</strong> "{transcript}"
                </p>
              </div>
            )}
          </div>

          {/* Quick Destinations */}
          <div className="space-y-3">
            <label className="text-slate-300 font-medium">Quick Destinations:</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {quickDestinations.map((dest) => (
                <Button
                  key={dest.name}
                  onClick={() => handleQuickDestination(dest.name)}
                  disabled={isLoading || !currentLocation}
                  className="h-12 bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 border border-slate-600/30"
                >
                  <span className="mr-2">{dest.icon}</span>
                  {dest.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Navigation Result */}
          {navigationResult && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <h4 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
                  Navigation Route:
                  {isNavigating && (
                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">ACTIVE</span>
                  )}
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-slate-400 text-sm">Distance</p>
                    <p className="text-slate-200 font-medium">{navigationResult.distance}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Duration</p>
                    <p className="text-slate-200 font-medium">{navigationResult.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Via {navigationResult.provider}</span>
                  <span>•</span>
                  <span>{navigationResult.transportMode}</span>
                </div>
              </div>

              {isNavigating && (
                <Button
                  onClick={stopNavigation}
                  className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                >
                  Stop Navigation
                </Button>
              )}
            </div>
          )}

          {/* Information */}
          <div className="text-xs text-slate-400 bg-slate-800/30 p-3 rounded-lg">
            <p className="font-medium text-slate-300 mb-1">🗺️ Navigation Features:</p>
            <ul className="space-y-1">
              <li>
                • 🎤 <strong>Voice Commands:</strong> "Take me to the hospital"
              </li>
              <li>
                • 🚶 <strong>Accessible Routes:</strong> Optimized for visually impaired users
              </li>
              <li>
                • 🔄 <strong>Turn-by-turn:</strong> Continuous voice guidance
              </li>
              <li>
                • 🚗🚶🚴 <strong>Multi-modal:</strong> Driving, walking, cycling options
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
