/**
 * Semaphore: limits the number of concurrent async operations.
 * Callers that exceed the limit wait in a FIFO queue.
 */
export class Semaphore {
  private running = 0
  private readonly queue: (() => void)[] = []

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++
      return
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve)
    })
  }

  release(): void {
    const next = this.queue.shift()
    if (next) {
      next()
    } else {
      this.running--
    }
  }

  get pending(): number {
    return this.queue.length
  }

  get active(): number {
    return this.running
  }
}

/**
 * Deduplicates concurrent calls that share the same key.
 * If a computation for a key is already in-flight, subsequent
 * callers receive the same promise instead of starting a new one.
 */
export class InflightDedup<T> {
  private readonly inflight = new Map<string, Promise<T>>()

  async run(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key)
    if (existing) return existing

    const promise = fn().finally(() => {
      this.inflight.delete(key)
    })

    this.inflight.set(key, promise)
    return promise
  }

  get size(): number {
    return this.inflight.size
  }
}
