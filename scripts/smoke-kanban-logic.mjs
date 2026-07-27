const SAFE_SMOKE_UID_PATTERN = /^smoke-[a-z0-9][a-z0-9-]{2,63}$/

export const isSafeSmokeUid = (uid) => SAFE_SMOKE_UID_PATTERN.test(uid)

export const createSmokeIdentity = (now, suffix) => {
  const normalizedSuffix = suffix.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12)
  if (!normalizedSuffix) {
    throw new Error("Smoke suffix must contain letters or digits.")
  }

  return {
    uid: `smoke-${now}-${normalizedSuffix}`,
    boardTitle: `__kanban_smoke__ ${now}-${normalizedSuffix}`,
  }
}
