"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Camera, CameraOff, Eye, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Detection {
  class: string
  score: number
  bbox: number[]
}

interface CameraDetectionProps {
  onSpeak: (text: string) => void
  isEnabled: boolean
}

export function CameraDetection({ onSpeak, isEnabled }: CameraDetectionProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [detections, setDetections] = useState<Detection[]>([])
  const [error, setError] = useState<string | null>(null)
  const [modelLoaded, setModelLoaded] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const modelRef = useRef<any>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load TensorFlow.js model
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Dynamically import TensorFlow.js to avoid SSR issues
        const tf = await import("@tensorflow/tfjs")
        await import("@tensorflow/tfjs-backend-webgl")
        const cocoSsd = await import("@tensorflow-models/coco-ssd")

        await tf.ready()
        const model = await cocoSsd.load()
        modelRef.current = model
        setModelLoaded(true)
        onSpeak("Object detection model loaded successfully")
      } catch (err) {
        console.error("Error loading model:", err)
        setError("Failed to load detection model")
        onSpeak("Error loading object detection model")
      }
    }

    loadModel()
  }, [onSpeak])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsDetecting(true)
        onSpeak("Camera started. Beginning object detection.")
        startDetection()
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("Failed to access camera")
      onSpeak("Error accessing camera. Please check permissions.")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setIsDetecting(false)
    setDetections([])
    onSpeak("Object detection stopped")
  }

  const startDetection = () => {
    if (!modelRef.current || !videoRef.current) return

    intervalRef.current = setInterval(async () => {
      if (videoRef.current && modelRef.current) {
        try {
          const predictions = await modelRef.current.detect(videoRef.current)
          setDetections(predictions)

          // Announce significant detections
          const significantDetections = predictions.filter((pred: Detection) => pred.score > 0.6)
          if (significantDetections.length > 0) {
            const announcement = significantDetections.map((pred: Detection) => `${pred.class} detected`).join(", ")

            // Only announce if different from last detection
            if (isEnabled) {
              onSpeak(announcement)
            }
          }
        } catch (err) {
          console.error("Detection error:", err)
        }
      }
    }, 2000) // Detect every 2 seconds
  }

  const drawDetections = () => {
    if (!canvasRef.current || !videoRef.current || detections.length === 0) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = "#00ff00"
    ctx.lineWidth = 2
    ctx.font = "16px Arial"
    ctx.fillStyle = "#00ff00"

    detections.forEach((detection: Detection) => {
      const [x, y, width, height] = detection.bbox
      ctx.strokeRect(x, y, width, height)
      ctx.fillText(`${detection.class} (${Math.round(detection.score * 100)}%)`, x, y > 20 ? y - 5 : y + 20)
    })
  }

  useEffect(() => {
    drawDetections()
  }, [detections])

  if (!modelLoaded) {
    return (
      <Card className="glass-effect border-slate-700/50">
        <CardHeader>
          <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-400" />
            Object Detection
          </h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading AI detection model...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-effect border-slate-700/50">
      <CardHeader>
        <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-400" />
          Real-Time Object Detection
        </h3>
      </CardHeader>
      <CardContent className="p-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-300">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <Button
            onClick={isDetecting ? stopCamera : startCamera}
            disabled={!modelLoaded}
            className={cn(
              "w-full h-12 text-lg font-semibold transition-all duration-300",
              isDetecting
                ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white",
            )}
          >
            {isDetecting ? (
              <>
                <CameraOff className="w-5 h-5 mr-2" />
                Stop Detection
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 mr-2" />
                Start Detection
              </>
            )}
          </Button>

          {isDetecting && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full rounded-lg bg-slate-800"
                style={{ maxHeight: "300px" }}
              />
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
            </div>
          )}

          {detections.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-200">Current Detections:</h4>
              <div className="space-y-1">
                {detections.map((detection, index) => (
                  <div key={index} className="p-2 rounded bg-slate-700/50 border border-slate-600/30 text-sm">
                    <span className="text-purple-300 font-medium">{detection.class}</span>
                    <span className="text-slate-400 ml-2">({Math.round(detection.score * 100)}% confidence)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
