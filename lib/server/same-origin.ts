// CSRF defence for cookie-authenticated API routes. SameSite=Lax alone still
// lets same-site pages and top-level form posts through; browsers label every
// request with Sec-Fetch-Site and send Origin on cross-origin mutations.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

// The host the browser addressed. Next.js builds `request.url` from its own
// `--hostname` in development (e.g. localhost while the browser used
// 127.0.0.1), and Vercel forwards the public host in X-Forwarded-Host.
// A cross-site page cannot set these headers without a CORS preflight.
const getRequestHost = (request: Request) =>
  request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
  request.headers.get("host") ||
  new URL(request.url).host

const getOriginHost = (origin: string) => {
  try {
    return new URL(origin).host
  } catch {
    return null // "null" from sandboxed frames and file:// pages
  }
}

export const isCrossOriginMutation = (request: Request) => {
  if (SAFE_METHODS.has(request.method)) {
    return false
  }

  const fetchSite = request.headers.get("sec-fetch-site")
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return true
  }

  const origin = request.headers.get("origin")
  return origin !== null && getOriginHost(origin) !== getRequestHost(request)
}
