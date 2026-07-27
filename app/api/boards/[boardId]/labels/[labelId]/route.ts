import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"

import {
  LabelRouteError,
  assertCanManageLabels,
  getLabelCatalogMaps,
  parseLabelBody,
} from "@/features/labels/server/label-route-helpers"
import { adminDb } from "@/lib/firebase/admin"
import { verifyAppCheckToken } from "@/lib/firebase/app-check"
import { getSession } from "@/lib/firebase/session"
import { getErrorMessage } from "@/lib/errors"

const authorize = async (request: Request) => {
  const appCheck = await verifyAppCheckToken(request)
  if (!appCheck.ok) {
    throw new LabelRouteError(401, appCheck.error ?? "Unauthorized")
  }
  const session = await getSession()
  if (!session) {
    throw new LabelRouteError(401, "Unauthorized")
  }
  return session
}

const errorResponse = (error: unknown, fallback: string) => {
  if (error instanceof LabelRouteError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return NextResponse.json(
    { error: getErrorMessage(error, fallback) },
    { status: 500 }
  )
}

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ boardId: string; labelId: string }> }
) {
  try {
    const session = await authorize(request)
    const { boardId, labelId } = await params
    const nextLabel = await parseLabelBody(request)
    const boardRef = adminDb.collection("boards").doc(boardId)
    const labelRef = boardRef.collection("labels").doc(labelId)

    await adminDb.runTransaction(async (transaction) => {
      const boardSnapshot = await transaction.get(boardRef)
      const labelSnapshot = await transaction.get(labelRef)
      const board = boardSnapshot.exists ? boardSnapshot.data() : undefined
      assertCanManageLabels(board, session.uid)
      if (!labelSnapshot.exists) {
        throw new LabelRouteError(404, "Label not found")
      }
      const currentLabel = labelSnapshot.data()!
      const { labelIds, labelNames } = getLabelCatalogMaps(board!)
      const duplicateId = labelNames[nextLabel.normalizedName]
      if (duplicateId && duplicateId !== labelId) {
        throw new LabelRouteError(409, "Label name already exists")
      }
      if (typeof currentLabel.normalizedName === "string") {
        delete labelNames[currentLabel.normalizedName]
      }
      labelNames[nextLabel.normalizedName] = labelId
      labelIds[labelId] = true
      const timestamp = FieldValue.serverTimestamp()
      transaction.update(labelRef, {
        ...nextLabel,
        updatedAt: timestamp,
      })
      transaction.update(boardRef, {
        labelIds,
        labelNames,
        updatedAt: timestamp,
      })
    })
    return NextResponse.json({ status: "ok", labelId })
  } catch (error) {
    return errorResponse(error, "Update label failed")
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: { params: Promise<{ boardId: string; labelId: string }> }
) {
  try {
    const session = await authorize(request)
    const { boardId, labelId } = await params
    const boardRef = adminDb.collection("boards").doc(boardId)
    const boardSnapshot = await boardRef.get()
    const board = boardSnapshot.exists ? boardSnapshot.data() : undefined
    assertCanManageLabels(board, session.uid)

    const assignedCards = await boardRef
      .collection("cards")
      .where("labelIds", "array-contains", labelId)
      .limit(501)
      .get()
    if (assignedCards.size > 500) {
      throw new LabelRouteError(409, "Label cleanup exceeds card limit")
    }
    if (!assignedCards.empty) {
      const batch = adminDb.batch()
      assignedCards.docs.forEach((cardSnapshot) => {
        batch.update(cardSnapshot.ref, {
          labelIds: FieldValue.arrayRemove(labelId),
          updatedAt: FieldValue.serverTimestamp(),
        })
      })
      await batch.commit()
    }

    await adminDb.runTransaction(async (transaction) => {
      const nextBoardSnapshot = await transaction.get(boardRef)
      const labelSnapshot = await transaction.get(
        boardRef.collection("labels").doc(labelId)
      )
      const nextBoard = nextBoardSnapshot.exists
        ? nextBoardSnapshot.data()
        : undefined
      assertCanManageLabels(nextBoard, session.uid)
      const { labelIds, labelNames } = getLabelCatalogMaps(nextBoard!)
      delete labelIds[labelId]
      Object.entries(labelNames).forEach(([name, id]) => {
        if (id === labelId) delete labelNames[name]
      })
      const timestamp = FieldValue.serverTimestamp()
      transaction.update(boardRef, {
        labelIds,
        labelNames,
        updatedAt: timestamp,
      })
      if (labelSnapshot.exists) {
        transaction.delete(labelSnapshot.ref)
      }
    })

    return NextResponse.json({ status: "ok", labelId })
  } catch (error) {
    return errorResponse(error, "Delete label failed")
  }
}
