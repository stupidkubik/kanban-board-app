"use client"

import * as React from "react"

import { useStoredUiLocale } from "@/lib/browser-preferences"
import {
  getClientErrorCorrelationId,
  reportClientError,
} from "@/lib/client/report-error"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

const copy = {
  ru: {
    title: "Что-то пошло не так",
    description: "Попробуйте повторить действие. Если ошибка вернётся, сообщите код ниже.",
    retry: "Повторить",
    code: "Код ошибки",
  },
  en: {
    title: "Something went wrong",
    description: "Try the action again. If the error returns, report the code below.",
    retry: "Try again",
    code: "Error code",
  },
} as const

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const locale = useStoredUiLocale()
  const [correlationId] = React.useState(() => getClientErrorCorrelationId(error))

  React.useEffect(() => {
    reportClientError(error, { boundary: "route" }, correlationId)
  }, [correlationId, error])

  const labels = copy[locale]

  return (
    <main className="errorBoundary" role="alert">
      <section className="errorBoundaryCard">
        <h1>{labels.title}</h1>
        <p>{labels.description}</p>
        {correlationId ? (
          <p className="errorBoundaryCode">
            {labels.code}: <code>{correlationId}</code>
          </p>
        ) : null}
        <button className="errorBoundaryButton" type="button" onClick={reset}>
          {labels.retry}
        </button>
      </section>
    </main>
  )
}
