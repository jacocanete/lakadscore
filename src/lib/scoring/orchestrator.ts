import type { ScoreResult } from "@/lib/types"
import { snapToGrid } from "@/lib/grid/snap"
import { getCachedScore, setCachedScore } from "@/lib/db/score-cache"
import {
  fetchAmenitiesByCategory,
  fetchNearbyTransitStops,
} from "@/lib/google/places"
import { fetchMaxGrade } from "@/lib/google/elevation"
import { findNearbyRoads, findBikeRoadInfo } from "@/lib/db/roads"
import { computeLakadScore } from "./lakad-score"
import { computeCommuteScore } from "./commute-score"
import { computeBikeScore } from "./bike-score"
import { getEnv } from "@/lib/config/env"

export type ScoreComputeResult = {
  result: ScoreResult
  cached: boolean
}

export async function computeScoreForLocation(
  lat: number,
  lng: number
): Promise<ScoreComputeResult> {
  const cell = snapToGrid(lat, lng)

  const cached = await getCachedScore(cell.id)
  if (cached) return { result: cached, cached: true }

  const [amenities, transitStops, maxGrade, nearbyRoads, bikeRoads] =
    await Promise.all([
      fetchAmenitiesByCategory(cell.lat, cell.lng),
      fetchNearbyTransitStops(cell.lat, cell.lng),
      fetchMaxGrade(cell.lat, cell.lng),
      findNearbyRoads(cell.lat, cell.lng),
      findBikeRoadInfo(cell.lat, cell.lng),
    ])

  const lakadScore = computeLakadScore(amenities)
  const commuteScore = computeCommuteScore(transitStops, nearbyRoads)
  const bikeScore = computeBikeScore(maxGrade, amenities, bikeRoads)

  const env = getEnv()
  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + env.SCORE_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
  )

  const result: ScoreResult = {
    location: { lat: cell.lat, lng: cell.lng },
    gridCellId: cell.id,
    lakadScore,
    commuteScore,
    bikeScore,
    computedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }

  await setCachedScore(cell.id, cell.lat, cell.lng, cell.resolution, result)

  return { result, cached: false }
}
