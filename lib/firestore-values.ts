export function toMillis(value: unknown): number | undefined {
  if (!value || typeof value !== "object") return undefined

  const timestamp = value as { toMillis?: () => number }
  return typeof timestamp.toMillis === "function" ? timestamp.toMillis() : undefined
}
