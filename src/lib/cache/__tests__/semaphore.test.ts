import { describe, test, expect } from "bun:test"
import { Semaphore } from "../concurrency"

function defer(): { resolve: () => void; promise: Promise<void> } {
  let resolve!: () => void
  const promise = new Promise<void>((r) => { resolve = r })
  return { resolve, promise }
}

describe("Semaphore", () => {
  test("allows up to max concurrent acquires", async () => {
    const sem = new Semaphore(3)

    await sem.acquire()
    await sem.acquire()
    await sem.acquire()

    expect(sem.active).toBe(3)
    expect(sem.pending).toBe(0)
  })

  test("queues acquires beyond max", async () => {
    const sem = new Semaphore(2)

    await sem.acquire()
    await sem.acquire()

    let fourthAcquired = false
    const p = sem.acquire().then(() => { fourthAcquired = true })

    // yield so microtasks settle
    await Promise.resolve()

    expect(fourthAcquired).toBe(false)
    expect(sem.pending).toBe(1)

    sem.release()
    await p

    expect(fourthAcquired).toBe(true)
    expect(sem.pending).toBe(0)
  })

  test("releases in FIFO order", async () => {
    const sem = new Semaphore(1)
    await sem.acquire()

    const order: number[] = []

    const p1 = sem.acquire().then(() => order.push(1))
    const p2 = sem.acquire().then(() => order.push(2))
    const p3 = sem.acquire().then(() => order.push(3))

    expect(sem.pending).toBe(3)

    sem.release()
    await p1
    sem.release()
    await p2
    sem.release()
    await p3

    expect(order).toEqual([1, 2, 3])
  })

  test("release without waiters decrements active count", () => {
    const sem = new Semaphore(2)

    // synchronous acquire (under limit)
    sem.acquire()
    sem.acquire()

    expect(sem.active).toBe(2)

    sem.release()
    expect(sem.active).toBe(1)

    sem.release()
    expect(sem.active).toBe(0)
  })

  test("limits actual concurrency in a workload", async () => {
    const sem = new Semaphore(3)
    let peak = 0
    let current = 0

    async function work(): Promise<void> {
      await sem.acquire()
      current++
      if (current > peak) peak = current
      // simulate async work
      await new Promise((r) => setTimeout(r, 10))
      current--
      sem.release()
    }

    await Promise.all(Array.from({ length: 20 }, () => work()))

    expect(peak).toBeLessThanOrEqual(3)
    expect(sem.active).toBe(0)
    expect(sem.pending).toBe(0)
  })
})
