import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = process.cwd()
const nextRoot = path.join(projectRoot, ".next")

const collectTraceManifests = (directory) => {
  if (!fs.existsSync(directory)) {
    return []
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return collectTraceManifests(entryPath)
    }
    return entry.name.endsWith(".nft.json") ? [entryPath] : []
  })
}

const isSensitiveProjectFile = (absolutePath) => {
  const relativePath = path.relative(projectRoot, absolutePath)
  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    relativePath.startsWith(`node_modules${path.sep}`) ||
    relativePath.startsWith(`.next${path.sep}`)
  ) {
    return false
  }

  const segments = relativePath.split(path.sep)
  const filename = path.basename(relativePath).toLowerCase()

  return (
    segments.some((segment) => segment === ".env" || segment.startsWith(".env.")) ||
    filename.includes("firebase-adminsdk") ||
    filename.includes("service-account") ||
    filename.includes("service_account") ||
    filename === "credentials.json" ||
    filename.endsWith(".pem") ||
    filename.endsWith(".p12")
  )
}

export const findSensitiveTraceEntries = (manifestPaths) => {
  const findings = []

  manifestPaths.forEach((manifestPath) => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    const files = Array.isArray(manifest.files) ? manifest.files : []

    files.forEach((tracedFile) => {
      const absolutePath = path.resolve(path.dirname(manifestPath), tracedFile)
      if (isSensitiveProjectFile(absolutePath)) {
        findings.push({ manifestPath, absolutePath })
      }
    })
  })

  return findings
}

const run = () => {
  const manifests = collectTraceManifests(nextRoot)
  if (!manifests.length) {
    throw new Error("No Next.js trace manifests found. Run `npm run build` first.")
  }

  const findings = findSensitiveTraceEntries(manifests)
  if (findings.length) {
    const details = findings
      .map(
        ({ manifestPath, absolutePath }) =>
          `${path.relative(projectRoot, manifestPath)} -> ${path.relative(projectRoot, absolutePath)}`
      )
      .join("\n")
    throw new Error(`Sensitive files found in Next.js server traces:\n${details}`)
  }

  process.stdout.write(`Server trace check passed (${manifests.length} manifests).\n`)
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  run()
}
