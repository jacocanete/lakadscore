import type {
  HazardAssessment,
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
const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() - cachedToken.fetchedAt < TOKEN_TTL_MS) {
    return cachedToken.token
  }

  const res = await fetch(TOKEN_URL)
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

  const res = await fetch(`${serviceUrl}?${params}`)
  if (!res.ok) {
    throw new Error(`ArcGIS query failed: ${res.status}`)
  }

  const data = (await res.json()) as ArcGISQueryResponse

  if (data.error) {
    throw new Error(`ArcGIS error ${data.error.code}: ${data.error.message}`)
  }

  return data.features.length > 0 ? data.features[0] : null
}

export async function assessHazards(lat: number, lng: number): Promise<HazardAssessment> {
  const token = await getToken()

  const [floodResult, rilResult, stormSurgeResult] = await Promise.all([
    queryArcGIS(FLOOD_SERVICE, lng, lat, token),
    queryArcGIS(RIL_SERVICE, lng, lat, token),
    queryArcGIS(STORM_SURGE_SERVICE, lng, lat, token),
  ])

  const floodCode = floodResult?.attributes?.fscode as string | undefined
  const rilCode = rilResult?.attributes?.rilscode as string | undefined
  const ssCode = stormSurgeResult?.attributes?.inuncode as string | undefined

  return {
    location: { lat, lng },
    flood: {
      susceptibility: floodCode ? (FLOOD_CODES[floodCode] ?? null) : null,
      code: floodCode ?? null,
    },
    landslide: {
      susceptibility: rilCode ? (RIL_CODES[rilCode] ?? null) : null,
      code: rilCode ?? null,
    },
    stormSurge: {
      level: ssCode ? (STORM_SURGE_CODES[ssCode] ?? null) : null,
      code: ssCode ?? null,
    },
    assessedAt: new Date().toISOString(),
    source: "HazardHunterPH",
    dataProviders: {
      flood: "MGB",
      landslide: "MGB",
      stormSurge: "DOST-PAGASA",
    },
  }
}
