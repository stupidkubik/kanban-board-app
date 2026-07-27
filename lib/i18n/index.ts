import type { BoardRoleLabel } from "@/lib/types/boards"
import { authCopy } from "./auth"
import { boardContentCopy } from "./board-content"
import { boardsHomeCopy } from "./boards-home"
import { commonCopy } from "./common"
import { notificationsErrorsCopy } from "./notifications-errors"
import { participantsInvitesCopy } from "./participants-invites"
import type { Copy, Locale } from "./types"

export type { AuthCopy, BoardCopy, CommonCopy, Copy, Locale } from "./types"

const copy = {
  ru: {
    common: commonCopy.ru,
    auth: authCopy.ru,
    board: {
      ...boardsHomeCopy.ru,
      ...boardContentCopy.ru,
      ...participantsInvitesCopy.ru,
      ...notificationsErrorsCopy.ru,
    },
  },
  en: {
    common: commonCopy.en,
    auth: authCopy.en,
    board: {
      ...boardsHomeCopy.en,
      ...boardContentCopy.en,
      ...participantsInvitesCopy.en,
      ...notificationsErrorsCopy.en,
    },
  },
} satisfies Record<Locale, Copy>

export const languageLabels: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
}

export const roleLabels: Record<
  Locale,
  Record<BoardRoleLabel, string>
> = {
  ru: {
    owner: "Владелец",
    editor: "Редактор",
    viewer: "Наблюдатель",
    member: "Участник",
  },
  en: {
    owner: "Owner",
    editor: "Editor",
    viewer: "Viewer",
    member: "Member",
  },
}

export const getCopy = (locale: Locale) => copy[locale] ?? copy.ru
