import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Generate contextual response based on navigation state
    const reply = generateNavigationResponse(message, context)

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("Navigation chat error:", error)
    return NextResponse.json({ error: "Failed to process navigation chat" }, { status: 500 })
  }
}

function generateNavigationResponse(message: string, context: any) {
  const lowerMessage = message.toLowerCase()

  // Navigation status questions
  if (lowerMessage.includes("how much further") || lowerMessage.includes("how far")) {
    if (context.isNavigating && context.destination) {
      return `You're heading to ${context.destination}. I'll check the remaining distance for you.`
    }
    return "You're not currently navigating. Would you like directions somewhere?"
  }

  if (lowerMessage.includes("am i going") || lowerMessage.includes("right way")) {
    if (context.isNavigating) {
      return "Yes, you're on the right track. Continue following the current direction."
    }
    return "You're not currently navigating. Start navigation to get directions."
  }

  if (lowerMessage.includes("where am i") || lowerMessage.includes("current location")) {
    if (context.currentLocation) {
      return `You're currently at ${context.currentLocation.address || "your detected location"}.`
    }
    return "I'm trying to detect your location. Please allow location access."
  }

  if (lowerMessage.includes("repeat") || lowerMessage.includes("say again")) {
    return "I'll repeat the current direction for you."
  }

  if (lowerMessage.includes("next") || lowerMessage.includes("continue")) {
    return "Moving to the next direction."
  }

  if (lowerMessage.includes("stop") || lowerMessage.includes("cancel")) {
    return "Stopping navigation. Let me know if you need directions elsewhere."
  }

  // Help and guidance
  if (lowerMessage.includes("help") || lowerMessage.includes("what can")) {
    return "I can help with navigation, give directions, repeat instructions, and answer questions about your route. Just ask!"
  }

  if (lowerMessage.includes("lost") || lowerMessage.includes("confused")) {
    return "Don't worry! Let me help you get back on track. Would you like me to recalculate your route?"
  }

  // Transport mode questions
  if (lowerMessage.includes("walking") || lowerMessage.includes("driving") || lowerMessage.includes("cycling")) {
    const mode = context.transportMode || "walking"
    return `You're currently set to ${mode} mode. I can change this if you'd like different directions.`
  }

  // Time and distance estimates
  if (lowerMessage.includes("how long") || lowerMessage.includes("time")) {
    if (context.isNavigating) {
      return "Let me check the estimated time remaining for your current route."
    }
    return "Start navigation to get time estimates for your journey."
  }

  // Safety and accessibility
  if (lowerMessage.includes("safe") || lowerMessage.includes("accessible")) {
    return "I prioritize safe, accessible routes with proper sidewalks and crosswalks for walking directions."
  }

  // Default helpful response
  return "I'm here to help with your navigation. You can ask me about directions, your current location, remaining distance, or any other navigation questions."
}
