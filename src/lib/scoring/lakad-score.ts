import type {
  AmenityCategory,
  CategoryScore,
  LakadScore,
  PedestrianFriendliness,
  PlaceResult,
} from "@/lib/types"
import type { PedestrianMetrics } from "@/lib/db/roads"
import {
  AMENITY_CATEGORIES,
  AMENITY_WEIGHTS,
  SCORE_LABELS,
} from "@/lib/config/constants"
import { distanceDecay } from "./decay"

/**
 * Distance bands for counting places. Each band has a weight reflecting
 * how valuable having places at that distance is for walkability.
 */
const DISTANCE_BANDS = [
  { maxMeters: 400, weight: 1.0 },   // 5-min walk — full value
  { maxMeters: 800, weight: 0.6 },   // 10-min walk
  { maxMeters: 1200, weight: 0.3 },  // 15-min walk
  { maxMeters: 2400, weight: 0.1 },  // 30-min walk — marginal
] as const

/**
 * Score a single amenity category.
 *
 * Components:
 *  - Proximity (50%): decay-weighted score of the nearest place
 *  - Density (35%): how many places exist across distance bands
 *  - Choice (15%): having multiple close options (within 800m)
 */
function scoreCategory(places: PlaceResult[]): {
  score: number
  nearestDistance: number | null
} {
  if (places.length === 0) return { score: 0, nearestDistance: null }

  const sorted = [...places].sort(
    (a, b) => a.distanceMeters - b.distanceMeters
  )
  const nearest = sorted[0]

  // Proximity: how close is the nearest one? (0.0 - 1.0)
  const proximityScore = distanceDecay(nearest.distanceMeters)

  // Density: count places in each distance band, weighted
  let densityRaw = 0
  for (const place of sorted) {
    for (const band of DISTANCE_BANDS) {
      if (place.distanceMeters <= band.maxMeters) {
        densityRaw += band.weight
        break
      }
    }
  }
  // Normalize: 5+ weighted places = max density score
  // With 20 max results, a really dense area might hit 15-20 weighted count.
  // We use a log curve so going from 1→3 matters more than 10→15.
  const densityScore = Math.min(Math.log2(densityRaw + 1) / Math.log2(6), 1.0)

  // Choice: how many options within a comfortable walk (800m)?
  const closeOptions = sorted.filter((p) => p.distanceMeters <= 800).length
  // Having 3+ close options is a full choice score
  const choiceScore = Math.min(closeOptions / 3, 1.0)

  const raw = proximityScore * 0.5 + densityScore * 0.35 + choiceScore * 0.15

  return { score: Math.min(raw, 1.0), nearestDistance: nearest.distanceMeters }
}

function getLabel(score: number): LakadScore["label"] {
  for (const { min, label } of SCORE_LABELS) {
    if (score >= min) return label
  }
  return "Car-Dependent"
}

/**
 * Compute a pedestrian friendliness modifier from road network metrics.
 *
 * Based on WalkScore's approach: intersection density, block length, and
 * road network density all influence how walkable an area actually is.
 *
 * Returns a modifier between 0.6 and 1.15:
 *  - Dense grid with short blocks and many intersections: up to 1.15
 *  - Sparse suburban layout with long blocks: down to 0.6
 */
function computePedestrianModifier(metrics: PedestrianMetrics): PedestrianFriendliness {
  // Intersection density score (0-1)
  // 15+ intersections within 500m radius = excellent walkable grid
  const intersectionScore = Math.min(metrics.intersectionCount / 15, 1.0)

  // Block length score (0-1)
  // Shorter blocks = more walkable. 80m avg = perfect, 300m+ = poor
  let blockScore = 0.5
  if (metrics.avgBlockLengthMeters !== null) {
    if (metrics.avgBlockLengthMeters <= 80) {
      blockScore = 1.0
    } else if (metrics.avgBlockLengthMeters >= 300) {
      blockScore = 0.0
    } else {
      blockScore = 1.0 - (metrics.avgBlockLengthMeters - 80) / 220
    }
  }

  // Road density score (0-1)
  // 30+ km/sq km = dense urban grid, <5 = very sparse
  const densityScore = Math.min(metrics.roadDensityKmPerSqKm / 30, 1.0)

  // Weighted combination: intersection density matters most
  const raw = intersectionScore * 0.45 + blockScore * 0.30 + densityScore * 0.25

  // Map to modifier range: 0.6 (worst) to 1.15 (best)
  const modifier = 0.6 + raw * 0.55

  return {
    intersectionDensity: metrics.intersectionCount,
    avgBlockLengthMeters: metrics.avgBlockLengthMeters,
    roadDensityKmPerSqKm: metrics.roadDensityKmPerSqKm,
    modifier: Math.round(modifier * 1000) / 1000,
  }
}

/**
 * Compute the LakadScore (walk score).
 *
 * Three-phase scoring:
 *  1. Per-category weighted scores (proximity + density + choice)
 *  2. Coverage breadth bonus/penalty
 *  3. Pedestrian friendliness modifier (intersection density, block length, road density)
 */
export function computeLakadScore(
  amenitiesByCategory: Map<AmenityCategory, PlaceResult[]>,
  pedestrianMetrics: PedestrianMetrics
): LakadScore {
  const categories: CategoryScore[] = []
  let weightedSum = 0
  let totalWeight = 0
  let coveredCategories = 0

  for (const [category] of Object.entries(AMENITY_CATEGORIES)) {
    const cat = category as AmenityCategory
    const places = amenitiesByCategory.get(cat) ?? []
    const weight = AMENITY_WEIGHTS[cat]

    const { score, nearestDistance } = scoreCategory(places)

    if (places.length > 0) coveredCategories++

    categories.push({
      category: cat,
      score: Math.round(score * 100),
      nearestDistanceMeters: nearestDistance,
      placesFound: places.length,
      places,
    })

    weightedSum += score * weight
    totalWeight += weight
  }

  const totalCategories = Object.keys(AMENITY_CATEGORIES).length
  const baseScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0

  const coverageRatio = coveredCategories / totalCategories
  let coverageModifier = 1.0
  if (coverageRatio >= 0.85) {
    coverageModifier = 1.0 + (coverageRatio - 0.85) * 0.5
  } else if (coverageRatio < 0.55) {
    coverageModifier = 0.9 + coverageRatio * 0.18
  }

  const pedestrianFriendliness = computePedestrianModifier(pedestrianMetrics)

  const adjustedScore = Math.round(
    Math.min(baseScore * pedestrianFriendliness.modifier * coverageModifier, 100)
  )

  return {
    score: adjustedScore,
    label: getLabel(adjustedScore),
    categories,
    pedestrianFriendliness,
  }
}
