import fs from "node:fs"
import path from "node:path"
import { afterAll, beforeAll, describe, it } from "vitest"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import {
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore"

const projectId = "kanban-test"
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST)
const describeRules = hasEmulator ? describe : describe.skip

const rulesPath = path.join(process.cwd(), "firestore.rules")

const makeTimestamp = () => Timestamp.fromMillis(Date.now())

const seedBoard = async (env: RulesTestEnvironment, boardId: string) => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, "boards", boardId), {
      title: "Test Board",
      ownerId: "owner",
      members: {
        owner: true,
        editor: true,
        viewer: true,
      },
      roles: {
        owner: "owner",
        editor: "editor",
        viewer: "viewer",
      },
      language: "en",
      createdAt: makeTimestamp(),
      updatedAt: makeTimestamp(),
    })
  })
}

const seedInvite = async (
  env: RulesTestEnvironment,
  inviteId: string,
  boardId: string,
  email: string,
  role: "editor" | "viewer"
) => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, "boardInvites", inviteId), {
      boardId,
      boardTitle: "Test Board",
      email,
      role,
      invitedById: "owner",
      createdAt: makeTimestamp(),
    })
  })
}

describeRules("firestore rules", () => {
  let env: RulesTestEnvironment | null = null

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: fs.readFileSync(rulesPath, "utf8"),
      },
    })
  })

  afterAll(async () => {
    if (env) {
      await env.cleanup()
    }
  })

  it("denies reads for unauthenticated users", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)

    const db = env!.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, "boards", boardId)))
  })

  it("allows members to read boards", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)

    const db = env!.authenticatedContext("viewer").firestore()
    await assertSucceeds(getDoc(doc(db, "boards", boardId)))
  })

  it("blocks viewers from updating board data", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)

    const db = env!.authenticatedContext("viewer").firestore()
    await assertFails(
      updateDoc(doc(db, "boards", boardId), {
        title: "Nope",
        updatedAt: makeTimestamp(),
      })
    )
  })

  it("allows editors to update board title", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)

    const db = env!.authenticatedContext("editor").firestore()
    await assertSucceeds(
      updateDoc(doc(db, "boards", boardId), {
        title: "Updated",
        updatedAt: makeTimestamp(),
      })
    )
  })

  it("enforces column permissions by role", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)

    const columnPayload = {
      title: "Todo",
      order: 1,
      createdAt: makeTimestamp(),
      updatedAt: makeTimestamp(),
    }

    const viewerDb = env!.authenticatedContext("viewer").firestore()
    await assertFails(
      setDoc(doc(viewerDb, "boards", boardId, "columns", "col-1"), columnPayload)
    )

    const editorDb = env!.authenticatedContext("editor").firestore()
    await assertSucceeds(
      setDoc(doc(editorDb, "boards", boardId, "columns", "col-1"), columnPayload)
    )
  })

  it("enforces card permissions by role", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)

    const cardPayload = {
      columnId: "col-1",
      title: "Card",
      order: 10,
      createdById: "editor",
      createdAt: makeTimestamp(),
      updatedAt: makeTimestamp(),
    }

    const viewerDb = env!.authenticatedContext("viewer").firestore()
    await assertFails(
      setDoc(doc(viewerDb, "boards", boardId, "cards", "card-1"), cardPayload)
    )

    const editorDb = env!.authenticatedContext("editor").firestore()
    await assertSucceeds(
      setDoc(doc(editorDb, "boards", boardId, "cards", "card-1"), cardPayload)
    )
  })

  it("allows invite acceptance only with a valid invite and matching role", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)

    const inviteEmail = "invitee@example.com"
    const inviteId = `${boardId}__${inviteEmail}`
    await seedInvite(env!, inviteId, boardId, inviteEmail, "viewer")

    const inviteeDb = env!
      .authenticatedContext("invitee", { email: inviteEmail })
      .firestore()

    await assertSucceeds(
      updateDoc(doc(inviteeDb, "boards", boardId), {
        "members.invitee": true,
        "roles.invitee": "viewer",
      })
    )

    await assertFails(
      updateDoc(doc(inviteeDb, "boards", boardId), {
        "members.invitee": true,
        "roles.invitee": "editor",
      })
    )
  })
})
