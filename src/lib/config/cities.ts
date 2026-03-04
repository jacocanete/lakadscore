export type City = {
  name: string
  slug: string
  lat: number
  lng: number
  region: string
  population?: number
}

export const CITIES: City[] = [
  // Metro Manila
  { name: "Makati", slug: "makati", lat: 14.5547, lng: 121.0244, region: "Metro Manila", population: 582602 },
  { name: "BGC", slug: "bgc", lat: 14.5505, lng: 121.0494, region: "Metro Manila" },
  { name: "Manila", slug: "manila", lat: 14.5995, lng: 120.9842, region: "Metro Manila", population: 1846513 },
  { name: "Quezon City", slug: "quezon-city", lat: 14.6760, lng: 121.0437, region: "Metro Manila", population: 2960048 },
  { name: "Pasig", slug: "pasig", lat: 14.5764, lng: 121.0851, region: "Metro Manila", population: 803159 },
  { name: "Taguig", slug: "taguig", lat: 14.5176, lng: 121.0509, region: "Metro Manila", population: 886722 },
  { name: "Mandaluyong", slug: "mandaluyong", lat: 14.5794, lng: 121.0359, region: "Metro Manila", population: 425758 },
  { name: "Pasay", slug: "pasay", lat: 14.5378, lng: 121.0014, region: "Metro Manila", population: 440656 },
  { name: "Marikina", slug: "marikina", lat: 14.6507, lng: 121.1029, region: "Metro Manila", population: 450741 },
  { name: "Paranaque", slug: "paranaque", lat: 14.4793, lng: 121.0198, region: "Metro Manila", population: 689992 },
  { name: "Las Pinas", slug: "las-pinas", lat: 14.4445, lng: 120.9939, region: "Metro Manila", population: 606293 },
  { name: "Muntinlupa", slug: "muntinlupa", lat: 14.4081, lng: 121.0415, region: "Metro Manila", population: 543445 },
  { name: "Caloocan", slug: "caloocan", lat: 14.6488, lng: 120.9690, region: "Metro Manila", population: 1661584 },
  { name: "Valenzuela", slug: "valenzuela", lat: 14.6942, lng: 120.9605, region: "Metro Manila", population: 714978 },

  // Visayas
  { name: "Cebu City", slug: "cebu", lat: 10.3157, lng: 123.8854, region: "Visayas", population: 964169 },
  { name: "Mandaue", slug: "mandaue", lat: 10.3236, lng: 123.9222, region: "Visayas", population: 362654 },
  { name: "Lapu-Lapu", slug: "lapu-lapu", lat: 10.3103, lng: 123.9494, region: "Visayas", population: 497604 },
  { name: "Iloilo City", slug: "iloilo", lat: 10.6920, lng: 122.5621, region: "Visayas", population: 457626 },
  { name: "Bacolod", slug: "bacolod", lat: 10.6840, lng: 122.9563, region: "Visayas", population: 600783 },
  { name: "Dumaguete", slug: "dumaguete", lat: 9.3068, lng: 123.3054, region: "Visayas", population: 134103 },
  { name: "Tagbilaran", slug: "tagbilaran", lat: 9.6500, lng: 123.8500, region: "Visayas", population: 105051 },

  // Mindanao
  { name: "Davao City", slug: "davao", lat: 7.1907, lng: 125.4553, region: "Mindanao", population: 1776949 },
  { name: "Cagayan de Oro", slug: "cagayan-de-oro", lat: 8.4542, lng: 124.6319, region: "Mindanao", population: 728402 },
  { name: "Zamboanga", slug: "zamboanga", lat: 6.9214, lng: 122.0790, region: "Mindanao", population: 977234 },
  { name: "General Santos", slug: "general-santos", lat: 6.1164, lng: 125.1716, region: "Mindanao", population: 697315 },
  { name: "Butuan", slug: "butuan", lat: 8.9475, lng: 125.5406, region: "Mindanao", population: 372910 },
  { name: "Iligan", slug: "iligan", lat: 8.2280, lng: 124.2452, region: "Mindanao", population: 363115 },

  // Luzon (outside Metro Manila)
  { name: "Baguio", slug: "baguio", lat: 16.4023, lng: 120.5960, region: "Luzon", population: 366358 },
  { name: "Angeles", slug: "angeles", lat: 15.1450, lng: 120.5887, region: "Luzon", population: 462831 },
  { name: "San Fernando (Pampanga)", slug: "san-fernando-pampanga", lat: 14.9667, lng: 120.6833, region: "Luzon", population: 306659 },
  { name: "Olongapo", slug: "olongapo", lat: 14.8292, lng: 120.2824, region: "Luzon", population: 260317 },
  { name: "Naga", slug: "naga", lat: 13.6192, lng: 123.1814, region: "Luzon", population: 209170 },
  { name: "Legazpi", slug: "legazpi", lat: 13.1391, lng: 123.7438, region: "Luzon", population: 210068 },
  { name: "Lipa", slug: "lipa", lat: 13.9411, lng: 121.1632, region: "Luzon", population: 372931 },
  { name: "Batangas City", slug: "batangas", lat: 13.7565, lng: 121.0583, region: "Luzon", population: 351437 },
  { name: "Santa Rosa (Laguna)", slug: "santa-rosa", lat: 14.3122, lng: 121.1115, region: "Luzon", population: 414812 },
  { name: "Antipolo", slug: "antipolo", lat: 14.5861, lng: 121.1761, region: "Luzon", population: 887399 },
]

export function getCityBySlug(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug)
}

export function getCitiesByRegion(): Record<string, City[]> {
  const grouped: Record<string, City[]> = {}
  for (const city of CITIES) {
    if (!grouped[city.region]) grouped[city.region] = []
    grouped[city.region].push(city)
  }
  return grouped
}
