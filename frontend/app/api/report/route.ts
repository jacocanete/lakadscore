import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkRateLimit } from "@/lib/cache/rate-limiter"
import { createReport, getNearbyReports } from "@/lib/db/reports"
import type { ReportType } from "@/generated/prisma/client"

const reportSchema = z.object({
  lat: z.number().min(4.5).max(21.5),
  lng: z.number().min(116).max(127),
  type: z.enum([
    "sidewalk_good",
    "sidewalk_poor",
    "sidewalk_missing",
    "crossing_marked",
    "crossing_unmarked",
    "street_light",
    "no_street_light",
    "flood_prone",
    "construction_blocked",
    "stray_animals",
    "bike_lane",
    "bike_friendly_road",
    "dangerous_intersection",
    "bike_parking",
  ]),
  description: z.string().max(500).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous"

  const { allowed, remaining } = checkRateLimit(`report:${ip}`)

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

  const parsed = reportSchema.safeParse(body)

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }))
    return NextResponse.json(
      { error: "Invalid report data", errors },
      { status: 400 }
    )
  }

  try {
    const report = await createReport({
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      type: parsed.data.type as ReportType,
      description: parsed.data.description,
    })

    return NextResponse.json(
      { success: true, report },
      {
        status: 201,
        headers: { "X-RateLimit-Remaining": String(remaining) },
      }
    )
  } catch (err) {
    console.error("Failed to create report:", err)
    return NextResponse.json(
      { error: "Failed to save report." },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const lat = parseFloat(params.get("lat") ?? "")
  const lng = parseFloat(params.get("lng") ?? "")
  const radiusKm = parseFloat(params.get("radius_km") ?? "1")

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    )
  }

  try {
    const reports = await getNearbyReports(lat, lng, radiusKm)
    return NextResponse.json({ reports, total: reports.length })
  } catch (err) {
    console.error("Failed to fetch reports:", err)
    return NextResponse.json(
      { error: "Failed to fetch reports." },
      { status: 500 }
    )
  }
}
