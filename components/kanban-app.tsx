"use client"

import * as React from "react"
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth"
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { clientAuth, clientDb } from "@/lib/firebase/client"

type BoardRecord = {
  title: string
  ownerId: string
  members: Record<string, boolean>
}

type Board = BoardRecord & { id: string }

const provider = new GoogleAuthProvider()

export function KanbanApp() {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [boards, setBoards] = React.useState<Board[]>([])
  const [title, setTitle] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(clientAuth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!user) {
      setBoards([])
      return
    }

    const memberField = `members.${user.uid}`
    const boardsQuery = query(
      collection(clientDb, "boards"),
      where(memberField, "==", true)
    )

    const unsubscribe = onSnapshot(
      boardsQuery,
      (snapshot) => {
        const nextBoards = snapshot.docs.map((doc) => {
          const data = doc.data() as BoardRecord
          return { id: doc.id, ...data }
        })

        setBoards(nextBoards)
      },
      (err) => {
        setError(err.message)
      }
    )

    return () => unsubscribe()
  }, [user])

  const handleSignIn = async () => {
    setError(null)
    try {
      await signInWithPopup(clientAuth, provider)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth error")
    }
  }

  const handleSignOut = async () => {
    setError(null)
    try {
      await signOut(clientAuth)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out error")
    }
  }

  const handleCreateBoard = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) {
      setError("Sign in to create a board.")
      return
    }

    const trimmed = title.trim()
    if (!trimmed) {
      setError("Board title is required.")
      return
    }

    setCreating(true)
    setError(null)

    try {
      await addDoc(collection(clientDb, "boards"), {
        title: trimmed,
        ownerId: user.uid,
        members: {
          [user.uid]: true,
        },
        createdAt: serverTimestamp(),
      })
      setTitle("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create board error")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Kanban MVP</CardTitle>
          <CardDescription>Auth + Firestore baseline (closed by default)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Checking session...</p>
          ) : user ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm">
                <div className="font-medium">Signed in</div>
                <div className="text-muted-foreground">{user.email ?? user.uid}</div>
              </div>
              <Button className="ml-auto" variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          ) : (
            <Button onClick={handleSignIn}>Sign in with Google</Button>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {user ? (
        <Card>
          <CardHeader>
            <CardTitle>Your boards</CardTitle>
            <CardDescription>
              Only explicit members can read or write board data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleCreateBoard}>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Board name"
                aria-label="Board name"
              />
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create board"}
              </Button>
            </form>
            <div className="grid gap-3">
              {boards.length ? (
                boards.map((board) => (
                  <div
                    key={board.id}
                    className="flex flex-col gap-1 rounded-lg border border-border p-4"
                  >
                    <div className="font-medium">{board.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Owner: {board.ownerId}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No boards yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
