import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkRateLimit } from "@/lib/cache/rate-limiter"
import {
  createTransitRoute,
  getTransitRoutes,
  confirmTransitRoute,
} from "@/lib/db/transit-routes"

const transitRouteSchema = z.object({
  name: z.string().min(1).max(200),
  mode: z.enum(["jeepney", "uv_express", "tricycle", "bus", "train"]),
  waypoints: z
    .array(
      z.object({
        lat: z.number().min(4.5).max(21.5),
        lng: z.number().min(116).max(127),
      })
    )
    .min(2),
  fare: z.number().positive().nullable().optional(),
  operatingHours: z.string().max(100).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous"

  const { allowed, remaining } = checkRateLimit(`transit:${ip}`)

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

  const parsed = transitRouteSchema.safeParse(body)

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }))
    return NextResponse.json(
      { error: "Invalid transit route data", errors },
      { status: 400 }
    )
  }

  try {
    const route = await createTransitRoute(parsed.data)
    return NextResponse.json(
      { success: true, route },
      {
        status: 201,
        headers: { "X-RateLimit-Remaining": String(remaining) },
      }
    )
  } catch (err) {
    console.error("Failed to create transit route:", err)
    return NextResponse.json(
      { error: "Failed to save transit route." },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const mode = params.get("mode") as
    | "jeepney"
    | "uv_express"
    | "tricycle"
    | "bus"
    | "train"
    | null
  const status = params.get("status") as "pending" | "verified" | null

  try {
    const routes = await getTransitRoutes({
      ...(mode && { mode }),
      ...(status && { status }),
    })
    return NextResponse.json({ routes, total: routes.length })
  } catch (err) {
    console.error("Failed to fetch transit routes:", err)
    return NextResponse.json(
      { error: "Failed to fetch transit routes." },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const schema = z.object({ routeId: z.string().min(1) })
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "routeId is required" },
      { status: 400 }
    )
  }

  try {
    const route = await confirmTransitRoute(parsed.data.routeId)
    return NextResponse.json({ success: true, route })
  } catch (err) {
    console.error("Failed to confirm transit route:", err)
    return NextResponse.json(
      { error: "Failed to confirm transit route." },
      { status: 500 }
    )
  }
}
