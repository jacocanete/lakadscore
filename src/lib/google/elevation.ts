import type { LatLng } from "@/lib/types"
import { getEnv } from "@/lib/config/env"
import { haversineDistance } from "@/lib/scoring/decay"

const ELEVATION_API_URL =
  "https://maps.googleapis.com/maps/api/elevation/json"

type ElevationResponse = {
  results?: { elevation: number; location: { lat: number; lng: number } }[]
  status: string
}

/**
 * Sample elevation at points around the origin within a 200m radius.
 * Returns the maximum grade percentage found.
 */
export async function fetchMaxGrade(lat: number, lng: number): Promise<number> {
  const env = getEnv()
  const SAMPLE_RADIUS_METERS = 200
  const SAMPLES = 8

  // Generate sample points in a circle around the origin
  const points: LatLng[] = [{ lat, lng }]
  for (let i = 0; i < SAMPLES; i++) {
    const angle = (2 * Math.PI * i) / SAMPLES
    const dLat = (SAMPLE_RADIUS_METERS / 111_320) * Math.cos(angle)
    const dLng =
      (SAMPLE_RADIUS_METERS /
        (111_320 * Math.cos((lat * Math.PI) / 180))) *
      Math.sin(angle)
    points.push({ lat: lat + dLat, lng: lng + dLng })
  }

  const locations = points.map((p) => `${p.lat},${p.lng}`).join("|")
  const url = `${ELEVATION_API_URL}?locations=${encodeURIComponent(locations)}&key=${env.GOOGLE_MAPS_API_KEY}`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Elevation API error ${res.status}`)
  }

  const data: ElevationResponse = await res.json() as ElevationResponse
  if (data.status !== "OK" || !data.results || data.results.length < 2) {
    return 0
  }

  const originElevation = data.results[0].elevation
  let maxGrade = 0

  for (let i = 1; i < data.results.length; i++) {
    const sample = data.results[i]
    const elevDiff = Math.abs(sample.elevation - originElevation)
    const dist = haversineDistance(
      lat,
      lng,
      sample.location.lat,
      sample.location.lng
    )
    if (dist > 0) {
      const grade = (elevDiff / dist) * 100
      if (grade > maxGrade) maxGrade = grade
    }
  }

  return maxGrade
}
