import { describe, test, expect } from "bun:test"
import { InflightDedup } from "../concurrency"

describe("InflightDedup", () => {
  test("returns same promise for concurrent calls with same key", async () => {
    const dedup = new InflightDedup<number>()
    let callCount = 0

    const fn = () => {
      callCount++
      return new Promise<number>((r) => setTimeout(() => r(42), 20))
    }

    const [a, b, c] = await Promise.all([
      dedup.run("key1", fn),
      dedup.run("key1", fn),
      dedup.run("key1", fn),
    ])

    expect(callCount).toBe(1)
    expect(a).toBe(42)
    expect(b).toBe(42)
    expect(c).toBe(42)
  })

  test("runs separate functions for different keys", async () => {
    const dedup = new InflightDedup<string>()
    let callCount = 0

    const fn = (val: string) => () => {
      callCount++
      return new Promise<string>((r) => setTimeout(() => r(val), 10))
    }

    const [a, b] = await Promise.all([
      dedup.run("key1", fn("first")),
      dedup.run("key2", fn("second")),
    ])

    expect(callCount).toBe(2)
    expect(a).toBe("first")
    expect(b).toBe("second")
  })

  test("cleans up after resolution, allowing re-computation", async () => {
    const dedup = new InflightDedup<number>()
    let callCount = 0

    const fn = () => {
      callCount++
      return Promise.resolve(callCount)
    }

    const first = await dedup.run("key1", fn)
    expect(first).toBe(1)
    expect(dedup.size).toBe(0)

    const second = await dedup.run("key1", fn)
    expect(second).toBe(2)
    expect(callCount).toBe(2)
  })

  test("cleans up after rejection", async () => {
    const dedup = new InflightDedup<number>()

    const failing = () => Promise.reject(new Error("boom"))

    const results = await Promise.allSettled([
      dedup.run("key1", failing),
      dedup.run("key1", failing),
    ])

    expect(results[0].status).toBe("rejected")
    expect(results[1].status).toBe("rejected")
    expect(dedup.size).toBe(0)
  })

  test("rejection does not poison subsequent calls", async () => {
    const dedup = new InflightDedup<string>()

    const failing = () => Promise.reject(new Error("boom"))
    await dedup.run("key1", failing).catch(() => {})

    const result = await dedup.run("key1", () => Promise.resolve("recovered"))
    expect(result).toBe("recovered")
  })

  test("size tracks inflight count accurately", async () => {
    const dedup = new InflightDedup<void>()
    const resolvers: (() => void)[] = []

    const makeFn = () => () =>
      new Promise<void>((r) => { resolvers.push(r) })

    dedup.run("a", makeFn())
    dedup.run("b", makeFn())
    dedup.run("c", makeFn())

    expect(dedup.size).toBe(3)

    resolvers[0]()
    await Promise.resolve()
    // need an extra tick for .finally() to fire
    await Promise.resolve()
    expect(dedup.size).toBe(2)

    resolvers[1]()
    resolvers[2]()
    await Promise.resolve()
    await Promise.resolve()
    expect(dedup.size).toBe(0)
  })
})
