import { NextResponse } from "next/server"

import { verifyAppCheckToken } from "@/lib/firebase/app-check"
import { clearSessionCookie, createSessionCookie } from "@/lib/firebase/session"

export async function POST(request: Request) {
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
