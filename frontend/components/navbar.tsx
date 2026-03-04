"use client"

import AppBar from "@mui/material/AppBar"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Box from "@mui/material/Box"
import Container from "@mui/material/Container"
import Link from "next/link"

export default function Navbar() {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 56 } }}>
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "1.1rem",
                color: "text.primary",
                letterSpacing: "-0.02em",
              }}
            >
              LakadScore
            </Typography>
          </Link>

          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Button
              component={Link}
              href="/score/makati"
              size="small"
              sx={{ color: "text.secondary", fontSize: "0.8rem" }}
            >
              Cities
            </Button>
            <Button
              size="small"
              sx={{ color: "text.secondary", fontSize: "0.8rem" }}
              href="#how-it-works"
            >
              How It Works
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
}
