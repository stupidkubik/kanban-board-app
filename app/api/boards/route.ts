import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"

import { adminDb } from "@/lib/firebase/admin"
import { verifyAppCheckToken } from "@/lib/firebase/app-check"
import { getSession } from "@/lib/firebase/session"
import { internalErrorResponse } from "@/lib/server/error-response"
import {
  hasOnlyKeys,
  isDocumentId,
  isPlainObject,
  parseBoardTitle,
  parseProfileFields,
} from "@/lib/server/route-input"

// `email` is accepted for older clients but ignored: the session decides it.
const CREATE_BOARD_KEYS = [
  "boardId",
  "title",
  "language",
  "displayName",
  "email",
  "photoURL",
] as const

export async function POST(request: Request) {
  const appCheck = await verifyAppCheckToken(request)
  if (!appCheck.ok) {
    return NextResponse.json({ error: appCheck.error }, { status: 401 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!isPlainObject(body) || !hasOnlyKeys(body, CREATE_BOARD_KEYS)) {
    return NextResponse.json({ error: "Invalid board data" }, { status: 400 })
  }
  const boardId = body.boardId
  const title = parseBoardTitle(body.title)
  const language = body.language
  const profile = parseProfileFields(body)
  if (
    !isDocumentId(boardId) ||
    !title ||
    (language !== "ru" && language !== "en") ||
    !profile
  ) {
    return NextResponse.json({ error: "Invalid board data" }, { status: 400 })
  }

  try {
    const boardRef = adminDb.collection("boards").doc(boardId)
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
          board.language !== language
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
        language,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      transaction.create(profileRef, {
        displayName: profile.displayName,
        email: session.email ?? null,
        photoURL: profile.photoURL,
        joinedAt: FieldValue.serverTimestamp(),
      })
    })

    return NextResponse.json({ status: "ok", boardId })
  } catch (error) {
    if (error instanceof Error && error.message === "BOARD_ID_CONFLICT") {
      return NextResponse.json({ error: "Board ID conflict" }, { status: 409 })
    }
    return internalErrorResponse(error, "Create board failed")
  }
}
