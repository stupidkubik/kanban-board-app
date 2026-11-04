import "server-only"

import { cookies } from "next/headers"

import { adminAuth } from "@/lib/firebase/admin"

const SESSION_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 5
const isProduction = () => process.env.NODE_ENV === "production"

// `__Host-` pins the cookie to this exact host over HTTPS with path "/", so a
// sibling subdomain cannot set or shadow it. Browsers only accept it with
// Secure, hence the plain name for local http development.
const getSessionCookieName = () =>
  isProduction() ? "__Host-session" : "session"
// Cookies issued before the rename; read and cleared until they expire.
const LEGACY_SESSION_COOKIE_NAME = "session"

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: "lax" as const,
  path: "/",
  maxAge,
})

export async function createSessionCookie(idToken: string) {
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRES_IN_MS,
  })

  const cookieStore = await cookies()
  cookieStore.set(
    getSessionCookieName(),
    sessionCookie,
    cookieOptions(SESSION_EXPIRES_IN_MS / 1000)
  )
  if (getSessionCookieName() !== LEGACY_SESSION_COOKIE_NAME) {
    cookieStore.set(LEGACY_SESSION_COOKIE_NAME, "", cookieOptions(0))
  }
}

const readSessionCookie = async () => {
  const cookieStore = await cookies()
  return (
    cookieStore.get(getSessionCookieName())?.value ||
    cookieStore.get(LEGACY_SESSION_COOKIE_NAME)?.value ||
    null
  )
}

// Signs the user out everywhere: revoking the refresh tokens invalidates every
// session cookie (verifySessionCookie checks revocation) and makes other
// devices fail their next ID-token refresh.
export async function revokeCurrentSession() {
  const sessionCookie = await readSessionCookie()
  if (!sessionCookie) {
    return
  }
  try {
    // checkRevoked: a cookie getSession() already rejects (stolen, then
    // revoked) must not be able to keep signing the account out.
    const claims = await adminAuth.verifySessionCookie(sessionCookie, true)
    await adminAuth.revokeRefreshTokens(claims.uid)
  } catch {
    // An expired or already revoked cookie has nothing left to revoke.
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.set(getSessionCookieName(), "", cookieOptions(0))
  if (getSessionCookieName() !== LEGACY_SESSION_COOKIE_NAME) {
    cookieStore.set(LEGACY_SESSION_COOKIE_NAME, "", cookieOptions(0))
  }
}

export async function getSession() {
  const sessionCookie = await readSessionCookie()
  if (!sessionCookie) {
    return null
  }

  try {
    return await adminAuth.verifySessionCookie(sessionCookie, true)
  } catch {
    return null
  }
}
