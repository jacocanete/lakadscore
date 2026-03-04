"use client"

import { LoadScript } from "@react-google-maps/api"

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
const LIBRARIES: ("places")[] = ["places"]

export default function MapsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={LIBRARIES}>
      {children}
    </LoadScript>
  )
}
