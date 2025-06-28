import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 })
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const base64 = Buffer.from(bytes).toString("base64")
    const mimeType = image.type

    // Use the OpenAI API key for image analysis
    const apiKey = process.env.OPENROUTER_OPENAI_API_KEY
    if (!apiKey) {
      // Fallback to mock response if no API key
      const mockDescription = generateMockImageDescription(image.name, image.type)
      return NextResponse.json({ description: mockDescription })
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
        model: "openai/gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant helping visually impaired users. Describe images in detail, focusing on important visual elements, text, people, objects, colors, and context. Be descriptive but concise. Mention any text you can read in the image. Keep descriptions clear and easy to understand when spoken aloud.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please describe this image in detail for someone who cannot see it.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenRouter API error: ${response.status} - ${errorText}`)
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const description = data.choices[0]?.message?.content || "I could not analyze this image."

    return NextResponse.json({ description })
  } catch (error) {
    console.error("Image analysis error:", error)

    // Fallback to mock response on error
    const formData = await request.formData().catch(() => new FormData())
    const image = formData.get("image") as File
    const mockDescription = generateMockImageDescription(image?.name || "image", image?.type || "image")
    return NextResponse.json({ description: mockDescription })
  }
}

function generateMockImageDescription(filename: string, mimeType: string): string {
  const imageType = mimeType.split("/")[1] || "unknown"

  return `I can see you've uploaded an image file named "${filename}" in ${imageType.toUpperCase()} format. Since I don't have access to the image analysis API right now, I cannot provide a detailed description. To enable full image analysis, please configure the OPENROUTER_OPENAI_API_KEY environment variable with your OpenRouter API key. The image appears to have been uploaded successfully and is ready for analysis once the API is configured.`
}

export const runtime = "nodejs"
export const maxDuration = 30
