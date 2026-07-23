type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  limit: number
  windowMs: number
  now?: number
}

export type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

const MAX_ENTRIES = 10_000

export function createFixedWindowRateLimiter() {
  const entries = new Map<string, RateLimitEntry>()

  return (key: string, { limit, windowMs, now = Date.now() }: RateLimitOptions): RateLimitResult => {
    const current = entries.get(key)

    if (!current || current.resetAt <= now) {
      if (entries.size >= MAX_ENTRIES) {
        for (const [entryKey, entry] of entries) {
          if (entry.resetAt <= now) entries.delete(entryKey)
        }

        if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value ?? "")
      }

      entries.set(key, { count: 1, resetAt: now + windowMs })
      return { allowed: true, retryAfterSeconds: 0 }
    }

    current.count += 1

    return {
      allowed: current.count <= limit,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }
}

declare global {
  var __kanbanRateLimit: ReturnType<typeof createFixedWindowRateLimiter> | undefined
}

export const checkRateLimit =
  globalThis.__kanbanRateLimit ?? (globalThis.__kanbanRateLimit = createFixedWindowRateLimiter())

export function getRequestClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwardedFor || request.headers.get("x-real-ip")?.trim() || "unknown"
}
