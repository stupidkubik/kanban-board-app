#!/usr/bin/env node

import { randomUUID } from "node:crypto"

import nextEnv from "@next/env"
import {
  applicationDefault,
  cert,
  deleteApp,
  initializeApp,
} from "firebase-admin/app"
import { FieldValue, getFirestore } from "firebase-admin/firestore"

import {
  createSmokeIdentity,
  isSafeSmokeUid,
} from "./smoke-kanban-logic.mjs"

nextEnv.loadEnvConfig(process.cwd())

if (process.env.SMOKE_ALLOW_WRITES !== "true") {
  console.error("Production smoke writes require SMOKE_ALLOW_WRITES=true.")
  process.exit(1)
}

let projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID ?? ""

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
let serviceAccount = null

if (serviceAccountJson) {
  try {
    serviceAccount = JSON.parse(serviceAccountJson)
  } catch {
    console.error("FIREBASE_SERVICE_ACCOUNT must contain valid JSON.")
    process.exit(1)
  }
  if (!projectId) {
    projectId = serviceAccount.project_id
  }
}

if (!projectId) {
  console.error(
    "Missing Firebase project id. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID or FIREBASE_PROJECT_ID."
  )
  process.exit(1)
}

const app = initializeApp({
  credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
  projectId,
})

const db = getFirestore(app)

const run = async () => {
  const now = Date.now()
  const identity = createSmokeIdentity(now, randomUUID())
  const uid = process.env.SMOKE_TEST_UID ?? identity.uid
  const boardTitle = identity.boardTitle
  const columnTitles = ["Todo", "In Progress"]

  if (!isSafeSmokeUid(uid)) {
    throw new Error(
      "SMOKE_TEST_UID must be a synthetic id beginning with smoke- and contain only lowercase letters, digits, or hyphens."
    )
  }

  process.stdout.write(
    `${JSON.stringify({
      smoke: "kanban",
      projectId,
      uid,
      boardTitle,
    })}\n`
  )

  let boardRef = null
  let runError = null

  try {
    boardRef = await db.collection("boards").add({
      title: boardTitle,
      ownerId: uid,
      members: {
        [uid]: true,
      },
      roles: {
        [uid]: "owner",
      },
      language: "en",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    for (const [index, title] of columnTitles.entries()) {
      const columnRef = await boardRef.collection("columns").add({
        title,
        order: now + index,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      if (!columnRef.id) {
        throw new Error(`Column creation failed: ${title}`)
      }
    }

    const boardsSnapshot = await db
      .collection("boards")
      .where(`members.${uid}`, "==", true)
      .get()

    const boardFound = boardsSnapshot.docs.some((doc) => doc.id === boardRef.id)
    if (!boardFound) {
      throw new Error("Board not found in list query.")
    }

    const columnsSnapshot = await boardRef
      .collection("columns")
      .orderBy("order", "asc")
      .get()

    const foundTitles = columnsSnapshot.docs.map((doc) => doc.data().title)
    for (const title of columnTitles) {
      if (!foundTitles.includes(title)) {
        throw new Error(`Column not found in list query: ${title}`)
      }
    }

    process.stdout.write("Smoke assertions passed.\n")
  } catch (error) {
    runError = error
  } finally {
    try {
      if (boardRef) {
        const columnsSnapshot = await boardRef.collection("columns").get()
        const cleanupBatch = db.batch()
        columnsSnapshot.docs.forEach((column) => cleanupBatch.delete(column.ref))
        if (!columnsSnapshot.empty) {
          await cleanupBatch.commit()
        }
        await boardRef.delete()

        const [boardAfterCleanup, columnsAfterCleanup, matchingBoards] =
          await Promise.all([
            boardRef.get(),
            boardRef.collection("columns").limit(1).get(),
            db.collection("boards").where("title", "==", boardTitle).limit(1).get(),
          ])
        if (
          boardAfterCleanup.exists ||
          !columnsAfterCleanup.empty ||
          !matchingBoards.empty
        ) {
          throw new Error("Smoke cleanup verification found leftover data.")
        }
      }
      process.stdout.write("Smoke cleanup verified.\n")
    } catch (cleanupError) {
      throw new AggregateError(
        runError ? [runError, cleanupError] : [cleanupError],
        "Smoke run or cleanup failed."
      )
    }
  }

  if (runError) {
    throw runError
  }
}

try {
  await run()
} catch (error) {
  console.error("Smoke test failed:", error)
  process.exitCode = 1
} finally {
  await deleteApp(app)
}
