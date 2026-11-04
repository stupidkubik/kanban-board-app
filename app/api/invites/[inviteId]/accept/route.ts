import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"

import { adminAuth, adminDb } from "@/lib/firebase/admin"
import { verifyAppCheckToken } from "@/lib/firebase/app-check"
import { getSession } from "@/lib/firebase/session"
import { internalErrorResponse } from "@/lib/server/error-response"
import {
  MAX_BOARD_MEMBERS,
  hasOnlyKeys,
  isDocumentId,
  isInviteId,
  isPlainObject,
  parseProfileFields,
} from "@/lib/server/route-input"

class AcceptInviteError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string
  ) {
    super(message)
  }
}

// `email` is accepted for older clients but ignored: the account decides it.
const ACCEPT_INVITE_KEYS = [
  "boardId",
  "displayName",
  "email",
  "photoURL",
] as const

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
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!isPlainObject(body) || !hasOnlyKeys(body, ACCEPT_INVITE_KEYS)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const boardId = body.boardId
  const profile = parseProfileFields(body)
  if (!isInviteId(inviteId) || !isDocumentId(boardId) || !profile) {
    return NextResponse.json(
      { error: "Invalid inviteId, boardId or profile" },
      { status: 400 }
    )
  }

  // Session cookie claims are frozen at sign-in, so read the live account:
  // a user who verified their address later is accepted, and a password
  // account registered for someone else's unverified address is not.
  let accountEmail: string
  try {
    const account = await adminAuth.getUser(session.uid)
    if (!account.email || !account.emailVerified) {
      return NextResponse.json(
        { error: "Email not verified", code: "email-not-verified" },
        { status: 403 }
      )
    }
    accountEmail = account.email.toLowerCase()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const inviteRef = adminDb.collection("boardInvites").doc(inviteId)
    const boardRef = adminDb.collection("boards").doc(boardId)
    const profileRef = boardRef.collection("memberProfiles").doc(session.uid)

    await adminDb.runTransaction(async (transaction) => {
      const [inviteSnapshot, boardSnapshot, profileSnapshot] =
        await Promise.all([
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
        { boardId?: string; email?: string; role?: string } | undefined

      if (inviteSnapshot.exists && invite) {
        if (invite.boardId !== boardId) {
          throw new AcceptInviteError(400, "Invite board mismatch")
        }
        if (invite.email?.toLowerCase() !== accountEmail) {
          throw new AcceptInviteError(403, "Invite email mismatch")
        }
      } else if (!alreadyMember) {
        throw new AcceptInviteError(404, "Invite not found")
      }

      if (!alreadyMember) {
        if (!invite || (invite.role !== "editor" && invite.role !== "viewer")) {
          throw new AcceptInviteError(400, "Invalid invite role")
        }
        // Rules reject any client board update once members exceed the cap.
        if (Object.keys(board.members ?? {}).length >= MAX_BOARD_MEMBERS) {
          throw new AcceptInviteError(
            409,
            "Board member limit reached",
            "member-limit"
          )
        }

        transaction.update(boardRef, {
          members: { ...board.members, [session.uid]: true },
          roles: { ...board.roles, [session.uid]: invite.role },
          updatedAt: FieldValue.serverTimestamp(),
        })
      }

      if (!profileSnapshot.exists) {
        transaction.set(profileRef, {
          displayName: profile.displayName,
          email: accountEmail,
          photoURL: profile.photoURL,
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
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }
    return internalErrorResponse(error, "Accept invite failed")
  }
}
