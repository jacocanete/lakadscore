export type ReportTypeConfig = {
  label: string
  group: "walking" | "cycling" | "safety"
}

export const REPORT_TYPE_CONFIG: Record<string, ReportTypeConfig> = {
  sidewalk_good: { label: "Good sidewalk", group: "walking" },
  sidewalk_poor: { label: "Poor sidewalk", group: "walking" },
  sidewalk_missing: { label: "No sidewalk", group: "walking" },
  crossing_marked: { label: "Marked crossing", group: "walking" },
  crossing_unmarked: { label: "Unmarked crossing", group: "walking" },
  street_light: { label: "Street light present", group: "safety" },
  no_street_light: { label: "No street light", group: "safety" },
  flood_prone: { label: "Flood-prone area", group: "safety" },
  construction_blocked: { label: "Blocked by construction", group: "safety" },
  stray_animals: { label: "Stray animals", group: "safety" },
  bike_lane: { label: "Bike lane", group: "cycling" },
  bike_friendly_road: { label: "Bike-friendly road", group: "cycling" },
  dangerous_intersection: { label: "Dangerous intersection", group: "safety" },
  bike_parking: { label: "Bike parking available", group: "cycling" },
}

export const REPORT_GROUPS = {
  walking: "Walking",
  cycling: "Cycling",
  safety: "Safety",
} as const

export function getReportLabel(type: string): string {
  return REPORT_TYPE_CONFIG[type]?.label ?? type
}

export function getReportGroup(type: string): string {
  const group = REPORT_TYPE_CONFIG[type]?.group
  return group ? REPORT_GROUPS[group] : "Other"
}
