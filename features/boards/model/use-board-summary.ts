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

type RemoteBoardSummary = {
  boardId: string
  columnCount: number | null
  cardCount: number | null
  profiles: BoardMemberProfile[]
}

type SummaryTask = {
  run: () => Promise<void>
}

const summaryCache = new Map<
  string,
  { expiresAt: number; value: RemoteBoardSummary }
>()
const pendingSummaries = new Map<string, Promise<RemoteBoardSummary>>()
const summaryQueue: SummaryTask[] = []
let summaryQueueActive = false

const drainSummaryQueue = () => {
  if (summaryQueueActive) return
  const task = summaryQueue.shift()
  if (!task) return

  summaryQueueActive = true
  void task.run().finally(() => {
    summaryQueueActive = false
    drainSummaryQueue()
  })
}

const enqueueSummary = <Result,>(load: () => Promise<Result>) =>
  new Promise<Result>((resolve, reject) => {
    summaryQueue.push({
      run: async () => {
        try {
          resolve(await load())
        } catch (error) {
          reject(error)
        }
      },
    })
    drainSummaryQueue()
  })

const loadRemoteSummary = (boardId: string, memberKey: string) => {
  const cacheKey = `${boardId}\u0000${memberKey}`
  const cached = summaryCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value)
  }

  const pending = pendingSummaries.get(cacheKey)
  if (pending) {
    return pending
  }

  const request = enqueueSummary(async () => {
    const boardRef = doc(clientDb, "boards", boardId)
    const [columns, cards, profiles] = await Promise.allSettled([
      getCountFromServer(collection(boardRef, "columns")),
      getCountFromServer(collection(boardRef, "cards")),
      getDocs(query(collection(boardRef, "memberProfiles"), limit(8))),
    ])
    const value: RemoteBoardSummary = {
      boardId,
      columnCount:
        columns.status === "fulfilled" ? columns.value.data().count : null,
      cardCount: cards.status === "fulfilled" ? cards.value.data().count : null,
      profiles:
        profiles.status === "fulfilled"
          ? profiles.value.docs.map((snapshot) =>
              normalizeMemberProfile(snapshot.id, snapshot.data())
            )
          : [],
    }
    const fullyLoaded =
      columns.status === "fulfilled" &&
      cards.status === "fulfilled" &&
      profiles.status === "fulfilled"
    summaryCache.set(cacheKey, {
      expiresAt: Date.now() + (fullyLoaded ? 10_000 : 2_000),
      value,
    })
    return value
  }).finally(() => {
    pendingSummaries.delete(cacheKey)
  })

  pendingSummaries.set(cacheKey, request)
  return request
}

export const useBoardSummary = (board: Board, user: User): BoardSummary => {
  const memberIds = React.useMemo(
    () => Object.entries(board.members).filter(([, active]) => active).map(([id]) => id),
    [board.members]
  )
  const memberKey = memberIds.join("\u0000")
  const [remoteSummary, setRemoteSummary] =
    React.useState<RemoteBoardSummary | null>(null)

  React.useEffect(() => {
    let active = true

    const timeoutId = window.setTimeout(() => {
      void loadRemoteSummary(board.id, memberKey).then((summary) => {
        if (active) {
          setRemoteSummary(summary)
        }
      })
    }, 500)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
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
