import { NextResponse } from "next/server"

export async function GET() {
  try {
    const deepseekKey = process.env.OPENROUTER_DEEPSEEK_API_KEY
    const openaiKey = process.env.OPENROUTER_OPENAI_API_KEY
    const grokKey =
      process.env.GROK_VISION_API_KEY || "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"

    // Test DeepSeek API
    let deepseekWorking = false
    let deepseekError = ""

    if (deepseekKey) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${deepseekKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.VERCEL_URL || "http://localhost:3000",
            "X-Title": "AI Smart Assistant",
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-chat",
            messages: [{ role: "user", content: "test" }],
            max_tokens: 10,
          }),
        })

        if (response.ok) {
          deepseekWorking = true
        } else {
          deepseekError = `HTTP ${response.status}`
        }
      } catch (error: any) {
        deepseekError = error.message
      }
    }

    // Test OpenAI API for image analysis
    let openaiWorking = false
    let openaiError = ""

    if (openaiKey) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.VERCEL_URL || "http://localhost:3000",
            "X-Title": "AI Smart Assistant",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o",
            messages: [{ role: "user", content: "test" }],
            max_tokens: 10,
          }),
        })

        if (response.ok) {
          openaiWorking = true
        } else {
          openaiError = `HTTP ${response.status}`
        }
      } catch (error: any) {
        openaiError = error.message
      }
    }

    // Test Grok 2 Vision API for image analysis
    let grokWorking = false
    let grokError = ""

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${grokKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.VERCEL_URL || "http://localhost:3000",
          "X-Title": "AI Smart Assistant",
        },
        body: JSON.stringify({
          model: "x-ai/grok-2-vision-1212",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 10,
        }),
      })

      if (response.ok) {
        grokWorking = true
      } else {
        grokError = `HTTP ${response.status}`
      }
    } catch (error: any) {
      grokError = error.message
    }

    return NextResponse.json({
      deepseek_configured: !!deepseekKey,
      openai_configured: !!openaiKey,
      grok_configured: true,
      deepseek_working: deepseekWorking,
      openai_working: openaiWorking,
      grok_working: grokWorking,
      deepseek_key_preview: deepseekKey ? `${deepseekKey.substring(0, 8)}...` : "Not configured",
      openai_key_preview: openaiKey ? `${openaiKey.substring(0, 8)}...` : "Not configured",
      grok_key_preview: `${grokKey.substring(0, 8)}...`,
      deepseek_error: deepseekError,
      openai_error: openaiError,
      grok_error: grokError,
      imageAnalysis: grokWorking,
      chatAI: deepseekWorking,
    })
  } catch (error) {
    console.error("API test error:", error)
    return NextResponse.json(
      {
        error: "Failed to test API keys",
        deepseek_configured: false,
        openai_configured: false,
        grok_configured: true,
        imageAnalysis: false,
        chatAI: false,
      },
      { status: 500 },
    )
  }
}

export const runtime = "nodejs"
