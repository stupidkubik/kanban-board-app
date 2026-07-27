import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"

import {
  LabelRouteError,
  assertCanManageLabels,
  assertCatalogHasCapacity,
  getLabelCatalogMaps,
  parseLabelBody,
} from "@/features/labels/server/label-route-helpers"
import { adminDb } from "@/lib/firebase/admin"
import { verifyAppCheckToken } from "@/lib/firebase/app-check"
import { getSession } from "@/lib/firebase/session"
import { getErrorMessage } from "@/lib/errors"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const appCheck = await verifyAppCheckToken(request)
  if (!appCheck.ok) {
    return NextResponse.json({ error: appCheck.error }, { status: 401 })
  }
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { boardId } = await params
    const label = await parseLabelBody(request)
    const boardRef = adminDb.collection("boards").doc(boardId)
    const labelRef = boardRef.collection("labels").doc()

    await adminDb.runTransaction(async (transaction) => {
      const boardSnapshot = await transaction.get(boardRef)
      const board = boardSnapshot.exists ? boardSnapshot.data() : undefined
      assertCanManageLabels(board, session.uid)
      const { labelIds, labelNames } = getLabelCatalogMaps(board!)
      if (labelNames[label.normalizedName]) {
        throw new LabelRouteError(409, "Label name already exists")
      }
      assertCatalogHasCapacity(labelIds)
      labelIds[labelRef.id] = true
      labelNames[label.normalizedName] = labelRef.id
      const timestamp = FieldValue.serverTimestamp()
      transaction.create(labelRef, {
        ...label,
        order: Date.now(),
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      transaction.update(boardRef, {
        labelIds,
        labelNames,
        updatedAt: timestamp,
      })
    })

    return NextResponse.json({ status: "ok", labelId: labelRef.id })
  } catch (error) {
    if (error instanceof LabelRouteError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json(
      { error: getErrorMessage(error, "Create label failed") },
      { status: 500 }
    )
  }
}
