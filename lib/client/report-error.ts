type ClientErrorContext = {
  boundary: "route" | "global"
}

export const getClientErrorCorrelationId = (error: Error & { digest?: string }) =>
  error.digest || globalThis.crypto?.randomUUID?.() || `client-${Date.now().toString(36)}`

export function reportClientError(
  error: Error & { digest?: string },
  context: ClientErrorContext,
  correlationId = getClientErrorCorrelationId(error),
) {
  console.error({
    event: "client_render_error",
    correlationId,
    boundary: context.boundary,
    name: error.name,
    message: error.message,
    path: globalThis.location?.pathname ?? null,
  })

  return correlationId
}
