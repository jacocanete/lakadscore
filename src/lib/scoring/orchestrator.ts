import type { ScoreResult } from "@/lib/types"
import { snapToGrid } from "@/lib/grid/snap"
import { getCachedScore, setCachedScore } from "@/lib/db/score-cache"
import {
  fetchAmenitiesByCategory,
  fetchNearbyTransitStops,
} from "@/lib/google/places"
import { fetchMaxGrade } from "@/lib/google/elevation"
import {
  findNearbyRoads,
  findBikeRoadInfo,
  findPedestrianMetrics,
  findBikeInfrastructure,
} from "@/lib/db/roads"
import { getNearbyReportsForScore } from "@/lib/db/reports"
import { computeLakadScore } from "./lakad-score"
import { computeCommuteScore } from "./commute-score"
import { computeBikeScore } from "./bike-score"
import { getEnv } from "@/lib/config/env"
import { Semaphore, InflightDedup } from "@/lib/cache/concurrency"

export type ScoreComputeResult = {
  result: ScoreResult
  cached: boolean
}

const env = getEnv()
const computeSemaphore = new Semaphore(env.MAX_CONCURRENT_SCORE_COMPUTATIONS)
const inflightScores = new InflightDedup<ScoreComputeResult>()

export { computeSemaphore, inflightScores }

export async function computeScoreForLocation(
  lat: number,
  lng: number
): Promise<ScoreComputeResult> {
  const cell = snapToGrid(lat, lng)

  const cached = await getCachedScore(cell.id)
  if (cached) return { result: cached, cached: true }

  return inflightScores.run(cell.id, () => computeScoreThrottled(cell))
}

async function computeScoreThrottled(cell: {
  id: string
  lat: number
  lng: number
  resolution: number
}): Promise<ScoreComputeResult> {
  await computeSemaphore.acquire()
  try {
    // Re-check cache — another request may have populated it while we waited
    const cached = await getCachedScore(cell.id)
    if (cached) return { result: cached, cached: true }

    const [amenities, transitStops, maxGrade, nearbyRoads, bikeRoads, pedestrianMetrics, bikeInfra, nearbyReports] =
      await Promise.all([
        fetchAmenitiesByCategory(cell.lat, cell.lng),
        fetchNearbyTransitStops(cell.lat, cell.lng),
        fetchMaxGrade(cell.lat, cell.lng),
        findNearbyRoads(cell.lat, cell.lng),
        findBikeRoadInfo(cell.lat, cell.lng),
        findPedestrianMetrics(cell.lat, cell.lng),
        findBikeInfrastructure(cell.lat, cell.lng),
        getNearbyReportsForScore(cell.lat, cell.lng),
      ])

    const lakadScore = computeLakadScore(amenities, pedestrianMetrics)
    const commuteScore = computeCommuteScore(transitStops, nearbyRoads)
    const bikeScore = computeBikeScore(maxGrade, amenities, bikeRoads, bikeInfra)

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
      nearbyReports,
      computedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }

    await setCachedScore(cell.id, cell.lat, cell.lng, cell.resolution, result)

    return { result, cached: false }
  } finally {
    computeSemaphore.release()
  }
}
