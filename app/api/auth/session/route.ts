import { NextResponse } from "next/server"

import { verifyAppCheckToken } from "@/lib/firebase/app-check"
import { clearSessionCookie, createSessionCookie } from "@/lib/firebase/session"
import { checkRateLimit, getRequestClientKey } from "@/lib/server/rate-limit"

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(`session:create:${getRequestClientKey(request)}`, {
    limit: 10,
    windowMs: 60_000,
  })

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many session attempts" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    )
  }

  const appCheck = await verifyAppCheckToken(request)
  if (!appCheck.ok) {
    return NextResponse.json({ error: appCheck.error }, { status: 401 })
  }

  let idToken = ""

  try {
    const body = (await request.json()) as { idToken?: string }
    idToken = body.idToken ?? ""
  } catch {
    idToken = ""
  }

  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 })
  }

  await createSessionCookie(idToken)

  return NextResponse.json({ status: "ok" })
}

export async function DELETE(request: Request) {
  const appCheck = await verifyAppCheckToken(request)
  if (!appCheck.ok) {
    return NextResponse.json({ error: appCheck.error }, { status: 401 })
  }

  await clearSessionCookie()
  return NextResponse.json({ status: "ok" })
}
