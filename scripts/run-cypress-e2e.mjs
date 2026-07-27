#!/usr/bin/env node

import { spawn } from "node:child_process"
import { initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const PROJECT_ID = "demo-kanban-e2e"
const APP_HOST = "127.0.0.1"
const APP_PORT = 3100
const APP_URL = `http://${APP_HOST}:${APP_PORT}`
const AUTH_EMULATOR_URL = "http://127.0.0.1:9099"
const FIRESTORE_EMULATOR_URL = "http://127.0.0.1:8080"
const E2E_EMAIL = "owner@kanban-e2e.test"
const E2E_PASSWORD = "local-e2e-password"
const openMode = process.argv.includes("--open")

const appEnvironment = {
  ...process.env,
  GCLOUD_PROJECT: PROJECT_ID,
  FIREBASE_PROJECT_ID: PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_USE_EMULATORS: "true",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${PROJECT_ID}.appspot.com`,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:e2e",
  NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY: "",
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "",
  NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG: "",
  FIREBASE_APPCHECK_ENFORCE: "false",
}

const waitForUrl = async (url, timeoutMs = 30_000) => {
  const deadline = Date.now() + timeoutMs
  let lastError = null

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status < 500) {
        return
      }
      lastError = new Error(`Received HTTP ${response.status} from ${url}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for ${url}`, { cause: lastError })
}

const requestJson = async (url, init) => {
  const response = await fetch(url, init)
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${init?.method ?? "GET"} ${url} failed: ${response.status} ${body}`)
  }
  const body = await response.text()
  return body ? JSON.parse(body) : null
}

const resetEmulators = async () => {
  await requestJson(
    `${FIRESTORE_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" }
  )
  await requestJson(
    `${AUTH_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: "DELETE" }
  )
}

const seedAuthUser = async () => {
  await requestJson(
    `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: E2E_EMAIL,
        password: E2E_PASSWORD,
        returnSecureToken: true,
      }),
    }
  )
}

const verifyCleanup = async () => {
  const cleanupApp = initializeApp({ projectId: PROJECT_ID }, "e2e-cleanup")
  const cleanupDb = getFirestore(cleanupApp)
  const queries = [
    ["boards", cleanupDb.collection("boards").limit(1)],
    ["boardInvites", cleanupDb.collection("boardInvites").limit(1)],
    ["columns", cleanupDb.collectionGroup("columns").limit(1)],
    ["cards", cleanupDb.collectionGroup("cards").limit(1)],
    ["memberProfiles", cleanupDb.collectionGroup("memberProfiles").limit(1)],
  ]
  const checks = await Promise.all(
    queries.map(async ([collectionId, query]) => ({
      collectionId,
      hasDocuments: !(await query.get()).empty,
    }))
  )
  const leftovers = checks
    .filter(({ hasDocuments }) => hasDocuments)
    .map(({ collectionId }) => collectionId)

  if (leftovers.length) {
    throw new Error(`E2E cleanup left documents in: ${leftovers.join(", ")}`)
  }

  process.stdout.write("E2E cleanup verified: no board data remains.\n")
}

const runProcess = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    })
    child.once("error", reject)
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} terminated by signal ${signal}`))
        return
      }
      resolve(code ?? 1)
    })
  })

const nextProcess = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    APP_HOST,
    "--port",
    String(APP_PORT),
  ],
  {
    env: appEnvironment,
    stdio: "inherit",
  }
)

let exitCode = 1

try {
  await resetEmulators()
  await seedAuthUser()
  await waitForUrl(`${APP_URL}/sign-in`)

  exitCode = await runProcess(
    "./node_modules/.bin/cypress",
    [openMode ? "open" : "run", "--config", `baseUrl=${APP_URL}`],
    {
      env: {
        ...appEnvironment,
        CYPRESS_E2E_EMAIL: E2E_EMAIL,
        CYPRESS_E2E_PASSWORD: E2E_PASSWORD,
        CYPRESS_E2E_ALLOW_WRITES: "true",
      },
    }
  )

  await verifyCleanup()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  exitCode = 1
} finally {
  nextProcess.kill("SIGTERM")
}

process.exitCode = exitCode
