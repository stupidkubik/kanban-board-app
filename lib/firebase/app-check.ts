import "server-only"

import { getAppCheck } from "firebase-admin/app-check"

import { adminApp } from "@/lib/firebase/admin"

const APP_CHECK_HEADER = "X-Firebase-AppCheck"

const shouldEnforceAppCheck = () => {
  if (process.env.FIREBASE_APPCHECK_ENFORCE === "true") {
    return true
  }
  if (process.env.NODE_ENV === "production") {
    return Boolean(process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY)
  }
  return false
}

export const verifyAppCheckToken = async (request: Request) => {
  if (!shouldEnforceAppCheck()) {
    return { ok: true }
  }

  const token = request.headers.get(APP_CHECK_HEADER)
  if (!token) {
    return { ok: false, error: "Missing App Check token" }
  }

  try {
    const appCheck = getAppCheck(adminApp)
    await appCheck.verifyToken(token)
    return { ok: true }
  } catch {
    return { ok: false, error: "Invalid App Check token" }
  }
}
