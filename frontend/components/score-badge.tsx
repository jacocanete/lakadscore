"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

function getScoreColor(score: number): string {
  if (score >= 90) return "#1B5E20"
  if (score >= 70) return "#2E7D32"
  if (score >= 50) return "#E65100"
  if (score >= 25) return "#C62828"
  return "#B71C1C"
}

type ScoreBadgeProps = {
  title: string
  score: number
  label: string
  icon: React.ReactNode
}

export default function ScoreBadge({
  title,
  score,
  label,
  icon,
}: ScoreBadgeProps) {
  const color = getScoreColor(score)

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        py: 2,
      }}
    >
      {/* Score number in a square */}
      <Box
        sx={{
          width: 72,
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: color,
          color: "white",
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: "1.75rem",
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {score}
        </Typography>
      </Box>

      {/* Label */}
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.25 }}>
          <Box sx={{ color: "text.secondary", display: "flex" }}>{icon}</Box>
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "text.secondary",
            }}
          >
            {title}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "text.primary",
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  )
}
