import type { Board } from "@/lib/types/boards"

export type MutationResult = { ok: true }
export type CreateBoardResult = MutationResult & { boardId: string }
export type BoardQueryState = {
  status: "loading" | "ready" | "not-found" | "forbidden" | "error"
  board: Board | null
}
export type BoardQueryInput = {
  boardId: string | null
  subscriptionKey: number
}
