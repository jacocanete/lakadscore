"use client"

import { useState } from "react"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Box from "@mui/material/Box"
import Alert from "@mui/material/Alert"
import CircularProgress from "@mui/material/CircularProgress"
import {
  REPORT_TYPE_CONFIG,
  REPORT_GROUPS,
} from "@/lib/config/report-types"

type ReportDialogProps = {
  open: boolean
  onClose: () => void
  lat: number
  lng: number
  locationName?: string
  onSubmitted: () => void
}

export default function ReportDialog({
  open,
  onClose,
  lat,
  lng,
  locationName,
  onSubmitted,
}: ReportDialogProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!selectedType) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          type: selectedType,
          description: description.trim() || null,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || "Failed to submit report")
      }

      setSelectedType(null)
      setDescription("")
      onSubmitted()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setSelectedType(null)
    setDescription("")
    setError(null)
    onClose()
  }

  const grouped: Record<string, { type: string; label: string }[]> = {}
  for (const [type, config] of Object.entries(REPORT_TYPE_CONFIG)) {
    const group = config.group
    if (!grouped[group]) grouped[group] = []
    grouped[group].push({ type, label: config.label })
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 0 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
          Report infrastructure
        </Typography>
        <Typography variant="body2" sx={{ fontSize: "0.8rem", mt: 0.5 }}>
          {locationName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {Object.entries(grouped).map(([group, items]) => (
          <Box key={group} sx={{ mb: 2.5 }}>
            <Typography
              sx={{
                fontSize: "0.7rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "text.secondary",
                mb: 1,
              }}
            >
              {REPORT_GROUPS[group as keyof typeof REPORT_GROUPS]}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {items.map(({ type, label }) => (
                <Button
                  key={type}
                  variant={selectedType === type ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setSelectedType(type)}
                  disabled={submitting}
                  sx={{
                    fontSize: "0.75rem",
                    px: 1.5,
                    py: 0.5,
                    borderColor: "divider",
                    color:
                      selectedType === type ? "white" : "text.primary",
                    bgcolor:
                      selectedType === type ? "text.primary" : "transparent",
                    "&:hover": {
                      bgcolor:
                        selectedType === type ? "text.primary" : "action.hover",
                      borderColor: "text.secondary",
                    },
                  }}
                >
                  {label}
                </Button>
              ))}
            </Box>
          </Box>
        ))}

        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          placeholder="Optional: add more details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          sx={{ mt: 1 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={submitting}
          sx={{ color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedType || submitting}
          variant="contained"
          sx={{
            bgcolor: "text.primary",
            "&:hover": { bgcolor: "text.primary", opacity: 0.9 },
          }}
        >
          {submitting ? (
            <CircularProgress size={18} sx={{ color: "white" }} />
          ) : (
            "Submit report"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
