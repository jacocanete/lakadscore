"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import TextField from "@mui/material/TextField"
import InputAdornment from "@mui/material/InputAdornment"
import IconButton from "@mui/material/IconButton"
import CircularProgress from "@mui/material/CircularProgress"
import SearchIcon from "@mui/icons-material/Search"
import MyLocationIcon from "@mui/icons-material/MyLocation"
import Box from "@mui/material/Box"
import { reverseGeocode } from "@/lib/geocode"

type SearchBarProps = {
  onPlaceSelected: (lat: number, lng: number, name: string) => void
  loading?: boolean
}

export default function SearchBar({ onPlaceSelected, loading }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [geolocating, setGeolocating] = useState(false)

  useEffect(() => {
    if (!inputRef.current || !window.google?.maps?.places) return
    if (autocompleteRef.current) return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "ph" },
      fields: ["geometry", "formatted_address", "name"],
    })

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace()
      if (!place.geometry?.location) return

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      const name = place.formatted_address || place.name || "Selected location"
      onPlaceSelected(lat, lng, name)
    })

    autocompleteRef.current = autocomplete
  }, [onPlaceSelected])

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return

    setGeolocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const address = await reverseGeocode(latitude, longitude)
        setGeolocating(false)
        onPlaceSelected(latitude, longitude, address)
      },
      () => {
        setGeolocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [onPlaceSelected])

  return (
    <Box sx={{ width: "100%", maxWidth: 560 }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        placeholder="Enter an address in the Philippines"
        variant="outlined"
        disabled={loading}
        size="medium"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                {loading ? (
                  <CircularProgress size={18} sx={{ color: "text.secondary" }} />
                ) : (
                  <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                )}
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleGeolocate}
                  disabled={loading || geolocating}
                  size="small"
                  title="Use my location"
                  sx={{ color: "text.secondary" }}
                >
                  {geolocating ? (
                    <CircularProgress size={18} />
                  ) : (
                    <MyLocationIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            bgcolor: "white",
            fontSize: "0.875rem",
          },
        }}
      />
    </Box>
  )
}
