import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"

import { adminDb } from "@/lib/firebase/admin"
import { verifyAppCheckToken } from "@/lib/firebase/app-check"
import { getSession } from "@/lib/firebase/session"
import { getErrorMessage } from "@/lib/errors"

class MemberRouteError extends Error {
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
    const boardSnapshot = await boardRef.get()
    if (!boardSnapshot.exists) {
      throw new MemberRouteError(404, "Board not found")
    }
    const currentBoard = boardSnapshot.data() as {
      ownerId?: string
      members?: Record<string, boolean>
    }
    const isLeaving = session.uid === memberId
    if (!isLeaving && currentBoard.ownerId !== session.uid) {
      throw new MemberRouteError(403, "Forbidden")
    }
    if (currentBoard.ownerId === memberId) {
      throw new MemberRouteError(409, "Board owner cannot leave or be removed")
    }
    if (currentBoard.members?.[memberId] !== true) {
      throw new MemberRouteError(404, "Board member not found")
    }

    const assignedCards = await boardRef
      .collection("cards")
      .where("assigneeIds", "array-contains", memberId)
      .limit(501)
      .get()
    if (assignedCards.size > 500) {
      throw new MemberRouteError(409, "Assignment cleanup exceeds card limit")
    }
    if (!assignedCards.empty) {
      const batch = adminDb.batch()
      assignedCards.docs.forEach((cardSnapshot) => {
        batch.update(cardSnapshot.ref, {
          assigneeIds: FieldValue.arrayRemove(memberId),
          updatedAt: FieldValue.serverTimestamp(),
        })
      })
      await batch.commit()
    }

    await adminDb.runTransaction(async (transaction) => {
      const boardSnapshot = await transaction.get(boardRef)
      if (!boardSnapshot.exists) {
        throw new MemberRouteError(404, "Board not found")
      }

      const board = boardSnapshot.data() as {
        ownerId?: string
        members?: Record<string, boolean>
        roles?: Record<string, string>
      }
      const isLeaving = session.uid === memberId

      if (!isLeaving && board.ownerId !== session.uid) {
        throw new MemberRouteError(403, "Forbidden")
      }
      if (board.ownerId === memberId) {
        throw new MemberRouteError(409, "Board owner cannot leave or be removed")
      }
      if (board.members?.[memberId] !== true) {
        throw new MemberRouteError(404, "Board member not found")
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
    if (error instanceof MemberRouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    const message = getErrorMessage(error, "Delete member failed")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
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

  let role: unknown
  try {
    const body = (await request.json()) as { role?: unknown }
    role = body.role
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (role !== "editor" && role !== "viewer") {
    return NextResponse.json(
      { error: "Role must be editor or viewer" },
      { status: 400 }
    )
  }

  try {
    const boardRef = adminDb.collection("boards").doc(boardId)

    await adminDb.runTransaction(async (transaction) => {
      const boardSnapshot = await transaction.get(boardRef)
      if (!boardSnapshot.exists) {
        throw new MemberRouteError(404, "Board not found")
      }

      const board = boardSnapshot.data() as {
        ownerId?: string
        members?: Record<string, boolean>
        roles?: Record<string, string>
      }

      if (board.ownerId !== session.uid) {
        throw new MemberRouteError(403, "Forbidden")
      }
      if (board.ownerId === memberId || board.roles?.[memberId] === "owner") {
        throw new MemberRouteError(409, "Board owner role cannot be changed")
      }
      if (
        board.members?.[memberId] !== true ||
        !board.roles?.[memberId]
      ) {
        throw new MemberRouteError(404, "Board member not found")
      }
      if (!["editor", "viewer"].includes(board.roles[memberId])) {
        throw new MemberRouteError(409, "Board member role cannot be changed")
      }
      if (board.roles[memberId] === role) {
        return
      }

      transaction.update(boardRef, {
        roles: {
          ...board.roles,
          [memberId]: role,
        },
        updatedAt: FieldValue.serverTimestamp(),
      })
    })

    return NextResponse.json({ status: "ok", role })
  } catch (error) {
    if (error instanceof MemberRouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    const message = getErrorMessage(error, "Update member role failed")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
