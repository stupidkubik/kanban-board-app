import { describe, expect, it } from "vitest"

import { getCopy, type Locale } from "@/lib/i18n"

const keysAtEveryLevel = (value: unknown, prefix = ""): string[] => {
  if (!value || typeof value !== "object") {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, child]) =>
    keysAtEveryLevel(child, prefix ? `${prefix}.${key}` : key)
  )
}

describe("i18n copy", () => {
  it("keeps the same complete key set for Russian and English", () => {
    const russian = getCopy("ru")
    const english = getCopy("en")

    expect(keysAtEveryLevel(russian).sort()).toEqual(
      keysAtEveryLevel(english).sort()
    )
    expect(keysAtEveryLevel(russian)).toHaveLength(168)
  })

  it("falls back to Russian for an unsupported runtime locale", () => {
    expect(getCopy("de" as Locale)).toBe(getCopy("ru"))
  })
})
