import { DECAY_THRESHOLDS } from "@/lib/config/constants"

/**
 * Polynomial distance decay — drops off faster near the threshold.
 *
 * Returns 1.0 from 0m to MAX_POINTS_DISTANCE, then decays to 0.0 at
 * ZERO_POINTS_DISTANCE using a quadratic curve. The exponent makes
 * nearby places much more valuable than distant ones.
 */
export function distanceDecay(distanceMeters: number): number {
  const { MAX_POINTS_DISTANCE_METERS, ZERO_POINTS_DISTANCE_METERS } =
    DECAY_THRESHOLDS

  if (distanceMeters <= MAX_POINTS_DISTANCE_METERS) return 1.0
  if (distanceMeters >= ZERO_POINTS_DISTANCE_METERS) return 0.0

  const range = ZERO_POINTS_DISTANCE_METERS - MAX_POINTS_DISTANCE_METERS
  const excess = distanceMeters - MAX_POINTS_DISTANCE_METERS
  const t = 1.0 - excess / range

  // Quadratic: drops off faster at the far end
  return t * t
}

/**
 * Haversine distance between two lat/lng points in meters.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
