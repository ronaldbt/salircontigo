import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Db } from './db'

let cached: Db | undefined

export function localDb(): Db {
  if (cached) return cached
  const file = join(process.cwd(), '.data', 'salircontigo.sqlite')
  mkdirSync(dirname(file), { recursive: true })
  const database = new DatabaseSync(file)
  database.exec('PRAGMA foreign_keys = ON')
  const migrations = join(process.cwd(), 'migrations')
  for (const name of readdirSync(migrations).filter(file => file.endsWith('.sql')).sort()) {
    database.exec(readFileSync(join(migrations, name), 'utf8'))
  }
  cached = {
    prepare(query: string) {
      const statement = database.prepare(query)
      let args: unknown[] = []
      const api = {
        bind(...values: unknown[]) {
          args = values
          return api
        },
        async first<T>() {
          const row = statement.get(...args as never[])
          return (row ?? null) as T | null
        },
        async all<T>() {
          return { results: statement.all(...args as never[]) as T[] }
        },
        async run() {
          const result = statement.run(...args as never[])
          return { success: true, meta: { changes: Number(result.changes) } }
        },
      }
      return api
    },
  }
  return cached
}
