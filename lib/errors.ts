export const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback
