import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")

  if (action === "reverse-geocode" && lat && lng) {
    try {
      // Try Mapbox first
      const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY
      if (mapboxKey) {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxKey}&types=address,poi`,
        )

        if (response.ok) {
          const data = await response.json()
          const address = data.features?.[0]?.place_name || `${lat}, ${lng}`
          return NextResponse.json({ address })
        }
      }

      // Fallback to HERE Maps
      const hereKey = process.env.HERE_MAP_API_KEY
      if (hereKey) {
        const response = await fetch(
          `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat},${lng}&apikey=${hereKey}`,
        )

        if (response.ok) {
          const data = await response.json()
          const address = data.items?.[0]?.address?.label || `${lat}, ${lng}`
          return NextResponse.json({ address })
        }
      }

      // Final fallback
      return NextResponse.json({ address: `${lat}, ${lng}` })
    } catch (error) {
      console.error("Reverse geocoding error:", error)
      return NextResponse.json({ address: `${lat}, ${lng}` })
    }
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const { origin, destination, mode = "walking" } = await request.json()

    if (!origin || !destination) {
      return NextResponse.json({ error: "Origin and destination required" }, { status: 400 })
    }

    // Try Mapbox first
    const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY
    if (mapboxKey) {
      try {
        const mapboxResult = await getMapboxDirections(origin, destination, mode, mapboxKey)
        if (mapboxResult) {
          return NextResponse.json(mapboxResult)
        }
      } catch (error) {
        console.error("Mapbox error:", error)
      }
    }

    // Fallback to HERE Maps
    const hereKey = process.env.HERE_MAP_API_KEY
    if (hereKey) {
      try {
        const hereResult = await getHereDirections(origin, destination, mode, hereKey)
        if (hereResult) {
          return NextResponse.json(hereResult)
        }
      } catch (error) {
        console.error("HERE Maps error:", error)
      }
    }

    // Final fallback - mock response
    return NextResponse.json({
      distance: "Unknown distance",
      duration: "Unknown duration",
      instructions: [`Navigate from ${origin} to ${destination}`],
      provider: "fallback",
      error: "No mapping service available",
    })
  } catch (error) {
    console.error("Navigation API error:", error)
    return NextResponse.json({ error: "Navigation request failed" }, { status: 500 })
  }
}

async function getMapboxDirections(origin: string, destination: string, mode: string, apiKey: string) {
  // Convert mode to Mapbox profile
  const profile = mode === "driving" ? "driving" : mode === "cycling" ? "cycling" : "walking"

  // Geocode origin and destination first
  const [originCoords, destCoords] = await Promise.all([
    geocodeMapbox(origin, apiKey),
    geocodeMapbox(destination, apiKey),
  ])

  if (!originCoords || !destCoords) {
    throw new Error("Failed to geocode locations")
  }

  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${originCoords};${destCoords}?steps=true&geometries=geojson&access_token=${apiKey}`,
  )

  if (!response.ok) {
    throw new Error("Mapbox directions failed")
  }

  const data = await response.json()
  const route = data.routes?.[0]

  if (!route) {
    throw new Error("No route found")
  }

  return {
    distance: formatDistance(route.distance),
    duration: formatDuration(route.duration),
    instructions: route.legs?.[0]?.steps?.map((step: any) => step.maneuver?.instruction).filter(Boolean) || [],
    provider: "Mapbox",
  }
}

async function getHereDirections(origin: string, destination: string, mode: string, apiKey: string) {
  // Convert mode to HERE transport mode
  const transportMode = mode === "driving" ? "car" : mode === "cycling" ? "bicycle" : "pedestrian"

  // Geocode origin and destination first
  const [originCoords, destCoords] = await Promise.all([geocodeHere(origin, apiKey), geocodeHere(destination, apiKey)])

  if (!originCoords || !destCoords) {
    throw new Error("Failed to geocode locations")
  }

  const response = await fetch(
    `https://router.hereapi.com/v8/routes?transportMode=${transportMode}&origin=${originCoords}&destination=${destCoords}&return=summary,instructions&apikey=${apiKey}`,
  )

  if (!response.ok) {
    throw new Error("HERE Maps directions failed")
  }

  const data = await response.json()
  const route = data.routes?.[0]

  if (!route) {
    throw new Error("No route found")
  }

  return {
    distance: formatDistance(route.sections?.[0]?.summary?.length || 0),
    duration: formatDuration(route.sections?.[0]?.summary?.duration || 0),
    instructions: route.sections?.[0]?.instructions?.map((inst: any) => inst.text).filter(Boolean) || [],
    provider: "HERE Maps",
  }
}

async function geocodeMapbox(query: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${apiKey}&limit=1`,
    )

    if (!response.ok) return null

    const data = await response.json()
    const coords = data.features?.[0]?.center

    return coords ? `${coords[0]},${coords[1]}` : null
  } catch {
    return null
  }
}

async function geocodeHere(query: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(query)}&apikey=${apiKey}&limit=1`,
    )

    if (!response.ok) return null

    const data = await response.json()
    const position = data.items?.[0]?.position

    return position ? `${position.lat},${position.lng}` : null
  } catch {
    return null
  }
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} meters`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} minutes`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

export const runtime = "nodejs"
export const maxDuration = 30
