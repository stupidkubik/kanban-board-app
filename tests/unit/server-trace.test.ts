import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"

// @ts-expect-error The production check is an executable JavaScript module.
import { findSensitiveTraceEntries } from "../../scripts/check-server-trace.mjs"

const temporaryDirectories: string[] = []

const createManifest = (files: string[]) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kanban-trace-test-"))
  temporaryDirectories.push(directory)
  const manifestPath = path.join(directory, "route.js.nft.json")
  fs.writeFileSync(manifestPath, JSON.stringify({ version: 1, files }))
  return manifestPath
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    fs.rmSync(directory, { recursive: true, force: true })
  })
})

describe("server trace secret check", () => {
  it("detects project credential files and ignores ordinary project files", () => {
    const envExample = path.join(process.cwd(), ".env.example")
    const readme = path.join(process.cwd(), "README.md")
    const manifestPath = createManifest([envExample, readme])

    const findings = findSensitiveTraceEntries([manifestPath])

    expect(findings).toEqual([{ manifestPath, absolutePath: envExample }])
  })
})
