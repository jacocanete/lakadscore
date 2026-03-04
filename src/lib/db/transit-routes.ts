import { prisma } from "./client"
import type { TransitMode, LatLng } from "@/lib/types"

type CreateTransitRouteInput = {
  name: string
  mode: TransitMode
  waypoints: LatLng[]
  fare?: number | null
  operatingHours?: string | null
  userId?: string | null
}

export async function createTransitRoute(input: CreateTransitRouteInput) {
  return prisma.transitRoute.create({
    data: {
      name: input.name,
      mode: input.mode as never,
      waypoints: JSON.parse(JSON.stringify(input.waypoints)),
      fare: input.fare ?? null,
      operatingHours: input.operatingHours ?? null,
      userId: input.userId ?? null,
    },
  })
}

export async function getTransitRoutes(filters?: {
  mode?: TransitMode
  status?: "pending" | "verified"
}) {
  return prisma.transitRoute.findMany({
    where: {
      ...(filters?.mode && { mode: filters.mode as never }),
      ...(filters?.status && { status: filters.status as never }),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })
}

export async function confirmTransitRoute(routeId: string) {
  const route = await prisma.transitRoute.update({
    where: { id: routeId },
    data: {
      confirmations: { increment: 1 },
    },
  })

  if (route.confirmations >= 3) {
    await prisma.transitRoute.update({
      where: { id: routeId },
      data: { status: "verified" },
    })
  }

  return route
}
