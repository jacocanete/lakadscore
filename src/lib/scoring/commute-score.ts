import type { CommuteScore, NearbyTransitStop, NearbyRoadInfo } from "@/lib/types"
import { distanceDecay } from "./decay"
import type { NearbyRoad } from "@/lib/db/roads"

const DISTANCE_TIERS = {
  CLOSE: 400,
  MEDIUM: 800,
  FAR: 1500,
} as const

// Jeepney likelihood by road class
const ROAD_TRANSIT_WEIGHT: Record<string, number> = {
  motorway: 0,    // expressways — no jeepneys
  trunk: 1.0,     // national highways — very high jeepney presence
  primary: 1.0,   // major city roads — very high
  secondary: 0.7, // secondary roads — frequent
  tertiary: 0.4,  // neighborhood connectors — occasional
}

function getLabel(score: number): string {
  if (score >= 90) return "Excellent Transit"
  if (score >= 70) return "Great Transit"
  if (score >= 50) return "Some Transit"
  if (score >= 25) return "Minimal Transit"
  return "No Transit"
}

export function computeCommuteScore(
  stops: NearbyTransitStop[],
  roads: NearbyRoad[]
): CommuteScore {
  const sorted = [...stops].sort(
    (a, b) => a.distanceMeters - b.distanceMeters
  )
  const nearestStopMeters = sorted.length > 0 ? sorted[0].distanceMeters : null

  const within400m = stops.filter(
    (s) => s.distanceMeters <= DISTANCE_TIERS.CLOSE
  )
  const within800m = stops.filter(
    (s) => s.distanceMeters <= DISTANCE_TIERS.MEDIUM
  )
  const within1500m = stops.filter(
    (s) => s.distanceMeters <= DISTANCE_TIERS.FAR
  )

  // --- Transit stop score (formal stops from Google) ---
  let stopScore = 0
  if (nearestStopMeters !== null) {
    const proximityScore = distanceDecay(nearestStopMeters)
    const densityScore = Math.min(
      within400m.length * 0.15 +
        within800m.length * 0.08 +
        within1500m.length * 0.03,
      1.0
    )
    const hasRail = stops.some((s) =>
      s.types.some((t) =>
        ["light_rail_station", "subway_station", "train_station"].includes(t)
      )
    )
    stopScore = proximityScore * 0.6 + densityScore * 0.4 + (hasRail ? 0.15 : 0)
    stopScore = Math.min(stopScore, 1.0)
  }

  // --- Road proximity score (jeepney/bus accessibility via OSM roads) ---
  let roadScore = 0
  let nearestMajorRoadMeters: number | null = null

  const transitRoads = roads.filter(
    (r) => (ROAD_TRANSIT_WEIGHT[r.highway] ?? 0) > 0
  )

  if (transitRoads.length > 0) {
    const nearest = transitRoads.reduce((a, b) =>
      a.distanceMeters < b.distanceMeters ? a : b
    )
    nearestMajorRoadMeters = Math.round(nearest.distanceMeters)

    for (const road of transitRoads) {
      const weight = ROAD_TRANSIT_WEIGHT[road.highway] ?? 0
      const proximity = distanceDecay(road.distanceMeters)
      roadScore = Math.max(roadScore, proximity * weight)
    }
  }

  // --- Combined score ---
  // Road proximity is weighted higher because it captures informal transit
  // that Google doesn't know about (jeepneys, UV express)
  const rawScore = Math.min(
    stopScore * 0.35 + roadScore * 0.65,
    1.0
  )
  const finalScore = Math.round(rawScore * 100)

  const nearbyRoads: NearbyRoadInfo[] = roads.map((r) => ({
    name: r.name,
    highway: r.highway,
    distanceMeters: r.distanceMeters,
  }))

  return {
    score: finalScore,
    label: getLabel(finalScore),
    nearbyStops: sorted,
    nearbyRoads,
    stopCounts: {
      within400m: within400m.length,
      within800m: within800m.length,
      within1500m: within1500m.length,
    },
    nearestStopMeters: nearestStopMeters ? Math.round(nearestStopMeters) : null,
    nearestMajorRoadMeters,
  }
}
