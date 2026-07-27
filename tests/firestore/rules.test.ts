// @vitest-environment node
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
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
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

const seedColumn = async (
  env: RulesTestEnvironment,
  boardId: string,
  columnId = "col-1"
) => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, "boards", boardId, "columns", columnId), {
      title: "Todo",
      order: 1,
      createdAt: makeTimestamp(),
      updatedAt: makeTimestamp(),
    })
  })
}

const seedLabel = async (
  env: RulesTestEnvironment,
  boardId: string,
  labelId = "label-1"
) => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await updateDoc(doc(db, "boards", boardId), {
      labelIds: { [labelId]: true },
      labelNames: { bug: labelId },
    })
    await setDoc(doc(db, "boards", boardId, "labels", labelId), {
      name: "Bug",
      normalizedName: "bug",
      color: "red",
      order: 1,
      createdAt: makeTimestamp(),
      updatedAt: makeTimestamp(),
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

  it("reserves board rename for the server but allows editor metadata updates", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)

    const db = env!.authenticatedContext("editor").firestore()
    await assertFails(
      updateDoc(doc(db, "boards", boardId), {
        title: "Updated",
        updatedAt: makeTimestamp(),
      })
    )

    await assertSucceeds(
      updateDoc(doc(db, "boards", boardId), {
        language: "ru",
        updatedAt: makeTimestamp(),
      })
    )
  })

  it("enforces column permissions and reserves deletion for the server", async () => {
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

    const ownerDb = env!.authenticatedContext("owner").firestore()
    await assertFails(
      deleteDoc(doc(ownerDb, "boards", boardId, "columns", "col-1"))
    )
  })

  it("enforces card permissions by role", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)
    await seedColumn(env!, boardId)

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

    await assertFails(
      updateDoc(doc(viewerDb, "boards", boardId, "cards", "card-1"), {
        title: "Viewer edit",
        updatedAt: makeTimestamp(),
      })
    )
    await assertSucceeds(
      updateDoc(doc(editorDb, "boards", boardId, "cards", "card-1"), {
        title: "Editor edit",
        updatedAt: makeTimestamp(),
      })
    )
    await assertFails(
      deleteDoc(doc(editorDb, "boards", boardId, "cards", "card-1"))
    )
    const ownerDb = env!.authenticatedContext("owner").firestore()
    await assertSucceeds(
      deleteDoc(doc(ownerDb, "boards", boardId, "cards", "card-1"))
    )
  })

  it("allows members to read labels and reserves catalog writes for server routes", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    const emptyBoardId = `${boardId}-empty`
    await seedBoard(env!, boardId)
    await seedBoard(env!, emptyBoardId)
    await seedLabel(env!, boardId)

    const viewerDb = env!.authenticatedContext("viewer").firestore()
    const editorDb = env!.authenticatedContext("editor").firestore()
    const ownerDb = env!.authenticatedContext("owner").firestore()
    const outsiderDb = env!.authenticatedContext("outsider").firestore()

    await assertSucceeds(
      getDoc(doc(viewerDb, "boards", boardId, "labels", "label-1"))
    )
    await assertSucceeds(
      getDocs(
        query(
          collection(viewerDb, "boards", boardId, "labels"),
          orderBy("order", "asc"),
          limit(50)
        )
      )
    )
    await assertSucceeds(
      getDocs(
        query(
          collection(viewerDb, "boards", emptyBoardId, "labels"),
          orderBy("order", "asc"),
          limit(50)
        )
      )
    )
    await assertFails(
      getDoc(doc(outsiderDb, "boards", boardId, "labels", "label-1"))
    )
    await assertFails(
      getDocs(collection(outsiderDb, "boards", boardId, "labels"))
    )
    await assertFails(
      setDoc(doc(editorDb, "boards", boardId, "labels", "label-2"), {
        name: "Feature",
        normalizedName: "feature",
        color: "blue",
        order: 2,
        createdAt: makeTimestamp(),
        updatedAt: makeTimestamp(),
      })
    )
    await assertFails(
      updateDoc(doc(editorDb, "boards", boardId, "labels", "label-1"), {
        name: "Critical",
        updatedAt: makeTimestamp(),
      })
    )
    await assertFails(
      deleteDoc(doc(ownerDb, "boards", boardId, "labels", "label-1"))
    )
  })

  it("rejects malformed card relationships and bounded fields", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)
    await seedColumn(env!, boardId)
    await seedLabel(env!, boardId)
    const db = env!.authenticatedContext("editor").firestore()
    const baseCard = {
      columnId: "col-1",
      title: "Card",
      order: 10,
      createdById: "editor",
      createdAt: makeTimestamp(),
      updatedAt: makeTimestamp(),
    }

    await assertFails(
      setDoc(doc(db, "boards", boardId, "cards", "wrong-author"), {
        ...baseCard,
        createdById: "owner",
      })
    )
    await assertFails(
      setDoc(doc(db, "boards", boardId, "cards", "missing-column"), {
        ...baseCard,
        columnId: "missing",
      })
    )
    await assertFails(
      setDoc(doc(db, "boards", boardId, "cards", "bad-assignee"), {
        ...baseCard,
        assigneeIds: ["outsider"],
      })
    )
    await assertFails(
      setDoc(doc(db, "boards", boardId, "cards", "bad-label"), {
        ...baseCard,
        labels: [42],
      })
    )
    await assertSucceeds(
      setDoc(doc(db, "boards", boardId, "cards", "valid-label"), {
        ...baseCard,
        labelIds: ["label-1"],
      })
    )
    await assertFails(
      setDoc(doc(db, "boards", boardId, "cards", "unknown-label"), {
        ...baseCard,
        labelIds: ["unknown"],
      })
    )
    await assertFails(
      setDoc(doc(db, "boards", boardId, "cards", "duplicate-label"), {
        ...baseCard,
        labelIds: ["label-1", "label-1"],
      })
    )
    await assertFails(
      setDoc(doc(db, "boards", boardId, "cards", "long-title"), {
        ...baseCard,
        title: "x".repeat(201),
      })
    )
  })

  it("reserves invite acceptance for the server", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)

    const inviteEmail = "invitee@example.com"
    const inviteId = `${boardId}__${inviteEmail}`
    await seedInvite(env!, inviteId, boardId, inviteEmail, "viewer")

    const inviteeDb = env!
      .authenticatedContext("invitee", { email: inviteEmail })
      .firestore()

    await assertFails(
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

  it("reserves member removal and leaving for the server", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)

    const ownerDb = env!.authenticatedContext("owner").firestore()
    await assertFails(
      updateDoc(doc(ownerDb, "boards", boardId), {
        "members.editor": deleteField(),
        "roles.editor": deleteField(),
        updatedAt: makeTimestamp(),
      })
    )

    const editorDb = env!.authenticatedContext("editor").firestore()
    await assertFails(
      updateDoc(doc(editorDb, "boards", boardId), {
        "members.editor": deleteField(),
        "roles.editor": deleteField(),
        updatedAt: makeTimestamp(),
      })
    )
  })

  it("enforces invite create, read, and decline permissions", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)
    const inviteEmail = "new-member@example.com"
    const inviteId = `${boardId}__${inviteEmail}`
    const ownerDb = env!.authenticatedContext("owner").firestore()
    const inviteRef = doc(ownerDb, "boardInvites", inviteId)

    await assertSucceeds(
      setDoc(inviteRef, {
        boardId,
        boardTitle: "Test Board",
        email: inviteEmail,
        role: "viewer",
        invitedById: "owner",
        createdAt: makeTimestamp(),
      })
    )

    const outsiderDb = env!.authenticatedContext("outsider").firestore()
    await assertFails(getDoc(doc(outsiderDb, "boardInvites", inviteId)))

    const inviteeDb = env!
      .authenticatedContext("invitee", { email: inviteEmail })
      .firestore()
    await assertSucceeds(getDoc(doc(inviteeDb, "boardInvites", inviteId)))
    await assertSucceeds(deleteDoc(doc(inviteeDb, "boardInvites", inviteId)))
  })

  it("protects member profiles and user preferences", async () => {
    const boardId = `board-${Math.random().toString(36).slice(2)}`
    await seedBoard(env!, boardId)
    const editorDb = env!.authenticatedContext("editor").firestore()
    const editorProfile = doc(
      editorDb,
      "boards",
      boardId,
      "memberProfiles",
      "editor"
    )

    await assertSucceeds(
      setDoc(editorProfile, {
        displayName: "Editor",
        email: "editor@example.com",
        joinedAt: makeTimestamp(),
      })
    )
    const ownerDb = env!.authenticatedContext("owner").firestore()
    await assertFails(
      setDoc(doc(ownerDb, "boards", boardId, "memberProfiles", "editor"), {
        displayName: "Changed by owner",
      })
    )
    const outsiderDb = env!.authenticatedContext("outsider").firestore()
    await assertFails(
      getDoc(doc(outsiderDb, "boards", boardId, "memberProfiles", "editor"))
    )

    await assertSucceeds(
      setDoc(doc(editorDb, "users", "editor"), {
        preferredLocale: "en",
        email: "editor@example.com",
      })
    )
    await assertFails(getDoc(doc(ownerDb, "users", "editor")))
  })
})
