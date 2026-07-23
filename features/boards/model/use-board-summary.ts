"use client"

import * as React from "react"
import type { User } from "firebase/auth"
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  query,
} from "firebase/firestore"

import { clientDb } from "@/lib/firebase/client"
import { normalizeMemberProfile } from "@/lib/store/firestore-normalizers"
import type { Board, BoardMemberProfile } from "@/lib/types/boards"

type BoardSummary = {
  columnCount: number | null
  cardCount: number | null
  memberCount: number
  visibleMembers: BoardMemberProfile[]
}

export const useBoardSummary = (board: Board, user: User): BoardSummary => {
  const memberIds = React.useMemo(
    () => Object.entries(board.members).filter(([, active]) => active).map(([id]) => id),
    [board.members]
  )
  const memberKey = memberIds.join("\u0000")
  const [remoteSummary, setRemoteSummary] = React.useState<{
    boardId: string
    columnCount: number | null
    cardCount: number | null
    profiles: BoardMemberProfile[]
  } | null>(null)

  React.useEffect(() => {
    let active = true
    const boardRef = doc(clientDb, "boards", board.id)

    Promise.all([
      getCountFromServer(collection(boardRef, "columns")),
      getCountFromServer(collection(boardRef, "cards")),
      getDocs(query(collection(boardRef, "memberProfiles"), limit(8))),
    ])
      .then(([columns, cards, profiles]) => {
        if (!active) {
          return
        }
        setRemoteSummary({
          boardId: board.id,
          columnCount: columns.data().count,
          cardCount: cards.data().count,
          profiles: profiles.docs.map((snapshot) =>
            normalizeMemberProfile(snapshot.id, snapshot.data())
          ),
        })
      })
      .catch(() => {
        if (active) {
          setRemoteSummary({
            boardId: board.id,
            columnCount: null,
            cardCount: null,
            profiles: [],
          })
        }
      })

    return () => {
      active = false
    }
  }, [board.id, memberKey])

  const profilesById = React.useMemo(
    () =>
      new Map(
        (remoteSummary?.boardId === board.id ? remoteSummary.profiles : []).map(
          (profile) => [profile.id, profile]
        )
      ),
    [board.id, remoteSummary]
  )
  const visibleMembers = memberIds.slice(0, 4).map((memberId) => {
    const profile = profilesById.get(memberId)
    if (profile) {
      return profile
    }
    return {
      id: memberId,
      displayName: memberId === user.uid ? user.displayName : null,
      email: memberId === user.uid ? user.email : null,
      photoURL: memberId === user.uid ? user.photoURL : null,
    }
  })

  return {
    columnCount:
      remoteSummary?.boardId === board.id ? remoteSummary.columnCount : null,
    cardCount: remoteSummary?.boardId === board.id ? remoteSummary.cardCount : null,
    memberCount: memberIds.length,
    visibleMembers,
  }
}
