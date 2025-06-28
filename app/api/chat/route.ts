import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Use the DeepSeek API key for chat
    const apiKey = process.env.OPENROUTER_DEEPSEEK_API_KEY
    if (!apiKey) {
      // Fallback to mock response if no API key
      const mockResponse = generateMockResponse(message)
      return NextResponse.json({ response: mockResponse })
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.VERCEL_URL || "http://localhost:3000",
        "X-Title": "AI Smart Assistant",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI assistant designed for visually impaired users. Provide clear, concise, and helpful responses. Be friendly and supportive. Keep responses conversational and easy to understand when spoken aloud. Limit responses to 2-3 sentences for better voice experience.",
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenRouter API error: ${response.status} - ${errorText}`)
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const assistantResponse = data.choices[0]?.message?.content || "I apologize, but I could not generate a response."

    return NextResponse.json({ response: assistantResponse })
  } catch (error) {
    console.error("Chat API error:", error)

    // Fallback to mock response on error
    const { message } = await request.json().catch(() => ({ message: "Hello" }))
    const mockResponse = generateMockResponse(message)
    return NextResponse.json({ response: mockResponse })
  }
}

function generateMockResponse(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
    return "Hello! I'm your AI assistant. How can I help you today?"
  }

  if (lowerMessage.includes("time")) {
    return `The current time is ${new Date().toLocaleTimeString()}.`
  }

  if (lowerMessage.includes("weather")) {
    return "I don't have access to real-time weather data, but I recommend checking your local weather app or website for current conditions."
  }

  if (lowerMessage.includes("help")) {
    return "I can help you with questions, analyze images you upload, and have conversations. Just speak naturally or upload an image for me to describe!"
  }

  if (lowerMessage.includes("thank")) {
    return "You're very welcome! I'm here to help whenever you need assistance."
  }

  return (
    'I understand you said: "' +
    message +
    "\". I'm here to help! You can ask me questions, request information, or upload images for me to analyze. What would you like to know?"
  )
}

export const maxDuration = 30
