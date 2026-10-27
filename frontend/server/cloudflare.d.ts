interface D1Meta {
  changes?: number
}

interface D1Prepared {
  bind(...values: unknown[]): D1Prepared
  first<T = Record<string, unknown>>(): Promise<T | null>
  run(): Promise<{ success: boolean, meta: D1Meta, results?: unknown[] }>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
}

interface D1Database {
  prepare(query: string): D1Prepared
  exec(query: string): Promise<unknown>
}

declare module 'h3' {
  interface H3EventContext {
    cloudflare?: {
      request: Request
      env: {
        DB?: D1Database
        NUXT_SESSION_SECRET?: string
      }
      context: {
        waitUntil: (promise: Promise<unknown>) => void
      }
    }
  }
}

export {}
