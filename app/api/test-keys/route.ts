import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const deepseekKey = process.env.OPENROUTER_DEEPSEEK_API_KEY
  const openaiKey = process.env.OPENROUTER_OPENAI_API_KEY

  return NextResponse.json({
    deepseek_configured: !!deepseekKey,
    openai_configured: !!openaiKey,
    deepseek_key_preview: deepseekKey ? `${deepseekKey.substring(0, 8)}...` : "Not configured",
    openai_key_preview: openaiKey ? `${openaiKey.substring(0, 8)}...` : "Not configured",
  })
}
