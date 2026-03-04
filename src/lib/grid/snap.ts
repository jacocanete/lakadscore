import type { GridCell } from "@/lib/types"
import { getEnv } from "@/lib/config/env"

/**
 * Snap a lat/lng to the nearest grid cell center.
 *
 * Grid resolution is configurable (default 100m).
 * At the equator, 1 degree latitude ~= 111,320m.
 * 1 degree longitude varies by latitude but we use a cos(lat) correction.
 */
export function snapToGrid(lat: number, lng: number): GridCell {
  const resolution = getEnv().GRID_RESOLUTION_METERS

  const latStep = resolution / 111_320
  const lngStep = resolution / (111_320 * Math.cos((lat * Math.PI) / 180))

  const snappedLat =
    Math.round(lat / latStep) * latStep
  const snappedLng =
    Math.round(lng / lngStep) * lngStep

  const roundedLat = Number(snappedLat.toFixed(6))
  const roundedLng = Number(snappedLng.toFixed(6))

  const id = `${roundedLat}:${roundedLng}:${resolution}`

  return {
    id,
    lat: roundedLat,
    lng: roundedLng,
    resolution,
  }
}
