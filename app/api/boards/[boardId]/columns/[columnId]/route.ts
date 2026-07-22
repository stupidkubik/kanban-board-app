import { NextResponse } from "next/server"

import { adminDb } from "@/lib/firebase/admin"
import { verifyAppCheckToken } from "@/lib/firebase/app-check"
import { getSession } from "@/lib/firebase/session"

const COLUMN_NOT_EMPTY = "COLUMN_NOT_EMPTY"

class DeleteColumnError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string
  ) {
    super(message)
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ boardId: string; columnId: string }>
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

  const { boardId, columnId } = await params
  if (!boardId || !columnId) {
    return NextResponse.json(
      { error: "Missing boardId or columnId" },
      { status: 400 }
    )
  }

  try {
    const boardRef = adminDb.collection("boards").doc(boardId)
    const columnRef = boardRef.collection("columns").doc(columnId)
    const cardsQuery = boardRef
      .collection("cards")
      .where("columnId", "==", columnId)
      .limit(1)

    await adminDb.runTransaction(async (transaction) => {
      const boardSnapshot = await transaction.get(boardRef)
      if (!boardSnapshot.exists) {
        throw new DeleteColumnError(404, "Board not found")
      }

      const board = boardSnapshot.data() as { ownerId?: string }
      if (board.ownerId !== session.uid) {
        throw new DeleteColumnError(403, "Forbidden")
      }

      const [columnSnapshot, cardsSnapshot] = await Promise.all([
        transaction.get(columnRef),
        transaction.get(cardsQuery),
      ])

      if (!columnSnapshot.exists) {
        throw new DeleteColumnError(404, "Column not found")
      }
      if (!cardsSnapshot.empty) {
        throw new DeleteColumnError(
          409,
          "Column is not empty",
          COLUMN_NOT_EMPTY
        )
      }

      transaction.delete(columnRef)
    })

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    if (error instanceof DeleteColumnError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    const message = error instanceof Error ? error.message : "Delete column failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
