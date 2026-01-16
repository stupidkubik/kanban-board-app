#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { applicationDefault, cert, initializeApp } from "firebase-admin/app"
import { FieldValue, getFirestore } from "firebase-admin/firestore"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const defaultServiceAccount = path.join(
  __dirname,
  "..",
  "kanban-mvp-1baf2-firebase-adminsdk-fbsvc-ae0f47a077.json"
)

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? defaultServiceAccount

let projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID ?? ""

let credential = null

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"))
  credential = cert(serviceAccount)
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

initializeApp({
  credential: credential ?? applicationDefault(),
  projectId,
})

const db = getFirestore()

const run = async () => {
  const uid = process.env.SMOKE_TEST_UID ?? "smoke-user"
  const now = Date.now()
  const boardTitle = `Smoke Board ${now}`
  const columnTitles = ["Todo", "In Progress"]

  let boardRef = null
  let columnRefs = []

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
      columnRefs.push(columnRef)
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

    console.log("Smoke test passed.")
  } finally {
    for (const columnRef of columnRefs) {
      await columnRef.delete()
    }
    if (boardRef) {
      await boardRef.delete()
    }
  }
}

run().catch((error) => {
  console.error("Smoke test failed:", error)
  process.exit(1)
})
