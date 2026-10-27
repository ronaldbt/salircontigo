export function errorCode(error: unknown) {
  const data = error as {
    data?: { error?: string, statusMessage?: string, data?: { error?: string } }
    statusMessage?: string
  }
  return data?.data?.data?.error
    || data?.data?.error
    || data?.data?.statusMessage
    || data?.statusMessage
    || 'error'
}

export function explainError(error: unknown, errors: Record<string, string>) {
  const code = errorCode(error)
  return errors[code] || errors.error || code
}
