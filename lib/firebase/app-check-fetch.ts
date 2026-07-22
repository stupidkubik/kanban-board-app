import "client-only"

import { getToken } from "firebase/app-check"

import { clientAppCheck } from "@/lib/firebase/client"

const APP_CHECK_HEADER = "X-Firebase-AppCheck"

export const fetchWithAppCheck = async (
  input: RequestInfo | URL,
  init: RequestInit = {}
) => {
  const headers = new Headers(init.headers)

  if (clientAppCheck) {
    const { token } = await getToken(clientAppCheck, false)
    headers.set(APP_CHECK_HEADER, token)
  }

  return fetch(input, {
    ...init,
    headers,
  })
}
