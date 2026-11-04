// Input checks shared by the Admin SDK routes. The Admin SDK bypasses
// Firestore Rules, so these mirror the limits the rules enforce on clients.

export const MAX_BOARD_TITLE_LENGTH = 120
export const MAX_DISPLAY_NAME_LENGTH = 120
export const MAX_PHOTO_URL_LENGTH = 2048
export const MAX_BOARD_MEMBERS = 100
const MAX_INVITE_ID_LENGTH = 512

// Auto ids (20 chars), Firebase Auth uids (28) and migration ids such as
// `legacy_<hex>` all fit. Anything else, in particular "/", would change the
// document path the route touches.
const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

export const isDocumentId = (value: unknown): value is string =>
  typeof value === "string" && DOCUMENT_ID_PATTERN.test(value)

// Invite ids are `${boardId}__${normalized email}`.
export const isInviteId = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= MAX_INVITE_ID_LENGTH &&
  !value.includes("/") &&
  /^[A-Za-z0-9_-]+__.+@.+$/.test(value)

export const isPlainObject = (
  value: unknown
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const hasOnlyKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[]
) => Object.keys(value).every((key) => allowed.includes(key))

export const parseBoardTitle = (value: unknown) => {
  if (typeof value !== "string") return null
  const title = value.trim()
  return title.length > 0 && title.length <= MAX_BOARD_TITLE_LENGTH
    ? title
    : null
}

export type ProfileFields = {
  displayName: string | null
  photoURL: string | null
}

// Values every board member downloads; null when absent.
export const parseProfileFields = (
  body: Record<string, unknown>
): ProfileFields | null => {
  const displayName = body.displayName ?? null
  const photoURL = body.photoURL ?? null

  if (
    displayName !== null &&
    (typeof displayName !== "string" ||
      displayName.length > MAX_DISPLAY_NAME_LENGTH)
  ) {
    return null
  }
  if (
    photoURL !== null &&
    (typeof photoURL !== "string" ||
      photoURL.length > MAX_PHOTO_URL_LENGTH ||
      !photoURL.startsWith("https://"))
  ) {
    return null
  }

  return { displayName, photoURL }
}
