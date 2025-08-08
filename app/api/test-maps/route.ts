import { NextResponse } from "next/server"

interface ServiceTest {
  service: string
  configured: boolean
  working: boolean
  status: "success" | "error"
  message: string
  error?: string
}

async function testMapboxGeocoding(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/Lagos.json?access_token=${apiKey}&limit=1`,
    )
    return response.ok
  } catch {
    return false
  }
}

async function testMapboxDirections(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/walking/3.3792,6.5244;3.3947,6.4698?access_token=${apiKey}`,
    )
    return response.ok
  } catch {
    return false
  }
}

async function testHereGeocoding(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`https://geocode.search.hereapi.com/v1/geocode?q=Lagos&apikey=${apiKey}&limit=1`)
    return response.ok
  } catch {
    return false
  }
}

async function testHereDirections(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://router.hereapi.com/v8/routes?transportMode=pedestrian&origin=6.5244,3.3792&destination=6.4698,3.3947&apikey=${apiKey}`,
    )
    return response.ok
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const mapboxKey = process.env.MAPBOX_API_KEY
    const hereKey = process.env.HERE_MAP_API_KEY

    const services: ServiceTest[] = []

    // Test Mapbox
    if (mapboxKey) {
      const geocodingWorks = await testMapboxGeocoding(mapboxKey)
      const directionsWork = await testMapboxDirections(mapboxKey)
      const working = geocodingWorks && directionsWork

      services.push({
        service: "Mapbox",
        configured: true,
        working,
        status: working ? "success" : "error",
        message: working
          ? "Geocoding and directions working"
          : `Issues: ${!geocodingWorks ? "geocoding " : ""}${!directionsWork ? "directions" : ""}`,
        error: working ? undefined : "API calls failed",
      })
    } else {
      services.push({
        service: "Mapbox",
        configured: false,
        working: false,
        status: "error",
        message: "API key not configured",
        error: "Missing MAPBOX_API_KEY",
      })
    }

    // Test HERE Maps
    if (hereKey) {
      const geocodingWorks = await testHereGeocoding(hereKey)
      const directionsWork = await testHereDirections(hereKey)
      const working = geocodingWorks && directionsWork

      services.push({
        service: "HERE Maps",
        configured: true,
        working,
        status: working ? "success" : "error",
        message: working
          ? "Geocoding and directions working"
          : `Issues: ${!geocodingWorks ? "geocoding " : ""}${!directionsWork ? "directions" : ""}`,
        error: working ? undefined : "API calls failed",
      })
    } else {
      services.push({
        service: "HERE Maps",
        configured: false,
        working: false,
        status: "error",
        message: "API key not configured",
        error: "Missing HERE_MAP_API_KEY",
      })
    }

    const anyWorking = services.some((s) => s.working)
    const anyConfigured = services.some((s) => s.configured)

    let instructions = ""
    if (!anyConfigured) {
      instructions =
        "Configure at least one mapping service: Get API keys from Mapbox (mapbox.com) or HERE Maps (developer.here.com)"
    } else if (!anyWorking) {
      instructions = "Check your API keys - they may be invalid or have insufficient permissions"
    }

    return NextResponse.json({
      services,
      anyWorking,
      anyConfigured,
      instructions: instructions || undefined,
      mapbox: {
        configured: !!mapboxKey,
        working: services.find((s) => s.service === "Mapbox")?.working || false,
        error: services.find((s) => s.service === "Mapbox")?.error,
        provider: "Mapbox",
      },
      here: {
        configured: !!hereKey,
        working: services.find((s) => s.service === "HERE Maps")?.working || false,
        error: services.find((s) => s.service === "HERE Maps")?.error,
        provider: "HERE Maps",
      },
    })
  } catch (error) {
    console.error("Maps test error:", error)
    return NextResponse.json(
      {
        error: "Failed to test mapping services",
        services: [],
        anyWorking: false,
        anyConfigured: false,
      },
      { status: 500 },
    )
  }
}

export const runtime = "nodejs"
