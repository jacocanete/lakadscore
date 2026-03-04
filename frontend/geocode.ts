/**
 * Reverse geocode lat/lng to a human-readable address using the
 * Google Maps Geocoder (already loaded via Maps JS SDK).
 *
 * Returns the formatted address, or a coordinate fallback.
 */
export function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  return new Promise((resolve) => {
    if (!window.google?.maps?.Geocoder) {
      resolve(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      return
    }

    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== "OK" || !results || results.length === 0) {
        resolve(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        return
      }

      // Prefer a street-level or neighborhood result over a country-level one
      const preferred =
        results.find(
          (r) =>
            r.types.includes("street_address") ||
            r.types.includes("route") ||
            r.types.includes("premise")
        ) ??
        results.find(
          (r) =>
            r.types.includes("neighborhood") ||
            r.types.includes("sublocality") ||
            r.types.includes("locality")
        ) ??
        results[0]

      resolve(preferred.formatted_address)
    })
  })
}
