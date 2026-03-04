import type { AmenityCategory, NearbyTransitStop, PlaceResult } from "@/lib/types"
import { AMENITY_CATEGORIES } from "@/lib/config/constants"
import { getEnv } from "@/lib/config/env"
import { haversineDistance } from "@/lib/scoring/decay"

const PLACES_API_URL =
  "https://places.googleapis.com/v1/places:searchNearby"

type NearbySearchResponse = {
  places?: {
    id: string
    displayName?: { text: string }
    location?: { latitude: number; longitude: number }
    types?: string[]
  }[]
}

async function searchNearby(
  lat: number,
  lng: number,
  includedTypes: string[],
  radiusMeters: number
): Promise<NearbySearchResponse> {
  const env = getEnv()

  const body = {
    includedTypes,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
    rankPreference: "DISTANCE",
  }

  const res = await fetch(PLACES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.location,places.types",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Places API error ${res.status}: ${text}`)
  }

  return res.json() as Promise<NearbySearchResponse>
}

const WALK_SPEED_METERS_PER_MIN = 80

function toPlaceResults(
  response: NearbySearchResponse,
  originLat: number,
  originLng: number
): PlaceResult[] {
  if (!response.places) return []

  return response.places
    .filter((p) => p.location)
    .map((p) => {
      const distanceMeters = haversineDistance(
        originLat,
        originLng,
        p.location!.latitude,
        p.location!.longitude
      )
      return {
        placeId: p.id,
        name: p.displayName?.text ?? "Unknown",
        location: {
          lat: p.location!.latitude,
          lng: p.location!.longitude,
        },
        types: p.types ?? [],
        distanceMeters,
        walkTimeMinutes: Math.round(distanceMeters / WALK_SPEED_METERS_PER_MIN),
      }
    })
}

export async function fetchAmenitiesByCategory(
  lat: number,
  lng: number
): Promise<Map<AmenityCategory, PlaceResult[]>> {
  const env = getEnv()
  const radius = env.MAX_AMENITY_RADIUS_METERS
  const result = new Map<AmenityCategory, PlaceResult[]>()

  const entries = Object.entries(AMENITY_CATEGORIES) as [
    AmenityCategory,
    string[],
  ][]

  // Fetch all categories in parallel
  const settled = await Promise.allSettled(
    entries.map(async ([category, types]) => {
      const response = await searchNearby(lat, lng, types, radius)
      const places = toPlaceResults(response, lat, lng)
      return { category, places }
    })
  )

  for (const s of settled) {
    if (s.status === "fulfilled") {
      result.set(s.value.category, s.value.places)
    } else {
      console.error("Places API category fetch failed:", s.reason)
    }
  }

  return result
}

const TRANSIT_STOP_TYPES = [
  "transit_station",
  "bus_station",
  "bus_stop",
  "light_rail_station",
  "subway_station",
  "train_station",
]

const TRANSIT_SEARCH_RADIUS_METERS = 1500

export async function fetchNearbyTransitStops(
  lat: number,
  lng: number
): Promise<NearbyTransitStop[]> {
  const response = await searchNearby(
    lat,
    lng,
    TRANSIT_STOP_TYPES,
    TRANSIT_SEARCH_RADIUS_METERS
  )
  const places = toPlaceResults(response, lat, lng)

  return places.map((p) => ({
    placeId: p.placeId,
    name: p.name,
    location: p.location,
    distanceMeters: p.distanceMeters,
    walkTimeMinutes: p.walkTimeMinutes,
    types: p.types,
  }))
}
