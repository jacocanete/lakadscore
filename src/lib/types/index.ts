export type LatLng = {
  lat: number
  lng: number
}

export type GridCell = {
  id: string
  lat: number
  lng: number
  resolution: number
}

export type AmenityCategory =
  | "grocery"
  | "restaurant"
  | "school"
  | "healthcare"
  | "pharmacy"
  | "finance"
  | "convenience"
  | "park"
  | "worship"

export type PlaceResult = {
  placeId: string
  name: string
  location: LatLng
  types: string[]
  distanceMeters: number
}

export type CategoryScore = {
  category: AmenityCategory
  score: number
  nearestDistanceMeters: number | null
  placesFound: number
}

export type LakadScore = {
  score: number
  label: string
  categories: CategoryScore[]
  pedestrianModifier: number
}

export type NearbyTransitStop = {
  placeId: string
  name: string
  location: LatLng
  distanceMeters: number
  types: string[]
}

export type NearbyRoadInfo = {
  name: string | null
  highway: string
  distanceMeters: number
}

export type CommuteScore = {
  score: number
  label: string
  nearbyStops: NearbyTransitStop[]
  nearbyRoads: NearbyRoadInfo[]
  stopCounts: {
    within400m: number
    within800m: number
    within1500m: number
  }
  nearestStopMeters: number | null
  nearestMajorRoadMeters: number | null
}

export type BikeRoadDetail = {
  highway: string
  distanceMeters: number
  count: number
}

export type BikeScore = {
  score: number
  label: string
  hillScore: number
  destinationScore: number
  roadScore: number
  nearbyRoads: BikeRoadDetail[]
}

export type ScoreResult = {
  location: LatLng
  gridCellId: string
  lakadScore: LakadScore
  commuteScore: CommuteScore
  bikeScore: BikeScore
  computedAt: string
  expiresAt: string
}

export type ScoreLabel =
  | "Walker's Paradise"
  | "Very Walkable"
  | "Walkable"
  | "Somewhat Walkable"
  | "Car-Dependent"

export type InfrastructureReportType =
  | "sidewalk_good"
  | "sidewalk_poor"
  | "sidewalk_missing"
  | "crossing_marked"
  | "crossing_unmarked"
  | "street_light"
  | "no_street_light"
  | "flood_prone"
  | "construction_blocked"
  | "stray_animals"
  | "bike_lane"
  | "bike_friendly_road"
  | "dangerous_intersection"
  | "bike_parking"

export type InfrastructureReport = {
  id: string
  location: LatLng
  type: InfrastructureReportType
  description: string | null
  confirmations: number
  createdAt: string
  userId: string | null
}

export type TransitMode = "jeepney" | "uv_express" | "tricycle" | "bus" | "train"

export type TransitRoute = {
  id: string
  name: string
  mode: TransitMode
  waypoints: LatLng[]
  fare: number | null
  operatingHours: string | null
  confirmations: number
  createdAt: string
  userId: string | null
}

export type CachedScore = {
  gridCellId: string
  result: ScoreResult
  computedAt: Date
  expiresAt: Date
}
