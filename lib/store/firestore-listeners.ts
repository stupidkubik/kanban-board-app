import { collection, doc, limit, onSnapshot, orderBy, query, where } from "firebase/firestore"

import { isVisibleCard, normalizeCard, type CardRecord } from "@/features/cards/model/card-normalizers"
import { clientDb } from "@/lib/firebase/client"
import {
  memberFieldPath,
  normalizeBoard,
  normalizeColumn,
  normalizeInvite,
  normalizeMemberProfile,
  type ColumnRecord,
  type Invite,
  type InviteRecord,
  type MemberProfileRecord,
} from "@/lib/store/firestore-normalizers"
import type { Board, BoardMemberProfile, Card, Column } from "@/lib/types/boards"

export const BOARD_COLUMN_LIMIT = 100
export const BOARD_MEMBER_LIMIT = 100
export const BOARD_CARD_LIMIT = 500

type Listener<T> = (value: T) => void
type ListenerError = (error: Error) => void

export function subscribeToBoards(uid: string, onData: Listener<Board[]>, onError: ListenerError) {
  const boardsQuery = query(
    collection(clientDb, "boards"),
    where(memberFieldPath(uid), "==", true),
  )

  return onSnapshot(
    boardsQuery,
    (snapshot) =>
      onData(
        snapshot.docs.map((docSnapshot) =>
          normalizeBoard(docSnapshot.id, docSnapshot.data() as Omit<Board, "id">),
        ),
      ),
    onError,
  )
}

export function subscribeToBoard(
  boardId: string,
  onData: Listener<Board | null>,
  onError: ListenerError,
) {
  return onSnapshot(
    doc(clientDb, "boards", boardId),
    (snapshot) =>
      onData(
        snapshot.exists()
          ? normalizeBoard(
              boardId,
              snapshot.data() as Omit<Board, "id"> & { createdBy?: string },
            )
          : null,
      ),
    onError,
  )
}

export function subscribeToInvites(
  email: string,
  onData: Listener<Invite[]>,
  onError: ListenerError,
) {
  const invitesQuery = query(
    collection(clientDb, "boardInvites"),
    where("email", "==", email.toLowerCase()),
  )

  return onSnapshot(
    invitesQuery,
    (snapshot) =>
      onData(
        snapshot.docs.map((docSnapshot) =>
          normalizeInvite(docSnapshot.id, docSnapshot.data() as InviteRecord),
        ),
      ),
    onError,
  )
}

export function subscribeToColumns(
  boardId: string,
  onData: Listener<Column[]>,
  onError: ListenerError,
) {
  const columnsQuery = query(
    collection(clientDb, "boards", boardId, "columns"),
    orderBy("order", "asc"),
    limit(BOARD_COLUMN_LIMIT),
  )

  return onSnapshot(
    columnsQuery,
    (snapshot) =>
      onData(
        snapshot.docs.map((docSnapshot) =>
          normalizeColumn(boardId, docSnapshot.id, docSnapshot.data() as ColumnRecord),
        ),
      ),
    onError,
  )
}

export function subscribeToBoardMembers(
  boardId: string,
  onData: Listener<BoardMemberProfile[]>,
  onError: ListenerError,
) {
  const membersQuery = query(
    collection(clientDb, "boards", boardId, "memberProfiles"),
    orderBy("joinedAt", "asc"),
    limit(BOARD_MEMBER_LIMIT),
  )

  return onSnapshot(
    membersQuery,
    (snapshot) =>
      onData(
        snapshot.docs.map((docSnapshot) =>
          normalizeMemberProfile(
            docSnapshot.id,
            docSnapshot.data() as MemberProfileRecord,
          ),
        ),
      ),
    onError,
  )
}

export function subscribeToCards(
  args: { boardId: string; columnId?: string | null },
  onData: Listener<Card[]>,
  onError: ListenerError,
) {
  const cardsCollection = collection(clientDb, "boards", args.boardId, "cards")
  const cardsQuery = args.columnId
    ? query(
        cardsCollection,
        where("columnId", "==", args.columnId),
        orderBy("order", "asc"),
        limit(BOARD_CARD_LIMIT),
      )
    : query(cardsCollection, orderBy("order", "asc"), limit(BOARD_CARD_LIMIT))

  return onSnapshot(
    cardsQuery,
    (snapshot) =>
      onData(
        snapshot.docs
          .map((docSnapshot) =>
            normalizeCard(
              args.boardId,
              docSnapshot.id,
              docSnapshot.data() as CardRecord,
            ),
          )
          .filter(isVisibleCard),
      ),
    onError,
  )
}
