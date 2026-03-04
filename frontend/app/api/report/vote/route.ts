import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkRateLimit } from "@/lib/cache/rate-limiter"
import { voteOnReport } from "@/lib/db/reports"

const voteSchema = z.object({
  reportId: z.string().min(1),
  isConfirm: z.boolean(),
})

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous"

  const { allowed } = checkRateLimit(`vote:${ip}`)

  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = voteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid vote data" },
      { status: 400 }
    )
  }

  try {
    // Use IP as a simple anonymous user ID
    const userId = `anon:${ip}`
    await voteOnReport(parsed.data.reportId, userId, parsed.data.isConfirm)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Failed to vote:", err)
    return NextResponse.json(
      { error: "Failed to save vote." },
      { status: 500 }
    )
  }
}
