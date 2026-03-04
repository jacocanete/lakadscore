import { NextResponse } from "next/server"
import { getCacheStats } from "@/lib/db/score-cache"
import { getReportStats } from "@/lib/db/reports"

export async function GET() {
  try {
    const [cache, reports] = await Promise.all([
      getCacheStats(),
      getReportStats(),
    ])

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      cache,
      reports,
    })
  } catch (err) {
    console.error("Health check failed:", err)
    return NextResponse.json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      error: "Database connection issue",
    }, { status: 503 })
  }
}
