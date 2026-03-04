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

// --- Pedestrian friendliness metrics ---

export type PedestrianMetrics = {
  intersectionCount: number
  avgBlockLengthMeters: number | null
  roadDensityKmPerSqKm: number
}

/**
 * Computes pedestrian-friendliness metrics from the road network:
 * - Intersection density: count of points where 3+ road segments meet
 * - Average block length: mean road segment length (shorter = more walkable)
 * - Road density: total road length per sq km (proxy for network completeness)
 *
 * All computed within a radius around the origin.
 */
export async function findPedestrianMetrics(
  lat: number,
  lng: number,
  radiusMeters: number = 500
): Promise<PedestrianMetrics> {
  const rows = await prisma.$queryRawUnsafe<
    {
      intersection_count: string
      avg_block_length: number | null
      total_road_length_m: number
    }[]
  >(
    `
    WITH nearby_roads AS (
      SELECT geom
      FROM roads
      WHERE highway IN (
        'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
        'residential', 'unclassified', 'living_street',
        'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'
      )
      AND ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
    ),
    endpoints AS (
      SELECT ST_StartPoint(geom) AS pt FROM nearby_roads
      UNION ALL
      SELECT ST_EndPoint(geom) AS pt FROM nearby_roads
    ),
    intersections AS (
      SELECT pt, COUNT(*) AS seg_count
      FROM endpoints
      GROUP BY pt
      HAVING COUNT(*) >= 3
    )
    SELECT
      (SELECT COUNT(*)::text FROM intersections) AS intersection_count,
      (SELECT ROUND(AVG(ST_Length(geom::geography))::numeric, 1)::float FROM nearby_roads) AS avg_block_length,
      (SELECT COALESCE(SUM(ST_Length(geom::geography)), 0)::float FROM nearby_roads) AS total_road_length_m
    `,
    lng,
    lat,
    radiusMeters
  )

  const row = rows[0]
  const intersectionCount = parseInt(row?.intersection_count ?? "0", 10)
  const avgBlockLength = row?.avg_block_length ?? null
  const totalRoadLengthM = row?.total_road_length_m ?? 0

  const areaKmSq = Math.PI * (radiusMeters / 1000) ** 2
  const roadDensityKmPerSqKm = areaKmSq > 0
    ? (totalRoadLengthM / 1000) / areaKmSq
    : 0

  return {
    intersectionCount,
    avgBlockLengthMeters: avgBlockLength,
    roadDensityKmPerSqKm: Math.round(roadDensityKmPerSqKm * 10) / 10,
  }
}

// --- Bike infrastructure from OSM tags ---

export type BikeInfraInfo = {
  cyclewayLengthMeters: number
  bikeLaneLengthMeters: number
  sharedLaneLengthMeters: number
}

/**
 * Queries OSM bike infrastructure within radius:
 * - Dedicated cycleways (highway=cycleway or highway=path with bicycle=designated)
 * - Bike lanes (cycleway=lane on a road)
 * - Shared infrastructure (cycleway=shared_lane/sharrow, or bicycle=yes on roads)
 *
 * Returns total length in meters for each category, with distance decay applied.
 */
export async function findBikeInfrastructure(
  lat: number,
  lng: number,
  radiusMeters: number = 1000
): Promise<BikeInfraInfo> {
  const rows = await prisma.$queryRawUnsafe<
    {
      infra_type: string
      total_length_m: number
    }[]
  >(
    `
    WITH nearby AS (
      SELECT
        highway,
        cycleway,
        bicycle,
        ST_Length(geom::geography) AS seg_length,
        ST_Distance(
          geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS dist
      FROM roads
      WHERE ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
    ),
    classified AS (
      SELECT
        seg_length,
        dist,
        CASE
          WHEN highway IN ('cycleway') THEN 'cycleway'
          WHEN highway = 'path' AND bicycle IN ('yes', 'designated') THEN 'cycleway'
          WHEN cycleway IN ('lane', 'track', 'opposite_lane', 'opposite_track') THEN 'bike_lane'
          WHEN cycleway IN ('shared_lane', 'sharrow') THEN 'shared'
          WHEN bicycle IN ('yes', 'designated') AND highway NOT IN ('cycleway', 'path') THEN 'shared'
          ELSE NULL
        END AS infra_type
      FROM nearby
    )
    SELECT
      infra_type,
      ROUND(SUM(
        seg_length * GREATEST(0, 1.0 - (dist / $3))
      )::numeric, 1)::float AS total_length_m
    FROM classified
    WHERE infra_type IS NOT NULL
    GROUP BY infra_type
    `,
    lng,
    lat,
    radiusMeters
  )

  let cyclewayLengthMeters = 0
  let bikeLaneLengthMeters = 0
  let sharedLaneLengthMeters = 0

  for (const row of rows) {
    switch (row.infra_type) {
      case "cycleway":
        cyclewayLengthMeters = row.total_length_m
        break
      case "bike_lane":
        bikeLaneLengthMeters = row.total_length_m
        break
      case "shared":
        sharedLaneLengthMeters = row.total_length_m
        break
    }
  }

  return {
    cyclewayLengthMeters,
    bikeLaneLengthMeters,
    sharedLaneLengthMeters,
  }
}
