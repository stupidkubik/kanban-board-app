import { NextResponse } from "next/server"

import { verifyAppCheckToken } from "@/lib/firebase/app-check"
import {
  clearSessionCookie,
  createSessionCookie,
  revokeCurrentSession,
} from "@/lib/firebase/session"
import { checkRateLimit, getRequestClientKey } from "@/lib/server/rate-limit"

// Firebase ID tokens are ~1 KB; anything far larger is not one.
const MAX_ID_TOKEN_LENGTH = 16_384

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    `session:create:${getRequestClientKey(request)}`,
    {
      limit: 10,
      windowMs: 60_000,
    }
  )

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many session attempts" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    )
  }

  const appCheck = await verifyAppCheckToken(request)
  if (!appCheck.ok) {
    return NextResponse.json({ error: appCheck.error }, { status: 401 })
  }

  let idToken: unknown
  try {
    const body = (await request.json()) as { idToken?: unknown }
    idToken = body?.idToken
  } catch {
    idToken = undefined
  }

  if (
    typeof idToken !== "string" ||
    idToken.length === 0 ||
    idToken.length > MAX_ID_TOKEN_LENGTH
  ) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 })
  }

  try {
    await createSessionCookie(idToken)
  } catch {
    // Expired, revoked, malformed or foreign-project tokens.
    return NextResponse.json({ error: "Invalid idToken" }, { status: 401 })
  }

  return NextResponse.json({ status: "ok" })
}

export async function DELETE(request: Request) {
  const appCheck = await verifyAppCheckToken(request)
  if (!appCheck.ok) {
    return NextResponse.json({ error: appCheck.error }, { status: 401 })
  }

  await revokeCurrentSession()
  await clearSessionCookie()
  return NextResponse.json({ status: "ok" })
}
