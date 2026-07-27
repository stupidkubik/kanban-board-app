#!/usr/bin/env node

import nextEnv from "@next/env"
import { applicationDefault, cert, deleteApp, initializeApp } from "firebase-admin/app"
import { FieldPath, FieldValue, getFirestore } from "firebase-admin/firestore"

import {
  buildCardLabelsMigrationPlan,
  catalogMapsEqual,
} from "./migrate-card-labels-logic.mjs"

nextEnv.loadEnvConfig(process.cwd())

const applyChanges = process.env.MIGRATION_APPLY === "true"
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
const emulatorMode = Boolean(process.env.FIRESTORE_EMULATOR_HOST)
const serviceAccount = serviceAccountJson ? JSON.parse(serviceAccountJson) : null
const projectId =
  process.env.GCLOUD_PROJECT ??
  process.env.FIREBASE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  serviceAccount?.project_id

if (!projectId) {
  throw new Error("Missing Firebase project id.")
}

const app = initializeApp(
  emulatorMode
    ? { projectId }
    : {
        credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
        projectId,
      },
  "card-labels-migration"
)
const db = getFirestore(app)

const commitWrites = async (writes) => {
  for (let offset = 0; offset < writes.length; offset += 450) {
    const batch = db.batch()
    writes.slice(offset, offset + 450).forEach((write) => write(batch))
    await batch.commit()
  }
}

const scanBoard = async (boardSnapshot) => {
  const boardRef = boardSnapshot.ref
  const [labelsSnapshot, cardsSnapshot] = await Promise.all([
    boardRef.collection("labels").get(),
    boardRef.collection("cards").limit(501).get(),
  ])
  if (cardsSnapshot.size > 500) {
    throw new Error(`Board ${boardSnapshot.id} exceeds the 500-card product cap.`)
  }
  const plan = buildCardLabelsMigrationPlan({
    existingLabels: labelsSnapshot.docs.map((label) => ({
      id: label.id,
      ...label.data(),
    })),
    cards: cardsSnapshot.docs.map((card) => ({ id: card.id, ...card.data() })),
  })
  const boardData = boardSnapshot.data()
  const catalogIndexChanged = !catalogMapsEqual(
    boardData.labelIds,
    boardData.labelNames,
    plan.labelIds,
    plan.labelNames
  )

  if (applyChanges) {
    const timestamp = FieldValue.serverTimestamp()
    const writes = [
      ...plan.createdLabels.map((label) => (batch) =>
        batch.set(boardRef.collection("labels").doc(label.id), {
          name: label.name,
          normalizedName: label.normalizedName,
          color: label.color,
          order: Date.now(),
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      ),
      ...plan.cardUpdates.map((card) => (batch) =>
        batch.update(boardRef.collection("cards").doc(card.id), {
          labelIds: card.labelIds,
          labels: FieldValue.delete(),
          updatedAt: timestamp,
        })
      ),
      ...(catalogIndexChanged
        ? [
            (batch) =>
              batch.update(boardRef, {
                labelIds: plan.labelIds,
                labelNames: plan.labelNames,
                updatedAt: timestamp,
              }),
          ]
        : []),
    ]
    await commitWrites(writes)
  }

  process.stdout.write(
    `${JSON.stringify({
      boardId: boardSnapshot.id,
      legacyCards: plan.cardUpdates.length,
      labelsCreated: plan.createdLabels.length,
      catalogIndexChanged,
      mode: applyChanges ? "apply" : "dry-run",
    })}\n`
  )
  return plan
}

try {
  let lastBoard = null
  while (true) {
    let query = db
      .collection("boards")
      .orderBy(FieldPath.documentId())
      .limit(100)
    if (lastBoard) query = query.startAfter(lastBoard)
    const snapshot = await query.get()
    for (const board of snapshot.docs) await scanBoard(board)
    if (snapshot.size < 100) break
    lastBoard = snapshot.docs.at(-1)
  }
} catch (error) {
  console.error(
    "Card labels migration failed:",
    error instanceof Error ? error.message : error
  )
  process.exitCode = 1
} finally {
  await deleteApp(app)
}
