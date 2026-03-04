import { prisma } from "./client"
import type { ReportType } from "@/generated/prisma/client"
import type { NearbyReport, InfrastructureReportType } from "@/lib/types"
import { haversineDistance } from "@/lib/scoring/decay"

type CreateReportInput = {
  lat: number
  lng: number
  type: ReportType
  description?: string | null
  userId?: string | null
}

export async function createReport(input: CreateReportInput) {
  return prisma.infrastructureReport.create({
    data: {
      lat: input.lat,
      lng: input.lng,
      type: input.type,
      description: input.description ?? null,
      userId: input.userId ?? null,
    },
  })
}

export async function getNearbyReports(
  lat: number,
  lng: number,
  radiusKm: number = 1
) {
  const degPerKm = 1 / 111.32
  const latRange = radiusKm * degPerKm
  const lngRange = radiusKm * degPerKm

  return prisma.infrastructureReport.findMany({
    where: {
      lat: { gte: lat - latRange, lte: lat + latRange },
      lng: { gte: lng - lngRange, lte: lng + lngRange },
      status: { not: "rejected" },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
}

export async function voteOnReport(
  reportId: string,
  userId: string,
  isConfirm: boolean
) {
  const vote = await prisma.reportVote.upsert({
    where: { reportId_userId: { reportId, userId } },
    update: { isConfirm },
    create: { reportId, userId, isConfirm },
  })

  const confirmCount = await prisma.reportVote.count({
    where: { reportId, isConfirm: true },
  })

  await prisma.infrastructureReport.update({
    where: { id: reportId },
    data: {
      confirmations: confirmCount,
      status: confirmCount >= 3 ? "verified" : "pending",
    },
  })

  return vote
}

export async function getNearbyReportsForScore(
  lat: number,
  lng: number,
  radiusKm: number = 1
): Promise<NearbyReport[]> {
  const degPerKm = 1 / 111.32
  const latRange = radiusKm * degPerKm
  const lngRange = radiusKm * degPerKm

  const reports = await prisma.infrastructureReport.findMany({
    where: {
      lat: { gte: lat - latRange, lte: lat + latRange },
      lng: { gte: lng - lngRange, lte: lng + lngRange },
      status: { not: "rejected" },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return reports
    .map((r) => ({
      id: r.id,
      location: { lat: r.lat, lng: r.lng },
      type: r.type as InfrastructureReportType,
      description: r.description,
      confirmations: r.confirmations,
      status: r.status,
      distanceMeters: haversineDistance(lat, lng, r.lat, r.lng),
      createdAt: r.createdAt.toISOString(),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
}

export async function getReportStats() {
  const [total, verified, pending] = await Promise.all([
    prisma.infrastructureReport.count(),
    prisma.infrastructureReport.count({ where: { status: "verified" } }),
    prisma.infrastructureReport.count({ where: { status: "pending" } }),
  ])
  return { total, verified, pending }
}
