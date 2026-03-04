import type {
  HazardAssessment,
  HazardLayerResult,
  FloodSusceptibility,
  LandslideSusceptibility,
  StormSurgeLevel,
} from "@/lib/types"

const TOKEN_URL = "https://hazardhunter.georisk.gov.ph/get-token"
const MAP_SERVICE_BASE = "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services"

const FLOOD_SERVICE = `${MAP_SERVICE_BASE}/MGB/Flood/MapServer/0/query`
const RIL_SERVICE = `${MAP_SERVICE_BASE}/MGB/RainInducedLandslide/MapServer/0/query`
const STORM_SURGE_SERVICE = `${MAP_SERVICE_BASE}/PAGASA/StormSurge/MapServer/0/query`

const FLOOD_CODES: Record<string, FloodSusceptibility> = {
  "01": "Low",
  "02": "Moderate",
  "03": "High",
  "04": "Very High",
}

const RIL_CODES: Record<string, LandslideSusceptibility> = {
  "01": "Debris Flow",
  "02": "Low",
  "03": "Moderate",
  "04": "High",
  "05": "Very High",
}

const STORM_SURGE_CODES: Record<string, StormSurgeLevel> = {
  "01": ">1m",
  "02": ">1m to 4m",
  "04": ">4m to 12m",
}

let cachedToken: { token: string; fetchedAt: number } | null = null
const TOKEN_TTL_MS = 30 * 60 * 1000
const QUERY_TIMEOUT_MS = 10_000

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() - cachedToken.fetchedAt < TOKEN_TTL_MS) {
    return cachedToken.token
  }

  const res = await fetch(TOKEN_URL, { signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) })
  if (!res.ok) {
    throw new Error(`Failed to fetch HazardHunter token: ${res.status}`)
  }

  const data = (await res.json()) as { token: string; tokenNga: string }
  cachedToken = { token: data.token, fetchedAt: Date.now() }
  return data.token
}

type ArcGISFeature = {
  attributes: Record<string, unknown>
}

type ArcGISQueryResponse = {
  features: ArcGISFeature[]
  error?: { code: number; message: string }
}

async function queryArcGIS(
  serviceUrl: string,
  lng: number,
  lat: number,
  token: string,
): Promise<ArcGISFeature | null> {
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "false",
    outFields: "*",
    f: "json",
    token,
  })

  const res = await fetch(`${serviceUrl}?${params}`, {
    signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
  })
  if (!res.ok) {
    throw new Error(`ArcGIS query failed: ${res.status}`)
  }

  const data = (await res.json()) as ArcGISQueryResponse

  if (data.error) {
    throw new Error(`ArcGIS error ${data.error.code}: ${data.error.message}`)
  }

  return data.features.length > 0 ? data.features[0] : null
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export async function assessHazards(lat: number, lng: number): Promise<HazardAssessment> {
  let token: string
  try {
    token = await getToken()
  } catch (err) {
    const msg = `Token fetch failed: ${errorMessage(err)}`
    return {
      location: { lat, lng },
      flood: { data: null, error: msg },
      landslide: { data: null, error: msg },
      stormSurge: { data: null, error: msg },
      assessedAt: new Date().toISOString(),
      source: "HazardHunterPH",
      dataProviders: { flood: "MGB", landslide: "MGB", stormSurge: "DOST-PAGASA" },
    }
  }

  const [floodSettled, rilSettled, ssSettled] = await Promise.allSettled([
    queryArcGIS(FLOOD_SERVICE, lng, lat, token),
    queryArcGIS(RIL_SERVICE, lng, lat, token),
    queryArcGIS(STORM_SURGE_SERVICE, lng, lat, token),
  ])

  let flood: HazardLayerResult<{ susceptibility: FloodSusceptibility; code: string | null }>
  if (floodSettled.status === "fulfilled") {
    const code = floodSettled.value?.attributes?.fscode as string | undefined
    flood = { data: { susceptibility: code ? (FLOOD_CODES[code] ?? null) : null, code: code ?? null }, error: null }
  } else {
    flood = { data: null, error: errorMessage(floodSettled.reason) }
  }

  let landslide: HazardLayerResult<{ susceptibility: LandslideSusceptibility; code: string | null }>
  if (rilSettled.status === "fulfilled") {
    const code = rilSettled.value?.attributes?.rilscode as string | undefined
    landslide = { data: { susceptibility: code ? (RIL_CODES[code] ?? null) : null, code: code ?? null }, error: null }
  } else {
    landslide = { data: null, error: errorMessage(rilSettled.reason) }
  }

  let stormSurge: HazardLayerResult<{ susceptibility: StormSurgeLevel; code: string | null }>
  if (ssSettled.status === "fulfilled") {
    const code = ssSettled.value?.attributes?.inuncode as string | undefined
    stormSurge = { data: { susceptibility: code ? (STORM_SURGE_CODES[code] ?? null) : null, code: code ?? null }, error: null }
  } else {
    stormSurge = { data: null, error: errorMessage(ssSettled.reason) }
  }

  return {
    location: { lat, lng },
    flood,
    landslide,
    stormSurge,
    assessedAt: new Date().toISOString(),
    source: "HazardHunterPH",
    dataProviders: { flood: "MGB", landslide: "MGB", stormSurge: "DOST-PAGASA" },
  }
}
