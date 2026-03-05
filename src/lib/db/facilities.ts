import { prisma } from "./client"
import type {
  EmergencyFacilityCategory,
  EmergencyFacilitySummary,
} from "@/lib/types"

const EMERGENCY_CATEGORIES: EmergencyFacilityCategory[] = [
  "police",
  "fire_station",
  "hospital",
]

const NEAREST_COUNT = 3

export async function findNearbyEmergencyFacilities(
  lat: number,
  lng: number,
  radiusMeters: number = 3000
): Promise<EmergencyFacilitySummary[]> {
  const rows = await prisma.$queryRawUnsafe<
    {
      category: string
      name: string | null
      dist: number
      rn: string
      cnt: string
    }[]
  >(
    `
    WITH nearby AS (
      SELECT
        category,
        name,
        ST_Distance(
          geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS dist
      FROM facilities
      WHERE category IN ('police', 'fire_station', 'hospital')
        AND ST_DWithin(
          geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
    ),
    ranked AS (
      SELECT
        category,
        name,
        ROUND(dist::numeric, 1)::float AS dist,
        ROW_NUMBER() OVER (PARTITION BY category ORDER BY dist) AS rn,
        COUNT(*) OVER (PARTITION BY category) AS cnt
      FROM nearby
    )
    SELECT
      category,
      name,
      dist,
      rn::text,
      cnt::text
    FROM ranked
    WHERE rn <= $4
    ORDER BY category, dist
    `,
    lng,
    lat,
    radiusMeters,
    NEAREST_COUNT
  )

  const grouped = new Map<
    string,
    { facilities: { name: string | null; dist: number }[]; count: number }
  >()

  for (const row of rows) {
    let entry = grouped.get(row.category)
    if (!entry) {
      entry = { facilities: [], count: parseInt(row.cnt, 10) }
      grouped.set(row.category, entry)
    }
    entry.facilities.push({ name: row.name, dist: row.dist })
  }

  return EMERGENCY_CATEGORIES.map((cat) => {
    const entry = grouped.get(cat)
    return {
      category: cat,
      nearest: entry
        ? entry.facilities.map((f) => ({
            category: cat,
            name: f.name,
            distanceMeters: f.dist,
          }))
        : [],
      countWithinRadius: entry?.count ?? 0,
    }
  })
}
