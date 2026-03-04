"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Box from "@mui/material/Box"
import Container from "@mui/material/Container"
import Typography from "@mui/material/Typography"
import Grid from "@mui/material/Grid"
import Divider from "@mui/material/Divider"
import Skeleton from "@mui/material/Skeleton"
import Stack from "@mui/material/Stack"
import Alert from "@mui/material/Alert"
import Chip from "@mui/material/Chip"
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk"
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus"
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike"
import PlaceIcon from "@mui/icons-material/Place"
import Link from "next/link"
import SearchBar from "@/components/search-bar"
import ScoreBadge from "@/components/score-badge"
import ScoreMap from "@/components/score-map"
import ReportsList from "@/components/reports-list"
import { getCityBySlug, getCitiesByRegion, type City } from "@/lib/config/cities"
import { reverseGeocode } from "@/lib/geocode"
import type { ScoreResult } from "@/lib/types"

export default function CityScorePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const citySlug = params.city as string
  const city = getCityBySlug(citySlug)

  const overrideLat = searchParams.get("lat")
  const overrideLng = searchParams.get("lng")
  const overrideName = searchParams.get("name")

  const [result, setResult] = useState<ScoreResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cached, setCached] = useState(false)
  const [locationName, setLocationName] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>()
  const lastClickRef = useRef(0)

  const fetchScore = useCallback(
    async (lat: number, lng: number, name?: string) => {
      setLoading(true)
      setError(null)
      setMapCenter({ lat, lng })
      if (name) setLocationName(name)

      try {
        const res = await fetch(`/api/score?lat=${lat}&lng=${lng}`, {
          cache: "no-store",
        })
        setCached(res.headers.get("X-Cache") === "HIT")

        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error || "Failed to fetch score")
        }

        const data: ScoreResult = await res.json()
        setResult(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
        setResult(null)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!city) return

    if (overrideLat && overrideLng) {
      const lat = parseFloat(overrideLat)
      const lng = parseFloat(overrideLng)
      if (overrideName) {
        setLocationName(overrideName)
      } else {
        setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        reverseGeocode(lat, lng).then(setLocationName)
      }
      fetchScore(lat, lng)
    } else {
      setLocationName(city.name)
      fetchScore(city.lat, city.lng)
    }
  }, [city, overrideLat, overrideLng, overrideName, fetchScore])

  const handlePlaceSelected = useCallback(
    (lat: number, lng: number, name: string) => {
      setLocationName(name)
      fetchScore(lat, lng, name)
    },
    [fetchScore]
  )

  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      const now = Date.now()
      if (now - lastClickRef.current < 2000) return
      lastClickRef.current = now

      setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      fetchScore(lat, lng)
      const address = await reverseGeocode(lat, lng)
      setLocationName(address)
    },
    [fetchScore]
  )

  if (!city) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          City not found
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          We don&apos;t have data for &ldquo;{citySlug}&rdquo; yet.
        </Typography>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", "&:hover": { color: "text.primary" } }}>
            &larr; Back to search
          </Typography>
        </Link>
      </Container>
    )
  }

  const regions = getCitiesByRegion()
  const siblingCities = regions[city.region]?.filter((c) => c.slug !== city.slug).slice(0, 6) || []

  return (
    <Box>
      {/* City header */}
      <Box sx={{ py: { xs: 4, md: 6 }, px: 2 }}>
        <Container maxWidth="lg">
          {/* Breadcrumb */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 3 }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", "&:hover": { color: "text.primary" } }}>
                Philippines
              </Typography>
            </Link>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              /
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              {city.region}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              /
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "text.primary", fontWeight: 500 }}>
              {city.name}
            </Typography>
          </Box>

          {/* Title + search */}
          <Grid container spacing={4} alignItems="flex-start">
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Typography
                  variant="h3"
                  sx={{ fontSize: { xs: "1.75rem", md: "2.25rem" } }}
                >
                  {locationName || city.name}
                </Typography>
                {result && (
                  <Chip
                    label={cached ? "cached" : "fresh"}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: "0.6rem",
                      height: 18,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  />
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 3 }}>
                <PlaceIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                  {city.region}, Philippines
                </Typography>
              </Box>

              <SearchBar onPlaceSelected={handlePlaceSelected} loading={loading} />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Divider />

      {/* Scores + Map */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 }, px: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Scores column */}
          <Grid size={{ xs: 12, md: 5 }}>
            {loading ? (
              <ScoresSkeleton />
            ) : result ? (
              <Box>
                <ScoreBadge
                  title="LakadScore"
                  score={result.lakadScore.score}
                  label={result.lakadScore.label}
                  icon={<DirectionsWalkIcon sx={{ fontSize: 16 }} />}
                />
                <Divider />
                <ScoreBadge
                  title="Commute Score"
                  score={result.commuteScore.score}
                  label={result.commuteScore.label}
                  icon={<DirectionsBusIcon sx={{ fontSize: 16 }} />}
                />
                <Divider />
                <ScoreBadge
                  title="Bike Score"
                  score={result.bikeScore.score}
                  label={result.bikeScore.label}
                  icon={<DirectionsBikeIcon sx={{ fontSize: 16 }} />}
                />
              </Box>
            ) : null}
          </Grid>

          {/* Map column */}
          <Grid size={{ xs: 12, md: 7 }}>
            <ScoreMap
              center={mapCenter || { lat: city.lat, lng: city.lng }}
              markerPosition={mapCenter || { lat: city.lat, lng: city.lng }}
              onMapClick={handleMapClick}
            />
          </Grid>
        </Grid>
      </Container>

      <Divider />

      {/* Details section */}
      {result && !loading && (
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 }, px: 2 }}>
          <Grid container spacing={6}>
            {/* About */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "text.secondary",
                  mb: 2,
                }}
              >
                About this location
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: "0.85rem", lineHeight: 1.8 }}
              >
                {locationName || city.name} has a LakadScore of{" "}
                <strong>{result.lakadScore.score}</strong> out of 100.
                {result.lakadScore.score >= 70
                  ? " Most errands can be accomplished on foot."
                  : result.lakadScore.score >= 50
                    ? " Some errands can be accomplished on foot."
                    : " Most errands require a vehicle."}
                {" "}The Commute Score is{" "}
                <strong>{result.commuteScore.score}</strong>
                {result.commuteScore.nearestMajorRoadMeters !== null &&
                  `, with the nearest major road ${Math.round(result.commuteScore.nearestMajorRoadMeters)}m away`}
                . The Bike Score is{" "}
                <strong>{result.bikeScore.score}</strong>.
              </Typography>
            </Grid>

            {/* Nearby amenities */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "text.secondary",
                  mb: 2,
                }}
              >
                Nearby amenities
              </Typography>
              <Stack spacing={1}>
                {result.lakadScore.categories
                  .filter((c) => c.placesFound > 0)
                  .map((c) => (
                    <Box
                      key={c.category}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        py: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.85rem",
                          textTransform: "capitalize",
                        }}
                      >
                        {c.category}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontSize: "0.8rem" }}
                        >
                          {c.placesFound} found
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            minWidth: 48,
                            textAlign: "right",
                          }}
                        >
                          {c.nearestDistanceMeters !== null
                            ? `${Math.round(c.nearestDistanceMeters)}m`
                            : "--"}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
              </Stack>
            </Grid>

            {/* Transit details */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "text.secondary",
                  mb: 2,
                }}
              >
                Transit & bike details
              </Typography>
              <Stack spacing={1}>
                <DetailRow
                  label="Transit stops within 400m"
                  value={String(result.commuteScore.stopCounts.within400m)}
                />
                <DetailRow
                  label="Transit stops within 800m"
                  value={String(result.commuteScore.stopCounts.within800m)}
                />
                {result.commuteScore.nearestMajorRoadMeters !== null && (
                  <DetailRow
                    label="Nearest major road"
                    value={`${Math.round(result.commuteScore.nearestMajorRoadMeters)}m`}
                  />
                )}

                <Divider sx={{ my: 1 }} />

                <DetailRow
                  label="Hill grade"
                  value={`${result.bikeScore.hillScore}/100`}
                />
                <DetailRow
                  label="Destinations"
                  value={`${result.bikeScore.destinationScore}/100`}
                />
                <DetailRow
                  label="Road infrastructure"
                  value={`${result.bikeScore.roadScore}/100`}
                />

                {result.bikeScore.nearbyRoads?.length > 0 && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    {result.bikeScore.nearbyRoads
                      .filter((r) => !r.highway.includes("_link"))
                      .slice(0, 4)
                      .map((r) => (
                        <DetailRow
                          key={r.highway}
                          label={`${r.highway} road`}
                          value={`${Math.round(r.distanceMeters)}m (${r.count} seg)`}
                        />
                      ))}
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      )}

      <Divider />

      {/* Community reports */}
      {mapCenter && (
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 }, px: 2 }}>
          <ReportsList lat={mapCenter.lat} lng={mapCenter.lng} />
        </Container>
      )}

      <Divider />

      {/* Nearby cities */}
      {siblingCities.length > 0 && (
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 }, px: 2 }}>
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "text.secondary",
              mb: 3,
            }}
          >
            Nearby cities in {city.region}
          </Typography>
          <Grid container spacing={0}>
            {siblingCities.map((c) => (
              <Grid size={{ xs: 6, sm: 4, md: 2 }} key={c.slug}>
                <Link
                  href={`/score/${c.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <Box
                    sx={{
                      py: 1,
                      "&:hover .sibling-name": { color: "text.primary" },
                    }}
                  >
                    <Typography
                      className="sibling-name"
                      sx={{
                        fontSize: "0.85rem",
                        color: "text.secondary",
                        transition: "color 0.15s",
                      }}
                    >
                      {c.name}
                    </Typography>
                  </Box>
                </Link>
              </Grid>
            ))}
          </Grid>
        </Container>
      )}
    </Box>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 0.5,
      }}
    >
      <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  )
}

function ScoresSkeleton() {
  return (
    <Stack spacing={2} divider={<Divider />}>
      {[1, 2, 3].map((i) => (
        <Box key={i} sx={{ display: "flex", gap: 2, py: 2 }}>
          <Skeleton variant="rectangular" width={72} height={72} />
          <Box>
            <Skeleton variant="text" width={80} height={14} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width={140} height={22} />
          </Box>
        </Box>
      ))}
    </Stack>
  )
}
