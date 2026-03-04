import { prisma } from "./client"
import type { ScoreResult } from "@/lib/types"
import { getEnv } from "@/lib/config/env"

export async function getCachedScore(
  gridCellId: string
): Promise<ScoreResult | null> {
  const entry = await prisma.scoreCache.findUnique({
    where: { gridCellId },
  })

  if (!entry) return null

  if (entry.expiresAt < new Date()) {
    await prisma.scoreCache.delete({ where: { gridCellId } })
    return null
  }

  return entry.result as unknown as ScoreResult
}

export async function setCachedScore(
  gridCellId: string,
  lat: number,
  lng: number,
  resolution: number,
  result: ScoreResult
): Promise<void> {
  const env = getEnv()
  const ttlMs = env.SCORE_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlMs)

  await prisma.scoreCache.upsert({
    where: { gridCellId },
    update: {
      result: JSON.parse(JSON.stringify(result)),
      computedAt: now,
      expiresAt,
    },
    create: {
      gridCellId,
      lat,
      lng,
      resolution,
      result: JSON.parse(JSON.stringify(result)),
      computedAt: now,
      expiresAt,
    },
  })
}

export async function invalidateCache(gridCellId: string): Promise<void> {
  await prisma.scoreCache
    .delete({ where: { gridCellId } })
    .catch(() => {})
}

export async function getCacheStats() {
  const now = new Date()
  const [total, active] = await Promise.all([
    prisma.scoreCache.count(),
    prisma.scoreCache.count({ where: { expiresAt: { gt: now } } }),
  ])
  return { total, active, expired: total - active }
}
