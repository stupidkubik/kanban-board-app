"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
  where,
} from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/components/auth-provider"
import { clientAuth, clientDb } from "@/lib/firebase/client"
import { getCopy, languageLabels, roleLabels, type Locale } from "@/lib/i18n"

type BoardRole = "owner" | "editor" | "viewer"
type BoardLanguage = Locale

type BoardRecord = {
  title: string
  ownerId: string
  members: Record<string, boolean>
  roles?: Record<string, BoardRole>
  language?: BoardLanguage
}

type Board = BoardRecord & { id: string }

type InviteRecord = {
  boardId: string
  boardTitle: string
  email: string
  role: BoardRole
  invitedBy: string
}

type Invite = InviteRecord & { id: string }

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value)

const getMemberRole = (board: Board, uid: string) => {
  const explicitRole = board.roles?.[uid]
  if (explicitRole) {
    return explicitRole
  }

  if (board.members[uid]) {
    return "editor"
  }

  return null
}

export function KanbanApp() {
  const router = useRouter()
  const { user } = useAuth()
  const [boards, setBoards] = React.useState<Board[]>([])
  const [title, setTitle] = React.useState("")
  const [uiLocale, setUiLocale] = React.useState<Locale>("ru")
  const [newBoardLanguage, setNewBoardLanguage] = React.useState<BoardLanguage>("ru")
  const [newBoardLanguageTouched, setNewBoardLanguageTouched] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [invites, setInvites] = React.useState<Invite[]>([])
  const [inviteEmailByBoard, setInviteEmailByBoard] = React.useState<Record<string, string>>(
    {}
  )
  const [inviteRoleByBoard, setInviteRoleByBoard] = React.useState<Record<string, BoardRole>>(
    {}
  )
  const [invitePendingId, setInvitePendingId] = React.useState<string | null>(null)
  const [languagePendingId, setLanguagePendingId] = React.useState<string | null>(null)
  const [profileReady, setProfileReady] = React.useState(false)
  const [profileExists, setProfileExists] = React.useState(false)
  const uiCopy = React.useMemo(() => getCopy(uiLocale), [uiLocale])

  React.useEffect(() => {
    const storedLocale = window.localStorage.getItem("uiLocale")
    if (storedLocale === "ru" || storedLocale === "en") {
      setUiLocale(storedLocale)
    }
  }, [])

  React.useEffect(() => {
    window.localStorage.setItem("uiLocale", uiLocale)
  }, [uiLocale])

  React.useEffect(() => {
    if (!newBoardLanguageTouched) {
      setNewBoardLanguage(uiLocale)
    }
  }, [newBoardLanguageTouched, uiLocale])

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

  React.useEffect(() => {
    if (!user?.email) {
      setInvites([])
      return
    }

    const normalizedEmail = user.email.toLowerCase()
    const invitesQuery = query(
      collection(clientDb, "boardInvites"),
      where("email", "==", normalizedEmail)
    )

    const unsubscribe = onSnapshot(
      invitesQuery,
      (snapshot) => {
        const nextInvites = snapshot.docs.map((doc) => {
          const data = doc.data() as InviteRecord
          return { id: doc.id, ...data }
        })
        setInvites(nextInvites)
      },
      (err) => {
        setError(err.message)
      }
    )

    return () => unsubscribe()
  }, [user])

  React.useEffect(() => {
    if (!user) {
      setProfileReady(false)
      setProfileExists(false)
      return
    }

    const profileRef = doc(clientDb, "users", user.uid)
    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        setProfileExists(snapshot.exists())
        if (snapshot.exists()) {
          const data = snapshot.data() as { preferredLocale?: Locale }
          if (data.preferredLocale === "ru" || data.preferredLocale === "en") {
            setUiLocale(data.preferredLocale)
          }
        }
        setProfileReady(true)
      },
      () => {
        setError(uiCopy.board.errors.profileLoadFailed)
        setProfileReady(true)
      }
    )

    return () => unsubscribe()
  }, [uiCopy.board.errors.profileLoadFailed, user])

  React.useEffect(() => {
    if (!user || !profileReady) {
      return
    }

    const profileRef = doc(clientDb, "users", user.uid)
    const payload: {
      preferredLocale: Locale
      email: string | null
      createdAt?: ReturnType<typeof serverTimestamp>
      updatedAt: ReturnType<typeof serverTimestamp>
    } = {
      preferredLocale: uiLocale,
      email: user.email ?? null,
      updatedAt: serverTimestamp(),
    }

    if (!profileExists) {
      payload.createdAt = serverTimestamp()
    }

    setDoc(profileRef, payload, { merge: true }).catch(() => {
      setError(uiCopy.board.errors.profileUpdateFailed)
    })
  }, [profileExists, profileReady, uiCopy.board.errors.profileUpdateFailed, uiLocale, user])

  const handleSignOut = async () => {
    setError(null)
    try {
      await fetch("/api/auth/session", { method: "DELETE" })
      await signOut(clientAuth)
      router.replace("/sign-in")
    } catch (err) {
      setError(err instanceof Error ? err.message : uiCopy.board.errors.signOutFailed)
    }
  }

  const handleCreateBoard = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) {
      setError(uiCopy.board.errors.signInToCreate)
      return
    }

    const trimmed = title.trim()
    if (!trimmed) {
      setError(uiCopy.board.errors.boardTitleRequired)
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
        roles: {
          [user.uid]: "owner",
        },
        language: newBoardLanguage,
        createdAt: serverTimestamp(),
      })
      setTitle("")
    } catch (err) {
      setError(err instanceof Error ? err.message : uiCopy.board.errors.createBoardFailed)
    } finally {
      setCreating(false)
    }
  }

  const handleLanguageChange = async (board: Board, language: BoardLanguage) => {
    const boardCopy = getCopy(board.language ?? uiLocale)
    if (!user) {
      setError(boardCopy.board.errors.signInToUpdate)
      return
    }

    const role = getMemberRole(board, user.uid)
    if (role === "viewer") {
      setError(boardCopy.board.errors.viewersCantUpdate)
      return
    }

    if (board.language === language) {
      return
    }

    setLanguagePendingId(board.id)
    setError(null)

    try {
      await updateDoc(doc(clientDb, "boards", board.id), {
        language,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : boardCopy.board.errors.updateLanguageFailed)
    } finally {
      setLanguagePendingId(null)
    }
  }

  const handleInvite = async (board: Board) => {
    const boardCopy = getCopy(board.language ?? uiLocale)
    if (!user) {
      setError(boardCopy.board.errors.signInToInvite)
      return
    }

    if (board.ownerId !== user.uid) {
      setError(boardCopy.board.errors.onlyOwnerCanInvite)
      return
    }

    const inviteEmail = inviteEmailByBoard[board.id] ?? ""
    const normalizedEmail = inviteEmail.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setError(boardCopy.board.errors.inviteInvalidEmail)
      return
    }

    if (user.email && normalizedEmail === user.email.toLowerCase()) {
      setError(boardCopy.board.errors.inviteSelf)
      return
    }

    const role = inviteRoleByBoard[board.id] ?? "editor"
    const inviteId = `${board.id}__${normalizedEmail}`

    setInvitePendingId(board.id)
    setError(null)

    try {
      await setDoc(doc(clientDb, "boardInvites", inviteId), {
        boardId: board.id,
        boardTitle: board.title,
        email: normalizedEmail,
        role,
        invitedBy: user.uid,
        createdAt: serverTimestamp(),
      })
      setInviteEmailByBoard((prev) => ({ ...prev, [board.id]: "" }))
    } catch (err) {
      setError(err instanceof Error ? err.message : boardCopy.board.errors.inviteFailed)
    } finally {
      setInvitePendingId(null)
    }
  }

  const handleAcceptInvite = async (invite: Invite) => {
    if (!user) {
      return
    }

    setError(null)

    try {
      const boardRef = doc(clientDb, "boards", invite.boardId)
      const inviteRef = doc(clientDb, "boardInvites", invite.id)
      const batch = writeBatch(clientDb)

      batch.update(boardRef, {
        [`members.${user.uid}`]: true,
        [`roles.${user.uid}`]: invite.role,
      })
      batch.delete(inviteRef)

      await batch.commit()
    } catch (err) {
      setError(err instanceof Error ? err.message : uiCopy.board.errors.acceptInviteFailed)
    }
  }

  const handleDeclineInvite = async (invite: Invite) => {
    setError(null)

    try {
      await deleteDoc(doc(clientDb, "boardInvites", invite.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : uiCopy.board.errors.declineInviteFailed)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{uiCopy.common.appTitle}</CardTitle>
          <CardDescription>{uiCopy.common.appSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {user ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm">
                <div className="font-medium">{uiCopy.common.signedIn}</div>
                <div className="text-muted-foreground">{user.email ?? user.uid}</div>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {uiCopy.common.interfaceLanguage}
                </div>
                <Select
                  value={uiLocale}
                  onValueChange={(value) => setUiLocale(value as Locale)}
                >
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">{languageLabels.ru}</SelectItem>
                    <SelectItem value="en">{languageLabels.en}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleSignOut}>
                  {uiCopy.common.signOut}
                </Button>
              </div>
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {user ? (
        <>
          {invites.length ? (
            <Card>
              <CardHeader>
                <CardTitle>{uiCopy.board.invitationsTitle}</CardTitle>
                <CardDescription>{uiCopy.board.invitationsSubtitle}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-col gap-2 rounded-lg border border-border p-4"
                  >
                    <div className="font-medium">{invite.boardTitle}</div>
                    <div className="text-xs text-muted-foreground">
                      {uiCopy.board.roleLabel}: {roleLabels[uiLocale][invite.role]}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => handleAcceptInvite(invite)}>
                        {uiCopy.board.acceptInvite}
                      </Button>
                      <Button variant="outline" onClick={() => handleDeclineInvite(invite)}>
                        {uiCopy.board.declineInvite}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        <Card>
          <CardHeader>
            <CardTitle>{uiCopy.board.boardSectionTitle}</CardTitle>
            <CardDescription>{uiCopy.board.boardSectionSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleCreateBoard}>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={uiCopy.board.boardNamePlaceholder}
                aria-label={uiCopy.board.boardNamePlaceholder}
              />
              <Select
                value={newBoardLanguage}
                onValueChange={(value) => {
                  setNewBoardLanguage(value as BoardLanguage)
                  setNewBoardLanguageTouched(true)
                }}
              >
                <SelectTrigger className="sm:w-40">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">{languageLabels.ru}</SelectItem>
                  <SelectItem value="en">{languageLabels.en}</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={creating}>
                {creating ? uiCopy.board.creatingBoard : uiCopy.board.createBoard}
              </Button>
            </form>
            <div className="grid gap-3">
              {boards.length ? (
                boards.map((board) => {
                  const role = getMemberRole(board, user.uid)
                  const isOwner = board.ownerId === user.uid
                  const inviteEmail = inviteEmailByBoard[board.id] ?? ""
                  const inviteRole = inviteRoleByBoard[board.id] ?? "editor"
                  const isInvitePending = invitePendingId === board.id
                  const currentLanguage = board.language ?? "ru"
                  const canEditLanguage = role !== "viewer"
                  const isLanguagePending = languagePendingId === board.id
                  const boardCopy = getCopy(currentLanguage)

                  return (
                    <div
                      key={board.id}
                      className="flex flex-col gap-1 rounded-lg border border-border p-4"
                    >
                      <div className="font-medium">{board.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {boardCopy.board.ownerLabel}: {board.ownerId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {boardCopy.board.roleLabel}:{" "}
                        {role
                          ? roleLabels[currentLanguage][role]
                          : roleLabels[currentLanguage].member}
                      </div>
                      <div className="mt-3 flex flex-col gap-2">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          {boardCopy.board.boardLanguageLabel}
                        </div>
                        <Select
                          value={currentLanguage}
                          onValueChange={(value) =>
                            handleLanguageChange(board, value as BoardLanguage)
                          }
                          disabled={!canEditLanguage || isLanguagePending}
                        >
                          <SelectTrigger className="sm:w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ru">{languageLabels.ru}</SelectItem>
                            <SelectItem value="en">{languageLabels.en}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {isOwner ? (
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            {boardCopy.board.inviteMember}
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              value={inviteEmail}
                              onChange={(event) =>
                                setInviteEmailByBoard((prev) => ({
                                  ...prev,
                                  [board.id]: event.target.value,
                                }))
                              }
                              placeholder={boardCopy.board.inviteEmailPlaceholder}
                              aria-label={boardCopy.board.inviteEmailPlaceholder}
                            />
                            <select
                              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                              value={inviteRole}
                              onChange={(event) =>
                                setInviteRoleByBoard((prev) => ({
                                  ...prev,
                                  [board.id]: event.target.value as BoardRole,
                                }))
                              }
                            >
                              <option value="editor">
                                {roleLabels[currentLanguage].editor}
                              </option>
                              <option value="viewer">
                                {roleLabels[currentLanguage].viewer}
                              </option>
                            </select>
                            <Button
                              type="button"
                              onClick={() => handleInvite(board)}
                              disabled={isInvitePending}
                            >
                              {isInvitePending
                                ? boardCopy.board.inviteSending
                                : boardCopy.board.inviteButton}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground">{uiCopy.board.noBoards}</p>
              )}
            </div>
          </CardContent>
        </Card>
        </>
      ) : null}
    </div>
  )
}
