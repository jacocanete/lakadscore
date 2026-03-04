import { z } from "zod"
import { getEnv } from "@/lib/config/env"
import { computeScoreForLocation } from "@/lib/scoring/orchestrator"
import { checkRateLimit, checkExpensiveRateLimit } from "@/lib/cache/rate-limiter"
import { snapToGrid } from "@/lib/grid/snap"
import { getCachedScore, getCacheStats } from "@/lib/db/score-cache"
import { createReport, getNearbyReports, voteOnReport, getReportStats } from "@/lib/db/reports"
import { createTransitRoute, getTransitRoutes, confirmTransitRoute } from "@/lib/db/transit-routes"
import { assessHazards } from "@/lib/hazard/client"
import type { ReportType } from "@/generated/prisma/client"

const env = getEnv()

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  })
}

function authenticate(req: Request): boolean {
  const bearer = req.headers.get("Authorization")?.replace("Bearer ", "")
  const xApiKey = req.headers.get("X-API-Key")
  const key = bearer ?? xApiKey
  return key === env.LAKADSCORE_API_KEY
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous"
}

async function parseJson(req: Request): Promise<{ data: unknown } | { error: Response }> {
  try {
    const data = await req.json()
    return { data }
  } catch {
    return { error: json({ error: "Invalid JSON body" }, 400) }
  }
}

// --- Route handlers ---

const scoreQuerySchema = z.object({
  lat: z.coerce
    .number()
    .min(4.5, "Latitude must be within the Philippines")
    .max(21.5, "Latitude must be within the Philippines"),
  lng: z.coerce
    .number()
    .min(116, "Longitude must be within the Philippines")
    .max(127, "Longitude must be within the Philippines"),
})

async function handleGetScore(req: Request): Promise<Response> {
  const ip = getClientIp(req)
  const { allowed, remaining, resetAt } = checkRateLimit(ip)

  if (!allowed) {
    return json(
      { error: "Rate limit exceeded. Try again later." },
      429,
      {
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": new Date(resetAt).toISOString(),
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
      }
    )
  }

  const url = new URL(req.url)
  const parsed = scoreQuerySchema.safeParse({
    lat: url.searchParams.get("lat"),
    lng: url.searchParams.get("lng"),
  })

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }))
    return json({ error: "Invalid parameters", errors }, 400)
  }

  const { lat, lng } = parsed.data

  try {
    const cell = snapToGrid(lat, lng)
    const cached = await getCachedScore(cell.id)

    if (cached) {
      return json(cached, 200, {
        "X-RateLimit-Remaining": String(remaining),
        "X-Cache": "HIT",
      })
    }

    const expensive = checkExpensiveRateLimit(ip)
    if (!expensive.allowed) {
      return json(
        { error: "Too many lookups for new locations. Try again in a minute." },
        429,
        { "X-RateLimit-Remaining": "0", "Retry-After": "60" }
      )
    }

    const { result } = await computeScoreForLocation(lat, lng)

    return json(result, 200, {
      "X-RateLimit-Remaining": String(remaining),
      "X-Cache": "MISS",
    })
  } catch (err) {
    console.error("Score computation failed:", err)
    return json({ error: "Failed to compute score. Please try again." }, 500)
  }
}

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

async function handlePostReport(req: Request): Promise<Response> {
  const ip = getClientIp(req)
  const { allowed, remaining } = checkRateLimit(`report:${ip}`)

  if (!allowed) {
    return json({ error: "Rate limit exceeded." }, 429)
  }

  const result = await parseJson(req)
  if ("error" in result) return result.error

  const parsed = reportSchema.safeParse(result.data)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }))
    return json({ error: "Invalid report data", errors }, 400)
  }

  try {
    const report = await createReport({
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      type: parsed.data.type as ReportType,
      description: parsed.data.description,
    })

    return json(
      { success: true, report },
      201,
      { "X-RateLimit-Remaining": String(remaining) }
    )
  } catch (err) {
    console.error("Failed to create report:", err)
    return json({ error: "Failed to save report." }, 500)
  }
}

async function handleGetReports(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const lat = parseFloat(url.searchParams.get("lat") ?? "")
  const lng = parseFloat(url.searchParams.get("lng") ?? "")
  const radiusKm = parseFloat(url.searchParams.get("radius_km") ?? "1")

  if (isNaN(lat) || isNaN(lng)) {
    return json({ error: "lat and lng are required" }, 400)
  }

  try {
    const reports = await getNearbyReports(lat, lng, radiusKm)
    return json({ reports, total: reports.length })
  } catch (err) {
    console.error("Failed to fetch reports:", err)
    return json({ error: "Failed to fetch reports." }, 500)
  }
}

const voteSchema = z.object({
  reportId: z.string().min(1),
  isConfirm: z.boolean(),
})

async function handlePostVote(req: Request): Promise<Response> {
  const ip = getClientIp(req)
  const { allowed } = checkRateLimit(`vote:${ip}`)

  if (!allowed) {
    return json({ error: "Rate limit exceeded." }, 429)
  }

  const result = await parseJson(req)
  if ("error" in result) return result.error

  const parsed = voteSchema.safeParse(result.data)
  if (!parsed.success) {
    return json({ error: "Invalid vote data" }, 400)
  }

  try {
    const userId = `anon:${ip}`
    await voteOnReport(parsed.data.reportId, userId, parsed.data.isConfirm)
    return json({ success: true })
  } catch (err) {
    console.error("Failed to vote:", err)
    return json({ error: "Failed to save vote." }, 500)
  }
}

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

async function handlePostTransitRoute(req: Request): Promise<Response> {
  const ip = getClientIp(req)
  const { allowed, remaining } = checkRateLimit(`transit:${ip}`)

  if (!allowed) {
    return json({ error: "Rate limit exceeded." }, 429)
  }

  const result = await parseJson(req)
  if ("error" in result) return result.error

  const parsed = transitRouteSchema.safeParse(result.data)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }))
    return json({ error: "Invalid transit route data", errors }, 400)
  }

  try {
    const route = await createTransitRoute(parsed.data)
    return json(
      { success: true, route },
      201,
      { "X-RateLimit-Remaining": String(remaining) }
    )
  } catch (err) {
    console.error("Failed to create transit route:", err)
    return json({ error: "Failed to save transit route." }, 500)
  }
}

async function handleGetTransitRoutes(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const mode = url.searchParams.get("mode") as
    | "jeepney"
    | "uv_express"
    | "tricycle"
    | "bus"
    | "train"
    | null
  const status = url.searchParams.get("status") as "pending" | "verified" | null

  try {
    const routes = await getTransitRoutes({
      ...(mode && { mode }),
      ...(status && { status }),
    })
    return json({ routes, total: routes.length })
  } catch (err) {
    console.error("Failed to fetch transit routes:", err)
    return json({ error: "Failed to fetch transit routes." }, 500)
  }
}

async function handlePatchTransitRoute(req: Request): Promise<Response> {
  const result = await parseJson(req)
  if ("error" in result) return result.error

  const schema = z.object({ routeId: z.string().min(1) })
  const parsed = schema.safeParse(result.data)

  if (!parsed.success) {
    return json({ error: "routeId is required" }, 400)
  }

  try {
    const route = await confirmTransitRoute(parsed.data.routeId)
    return json({ success: true, route })
  } catch (err) {
    console.error("Failed to confirm transit route:", err)
    return json({ error: "Failed to confirm transit route." }, 500)
  }
}

const hazardQuerySchema = z.object({
  lat: z.coerce
    .number()
    .min(4.5, "Latitude must be within the Philippines")
    .max(21.5, "Latitude must be within the Philippines"),
  lng: z.coerce
    .number()
    .min(116, "Longitude must be within the Philippines")
    .max(127, "Longitude must be within the Philippines"),
})

async function handleGetHazard(req: Request): Promise<Response> {
  const ip = getClientIp(req)
  const { allowed, remaining, resetAt } = checkRateLimit(ip)

  if (!allowed) {
    return json(
      { error: "Rate limit exceeded. Try again later." },
      429,
      {
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": new Date(resetAt).toISOString(),
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
      }
    )
  }

  const url = new URL(req.url)
  const parsed = hazardQuerySchema.safeParse({
    lat: url.searchParams.get("lat"),
    lng: url.searchParams.get("lng"),
  })

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }))
    return json({ error: "Invalid parameters", errors }, 400)
  }

  try {
    const assessment = await assessHazards(parsed.data.lat, parsed.data.lng)
    return json(assessment, 200, {
      "X-RateLimit-Remaining": String(remaining),
    })
  } catch (err) {
    console.error("Hazard assessment failed:", err)
    return json({ error: "Failed to assess hazards. Please try again." }, 500)
  }
}

async function handleHealth(): Promise<Response> {
  try {
    const [cache, reports] = await Promise.all([
      getCacheStats(),
      getReportStats(),
    ])

    return json({
      status: "ok",
      timestamp: new Date().toISOString(),
      cache,
      reports,
    })
  } catch (err) {
    console.error("Health check failed:", err)
    return json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        error: "Database connection issue",
      },
      503
    )
  }
}

// --- Router ---

type RouteHandler = (req: Request) => Promise<Response>

const routes: Record<string, Record<string, RouteHandler>> = {
  "/api/score": {
    GET: handleGetScore,
  },
  "/api/report": {
    GET: handleGetReports,
    POST: handlePostReport,
  },
  "/api/report/vote": {
    POST: handlePostVote,
  },
  "/api/transit-routes": {
    GET: handleGetTransitRoutes,
    POST: handlePostTransitRoute,
    PATCH: handlePatchTransitRoute,
  },
  "/api/hazard": {
    GET: handleGetHazard,
  },
  "/api/health": {
    GET: handleHealth,
  },
}

const server = Bun.serve({
  port: env.PORT,
  async fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
        },
      })
    }

    if (path !== "/api/health" && !authenticate(req)) {
      return json({ error: "Unauthorized" }, 401)
    }

    const route = routes[path]
    if (!route) {
      return json({ error: "Not found" }, 404)
    }

    const handler = route[req.method]
    if (!handler) {
      return json({ error: "Method not allowed" }, 405)
    }

    return handler(req)
  },
})

console.log(`LakadScore API running on http://localhost:${server.port}`)
