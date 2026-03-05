import { describe, test, expect, beforeEach, mock } from "bun:test"

// The rate limiter reads env at call time, so we need to set env vars
// before importing. The module also sets up a setInterval on load.
process.env.GOOGLE_MAPS_API_KEY = "test-key"
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test"
process.env.LAKADSCORE_API_KEY = "test-api-key"
process.env.RATE_LIMIT_RPM = "5"

// We need fresh module state for each test suite, but bun:test
// doesn't support module re-imports easily. We'll work with the
// shared state and use unique keys per test to avoid collisions.

import { checkRateLimit, checkExpensiveRateLimit } from "../rate-limiter"

describe("checkRateLimit", () => {
  test("allows requests within the limit", () => {
    const key = `test-general-${Date.now()}`

    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4 - i)
    }
  })

  test("blocks requests exceeding the limit", () => {
    const key = `test-block-${Date.now()}`

    for (let i = 0; i < 5; i++) {
      checkRateLimit(key)
    }

    const result = checkRateLimit(key)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  test("returns correct resetAt timestamp", () => {
    const key = `test-reset-${Date.now()}`
    const before = Date.now()
    const result = checkRateLimit(key)
    const after = Date.now()

    expect(result.resetAt).toBeGreaterThanOrEqual(before + 60_000)
    expect(result.resetAt).toBeLessThanOrEqual(after + 60_000)
  })

  test("different keys have independent limits", () => {
    const key1 = `test-indep-a-${Date.now()}`
    const key2 = `test-indep-b-${Date.now()}`

    for (let i = 0; i < 5; i++) {
      checkRateLimit(key1)
    }

    const blocked = checkRateLimit(key1)
    expect(blocked.allowed).toBe(false)

    const allowed = checkRateLimit(key2)
    expect(allowed.allowed).toBe(true)
  })
})

describe("checkExpensiveRateLimit", () => {
  test("allows up to 10 requests", () => {
    const key = `test-expensive-${Date.now()}`

    for (let i = 0; i < 10; i++) {
      const result = checkExpensiveRateLimit(key)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9 - i)
    }
  })

  test("blocks after 10 requests", () => {
    const key = `test-expensive-block-${Date.now()}`

    for (let i = 0; i < 10; i++) {
      checkExpensiveRateLimit(key)
    }

    const result = checkExpensiveRateLimit(key)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })
})
