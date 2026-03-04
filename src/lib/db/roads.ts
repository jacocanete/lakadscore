import { prisma } from "./client"

export type NearbyRoad = {
  name: string | null
  highway: string
  distanceMeters: number
}

export async function findNearbyRoads(
  lat: number,
  lng: number,
  radiusMeters: number = 500
): Promise<NearbyRoad[]> {
  const rows = await prisma.$queryRawUnsafe<
    { name: string | null; highway: string; distance_meters: number }[]
  >(
    `
    SELECT DISTINCT ON (highway)
      name,
      highway,
      ROUND(ST_Distance(
        geom::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      )::numeric, 1)::float as distance_meters
    FROM roads
    WHERE highway IN ('motorway', 'trunk', 'primary', 'secondary', 'tertiary')
      AND ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
    ORDER BY highway, ST_Distance(
      geom::geography,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
    )
    `,
    lng,
    lat,
    radiusMeters
  )

  return rows.map((r) => ({
    name: r.name,
    highway: r.highway,
    distanceMeters: r.distance_meters,
  }))
}

export type BikeRoadInfo = {
  highway: string
  distanceMeters: number
  count: number
}

/**
 * Counts roads by type within radius, with nearest distance per type.
 * Used by bike score to evaluate road infrastructure friendliness.
 */
export async function findBikeRoadInfo(
  lat: number,
  lng: number,
  radiusMeters: number = 800
): Promise<BikeRoadInfo[]> {
  const rows = await prisma.$queryRawUnsafe<
    { highway: string; distance_meters: number; count: string }[]
  >(
    `
    SELECT
      sub.highway,
      sub.min_dist::float as distance_meters,
      sub.cnt::text as count
    FROM (
      SELECT
        highway,
        MIN(ROUND(ST_Distance(
          geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        )::numeric, 1)) as min_dist,
        COUNT(*) as cnt
      FROM roads
      WHERE ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      GROUP BY highway
    ) sub
    ORDER BY sub.min_dist
    `,
    lng,
    lat,
    radiusMeters
  )

  return rows.map((r) => ({
    highway: r.highway,
    distanceMeters: r.distance_meters,
    count: parseInt(r.count, 10),
  }))
}
