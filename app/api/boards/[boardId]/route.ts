import { NextResponse } from "next/server"
import { FieldValue, type Query } from "firebase-admin/firestore"

import { adminDb } from "@/lib/firebase/admin"
import { verifyAppCheckToken } from "@/lib/firebase/app-check"
import { getSession } from "@/lib/firebase/session"

const DELETE_BATCH_SIZE = 500
const MAX_INVITES_PER_RENAME = 499

const deleteByQuery = async (query: Query) => {
  while (true) {
    const snapshot = await query.limit(DELETE_BATCH_SIZE).get()
    if (snapshot.empty) {
      break
    }

    const batch = adminDb.batch()
    snapshot.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()

    if (snapshot.size < DELETE_BATCH_SIZE) {
      break
    }
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const appCheck = await verifyAppCheckToken(request)
  if (!appCheck.ok) {
    return NextResponse.json({ error: appCheck.error }, { status: 401 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { boardId } = await params
  if (!boardId) {
    return NextResponse.json({ error: "Missing boardId" }, { status: 400 })
  }

  try {
    const snapshot = await adminDb.collection("boards").doc(boardId).get()
    if (!snapshot.exists) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }
    const board = snapshot.data() as { members?: Record<string, boolean> }
    if (board.members?.[session.uid] !== true) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ status: "ok" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Board access check failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const appCheck = await verifyAppCheckToken(request)
  if (!appCheck.ok) {
    return NextResponse.json({ error: appCheck.error }, { status: 401 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { boardId } = await params
  let title = ""
  try {
    const body = (await request.json()) as { title?: string }
    title = body.title?.trim() ?? ""
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!boardId || !title) {
    return NextResponse.json({ error: "Missing boardId or title" }, { status: 400 })
  }

  try {
    const boardRef = adminDb.collection("boards").doc(boardId)
    const invitesQuery = adminDb
      .collection("boardInvites")
      .where("boardId", "==", boardId)
      .limit(MAX_INVITES_PER_RENAME + 1)

    await adminDb.runTransaction(async (transaction) => {
      const [boardSnapshot, invitesSnapshot] = await Promise.all([
        transaction.get(boardRef),
        transaction.get(invitesQuery),
      ])

      if (!boardSnapshot.exists) {
        throw new Error("BOARD_NOT_FOUND")
      }
      const board = boardSnapshot.data() as {
        ownerId?: string
        roles?: Record<string, string>
      }
      const role =
        board.ownerId === session.uid ? "owner" : board.roles?.[session.uid]
      if (!role || !["owner", "editor"].includes(role)) {
        throw new Error("FORBIDDEN")
      }
      if (invitesSnapshot.size > MAX_INVITES_PER_RENAME) {
        throw new Error("TOO_MANY_INVITES")
      }

      transaction.update(boardRef, {
        title,
        updatedAt: FieldValue.serverTimestamp(),
      })
      invitesSnapshot.docs.forEach((invite) => {
        transaction.update(invite.ref, { boardTitle: title })
      })
    })

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "BOARD_NOT_FOUND") {
        return NextResponse.json({ error: "Board not found" }, { status: 404 })
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      if (error.message === "TOO_MANY_INVITES") {
        return NextResponse.json(
          { error: "Too many pending invites to rename atomically" },
          { status: 409 }
        )
      }
    }
    const message = error instanceof Error ? error.message : "Update board failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const appCheck = await verifyAppCheckToken(request)
  if (!appCheck.ok) {
    return NextResponse.json({ error: appCheck.error }, { status: 401 })
  }

  const { boardId } = await params
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!boardId) {
    return NextResponse.json({ error: "Missing boardId" }, { status: 400 })
  }

  try {
    const boardRef = adminDb.collection("boards").doc(boardId)
    const snapshot = await boardRef.get()

    if (!snapshot.exists) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    const data = snapshot.data() as { ownerId?: string }
    if (data.ownerId !== session.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await deleteByQuery(boardRef.collection("columns"))
    await deleteByQuery(boardRef.collection("cards"))
    await deleteByQuery(boardRef.collection("memberProfiles"))
    await deleteByQuery(
      adminDb.collection("boardInvites").where("boardId", "==", boardId)
    )

    await boardRef.delete()

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete board failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
