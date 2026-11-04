// Users see the localized fallback each call site passes in, never a raw SDK
// or server message ("Missing or insufficient permissions."). Raw details
// stay in the console; known codes are mapped to copy where they matter.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export type SerializedError = {
  name: string
  message: string
  code?: string
  status?: number
}

export const getErrorCode = (error: unknown): string | undefined =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string"
    ? error.code
    : undefined

const readMessage = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof error.message === "string"
    ? error.message
    : undefined

const readStatus = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  typeof error.status === "number"
    ? error.status
    : undefined

// RTK Query keeps mutation errors in the store, which must stay serializable.
export const serializeError = (
  error: unknown,
  fallback: string
): SerializedError => {
  const code = getErrorCode(error)
  const status = readStatus(error)
  return {
    name: error instanceof Error ? error.name : "Error",
    message: readMessage(error) ?? fallback,
    ...(code ? { code } : {}),
    ...(status !== undefined ? { status } : {}),
  }
}

// Turns a failed API response into an ApiError that keeps the server's code.
export const readApiError = async (response: Response, fallback: string) => {
  let code: string | undefined
  let message = fallback
  try {
    const payload = (await response.json()) as {
      code?: unknown
      error?: unknown
    }
    if (typeof payload.code === "string") code = payload.code
    if (typeof payload.error === "string") message = payload.error
  } catch {
    // Keep the fallback when the server does not return JSON.
  }
  return new ApiError(response.status, code, message)
}

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (error !== undefined && error !== null) {
    console.warn("[kanban]", fallback, error)
  }
  return fallback
}
