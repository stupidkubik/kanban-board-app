import { NextResponse } from "next/server"

import { clearSessionCookie, createSessionCookie } from "@/lib/firebase/session"

export async function POST(request: Request) {
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

export async function DELETE() {
  await clearSessionCookie()
  return NextResponse.json({ status: "ok" })
}
