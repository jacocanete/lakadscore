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
  walkTimeMinutes: number
}

export type CategoryScore = {
  category: AmenityCategory
  score: number
  nearestDistanceMeters: number | null
  placesFound: number
  places: PlaceResult[]
}

export type PedestrianFriendliness = {
  intersectionDensity: number
  avgBlockLengthMeters: number | null
  roadDensityKmPerSqKm: number
  modifier: number
}

export type LakadScore = {
  score: number
  label: string
  categories: CategoryScore[]
  pedestrianFriendliness: PedestrianFriendliness
}

export type NearbyTransitStop = {
  placeId: string
  name: string
  location: LatLng
  distanceMeters: number
  walkTimeMinutes: number
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

export type BikeInfraDetail = {
  cyclewayLengthMeters: number
  bikeLaneLengthMeters: number
  sharedLaneLengthMeters: number
}

export type BikeScore = {
  score: number
  label: string
  hillScore: number
  destinationScore: number
  roadScore: number
  infraScore: number
  nearbyRoads: BikeRoadDetail[]
  bikeInfra: BikeInfraDetail
}

export type NearbyReport = {
  id: string
  location: LatLng
  type: InfrastructureReportType
  description: string | null
  confirmations: number
  status: string
  distanceMeters: number
  createdAt: string
}

export type ScoreResult = {
  location: LatLng
  gridCellId: string
  lakadScore: LakadScore
  commuteScore: CommuteScore
  bikeScore: BikeScore
  nearbyReports: NearbyReport[]
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

export type FloodSusceptibility = "Low" | "Moderate" | "High" | "Very High" | null

export type LandslideSusceptibility =
  | "Debris Flow"
  | "Low"
  | "Moderate"
  | "High"
  | "Very High"
  | null

export type StormSurgeLevel = ">1m" | ">1m to 4m" | ">4m to 12m" | null

export type HazardAssessment = {
  location: LatLng
  flood: {
    susceptibility: FloodSusceptibility
    code: string | null
  }
  landslide: {
    susceptibility: LandslideSusceptibility
    code: string | null
  }
  stormSurge: {
    level: StormSurgeLevel
    code: string | null
  }
  assessedAt: string
  source: "HazardHunterPH"
  dataProviders: {
    flood: "MGB"
    landslide: "MGB"
    stormSurge: "DOST-PAGASA"
  }
}
