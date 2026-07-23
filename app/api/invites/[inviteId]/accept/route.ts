import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"

import { adminDb } from "@/lib/firebase/admin"
import { verifyAppCheckToken } from "@/lib/firebase/app-check"
import { getSession } from "@/lib/firebase/session"
import { getErrorMessage } from "@/lib/errors"

class AcceptInviteError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

type AcceptInviteBody = {
  boardId?: string
  displayName?: string | null
  email?: string | null
  photoURL?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const appCheck = await verifyAppCheckToken(request)
  if (!appCheck.ok) {
    return NextResponse.json({ error: appCheck.error }, { status: 401 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { inviteId } = await params
  let body: AcceptInviteBody = {}
  try {
    body = (await request.json()) as AcceptInviteBody
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!inviteId || !body.boardId) {
    return NextResponse.json(
      { error: "Missing inviteId or boardId" },
      { status: 400 }
    )
  }

  try {
    const inviteRef = adminDb.collection("boardInvites").doc(inviteId)
    const boardRef = adminDb.collection("boards").doc(body.boardId)
    const profileRef = boardRef.collection("memberProfiles").doc(session.uid)

    await adminDb.runTransaction(async (transaction) => {
      const [inviteSnapshot, boardSnapshot, profileSnapshot] = await Promise.all([
        transaction.get(inviteRef),
        transaction.get(boardRef),
        transaction.get(profileRef),
      ])

      if (!boardSnapshot.exists) {
        throw new AcceptInviteError(404, "Board not found")
      }

      const board = boardSnapshot.data() as {
        members?: Record<string, boolean>
        roles?: Record<string, string>
      }
      const alreadyMember = board.members?.[session.uid] === true
      const invite = inviteSnapshot.data() as
        | { boardId?: string; email?: string; role?: string }
        | undefined

      if (inviteSnapshot.exists && invite) {
        if (invite.boardId !== body.boardId) {
          throw new AcceptInviteError(400, "Invite board mismatch")
        }
        if (!session.email || invite.email?.toLowerCase() !== session.email.toLowerCase()) {
          throw new AcceptInviteError(403, "Invite email mismatch")
        }
      } else if (!alreadyMember) {
          throw new AcceptInviteError(404, "Invite not found")
      }

      if (!alreadyMember) {
        if (!invite || (invite.role !== "editor" && invite.role !== "viewer")) {
          throw new AcceptInviteError(400, "Invalid invite role")
        }

        transaction.update(boardRef, {
          members: { ...board.members, [session.uid]: true },
          roles: { ...board.roles, [session.uid]: invite.role },
          updatedAt: FieldValue.serverTimestamp(),
        })
      }

      if (!profileSnapshot.exists) {
        transaction.set(profileRef, {
          displayName: body.displayName ?? null,
          email: session.email ?? body.email ?? null,
          photoURL: body.photoURL ?? null,
          joinedAt: FieldValue.serverTimestamp(),
        })
      }
      if (inviteSnapshot.exists) {
        transaction.delete(inviteRef)
      }
    })

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    if (error instanceof AcceptInviteError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = getErrorMessage(error, "Accept invite failed")
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
