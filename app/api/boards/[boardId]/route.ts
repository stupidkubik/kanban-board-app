import { NextResponse } from "next/server"
import type { Query } from "firebase-admin/firestore"

import { adminDb } from "@/lib/firebase/admin"
import { getSession } from "@/lib/firebase/session"

const DELETE_BATCH_SIZE = 500

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

export async function DELETE(
  _request: Request,
  { params }: { params: { boardId: string } | Promise<{ boardId: string }> }
) {
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
