"use client"

import { GoogleMap, MarkerF } from "@react-google-maps/api"
import Box from "@mui/material/Box"

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
}

const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 }

type ScoreMapProps = {
  center?: { lat: number; lng: number }
  markerPosition?: { lat: number; lng: number }
  onMapClick?: (lat: number, lng: number) => void
}

export default function ScoreMap({
  center,
  markerPosition,
  onMapClick,
}: ScoreMapProps) {
  const handleClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !onMapClick) return
    onMapClick(e.latLng.lat(), e.latLng.lng())
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: { xs: 320, md: 420 },
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center || DEFAULT_CENTER}
        zoom={center ? 15 : 6}
        onClick={handleClick}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          draggableCursor: "crosshair",
          draggingCursor: "grabbing",
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        }}
      >
        {markerPosition && <MarkerF position={markerPosition} />}
      </GoogleMap>
    </Box>
  )
}
