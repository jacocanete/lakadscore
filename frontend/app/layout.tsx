import type { Metadata } from "next"
import { Inter } from "next/font/google"
import ThemeRegistry from "./theme-registry"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import MapsProvider from "@/components/maps-provider"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "LakadScore - Walk, Transit & Bike Scores for the Philippines",
  description:
    "Find out how walkable, transit-friendly, and bikeable any location in the Philippines is. The first WalkScore-style platform built for Filipino neighborhoods.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeRegistry>
          <MapsProvider>
            <Navbar />
            {children}
            <Footer />
          </MapsProvider>
        </ThemeRegistry>
      </body>
    </html>
  )
}
