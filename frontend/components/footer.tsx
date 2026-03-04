"use client"

import Box from "@mui/material/Box"
import Container from "@mui/material/Container"
import Typography from "@mui/material/Typography"
import Grid from "@mui/material/Grid"
import Link from "next/link"
import { getCitiesByRegion } from "@/lib/config/cities"

export default function Footer() {
  const regions = getCitiesByRegion()

  return (
    <Box
      component="footer"
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        py: 6,
        mt: 8,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "1rem",
                mb: 1.5,
                letterSpacing: "-0.02em",
              }}
            >
              LakadScore
            </Typography>
            <Typography variant="body2" sx={{ fontSize: "0.8rem", lineHeight: 1.7 }}>
              Walk, transit, and bike scores for any location in the
              Philippines. The first walkability platform built for Filipino
              neighborhoods.
            </Typography>
          </Grid>

          {Object.entries(regions)
            .slice(0, 3)
            .map(([region, cities]) => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={region}>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "text.secondary",
                    mb: 1.5,
                  }}
                >
                  {region}
                </Typography>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}
                >
                  {cities.slice(0, 8).map((city) => (
                    <Link
                      key={city.slug}
                      href={`/score/${city.slug}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.8rem",
                          color: "text.secondary",
                          "&:hover": { color: "text.primary" },
                        }}
                      >
                        {city.name}
                      </Typography>
                    </Link>
                  ))}
                </Box>
              </Grid>
            ))}
        </Grid>

        <Box
          sx={{
            mt: 6,
            pt: 3,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontSize: "0.75rem", color: "text.secondary" }}
          >
            &copy; {new Date().getFullYear()} LakadScore
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontSize: "0.75rem", color: "text.secondary" }}
          >
            Powered by Google Places API &middot; OpenStreetMap
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
