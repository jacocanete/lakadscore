"use client"

import { useState } from "react"
import { ThemeProvider } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import createCache from "@emotion/cache"
import { CacheProvider } from "@emotion/react"
import theme from "@/lib/theme"

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode
}) {
  const [emotionCache] = useState(() => {
    const cache = createCache({ key: "mui" })
    cache.compat = true
    return cache
  })

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  )
}
