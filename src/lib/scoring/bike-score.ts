import type { BikeScore, BikeRoadDetail, PlaceResult, AmenityCategory } from "@/lib/types"
import type { BikeRoadInfo } from "@/lib/db/roads"

const MAX_GRADE_PERCENT = 10
const FLAT_GRADE_PERCENT = 2

function hillScore(maxGradePercent: number): number {
  if (maxGradePercent <= FLAT_GRADE_PERCENT) return 100
  if (maxGradePercent >= MAX_GRADE_PERCENT) return 0
  return (
    ((MAX_GRADE_PERCENT - maxGradePercent) /
      (MAX_GRADE_PERCENT - FLAT_GRADE_PERCENT)) *
    100
  )
}

// Higher = more bike-friendly
const ROAD_BIKE_FRIENDLINESS: Record<string, number> = {
  tertiary: 1.0,
  tertiary_link: 0.9,
  secondary: 0.6,
  secondary_link: 0.55,
  primary: 0.3,
  primary_link: 0.25,
  trunk: 0.05,
  trunk_link: 0.05,
  motorway: 0.0,
  motorway_link: 0.0,
}

/**
 * Score road infrastructure for bikeability.
 *
 * Considers:
 *  - What the nearest road type is (tertiary nearby = good, motorway only = bad)
 *  - Mix of road types within 800m (more tertiary/secondary = better)
 *  - Presence of dangerous roads very close (trunk/motorway < 100m = penalty)
 */
function roadInfraScore(roads: BikeRoadInfo[]): number {
  if (roads.length === 0) return 30

  // 1. Nearest road friendliness (0-40 pts)
  const nearest = roads[0]
  const nearestFriendliness = ROAD_BIKE_FRIENDLINESS[nearest.highway] ?? 0.3
  const nearestScore = nearestFriendliness * 40

  // 2. Road mix score (0-40 pts)
  // Weighted average of friendliness across all nearby road segments
  let totalSegments = 0
  let weightedFriendliness = 0
  for (const road of roads) {
    const friendliness = ROAD_BIKE_FRIENDLINESS[road.highway] ?? 0.3
    weightedFriendliness += friendliness * road.count
    totalSegments += road.count
  }
  const avgFriendliness = totalSegments > 0 ? weightedFriendliness / totalSegments : 0
  const mixScore = avgFriendliness * 40

  // 3. Danger penalty (0 to -20 pts)
  // If trunk or motorway is within 100m, penalize
  let dangerPenalty = 0
  for (const road of roads) {
    if (
      (road.highway === "motorway" || road.highway === "motorway_link") &&
      road.distanceMeters < 150
    ) {
      dangerPenalty = Math.max(dangerPenalty, 20)
    } else if (
      (road.highway === "trunk" || road.highway === "trunk_link") &&
      road.distanceMeters < 100
    ) {
      dangerPenalty = Math.max(dangerPenalty, 12)
    }
  }

  // 4. Density bonus (0-20 pts)
  // More road segments nearby = more route options
  const densityBonus = Math.min(totalSegments / 30, 1) * 20

  return Math.max(0, Math.min(100, nearestScore + mixScore + densityBonus - dangerPenalty))
}

function getLabel(score: number): string {
  if (score >= 90) return "Biker's Paradise"
  if (score >= 70) return "Very Bikeable"
  if (score >= 50) return "Bikeable"
  if (score >= 25) return "Somewhat Bikeable"
  return "Not Bikeable"
}

export function computeBikeScore(
  maxGradePercent: number,
  amenitiesByCategory: Map<AmenityCategory, PlaceResult[]>,
  bikeRoads: BikeRoadInfo[]
): BikeScore {
  const hill = hillScore(maxGradePercent)

  let categoriesWithNearby = 0
  const totalCategories = amenitiesByCategory.size || 1

  for (const places of amenitiesByCategory.values()) {
    const hasNearby = places.some((p) => p.distanceMeters <= 1000)
    if (hasNearby) categoriesWithNearby++
  }

  const destinationScore = (categoriesWithNearby / totalCategories) * 100
  const road = roadInfraScore(bikeRoads)

  // 30% hill, 30% destinations, 40% road infrastructure
  const rawScore = hill * 0.3 + destinationScore * 0.3 + road * 0.4
  const finalScore = Math.round(Math.min(Math.max(rawScore, 0), 100))

  const nearbyRoads: BikeRoadDetail[] = bikeRoads.map((r) => ({
    highway: r.highway,
    distanceMeters: r.distanceMeters,
    count: r.count,
  }))

  return {
    score: finalScore,
    label: getLabel(finalScore),
    hillScore: Math.round(hill),
    destinationScore: Math.round(destinationScore),
    roadScore: Math.round(road),
    nearbyRoads,
  }
}
