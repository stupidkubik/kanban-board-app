"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

import { useAuth } from "@/components/auth-provider"
import {
  useCreateColumnMutation,
  useDeleteColumnMutation,
  useGetBoardMembersQuery,
  useGetBoardsQuery,
  useGetColumnsQuery,
  useUpdateColumnMutation,
} from "@/lib/store/firestore-api"
import { clientDb } from "@/lib/firebase/client"
import { getCopy, roleLabels, type Locale } from "@/lib/i18n"
import { type Board, type BoardRole, type Column } from "@/lib/types/boards"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import styles from "@/components/board-page.module.css"

const isNonEmpty = (value: string) => value.trim().length > 0
const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value)
type DisplayRole = "owner" | "editor" | "viewer" | "member"

const getMemberRole = (board: Board, uid: string | undefined) => {
  if (!uid) {
    return null
  }

  if (!board.members[uid]) {
    return null
  }

  const explicitRole = board.roles?.[uid]
  if (explicitRole) {
    return explicitRole
  }

  if (board.ownerId === uid) {
    return "owner"
  }

  return "editor"
}

export function BoardPage() {
  const params = useParams<{ boardId?: string | string[] }>()
  const { user } = useAuth()
  const boardId = Array.isArray(params?.boardId)
    ? params.boardId[0]
    : params?.boardId
  const [uiLocale, setUiLocale] = React.useState<Locale>("ru")
  const [showAddColumn, setShowAddColumn] = React.useState(false)
  const [newColumnTitle, setNewColumnTitle] = React.useState("")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState("")
  const [deletePendingId, setDeletePendingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<BoardRole>("editor")
  const [invitePending, setInvitePending] = React.useState(false)

  const uiCopy = React.useMemo(() => getCopy(uiLocale), [uiLocale])

  React.useEffect(() => {
    const storedLocale = window.localStorage.getItem("uiLocale")
    if (storedLocale === "ru" || storedLocale === "en") {
      setUiLocale(storedLocale)
    }
  }, [])

  const { data: boards = [] } = useGetBoardsQuery(user?.uid ?? null, {
    skip: !user?.uid,
  })
  const board = boards.find((item) => item.id === boardId)

  const { data: columns = [] } = useGetColumnsQuery(boardId ?? null, {
    skip: !boardId,
  })
  const { data: memberProfiles = [] } = useGetBoardMembersQuery(boardId ?? null, {
    skip: !boardId,
  })

  const [createColumn, { isLoading: creatingColumn }] =
    useCreateColumnMutation()
  const [updateColumn, { isLoading: updatingColumn }] =
    useUpdateColumnMutation()
  const [deleteColumn] = useDeleteColumnMutation()

  const role = board ? getMemberRole(board, user?.uid) : null
  const canEdit = role !== "viewer" && !!board
  const isOwner = board?.ownerId === user?.uid
  const memberProfilesById = React.useMemo(() => {
    return new Map(memberProfiles.map((member) => [member.id, member]))
  }, [memberProfiles])
  const participants = React.useMemo(() => {
    if (!board) {
      return []
    }

    return Object.entries(board.members)
      .filter(([, isMember]) => isMember)
      .map(([memberId]) => {
        const profile = memberProfilesById.get(memberId)
        const isYou = memberId === user?.uid
        const displayName =
          profile?.displayName ?? (isYou ? user?.displayName : null)
        const email = profile?.email ?? (isYou ? user?.email : null)
        const photoURL =
          profile?.photoURL ?? (isYou ? user?.photoURL : null)
        const roleKey =
          board.roles?.[memberId] ?? (memberId === board.ownerId ? "owner" : "member")

        return {
          id: memberId,
          name: displayName || email || memberId,
          secondaryLabel:
            displayName && email && displayName !== email ? email : null,
          photoURL,
          role: roleKey as DisplayRole,
          isYou,
        }
      })
  }, [board, memberProfilesById, user?.displayName, user?.email, user?.photoURL, user?.uid])

  const handleCreateColumn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!boardId || !user) {
      return
    }

    if (!isNonEmpty(newColumnTitle)) {
      setError(uiCopy.board.errors.columnTitleRequired)
      return
    }

    setError(null)

    try {
      await createColumn({
        boardId,
        title: newColumnTitle.trim(),
      }).unwrap()
      setNewColumnTitle("")
      setShowAddColumn(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : uiCopy.board.errors.createColumnFailed
      )
    }
  }

  const startEditing = (column: Column) => {
    if (!canEdit) {
      return
    }
    setEditingId(column.id)
    setEditingTitle(column.title)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingTitle("")
  }

  const commitEditing = async () => {
    if (!boardId || !editingId) {
      return
    }

    if (!isNonEmpty(editingTitle)) {
      setError(uiCopy.board.errors.columnTitleRequired)
      return
    }

    setError(null)

    try {
      await updateColumn({
        boardId,
        columnId: editingId,
        title: editingTitle.trim(),
      }).unwrap()
      cancelEditing()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : uiCopy.board.errors.updateColumnFailed
      )
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    if (!boardId) {
      return
    }

    setError(null)
    setDeletePendingId(columnId)

    try {
      await deleteColumn({ boardId, columnId }).unwrap()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : uiCopy.board.errors.deleteColumnFailed
      )
    } finally {
      setDeletePendingId(null)
    }
  }

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!board) {
      return
    }

    if (!user) {
      setError(uiCopy.board.errors.signInToInvite)
      return
    }

    if (board.ownerId !== user.uid) {
      setError(uiCopy.board.errors.onlyOwnerCanInvite)
      return
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setError(uiCopy.board.errors.inviteInvalidEmail)
      return
    }

    if (user.email && normalizedEmail === user.email.toLowerCase()) {
      setError(uiCopy.board.errors.inviteSelf)
      return
    }

    setError(null)
    setInvitePending(true)

    try {
      const inviteId = `${board.id}__${normalizedEmail}`
      await setDoc(doc(clientDb, "boardInvites", inviteId), {
        boardId: board.id,
        boardTitle: board.title,
        email: normalizedEmail,
        role: inviteRole,
        invitedById: user.uid,
        createdAt: serverTimestamp(),
      })
      setInviteEmail("")
    } catch (err) {
      setError(err instanceof Error ? err.message : uiCopy.board.errors.inviteFailed)
    } finally {
      setInvitePending(false)
    }
  }

  if (!boardId) {
    return null
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{board?.title ?? "Board"}</h1>
          <p className={styles.subtitle}>{uiCopy.board.columnsTitle}</p>
        </div>
        <div className={styles.actions}>
          {showAddColumn ? (
            <form className={styles.inlineForm} onSubmit={handleCreateColumn}>
              <Input
                className={styles.columnTitleInput}
                value={newColumnTitle}
                onChange={(event) => setNewColumnTitle(event.target.value)}
                placeholder={uiCopy.board.columnNamePlaceholder}
                aria-label={uiCopy.board.columnNamePlaceholder}
                disabled={!canEdit || creatingColumn}
              />
              <Button type="submit" disabled={!canEdit || creatingColumn}>
                {creatingColumn ? uiCopy.board.creatingColumn : uiCopy.board.createColumn}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowAddColumn(false)
                  setNewColumnTitle("")
                }}
              >
                {uiCopy.common.cancel}
              </Button>
            </form>
          ) : (
            <Button type="button" onClick={() => setShowAddColumn(true)} disabled={!canEdit}>
              {uiCopy.board.addColumn}
            </Button>
          )}
        </div>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      {board ? (
        <Card className={styles.participantsCard} size="sm">
          <CardHeader>
            <CardTitle>{uiCopy.board.participantsTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length ? (
              <>
                <ul className={styles.participantsList}>
                  {participants.map((participant) => (
                    <li key={participant.id} className={styles.participantRow}>
                      <div className={styles.participantIdentity}>
                        <div className={styles.participantAvatar}>
                          {participant.photoURL ? (
                            <img
                              className={styles.participantAvatarImage}
                              src={participant.photoURL}
                              alt={participant.name}
                            />
                          ) : (
                            <span className={styles.participantAvatarFallback}>
                              {participant.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className={styles.participantInfo}>
                          <div className={styles.participantNameRow}>
                            <span className={styles.participantName}>
                              {participant.name}
                            </span>
                            {participant.isYou ? (
                              <span className={styles.participantBadge}>
                                {uiCopy.board.youLabel}
                              </span>
                            ) : null}
                          </div>
                          {participant.secondaryLabel ? (
                            <span className={styles.participantSecondary}>
                              {participant.secondaryLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className={styles.participantRole}>
                        {roleLabels[uiLocale][participant.role]}
                      </span>
                    </li>
                  ))}
                </ul>
                {participants.length === 1 ? (
                  <p className={styles.participantsEmpty}>{uiCopy.board.onlyYou}</p>
                ) : null}
                {isOwner ? (
                  <form className={styles.inviteForm} onSubmit={handleInvite}>
                    <div className={styles.inviteLabel}>{uiCopy.board.inviteMember}</div>
                    <div className={styles.inviteRow}>
                      <Input
                        className={styles.inviteInput}
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder={uiCopy.board.inviteEmailPlaceholder}
                        aria-label={uiCopy.board.inviteEmailPlaceholder}
                        type="email"
                        disabled={invitePending}
                      />
                      <select
                        className={styles.inviteSelect}
                        value={inviteRole}
                        onChange={(event) =>
                          setInviteRole(event.target.value as BoardRole)
                        }
                        disabled={invitePending}
                      >
                        <option value="editor">{roleLabels[uiLocale].editor}</option>
                        <option value="viewer">{roleLabels[uiLocale].viewer}</option>
                      </select>
                      <Button type="submit" disabled={invitePending}>
                        {invitePending
                          ? uiCopy.board.inviteSending
                          : uiCopy.board.inviteButton}
                      </Button>
                    </div>
                  </form>
                ) : null}
              </>
            ) : (
              <p className={styles.participantsEmpty}>{uiCopy.board.onlyYou}</p>
            )}
          </CardContent>
        </Card>
      ) : null}
      <div className={styles.columnsGrid}>
        {columns.length ? (
          columns.map((column) => {
            const isEditing = editingId === column.id
            const isDeleting = deletePendingId === column.id

            return (
              <Card key={column.id} className={styles.columnCard}>
                <CardHeader>
                  <div className={styles.columnHeader}>
                    {isEditing ? (
                      <Input
                        className={styles.columnTitleInput}
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        onBlur={commitEditing}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            commitEditing()
                          }
                          if (event.key === "Escape") {
                            event.preventDefault()
                            cancelEditing()
                          }
                        }}
                        disabled={!canEdit || updatingColumn}
                        autoFocus
                      />
                    ) : (
                      <button
                        className={styles.columnTitleButton}
                        type="button"
                        onClick={() => startEditing(column)}
                        disabled={!canEdit}
                      >
                        <CardTitle>{column.title}</CardTitle>
                      </button>
                    )}
                    <div className={styles.columnActions}>
                      {isOwner ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isDeleting}
                            >
                              {uiCopy.board.deleteColumn}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {uiCopy.board.deleteColumnTitle}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {uiCopy.board.deleteColumnDescription}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel type="button">
                                {uiCopy.common.cancel}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                type="button"
                                variant="destructive"
                                onClick={() => handleDeleteColumn(column.id)}
                              >
                                {uiCopy.board.deleteColumn}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
          })
        ) : (
          <p className={styles.empty}>{uiCopy.board.noColumns}</p>
        )}
      </div>
    </div>
  )
}
