import type { AmenityCategory, ScoreLabel } from "@/lib/types"

export const AMENITY_CATEGORIES: Record<AmenityCategory, string[]> = {
  grocery: ["grocery_store", "supermarket"],
  restaurant: ["restaurant"],
  school: ["school", "primary_school", "secondary_school", "university"],
  healthcare: ["hospital", "medical_clinic", "doctor"],
  pharmacy: ["pharmacy", "drugstore"],
  finance: ["bank", "atm"],
  convenience: ["convenience_store"],
  park: ["park", "playground"],
  worship: ["church", "mosque", "hindu_temple", "buddhist_temple"],
}

export const AMENITY_WEIGHTS: Record<AmenityCategory, number> = {
  grocery: 3,
  restaurant: 2,
  school: 2,
  healthcare: 3,
  pharmacy: 2,
  finance: 1,
  convenience: 2,
  park: 1.5,
  worship: 0.5,
}

export const DECAY_THRESHOLDS = {
  MAX_POINTS_DISTANCE_METERS: 400,
  ZERO_POINTS_DISTANCE_METERS: 2400,
} as const

export const SCORE_LABELS: { min: number; label: ScoreLabel }[] = [
  { min: 90, label: "Walker's Paradise" },
  { min: 70, label: "Very Walkable" },
  { min: 50, label: "Walkable" },
  { min: 25, label: "Somewhat Walkable" },
  { min: 0, label: "Car-Dependent" },
]


