"use client"

import Typography from "@mui/material/Typography"
import Box from "@mui/material/Box"
import LinearProgress from "@mui/material/LinearProgress"

function getScoreColor(score: number): string {
  if (score >= 90) return "#1B5E20"
  if (score >= 70) return "#2E7D32"
  if (score >= 50) return "#E65100"
  if (score >= 25) return "#C62828"
  return "#B71C1C"
}

type ScoreCardProps = {
  title: string
  score: number
  label: string
  icon: React.ReactNode
  details?: React.ReactNode
}

export default function ScoreCard({
  title,
  score,
  label,
  icon,
  details,
}: ScoreCardProps) {
  const color = getScoreColor(score)

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 200,
        p: 2.5,
        border: "1px solid",
        borderColor: "divider",
        marginLeft: { sm: "-1px" },
        marginTop: { xs: "-1px", sm: 0 },
        "&:first-of-type": {
          marginLeft: 0,
          marginTop: 0,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          mb: 2.5,
          color: "text.secondary",
        }}
      >
        {icon}
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          {title}
        </Typography>
      </Box>

      <Typography
        sx={{
          fontSize: "2.75rem",
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color,
          mb: 0.5,
        }}
      >
        {score}
      </Typography>

      <Typography
        variant="body2"
        sx={{ fontWeight: 500, mb: 2 }}
      >
        {label}
      </Typography>

      <LinearProgress
        variant="determinate"
        value={score}
        sx={{
          height: 2,
          bgcolor: "#EEEEEE",
          "& .MuiLinearProgress-bar": {
            bgcolor: color,
          },
        }}
      />

      {details && (
        <Box
          sx={{
            mt: 2,
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          {details}
        </Box>
      )}
    </Box>
  )
}
