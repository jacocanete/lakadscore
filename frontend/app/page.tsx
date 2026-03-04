"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Container from "@mui/material/Container"
import Typography from "@mui/material/Typography"
import Grid from "@mui/material/Grid"
import Divider from "@mui/material/Divider"
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk"
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus"
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike"
import Link from "next/link"
import SearchBar from "@/components/search-bar"
import { getCitiesByRegion, CITIES } from "@/lib/config/cities"

export default function Home() {
  const router = useRouter()
  const regions = getCitiesByRegion()

  const handlePlaceSelected = useCallback(
    (lat: number, lng: number, name: string) => {
      const closest = CITIES.reduce((best, city) => {
        const d = Math.abs(city.lat - lat) + Math.abs(city.lng - lng)
        const bestD = Math.abs(best.lat - lat) + Math.abs(best.lng - lng)
        return d < bestD ? city : best
      }, CITIES[0])

      const dist = Math.abs(closest.lat - lat) + Math.abs(closest.lng - lng)
      if (dist < 0.15) {
        router.push(`/score/${closest.slug}`)
      } else {
        router.push(`/score/${closest.slug}?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}`)
      }
    },
    [router]
  )

  return (
    <Box>
      {/* Hero */}
      <Box sx={{ py: { xs: 8, md: 14 }, px: 2 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            sx={{
              mb: 2,
              fontSize: { xs: "2rem", md: "3rem" },
              maxWidth: 600,
            }}
          >
            How walkable is your neighborhood?
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              mb: 5,
              maxWidth: 440,
              fontSize: "1.05rem",
              lineHeight: 1.7,
            }}
          >
            Get walk, transit, and bike scores for any address in the
            Philippines. Find out if daily errands are within walking distance.
          </Typography>
          <SearchBar onPlaceSelected={handlePlaceSelected} />
        </Container>
      </Box>

      <Divider />

      {/* What we measure */}
      <Box id="how-it-works" sx={{ py: { xs: 6, md: 9 }, px: 2 }}>
        <Container maxWidth="lg">
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "text.secondary",
              mb: 4,
            }}
          >
            What we measure
          </Typography>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
                <DirectionsWalkIcon sx={{ fontSize: 22, color: "text.secondary" }} />
                <Typography variant="h6" sx={{ fontSize: "1rem" }}>
                  LakadScore
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{ fontSize: "0.85rem", lineHeight: 1.7 }}
              >
                Measures walkability based on distance to nearby amenities —
                groceries, restaurants, schools, healthcare, parks, and more.
                Scores 0-100 from Car-Dependent to Walker&apos;s Paradise.
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
                <DirectionsBusIcon sx={{ fontSize: 22, color: "text.secondary" }} />
                <Typography variant="h6" sx={{ fontSize: "1rem" }}>
                  Commute Score
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{ fontSize: "0.85rem", lineHeight: 1.7 }}
              >
                Evaluates transit accessibility using Google transit stop data
                and proximity to major roads where jeepneys and buses operate.
                Built specifically for Philippine public transit.
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
                <DirectionsBikeIcon sx={{ fontSize: 22, color: "text.secondary" }} />
                <Typography variant="h6" sx={{ fontSize: "1rem" }}>
                  Bike Score
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{ fontSize: "0.85rem", lineHeight: 1.7 }}
              >
                Rates bikeability based on terrain (hill grade) and nearby
                destinations. Flat areas with lots of amenities score higher.
                Accounts for elevation changes across Filipino cities.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Divider />

      {/* City scores */}
      <Box sx={{ py: { xs: 6, md: 9 }, px: 2 }}>
        <Container maxWidth="lg">
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "text.secondary",
              mb: 1,
            }}
          >
            Explore cities
          </Typography>
          <Typography
            variant="h5"
            sx={{ mb: 5, fontSize: { xs: "1.25rem", md: "1.5rem" } }}
          >
            Get scores for cities across the Philippines
          </Typography>

          {Object.entries(regions).map(([region, cities]) => (
            <Box key={region} sx={{ mb: 5 }}>
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "text.secondary",
                  mb: 2,
                  pb: 1,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                {region}
              </Typography>

              <Grid container spacing={0}>
                {cities.map((city) => (
                  <Grid size={{ xs: 6, sm: 4, md: 3 }} key={city.slug}>
                    <Link
                      href={`/score/${city.slug}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Box
                        sx={{
                          py: 1.25,
                          pr: 2,
                          display: "flex",
                          alignItems: "baseline",
                          gap: 1,
                          "&:hover .city-name": {
                            color: "text.primary",
                          },
                        }}
                      >
                        <Typography
                          className="city-name"
                          sx={{
                            fontSize: "0.85rem",
                            color: "text.secondary",
                            transition: "color 0.15s",
                          }}
                        >
                          {city.name}
                        </Typography>
                      </Box>
                    </Link>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Container>
      </Box>
    </Box>
  )
}
