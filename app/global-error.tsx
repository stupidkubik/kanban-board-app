"use client"

import * as React from "react"

import {
  getClientErrorCorrelationId,
  reportClientError,
} from "@/lib/client/report-error"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [correlationId] = React.useState(() => getClientErrorCorrelationId(error))

  React.useEffect(() => {
    reportClientError(error, { boundary: "global" }, correlationId)
  }, [correlationId, error])

  return (
    <html lang="en">
      <body>
        <main
          role="alert"
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <section style={{ maxWidth: 520, textAlign: "center" }}>
            <h1>Application error</h1>
            <p>Reload the application and try again.</p>
            {correlationId ? <p>Error code: {correlationId}</p> : null}
            <button type="button" onClick={reset}>
              Reload
            </button>
          </section>
        </main>
      </body>
    </html>
  )
}
