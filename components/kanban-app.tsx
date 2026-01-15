"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import {
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

import { useAuth } from "@/components/auth-provider"
import { clientAuth, clientDb } from "@/lib/firebase/client"
import { getCopy, languageLabels, roleLabels, type Locale } from "@/lib/i18n"
import {
  boardUpdateOptimistic,
  boardUpsertOptimistic,
  boardsClear,
  boardsError,
  boardsLoading,
  boardsReceived,
  type Board,
  type BoardLanguage,
  type BoardRole,
} from "@/lib/store/boards-slice"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import styles from "@/components/kanban-app.module.css"

type InviteRecord = {
  boardId: string
  boardTitle: string
  email: string
  role: BoardRole
  invitedBy: string
  createdAt?: number
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

const toMillis = (value: unknown): number | undefined => {
  if (!value || typeof value !== "object") {
    return undefined
  }

  const maybeTimestamp = value as { toMillis?: () => number }
  if (typeof maybeTimestamp.toMillis === "function") {
    return maybeTimestamp.toMillis()
  }

  return undefined
}

export function KanbanApp() {
  const router = useRouter()
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const boards = useAppSelector((state) =>
    state.boards.order.map((id) => state.boards.boards[id]).filter(Boolean)
  )
  const [title, setTitle] = React.useState("")
  const [uiLocale, setUiLocale] = React.useState<Locale>("ru")
  const [localeTouched, setLocaleTouched] = React.useState(false)
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
  const handleUiLocaleChange = React.useCallback((value: Locale) => {
    setUiLocale(value)
    setLocaleTouched(true)
  }, [])
  const localeTouchedRef = React.useRef(false)
  const uiLocaleRef = React.useRef<Locale>("ru")

  React.useEffect(() => {
    localeTouchedRef.current = localeTouched
  }, [localeTouched])

  React.useEffect(() => {
    uiLocaleRef.current = uiLocale
  }, [uiLocale])

  React.useEffect(() => {
    const storedLocale = window.localStorage.getItem("uiLocale")
    const storedTouched = window.localStorage.getItem("uiLocaleTouched")
    if (storedLocale === "ru" || storedLocale === "en") {
      setUiLocale(storedLocale)
    }
    if (storedTouched === "1") {
      setLocaleTouched(true)
    }
  }, [])

  React.useEffect(() => {
    window.localStorage.setItem("uiLocale", uiLocale)
  }, [uiLocale])

  React.useEffect(() => {
    if (localeTouched) {
      window.localStorage.setItem("uiLocaleTouched", "1")
    } else {
      window.localStorage.removeItem("uiLocaleTouched")
    }
  }, [localeTouched])

  React.useEffect(() => {
    if (!newBoardLanguageTouched) {
      setNewBoardLanguage(uiLocale)
    }
  }, [newBoardLanguageTouched, uiLocale])

  React.useEffect(() => {
    if (!user) {
      dispatch(boardsClear())
      return
    }

    const memberField = `members.${user.uid}`
    const boardsQuery = query(
      collection(clientDb, "boards"),
      where(memberField, "==", true)
    )

    dispatch(boardsLoading())
    const unsubscribe = onSnapshot(
      boardsQuery,
      (snapshot) => {
        const nextBoards = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<Board, "id">
          const board: Board = {
            id: doc.id,
            title: data.title,
            ownerId: data.ownerId,
            members: data.members ?? {},
            roles: data.roles,
            language: data.language,
          }
          const createdAt = toMillis((data as { createdAt?: unknown }).createdAt)
          if (createdAt !== undefined) {
            board.createdAt = createdAt
          }
          const updatedAt = toMillis((data as { updatedAt?: unknown }).updatedAt)
          if (updatedAt !== undefined) {
            board.updatedAt = updatedAt
          }
          return board
        })
        dispatch(boardsReceived(nextBoards))
      },
      (err) => {
        setError(err.message)
        dispatch(boardsError(err.message))
      }
    )

    return () => unsubscribe()
  }, [dispatch, user])

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
          const data = doc.data() as InviteRecord & { createdAt?: unknown }
          const invite: Invite = {
            id: doc.id,
            boardId: data.boardId,
            boardTitle: data.boardTitle,
            email: data.email,
            role: data.role,
            invitedBy: data.invitedBy,
          }
          const createdAt = toMillis(data.createdAt)
          if (createdAt !== undefined) {
            invite.createdAt = createdAt
          }
          return invite
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
      setLocaleTouched(false)
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
            if (localeTouchedRef.current) {
              if (data.preferredLocale === uiLocaleRef.current) {
                setLocaleTouched(false)
              }
            } else {
              setUiLocale(data.preferredLocale)
            }
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

    if (!localeTouched && profileExists) {
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

    setDoc(profileRef, payload, { merge: true })
      .then(() => {
        if (localeTouched) {
          setLocaleTouched(false)
        }
      })
      .catch(() => {
        setError(uiCopy.board.errors.profileUpdateFailed)
      })
  }, [
    localeTouched,
    profileExists,
    profileReady,
    uiCopy.board.errors.profileUpdateFailed,
    uiLocale,
    user,
  ])

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
      const docRef = doc(collection(clientDb, "boards"))
      dispatch(
        boardUpsertOptimistic({
          id: docRef.id,
          title: trimmed,
          ownerId: user.uid,
          members: {
            [user.uid]: true,
          },
          roles: {
            [user.uid]: "owner",
          },
          language: newBoardLanguage,
        })
      )
      await setDoc(docRef, {
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
    const previousLanguage = board.language ?? "ru"
    dispatch(boardUpdateOptimistic({ id: board.id, changes: { language } }))

    try {
      await updateDoc(doc(clientDb, "boards", board.id), {
        language,
      })
    } catch (err) {
      dispatch(
        boardUpdateOptimistic({
          id: board.id,
          changes: { language: previousLanguage },
        })
      )
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
    <div className={styles.page}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{uiCopy.common.appTitle}</h2>
          <p className={styles.cardSubtitle}>{uiCopy.common.appSubtitle}</p>
        </div>
        <div className={styles.cardContent}>
          {user ? (
            <div className={styles.row}>
              <div className={styles.meta}>
                <div>{uiCopy.common.signedIn}</div>
                <div className={styles.muted}>{user.email ?? user.uid}</div>
              </div>
              <div className={styles.row}>
                <div className={styles.label}>{uiCopy.common.interfaceLanguage}</div>
                <select
                  className={styles.select}
                  value={uiLocale}
                  onChange={(event) => handleUiLocaleChange(event.target.value as Locale)}
                >
                  <option value="ru">{languageLabels.ru}</option>
                  <option value="en">{languageLabels.en}</option>
                </select>
                <button
                  className={`${styles.button} ${styles.buttonOutline}`}
                  onClick={handleSignOut}
                  type="button"
                >
                  {uiCopy.common.signOut}
                </button>
              </div>
            </div>
          ) : null}
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
      </section>

      {user ? (
        <>
          {invites.length ? (
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{uiCopy.board.invitationsTitle}</h3>
                <p className={styles.cardSubtitle}>{uiCopy.board.invitationsSubtitle}</p>
              </div>
              <div className={styles.cardContent}>
                {invites.map((invite) => (
                  <div key={invite.id} className={styles.boardCard}>
                    <div>{invite.boardTitle}</div>
                    <div className={styles.muted}>
                      {uiCopy.board.roleLabel}: {roleLabels[uiLocale][invite.role]}
                    </div>
                    <div className={styles.row}>
                      <button
                        className={styles.button}
                        onClick={() => handleAcceptInvite(invite)}
                        type="button"
                      >
                        {uiCopy.board.acceptInvite}
                      </button>
                      <button
                        className={`${styles.button} ${styles.buttonOutline}`}
                        onClick={() => handleDeclineInvite(invite)}
                        type="button"
                      >
                        {uiCopy.board.declineInvite}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{uiCopy.board.boardSectionTitle}</h3>
            <p className={styles.cardSubtitle}>{uiCopy.board.boardSectionSubtitle}</p>
          </div>
          <div className={styles.cardContent}>
            <form className={styles.formRow} onSubmit={handleCreateBoard}>
              <input
                className={styles.input}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={uiCopy.board.boardNamePlaceholder}
                aria-label={uiCopy.board.boardNamePlaceholder}
              />
              <select
                className={styles.select}
                value={newBoardLanguage}
                onChange={(event) => {
                  setNewBoardLanguage(event.target.value as BoardLanguage)
                  setNewBoardLanguageTouched(true)
                }}
              >
                <option value="ru">{languageLabels.ru}</option>
                <option value="en">{languageLabels.en}</option>
              </select>
              <button className={styles.button} type="submit" disabled={creating}>
                {creating ? uiCopy.board.creatingBoard : uiCopy.board.createBoard}
              </button>
            </form>
            <div className={styles.grid}>
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
                    <div key={board.id} className={styles.boardCard}>
                      <div>{board.title}</div>
                      <div className={styles.muted}>
                        {boardCopy.board.ownerLabel}: {board.ownerId}
                      </div>
                      <div className={styles.muted}>
                        {boardCopy.board.roleLabel}:{" "}
                        {role
                          ? roleLabels[currentLanguage][role]
                          : roleLabels[currentLanguage].member}
                      </div>
                      <div className={styles.section}>
                        <div className={styles.label}>{boardCopy.board.boardLanguageLabel}</div>
                        <select
                          className={styles.select}
                          value={currentLanguage}
                          onChange={(event) =>
                            handleLanguageChange(board, event.target.value as BoardLanguage)
                          }
                          disabled={!canEditLanguage || isLanguagePending}
                        >
                          <option value="ru">{languageLabels.ru}</option>
                          <option value="en">{languageLabels.en}</option>
                        </select>
                      </div>
                      {isOwner ? (
                        <div className={styles.section}>
                          <div className={styles.label}>{boardCopy.board.inviteMember}</div>
                          <div className={styles.inviteRow}>
                            <input
                              className={styles.input}
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
                              className={styles.select}
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
                            <button
                              className={styles.button}
                              type="button"
                              onClick={() => handleInvite(board)}
                              disabled={isInvitePending}
                            >
                              {isInvitePending
                                ? boardCopy.board.inviteSending
                                : boardCopy.board.inviteButton}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })
              ) : (
                <p className={styles.muted}>{uiCopy.board.noBoards}</p>
              )}
            </div>
          </div>
        </section>
        </>
      ) : null}
    </div>
  )
}
