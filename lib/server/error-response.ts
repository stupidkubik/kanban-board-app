import { NextResponse } from "next/server"

const readCode = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (typeof error.code === "string" || typeof error.code === "number")
    ? error.code
    : undefined

// Unexpected failures: the details (Firestore paths, gRPC codes, SDK text)
// go to the server log under an id; the client gets the fallback and the id.
export const internalErrorResponse = (error: unknown, fallback: string) => {
  const errorId = globalThis.crypto.randomUUID()
  console.error({
    event: "api_error",
    errorId,
    summary: fallback,
    name: error instanceof Error ? error.name : typeof error,
    code: readCode(error),
    message: error instanceof Error ? error.message : String(error),
  })
  return NextResponse.json({ error: fallback, errorId }, { status: 500 })
}
