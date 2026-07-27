#!/usr/bin/env node

import nextEnv from "@next/env"
import { applicationDefault, cert, deleteApp, initializeApp } from "firebase-admin/app"
import { FieldPath, getFirestore } from "firebase-admin/firestore"

import {
  chunkValues,
  findStaleProfileIds,
  getProtectedMemberIds,
} from "./stale-member-profiles-logic.mjs"

nextEnv.loadEnvConfig(process.cwd())

const PAGE_SIZE = 100
const applyChanges = process.env.MIGRATION_APPLY === "true"
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
const emulatorMode = Boolean(process.env.FIRESTORE_EMULATOR_HOST)

let serviceAccount = null
if (serviceAccountJson) {
  try {
    serviceAccount = JSON.parse(serviceAccountJson)
  } catch {
    console.error("FIREBASE_SERVICE_ACCOUNT must contain valid JSON.")
    process.exit(1)
  }
}

const projectId =
  process.env.GCLOUD_PROJECT ??
  process.env.FIREBASE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  serviceAccount?.project_id

if (!projectId) {
  console.error(
    "Missing Firebase project id. Set GCLOUD_PROJECT, FIREBASE_PROJECT_ID, or NEXT_PUBLIC_FIREBASE_PROJECT_ID."
  )
  process.exit(1)
}

const app = initializeApp(
  emulatorMode
    ? { projectId }
    : {
        credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
        projectId,
      },
  "stale-member-profiles-migration"
)
const db = getFirestore(app)

const deleteStillStaleProfiles = async (boardRef, profileIds) => {
  let deleted = 0

  for (const profileIdChunk of chunkValues(profileIds)) {
    deleted += await db.runTransaction(async (transaction) => {
      const currentBoard = await transaction.get(boardRef)
      if (!currentBoard.exists) {
        return 0
      }

      const data = currentBoard.data()
      const protectedIds = getProtectedMemberIds(data?.members, data?.ownerId)
      const stillStaleIds = profileIdChunk.filter(
        (profileId) => !protectedIds.has(profileId)
      )

      for (const profileId of stillStaleIds) {
        transaction.delete(boardRef.collection("memberProfiles").doc(profileId))
      }
      return stillStaleIds.length
    })
  }

  return deleted
}

const scanBoard = async (boardSnapshot) => {
  const boardRef = boardSnapshot.ref
  const boardData = boardSnapshot.data()
  const profilesSnapshot = await boardRef.collection("memberProfiles").get()
  const profileIds = profilesSnapshot.docs.map((profile) => profile.id)
  const staleProfileIds = findStaleProfileIds({
    members: boardData.members,
    ownerId: boardData.ownerId,
    profileIds,
  })
  const deleted = applyChanges
    ? await deleteStillStaleProfiles(boardRef, staleProfileIds)
    : 0

  process.stdout.write(
    `${JSON.stringify({
      boardId: boardSnapshot.id,
      profilesScanned: profileIds.length,
      staleProfilesFound: staleProfileIds.length,
      staleProfilesDeleted: deleted,
    })}\n`
  )

  return {
    profilesScanned: profileIds.length,
    staleProfilesFound: staleProfileIds.length,
    staleProfilesDeleted: deleted,
  }
}

const run = async () => {
  const totals = {
    boardsScanned: 0,
    profilesScanned: 0,
    staleProfilesFound: 0,
    staleProfilesDeleted: 0,
  }
  let lastBoard = null

  process.stdout.write(
    `${JSON.stringify({
      migration: "stale-member-profiles",
      mode: applyChanges ? "apply" : "dry-run",
      projectId,
      emulator: emulatorMode,
    })}\n`
  )

  while (true) {
    let boardsQuery = db
      .collection("boards")
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE)
    if (lastBoard) {
      boardsQuery = boardsQuery.startAfter(lastBoard)
    }

    const boardsSnapshot = await boardsQuery.get()
    for (const boardSnapshot of boardsSnapshot.docs) {
      const result = await scanBoard(boardSnapshot)
      totals.boardsScanned += 1
      totals.profilesScanned += result.profilesScanned
      totals.staleProfilesFound += result.staleProfilesFound
      totals.staleProfilesDeleted += result.staleProfilesDeleted
    }

    if (boardsSnapshot.size < PAGE_SIZE) {
      break
    }
    lastBoard = boardsSnapshot.docs.at(-1)
  }

  process.stdout.write(`${JSON.stringify({ summary: totals })}\n`)
}

try {
  await run()
} catch (error) {
  console.error(
    "Stale member profile migration failed:",
    error instanceof Error ? error.message : error
  )
  process.exitCode = 1
} finally {
  await deleteApp(app)
}
