"use client"

import { useState, useEffect, useCallback } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Stack from "@mui/material/Stack"
import Chip from "@mui/material/Chip"
import IconButton from "@mui/material/IconButton"
import Button from "@mui/material/Button"
import Skeleton from "@mui/material/Skeleton"
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined"
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined"
import AddIcon from "@mui/icons-material/Add"
import { getReportLabel, getReportGroup } from "@/lib/config/report-types"
import ReportDialog from "./report-dialog"

type Report = {
  id: string
  lat: number
  lng: number
  type: string
  description: string | null
  status: string
  confirmations: number
  createdAt: string
}

type ReportsListProps = {
  lat: number
  lng: number
  locationName?: string
}

export default function ReportsList({ lat, lng, locationName }: ReportsListProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [votingId, setVotingId] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/report?lat=${lat}&lng=${lng}&radius_km=1`
      )
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports)
      }
    } catch {
      // Silently fail — reports are supplementary
    } finally {
      setLoading(false)
    }
  }, [lat, lng])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handleVote = async (reportId: string, isConfirm: boolean) => {
    setVotingId(reportId)
    try {
      const res = await fetch("/api/report/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, isConfirm }),
      })
      if (res.ok) {
        await fetchReports()
      }
    } catch {
      // Silently fail
    } finally {
      setVotingId(null)
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "text.secondary",
          }}
        >
          Community reports
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => setDialogOpen(true)}
          sx={{
            fontSize: "0.75rem",
            color: "text.secondary",
            "&:hover": { color: "text.primary" },
          }}
        >
          Add report
        </Button>
      </Box>

      {loading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={56} />
          ))}
        </Stack>
      ) : reports.length === 0 ? (
        <Box
          sx={{
            py: 4,
            border: "1px solid",
            borderColor: "divider",
            textAlign: "center",
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontSize: "0.85rem", mb: 1.5 }}
          >
            No reports for this area yet.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setDialogOpen(true)}
            sx={{
              fontSize: "0.75rem",
              borderColor: "divider",
              color: "text.primary",
              "&:hover": { borderColor: "text.secondary" },
            }}
          >
            Be the first to report
          </Button>
        </Box>
      ) : (
        <Stack spacing={0}>
          {reports.map((report) => (
            <Box
              key={report.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                py: 1.5,
                px: 2,
                border: "1px solid",
                borderColor: "divider",
                mt: "-1px",
                "&:first-of-type": { mt: 0 },
              }}
            >
              {/* Type + description */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                    {getReportLabel(report.type)}
                  </Typography>
                  <Chip
                    label={getReportGroup(report.type)}
                    size="small"
                    sx={{
                      fontSize: "0.6rem",
                      height: 18,
                      bgcolor:
                        report.status === "verified"
                          ? "secondary.main"
                          : "transparent",
                      color:
                        report.status === "verified"
                          ? "white"
                          : "text.secondary",
                      border:
                        report.status !== "verified"
                          ? "1px solid"
                          : "none",
                      borderColor: "divider",
                    }}
                  />
                  {report.status === "verified" && (
                    <Chip
                      label="verified"
                      size="small"
                      sx={{
                        fontSize: "0.6rem",
                        height: 18,
                        bgcolor: "secondary.main",
                        color: "white",
                      }}
                    />
                  )}
                </Box>
                {report.description && (
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: "0.8rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {report.description}
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  sx={{ fontSize: "0.7rem", color: "text.secondary", mt: 0.25 }}
                >
                  {formatTimeAgo(report.createdAt)}
                </Typography>
              </Box>

              {/* Confirmations + vote buttons */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  flexShrink: 0,
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => handleVote(report.id, true)}
                  disabled={votingId === report.id}
                  title="Confirm this report"
                  sx={{ color: "text.secondary" }}
                >
                  <ThumbUpOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <Typography
                  sx={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    minWidth: 20,
                    textAlign: "center",
                  }}
                >
                  {report.confirmations}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleVote(report.id, false)}
                  disabled={votingId === report.id}
                  title="Dispute this report"
                  sx={{ color: "text.secondary" }}
                >
                  <ThumbDownOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      <ReportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        lat={lat}
        lng={lng}
        locationName={locationName}
        onSubmitted={fetchReports}
      />
    </Box>
  )
}
