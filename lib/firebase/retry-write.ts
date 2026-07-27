import "client-only"

import { clientAuth } from "@/lib/firebase/client"

const transientCodes = new Set([
  "auth/internal-error",
  "auth/network-request-failed",
  "auth/timeout",
  "firestore/unavailable",
  "unavailable",
])

export const isTransientFirebaseError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false
  }

  const candidate = error as { code?: unknown; message?: unknown; name?: unknown }
  if (
    typeof candidate.code === "string" &&
    transientCodes.has(candidate.code)
  ) {
    return true
  }
  if (candidate.name === "AbortError") {
    return true
  }

  const message =
    typeof candidate.message === "string" ? candidate.message.toLowerCase() : ""
  return (
    message.includes("auth/internal-error") ||
    message.includes("network-request-failed") ||
    message.includes("the user aborted a request") ||
    message.includes("aborterror") ||
    message.includes("code=unavailable")
  )
}

export const retryFirebaseWrite = async <Result>(
  write: () => Promise<Result>
): Promise<Result> => {
  try {
    return await write()
  } catch (error) {
    if (!isTransientFirebaseError(error)) {
      throw error
    }

    try {
      await clientAuth.currentUser?.getIdToken(true)
    } catch {
      // The write retry below remains useful for transient Firestore failures.
    }
    return write()
  }
}
