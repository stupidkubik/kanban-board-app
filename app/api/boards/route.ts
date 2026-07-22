import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"

import { adminDb } from "@/lib/firebase/admin"
import { verifyAppCheckToken } from "@/lib/firebase/app-check"
import { getSession } from "@/lib/firebase/session"

type CreateBoardBody = {
  boardId?: string
  title?: string
  language?: string
  displayName?: string | null
  email?: string | null
  photoURL?: string | null
}

export async function POST(request: Request) {
  const appCheck = await verifyAppCheckToken(request)
  if (!appCheck.ok) {
    return NextResponse.json({ error: appCheck.error }, { status: 401 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: CreateBoardBody = {}
  try {
    body = (await request.json()) as CreateBoardBody
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const title = body.title?.trim()
  if (!body.boardId || !title || !["ru", "en"].includes(body.language ?? "")) {
    return NextResponse.json({ error: "Invalid board data" }, { status: 400 })
  }

  try {
    const boardRef = adminDb.collection("boards").doc(body.boardId)
    const profileRef = boardRef.collection("memberProfiles").doc(session.uid)

    await adminDb.runTransaction(async (transaction) => {
      const boardSnapshot = await transaction.get(boardRef)
      if (boardSnapshot.exists) {
        const board = boardSnapshot.data() as {
          ownerId?: string
          title?: string
          language?: string
        }
        if (
          board.ownerId !== session.uid ||
          board.title !== title ||
          board.language !== body.language
        ) {
          throw new Error("BOARD_ID_CONFLICT")
        }
        return
      }

      transaction.create(boardRef, {
        title,
        ownerId: session.uid,
        members: { [session.uid]: true },
        roles: { [session.uid]: "owner" },
        language: body.language,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      transaction.create(profileRef, {
        displayName: body.displayName ?? null,
        email: session.email ?? body.email ?? null,
        photoURL: body.photoURL ?? null,
        joinedAt: FieldValue.serverTimestamp(),
      })
    })

    return NextResponse.json({ status: "ok", boardId: body.boardId })
  } catch (error) {
    if (error instanceof Error && error.message === "BOARD_ID_CONFLICT") {
      return NextResponse.json({ error: "Board ID conflict" }, { status: 409 })
    }
    const message = error instanceof Error ? error.message : "Create board failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
