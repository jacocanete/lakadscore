import { prisma } from "./client"
import type { AmenityCategory, PlaceResult } from "@/lib/types"

const WALK_SPEED_METERS_PER_MIN = 80
const MAX_RESULTS = 20

type AmenityRow = {
  node_id: bigint | null
  name: string | null
  subcategory: string | null
  lat: number
  lng: number
  distance_meters: number
}

export async function fetchOsmAmenities(
  lat: number,
  lng: number,
  category: AmenityCategory,
  radiusMeters: number
): Promise<PlaceResult[]> {
  const rows = await prisma.$queryRawUnsafe<AmenityRow[]>(
    `
    SELECT
      node_id,
      name,
      subcategory,
      ST_Y(geom) AS lat,
      ST_X(geom) AS lng,
      ST_Distance(
        geom::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) AS distance_meters
    FROM amenities
    WHERE category = $4
      AND ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
    ORDER BY distance_meters
    LIMIT $5
    `,
    lng,
    lat,
    radiusMeters,
    category,
    MAX_RESULTS
  )

  return rows.map((row) => {
    const distanceMeters = Number(row.distance_meters)
    return {
      placeId: row.node_id
        ? `osm:${row.node_id}`
        : `osm:${category}:${row.lat},${row.lng}`,
      name: row.name ?? "Unknown",
      location: { lat: row.lat, lng: row.lng },
      types: row.subcategory ? [row.subcategory] : [],
      distanceMeters,
      walkTimeMinutes: Math.round(distanceMeters / WALK_SPEED_METERS_PER_MIN),
    }
  })
}
