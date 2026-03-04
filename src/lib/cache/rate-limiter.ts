import { getEnv } from "@/lib/config/env"

type RateLimitEntry = {
  count: number
  windowStart: number
}

const WINDOW_MS = 60_000
const store = new Map<string, RateLimitEntry>()

export function checkRateLimit(key: string): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const env = getEnv()
  const limit = env.RATE_LIMIT_RPM
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1, resetAt: now + WINDOW_MS }
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + WINDOW_MS,
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.windowStart + WINDOW_MS,
  }
}

/**
 * Separate budget for expensive operations (cache misses that trigger
 * Google API calls). Much tighter than the general rate limit.
 *
 * Default: 10 fresh computations per minute per IP.
 * At $0.32 each, worst case = $3.20/min per abuser.
 */
const EXPENSIVE_LIMIT = 10
const EXPENSIVE_WINDOW_MS = 60_000
const expensiveStore = new Map<string, RateLimitEntry>()

export function checkExpensiveRateLimit(key: string): {
  allowed: boolean
  remaining: number
} {
  const now = Date.now()
  const entry = expensiveStore.get(key)

  if (!entry || now - entry.windowStart >= EXPENSIVE_WINDOW_MS) {
    expensiveStore.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: EXPENSIVE_LIMIT - 1 }
  }

  if (entry.count >= EXPENSIVE_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: EXPENSIVE_LIMIT - entry.count }
}
