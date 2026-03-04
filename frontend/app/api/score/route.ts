import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { computeScoreForLocation } from "@/lib/scoring/orchestrator"
import { checkRateLimit, checkExpensiveRateLimit } from "@/lib/cache/rate-limiter"
import { snapToGrid } from "@/lib/grid/snap"
import { getCachedScore } from "@/lib/db/score-cache"

const querySchema = z.object({
  lat: z.coerce
    .number()
    .min(4.5, "Latitude must be within the Philippines")
    .max(21.5, "Latitude must be within the Philippines"),
  lng: z.coerce
    .number()
    .min(116, "Longitude must be within the Philippines")
    .max(127, "Longitude must be within the Philippines"),
})

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous"

  const { allowed, remaining, resetAt } = checkRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(resetAt).toISOString(),
          "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        },
      }
    )
  }

  const params = request.nextUrl.searchParams
  const parsed = querySchema.safeParse({
    lat: params.get("lat"),
    lng: params.get("lng"),
  })

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }))
    return NextResponse.json({ error: "Invalid parameters", errors }, { status: 400 })
  }

  const { lat, lng } = parsed.data

  try {
    // Check cache first before burning the expensive budget
    const cell = snapToGrid(lat, lng)
    const cached = await getCachedScore(cell.id)

    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-Cache": "HIT",
        },
      })
    }

    // Cache miss — check the expensive rate limit
    const expensive = checkExpensiveRateLimit(ip)
    if (!expensive.allowed) {
      return NextResponse.json(
        { error: "Too many lookups for new locations. Try again in a minute." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60",
          },
        }
      )
    }

    const { result } = await computeScoreForLocation(lat, lng)

    return NextResponse.json(result, {
      headers: {
        "X-RateLimit-Remaining": String(remaining),
        "X-Cache": "MISS",
      },
    })
  } catch (err) {
    console.error("Score computation failed:", err)
    return NextResponse.json(
      { error: "Failed to compute score. Please try again." },
      { status: 500 }
    )
  }
}
