"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Camera, Upload, AlertCircle, Loader2, RefreshCw, Play, Pause, Zap } from 'lucide-react'
import { cn } from "@/lib/utils"

interface ObjectDetectionProps {
  onSpeak: (text: string) => void
  isEnabled: boolean
}

interface DetectionResult {
  objects: Array<{
    name: string
    confidence: number
    count: number
  }>
  description: string
  method: string
  apiUsed?: string
}

export function ObjectDetection({ onSpeak, isEnabled }: ObjectDetectionProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionResults, setDetectionResults] = useState<DetectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detectionMethod, setDetectionMethod] = useState<"api" | "simple" | "upload">("api")
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [scanInterval, setScanInterval] = useState(5) // seconds between scans
  const [lastAnnouncement, setLastAnnouncement] = useState<string>("")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isDetectionActiveRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopContinuousDetection()
      stopCamera()
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      setIsLoading(true)
      onSpeak("Starting camera...")

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "environment",
        },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameraStream(stream)
      onSpeak("Camera ready. Starting continuous object detection.")

      // Start continuous detection automatically
      setTimeout(() => {
        startContinuousDetection()
        onSpeak("Object detection is now active. I will announce what I see.")
      }, 2000) // Give camera 2 seconds to stabilize
    } catch (err: any) {
      console.error("Camera error:", err)
      setError("Camera access denied. Please allow camera permissions.")
      onSpeak("Camera access needed for object detection.")
    } finally {
      setIsLoading(false)
    }
  }, [onSpeak])

  const stopCamera = useCallback(() => {
    stopContinuousDetection()

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsDetecting(false)
    setDetectionResults(null)
    setLastAnnouncement("")
    onSpeak("Object detection stopped.")
  }, [cameraStream, onSpeak])

  const startContinuousDetection = useCallback(() => {
    if (isDetectionActiveRef.current || !cameraStream) return

    setIsDetecting(true)
    isDetectionActiveRef.current = true
    onSpeak("Continuous scanning started.")

    // Initial detection after a short delay
    setTimeout(() => {
      performDetection()
    }, 1000)

    // Set up interval for continuous detection
    detectionIntervalRef.current = setInterval(() => {
      if (isDetectionActiveRef.current && cameraStream) {
        performDetection()
      }
    }, scanInterval * 1000)
  }, [cameraStream, scanInterval])

  const stopContinuousDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    isDetectionActiveRef.current = false
    setIsDetecting(false)
  }, [])

  const captureImageAsBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !canvasRef.current) {
        resolve(null)
        return
      }

      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")

      if (!context || video.readyState !== 4) {
        resolve(null)
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      canvas.toBlob(
        (blob) => {
          resolve(blob)
        },
        "image/jpeg",
        0.8,
      )
    })
  }, [])

  const captureImageAsDataURL = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext("2d")

    if (!context || video.readyState !== 4) return null

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    return canvas.toDataURL("image/jpeg", 0.8)
  }, [])

  const detectWithAPI = async (imageBlob: Blob): Promise<DetectionResult> => {
    const formData = new FormData()
    formData.append("image", imageBlob, "capture.jpg")

    const response = await fetch("/api/analyze-image", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    return {
      objects: data.objects || [],
      description: data.description || "No description available",
      method: "AI API",
      apiUsed: data.apiUsed || "Unknown API",
    }
  }

  const detectWithSimpleAnalysis = async (imageData: string): Promise<DetectionResult> => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData?.data

        if (!data) {
          resolve({
            objects: [],
            description: "Unable to analyze image",
            method: "Simple Analysis",
          })
          return
        }

        const colorAnalysis = analyzeColors(data)
        const objects = inferObjectsFromColors(colorAnalysis)

        resolve({
          objects,
          description: generateSimpleDescription(objects, colorAnalysis),
          method: "Simple Analysis",
        })
      }

      img.onerror = () => {
        resolve({
          objects: [],
          description: "Failed to load image for analysis",
          method: "Simple Analysis",
        })
      }

      img.src = imageData
    })
  }

  const analyzeColors = (data: Uint8ClampedArray) => {
    const totalPixels = data.length / 4
    let redCount = 0,
      greenCount = 0,
      blueCount = 0
    let brightPixels = 0,
      darkPixels = 0

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const brightness = (r + g + b) / 3

      if (r > g && r > b && r > 100) redCount++
      if (g > r && g > b && g > 100) greenCount++
      if (b > r && b > g && b > 100) blueCount++

      if (brightness > 128) brightPixels++
      else darkPixels++
    }

    return {
      redPercent: (redCount / totalPixels) * 100,
      greenPercent: (greenCount / totalPixels) * 100,
      bluePercent: (blueCount / totalPixels) * 100,
      brightness: (brightPixels / totalPixels) * 100,
    }
  }

  const inferObjectsFromColors = (colorAnalysis: any) => {
    const objects = []

    if (colorAnalysis.greenPercent > 15) {
      objects.push({ name: "vegetation", confidence: 0.7, count: 1 })
    }
    if (colorAnalysis.bluePercent > 10) {
      objects.push({ name: "sky or water", confidence: 0.6, count: 1 })
    }
    if (colorAnalysis.redPercent > 8) {
      objects.push({ name: "red objects", confidence: 0.5, count: 1 })
    }
    if (colorAnalysis.brightness > 70) {
      objects.push({ name: "bright surfaces", confidence: 0.8, count: 1 })
    }
    if (colorAnalysis.brightness < 30) {
      objects.push({ name: "dark areas", confidence: 0.8, count: 1 })
    }

    return objects
  }

  const generateSimpleDescription = (objects: any[], colorAnalysis: any) => {
    if (objects.length === 0) {
      return "Scene appears mostly uniform with mixed colors."
    }

    const objectNames = objects.map((obj) => obj.name).join(", ")
    const brightness = colorAnalysis.brightness > 50 ? "bright" : "dim"

    return `I can see ${objectNames} in a ${brightness} environment.`
  }

  const performDetection = async () => {
    if (!isDetectionActiveRef.current || !cameraStream) return

    try {
      let results: DetectionResult

      if (detectionMethod === "api") {
        const imageBlob = await captureImageAsBlob()
        if (!imageBlob) return
        results = await detectWithAPI(imageBlob)
      } else {
        const imageData = captureImageAsDataURL()
        if (!imageData) return
        results = await detectWithSimpleAnalysis(imageData)
      }

      setDetectionResults(results)

      // Announce results if enabled and different from last announcement
      if (isEnabled && results.objects.length > 0) {
        const objectList = results.objects
          .filter((obj) => obj.confidence > 0.6) // Only announce confident detections
          .slice(0, 5) // Limit to first 5 objects
          .map((obj) => (obj.count > 1 ? `${obj.count} ${obj.name}s` : obj.name))
          .join(", ")

        if (objectList && objectList !== lastAnnouncement) {
          // Always announce the full description for comprehensive feedback
          const announcement = results.description.length > 200 
            ? `Objects detected: ${objectList}` 
            : results.description
          onSpeak(announcement)
          setLastAnnouncement(objectList)
        }
      } else if (isEnabled && results.objects.length === 0) {
        if (lastAnnouncement !== "nothing detected") {
          onSpeak("No clear objects detected in the current view.")
          setLastAnnouncement("nothing detected")
        }
      }
    } catch (err: any) {
      console.error("Detection error:", err)
      // Don't announce errors during continuous detection to avoid spam
      if (err.message.includes("API error")) {
        // Fallback to simple detection if API fails
        setDetectionMethod("simple")
      }
    }
  }

  const handleManualDetection = async () => {
    if (detectionMethod === "upload") {
      // Handle file upload
      if (!fileInputRef.current?.files?.[0]) {
        setError("Please select an image file")
        return
      }

      setIsLoading(true)
      try {
        const file = fileInputRef.current.files[0]
        const formData = new FormData()
        formData.append("image", file)

        const response = await fetch("/api/analyze-image", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()

        const results: DetectionResult = {
          objects: data.objects || [],
          description: data.description || "No description available",
          method: "AI API (Upload)",
          apiUsed: data.apiUsed || "Unknown API",
        }

        setDetectionResults(results)

        if (results.objects.length > 0) {
          const objectList = results.objects
            .slice(0, 8) // More objects for manual detection
            .map((obj) => (obj.count > 1 ? `${obj.count} ${obj.name}s` : obj.name))
            .join(", ")
          
          // Always announce results for manual detection
          const announcement = results.description.length > 200 
            ? `Objects found: ${objectList}` 
            : results.description
          onSpeak(announcement)
        } else {
          onSpeak("No objects detected in this image.")
        }
      } catch (err: any) {
        setError(err.message)
        onSpeak("Failed to analyze the uploaded image.")
      } finally {
        setIsLoading(false)
      }
    } else {
      // Manual single detection for camera
      await performDetection()
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setError(null)
    } else {
      setError("Please select a valid image file")
    }
  }

  return (
    <Card className="glass-effect border-slate-700/50">
      <CardHeader>
        <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-400" />
          Continuous Object Detection
          {isDetecting && (
            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded animate-pulse">SCANNING</span>
          )}
          {detectionResults?.apiUsed && (
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded flex items-center gap-1">
              {detectionResults.apiUsed.includes("Grok") && <Zap className="w-3 h-3" />}
              {detectionResults.apiUsed}
            </span>
          )}
        </h3>
      </CardHeader>
      <CardContent className="p-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-red-300 text-sm">{error}</span>
                <Button
                  onClick={() => setError(null)}
                  size="sm"
                  className="mt-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Detection Method Selection */}
          <div className="space-y-3">
            <label className="text-slate-300 font-medium">Detection Method:</label>
            <Select
              value={detectionMethod}
              onValueChange={(value: any) => {
                setDetectionMethod(value)
                if (isDetecting && value !== "upload") {
                  // Restart detection with new method
                  stopContinuousDetection()
                  setTimeout(() => startContinuousDetection(), 1000)
                }
              }}
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="api" className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Grok 2 Vision (Best for continuous)
                  </div>
                </SelectItem>
                <SelectItem value="simple" className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-400" />
                    Simple Analysis (Fallback)
                  </div>
                </SelectItem>
                <SelectItem value="upload" className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-purple-400" />
                    Upload Image (Single scan)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scan Interval for continuous detection */}
          {detectionMethod !== "upload" && (
            <div className="space-y-3">
              <label className="text-slate-300 font-medium">Scan Interval:</label>
              <Select
                value={scanInterval.toString()}
                onValueChange={(value) => {
                  setScanInterval(Number.parseInt(value))
                  if (isDetecting) {
                    // Restart with new interval
                    stopContinuousDetection()
                    setTimeout(() => startContinuousDetection(), 1000)
                  }
                }}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="3" className="text-white hover:bg-slate-700">
                    Every 3 seconds (Fast)
                  </SelectItem>
                  <SelectItem value="5" className="text-white hover:bg-slate-700">
                    Every 5 seconds (Normal)
                  </SelectItem>
                  <SelectItem value="8" className="text-white hover:bg-slate-700">
                    Every 8 seconds (Slow)
                  </SelectItem>
                  <SelectItem value="10" className="text-white hover:bg-slate-700">
                    Every 10 seconds (Very slow)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Camera View or Upload */}
          {detectionMethod === "upload" ? (
            <div className="space-y-3">
              <label className="text-slate-300 font-medium">Select Image:</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative bg-slate-900 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  autoPlay
                  muted
                  playsInline
                  style={{ display: cameraStream ? "block" : "none" }}
                />
                {!cameraStream && (
                  <div className="w-full h-64 flex items-center justify-center bg-slate-800">
                    <div className="text-center text-slate-400">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Camera not active</p>
                      <p className="text-xs mt-1">Start camera for continuous detection</p>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning indicator overlay */}
                {isDetecting && cameraStream && (
                  <div className="absolute top-2 right-2 bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs animate-pulse flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Scanning...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {detectionMethod !== "upload" && (
              <Button
                onClick={cameraStream ? stopCamera : startCamera}
                disabled={isLoading}
                className={cn(
                  "h-12 text-lg font-semibold transition-all duration-300",
                  cameraStream
                    ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
                  "text-white",
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : cameraStream ? (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Stop Camera
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Start Camera
                  </>
                )}
              </Button>
            )}

            {detectionMethod !== "upload" && cameraStream && (
              <Button
                onClick={isDetecting ? stopContinuousDetection : startContinuousDetection}
                className={cn(
                  "h-12 text-lg font-semibold transition-all duration-300",
                  isDetecting
                    ? "bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
                    : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800",
                  "text-white",
                )}
              >
                {isDetecting ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause Scanning
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Scanning
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={handleManualDetection}
              disabled={isLoading || (!cameraStream && detectionMethod !== "upload")}
              className="h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5 mr-2" />
                  {detectionMethod === "upload" ? "Analyze Image" : "Scan Now"}
                </>
              )}
            </Button>
          </div>

          {/* Detection Results */}
          {detectionResults && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <h4 className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
                  Latest Detection Results:
                  {isDetecting && (
                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">LIVE</span>
                  )}
                  {detectionResults.apiUsed && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {detectionResults.apiUsed}
                    </span>
                  )}
                </h4>
                <p className="text-slate-200 mb-3">{detectionResults.description}</p>

                {detectionResults.objects.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-slate-300">Objects Found:</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {detectionResults.objects
                        .filter((obj) => obj.confidence > 0.4)
                        .map((obj, index) => (
                          <div key={index} className="p-2 rounded bg-slate-800/50 border border-slate-600/30">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-200 capitalize">{obj.name}</span>
                              <span className="text-xs text-slate-400">×{obj.count}</span>
                            </div>
                            <div className="text-xs text-slate-400">{Math.round(obj.confidence * 100)}% confidence</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Information */}
          <div className="text-xs text-slate-400 bg-slate-800/30 p-3 rounded-lg">
            <p className="font-medium text-slate-300 mb-1 flex items-center gap-1">
              <Zap className="w-4 h-4 text-yellow-400" />
              Powered by Grok 2 Vision 1212:
            </p>
            <ul className="space-y-1">
              <li>
                • 📹 <strong>Start Camera:</strong> Automatically begins continuous scanning
              </li>
              <li>
                • 🔍 <strong>Auto-Scan:</strong> Detects objects at your chosen interval
              </li>
              <li>
                • 🗣️ <strong>Voice Announcements:</strong> Calls out detected objects automatically
              </li>
              <li>
                • ⏸️ <strong>Pause/Resume:</strong> Control scanning without stopping camera
              </li>
              <li>
                • ⚡ <strong>Grok 2 Vision:</strong> Advanced AI object detection and scene understanding
              </li>
              <li>
                • 👁️ <strong>Simple Analysis:</strong> Fallback color/pattern detection
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
