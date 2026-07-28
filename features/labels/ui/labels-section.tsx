"use client"

import * as React from "react"
import { PencilSimple, Plus, TrashSimple } from "@phosphor-icons/react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IconButton } from "@/components/ui/icon-button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useLabelManager } from "@/features/labels/model/use-label-manager"
import { LabelColorPicker } from "@/features/labels/ui/label-color-picker"
import { getLabelColorStyle } from "@/lib/label-palette"
import type { BoardLabel, BoardLabelColor } from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"
import styles from "@/features/labels/ui/labels.module.css"

const getColorLabels = (uiCopy: BoardCopy): Record<BoardLabelColor, string> => ({
  gray: uiCopy.board.labelColorGray,
  red: uiCopy.board.labelColorRed,
  orange: uiCopy.board.labelColorOrange,
  yellow: uiCopy.board.labelColorYellow,
  green: uiCopy.board.labelColorGreen,
  blue: uiCopy.board.labelColorBlue,
  purple: uiCopy.board.labelColorPurple,
  pink: uiCopy.board.labelColorPink,
})

type LabelRowProps = {
  label: BoardLabel
  canEdit: boolean
  uiCopy: BoardCopy
  colorLabels: Record<BoardLabelColor, string>
  editing: boolean
  editName: string
  editColor: BoardLabelColor
  pending: boolean
  dirty: boolean
  onStartEdit: () => void
  onCancel: () => void
  onNameChange: (value: string) => void
  onColorChange: (value: BoardLabelColor) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onDelete: () => void
  deleteButtonRef: React.Ref<HTMLButtonElement>
}

function LabelRow({ label, canEdit, uiCopy, colorLabels, editing, editName, editColor, pending, dirty, onStartEdit, onCancel, onNameChange, onColorChange, onSubmit, onDelete, deleteButtonRef }: LabelRowProps) {
  return (
    <li className={styles.labelRow} data-testid={`label-row-${label.id}`}>
      {editing ? (
        <form className={styles.editForm} onSubmit={onSubmit}>
          <Input value={editName} onChange={(event) => onNameChange(event.target.value)} aria-label={`${uiCopy.board.labelNamePlaceholder}: ${label.name}`} disabled={pending} maxLength={50} autoFocus />
          <LabelColorPicker value={editColor} labels={colorLabels} onValueChange={onColorChange} disabled={pending} testId={`label-color-${label.id}`} ariaLabel={`${uiCopy.board.labelColorLabel}: ${label.name}`} />
          <div className={styles.rowActions}>
            <Button type="submit" size="sm" disabled={pending || !dirty}>{pending ? <Spinner size="sm" aria-hidden="true" /> : null}{uiCopy.board.saveLabel}</Button>
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onCancel}>{uiCopy.common.cancel}</Button>
            <IconButton ref={deleteButtonRef} type="button" variant="ghost" size="icon-sm" label={`${uiCopy.board.deleteLabel}: ${label.name}`} disabled={pending} onClick={onDelete}><TrashSimple weight="bold" aria-hidden="true" /></IconButton>
          </div>
        </form>
      ) : (
        <div className={styles.labelReadRow}>
          <span className={styles.labelIdentity}>
            <i className={styles.swatch} style={getLabelColorStyle(label.color)} aria-hidden="true" />
            <span>{label.name}</span>
            <span className={styles.colorName}>{colorLabels[label.color]}</span>
          </span>
          {canEdit ? <IconButton type="button" variant="ghost" size="icon-sm" label={`${uiCopy.board.editLabel}: ${label.name}`} onClick={onStartEdit}><PencilSimple weight="bold" aria-hidden="true" /></IconButton> : null}
        </div>
      )}
    </li>
  )
}

type LabelsSectionProps = { boardId: string; canEdit: boolean; uiCopy: BoardCopy; setError: (message: string | null) => void }

export function LabelsSection({ boardId, canEdit, uiCopy, setError }: LabelsSectionProps) {
  const manager = useLabelManager({ boardId, uiCopy, setError })
  const deleteTriggerRef = React.useRef<HTMLButtonElement>(null)
  const colorLabels = getColorLabels(uiCopy)

  return (
    <>
      <Card className={styles.catalog} data-testid="labels-section">
        <CardHeader className={styles.header}>
          <div><CardTitle>{uiCopy.board.labelsTitle}</CardTitle><CardDescription className={styles.description}>{uiCopy.board.labelsDescription}</CardDescription></div>
          {canEdit && !manager.createOpen ? <Button type="button" size="sm" onClick={manager.openCreate} disabled={manager.atLimit} data-testid="create-label-trigger"><Plus weight="bold" aria-hidden="true" />{uiCopy.board.createLabel}</Button> : null}
        </CardHeader>
        <CardContent className={styles.content}>
          {canEdit && manager.createOpen ? (
            <form className={styles.createForm} onSubmit={manager.submitCreate}>
              <Input value={manager.createName} onChange={(event) => manager.setCreateName(event.target.value)} placeholder={uiCopy.board.labelNamePlaceholder} aria-label={uiCopy.board.labelNamePlaceholder} maxLength={50} disabled={manager.creating || manager.atLimit} data-testid="new-label-name" autoFocus />
              <LabelColorPicker value={manager.createColor} labels={colorLabels} onValueChange={manager.setCreateColor} disabled={manager.creating || manager.atLimit} testId="new-label-color" ariaLabel={uiCopy.board.labelColorLabel} />
              <div className={styles.rowActions}>
                <Button type="submit" size="sm" disabled={manager.creating || manager.atLimit || !manager.createDirty} data-testid="create-label">{manager.creating ? <Spinner size="sm" aria-hidden="true" /> : null}{manager.creating ? uiCopy.board.creatingLabel : uiCopy.board.createLabel}</Button>
                <Button type="button" size="sm" variant="ghost" disabled={manager.creating} onClick={manager.cancelCreate}>{uiCopy.common.cancel}</Button>
              </div>
            </form>
          ) : null}
          {manager.atLimit ? <p className={styles.limit}>{uiCopy.board.labelLimitReached}</p> : null}
          {manager.labels.length ? <ul className={styles.list}>{manager.labels.map((label) => <LabelRow key={`${label.id}-${label.updatedAt ?? 0}`} label={label} canEdit={canEdit} uiCopy={uiCopy} colorLabels={colorLabels} editing={manager.editingLabel?.id === label.id} editName={manager.editName} editColor={manager.editColor} pending={manager.pendingLabelId === label.id} dirty={manager.editDirty} onStartEdit={() => manager.startEdit(label)} onCancel={manager.cancelEdit} onNameChange={manager.setEditName} onColorChange={manager.setEditColor} onSubmit={manager.submitEdit} onDelete={() => manager.setDeleteTarget(label)} deleteButtonRef={deleteTriggerRef} />)}</ul> : <p className={styles.empty}>{uiCopy.board.labelEmpty}</p>}
        </CardContent>
      </Card>
      <AlertDialog open={Boolean(manager.deleteTarget)} onOpenChange={(open) => { if (!open && !manager.pendingLabelId) manager.setDeleteTarget(null) }}>
        <AlertDialogContent onCloseAutoFocus={(event) => { if (deleteTriggerRef.current) { event.preventDefault(); deleteTriggerRef.current.focus() } }}><AlertDialogHeader><AlertDialogTitle>{uiCopy.board.deleteLabelTitle}</AlertDialogTitle><AlertDialogDescription>{uiCopy.board.deleteLabelDescription}{manager.deleteTarget ? ` ${manager.deleteTarget.name}` : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={Boolean(manager.pendingLabelId)}>{uiCopy.common.cancel}</AlertDialogCancel><AlertDialogAction disabled={Boolean(manager.pendingLabelId)} onClick={(event) => { event.preventDefault(); void manager.confirmDelete() }} data-testid="delete-label-confirm">{uiCopy.board.deleteLabel}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  )
}
