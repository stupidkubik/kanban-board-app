import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"

import { adminDb } from "@/lib/firebase/admin"
import { verifyAppCheckToken } from "@/lib/firebase/app-check"
import { getSession } from "@/lib/firebase/session"

class DeleteMemberError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ boardId: string; memberId: string }>
  }
) {
  const appCheck = await verifyAppCheckToken(request)
  if (!appCheck.ok) {
    return NextResponse.json({ error: appCheck.error }, { status: 401 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { boardId, memberId } = await params
  if (!boardId || !memberId) {
    return NextResponse.json(
      { error: "Missing boardId or memberId" },
      { status: 400 }
    )
  }

  try {
    const boardRef = adminDb.collection("boards").doc(boardId)
    const profileRef = boardRef.collection("memberProfiles").doc(memberId)

    await adminDb.runTransaction(async (transaction) => {
      const boardSnapshot = await transaction.get(boardRef)
      if (!boardSnapshot.exists) {
        throw new DeleteMemberError(404, "Board not found")
      }

      const board = boardSnapshot.data() as {
        ownerId?: string
        members?: Record<string, boolean>
        roles?: Record<string, string>
      }
      const isLeaving = session.uid === memberId

      if (!isLeaving && board.ownerId !== session.uid) {
        throw new DeleteMemberError(403, "Forbidden")
      }
      if (board.ownerId === memberId) {
        throw new DeleteMemberError(409, "Board owner cannot leave or be removed")
      }
      if (board.members?.[memberId] !== true) {
        throw new DeleteMemberError(404, "Board member not found")
      }

      const members = { ...board.members }
      const roles = { ...board.roles }
      delete members[memberId]
      delete roles[memberId]

      transaction.update(boardRef, {
        members,
        roles,
        updatedAt: FieldValue.serverTimestamp(),
      })
      transaction.delete(profileRef)
    })

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    if (error instanceof DeleteMemberError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    const message = error instanceof Error ? error.message : "Delete member failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
