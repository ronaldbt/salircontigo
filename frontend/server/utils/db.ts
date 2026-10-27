import type { H3Event } from 'h3'
import { normalizeTimes } from '#shared/defaults'
import type { Invite, InviteResponse, User } from '#shared/types'
import { MAX_INVITES } from '#shared/types'

interface DbStatement {
  bind(...values: unknown[]): DbStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  run(): Promise<{ success: boolean, meta: { changes?: number }, results?: unknown[] }>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
}

export interface Db {
  prepare(query: string): DbStatement
}

type Row = Record<string, unknown>

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString()
  return String(value ?? '')
}

function json<T>(value: unknown, fallback: T): T {
  if (value == null || value === '') return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    }
    catch {
      return fallback
    }
  }
  return value as T
}

function pack(value: unknown) {
  return JSON.stringify(value ?? null)
}

function bit(value: boolean) {
  return value ? 1 : 0
}

function isUnique(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /unique constraint failed/i.test(message)
}

export function fail(status: number, error: string): never {
  throw createError({
    statusCode: status,
    statusMessage: error,
    data: { error },
  })
}

export async function sqlFor(event: H3Event): Promise<Db> {
  const remote = event.context.cloudflare?.env?.DB
  if (remote) return remote
  if (process.env.CF_PAGES) fail(500, 'database_unavailable')
  const { localDb } = await import('./local-db')
  return localDb()
}

async function one<T extends Row>(db: Db, query: string, ...args: unknown[]) {
  const statement = db.prepare(query)
  return (args.length ? statement.bind(...args) : statement).first<T>()
}

async function many<T extends Row>(db: Db, query: string, ...args: unknown[]) {
  const statement = db.prepare(query)
  const result = await (args.length ? statement.bind(...args) : statement).all<T>()
  return result.results || []
}

async function run(db: Db, query: string, ...args: unknown[]) {
  const statement = db.prepare(query)
  return (args.length ? statement.bind(...args) : statement).run()
}

function changes(result: { meta: { changes?: number } }) {
  return Number(result.meta?.changes || 0)
}

function mapUser(row: Row): User {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    salt: String(row.salt),
    invitesCreated: Number(row.invites_created),
    createdAt: iso(row.created_at),
  }
}

function mapInvite(row: Row): Invite {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    slug: String(row.slug),
    name: String(row.name),
    photoUrl: String(row.photo_url ?? ''),
    active: Boolean(row.active),
    kind: row.kind === 'sorry' ? 'sorry' : 'date',
    steps: json(row.steps, { date: true, food: true, letter: true, play: false }),
    prompts: json(row.prompts, []),
    languages: json(row.languages, ['es']),
    defaultLang: row.default_lang === 'en' || row.default_lang === 'pt' ? row.default_lang : 'es',
    copy: json(row.copy, {} as Invite['copy']),
    foods: json(row.foods, []),
    times: normalizeTimes(json(row.times, [])),
    whatsapp: String(row.whatsapp ?? ''),
    callmebotKey: String(row.callmebot_key ?? ''),
    createdAt: iso(row.created_at),
  }
}

function mapResponse(row: Row): InviteResponse {
  return {
    id: String(row.id),
    inviteId: String(row.invite_id),
    lang: row.lang === 'en' || row.lang === 'pt' ? row.lang : 'es',
    noAttempts: Number(row.no_attempts) || 0,
    date: String(row.date ?? ''),
    time: String(row.time ?? ''),
    foodId: String(row.food_id ?? ''),
    answers: json(row.answers, []),
    callmebotOk: Boolean(row.callmebot_ok),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export async function findUserById(db: Db, id: string) {
  const row = await one(db, 'select * from users where id = ?', id)
  return row ? mapUser(row) : null
}

export async function findUserByEmail(db: Db, email: string) {
  const row = await one(db, 'select * from users where email = ?', email)
  return row ? mapUser(row) : null
}

export async function insertUser(db: Db, user: User) {
  try {
    await run(
      db,
      `insert into users (id, name, email, password_hash, salt, invites_created, created_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
      user.id,
      user.name,
      user.email,
      user.passwordHash,
      user.salt,
      user.invitesCreated,
      user.createdAt,
    )
  }
  catch (error) {
    if (isUnique(error)) fail(400, 'email_taken')
    throw error
  }
}

export async function findInviteBySlug(db: Db, slug: string) {
  const row = await one(db, 'select * from invites where slug = ?', slug)
  return row ? mapInvite(row) : null
}

export async function findInviteForUser(db: Db, id: string, userId: string) {
  const row = await one(db, 'select * from invites where id = ? and user_id = ?', id, userId)
  return row ? mapInvite(row) : null
}

export async function listResponses(db: Db, inviteId: string) {
  const rows = await many(
    db,
    'select * from responses where invite_id = ? order by created_at desc',
    inviteId,
  )
  return rows.map(mapResponse)
}

export async function listInviteSummaries(db: Db, userId: string) {
  const invites = await many(
    db,
    'select * from invites where user_id = ? order by created_at desc',
    userId,
  )
  const ids = invites.map(row => String(row.id))
  const responses = ids.length
    ? await many(
      db,
      `select * from responses where invite_id in (${ids.map(() => '?').join(', ')}) order by created_at desc`,
      ...ids,
    )
    : []
  const grouped = new Map<string, InviteResponse[]>()
  for (const row of responses) {
    const response = mapResponse(row)
    const list = grouped.get(response.inviteId) || []
    list.push(response)
    grouped.set(response.inviteId, list)
  }
  return invites.map((row) => {
    const invite = mapInvite(row)
    const list = grouped.get(invite.id) || []
    return {
      id: invite.id,
      name: invite.name,
      slug: invite.slug,
      kind: invite.kind,
      active: invite.active,
      languages: invite.languages,
      defaultLang: invite.defaultLang,
      createdAt: invite.createdAt,
      responses: list.length,
      latest: list[0] || null,
    }
  })
}

async function insertInvite(db: Db, invite: Invite) {
  await run(
    db,
    `insert into invites (
      id, user_id, slug, name, photo_url, active, kind, steps, prompts, languages,
      default_lang, copy, foods, times, whatsapp, callmebot_key, created_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    invite.id,
    invite.userId,
    invite.slug,
    invite.name,
    invite.photoUrl,
    bit(invite.active),
    invite.kind,
    pack(invite.steps),
    pack(invite.prompts),
    pack(invite.languages),
    invite.defaultLang,
    pack(invite.copy),
    pack(invite.foods),
    pack(invite.times),
    invite.whatsapp,
    invite.callmebotKey,
    invite.createdAt,
  )
}

export async function reserveInvite(db: Db, userId: string, invite: Invite) {
  const updated = await run(
    db,
    'update users set invites_created = invites_created + 1 where id = ? and invites_created < ?',
    userId,
    MAX_INVITES,
  )
  if (!changes(updated)) {
    const user = await one(db, 'select id from users where id = ?', userId)
    if (!user) fail(401, 'unauthorized')
    fail(403, 'quota')
  }
  try {
    await insertInvite(db, invite)
  }
  catch (error) {
    await run(
      db,
      'update users set invites_created = invites_created - 1 where id = ? and invites_created > 0',
      userId,
    )
    if (isUnique(error)) fail(400, 'slug_taken')
    throw error
  }
  return invite
}

export async function saveInvite(db: Db, invite: Invite) {
  const result = await run(
    db,
    `update invites set
      slug = ?,
      name = ?,
      photo_url = ?,
      active = ?,
      steps = ?,
      prompts = ?,
      languages = ?,
      default_lang = ?,
      copy = ?,
      foods = ?,
      times = ?,
      whatsapp = ?,
      callmebot_key = ?
    where id = ? and user_id = ?`,
    invite.slug,
    invite.name,
    invite.photoUrl,
    bit(invite.active),
    pack(invite.steps),
    pack(invite.prompts),
    pack(invite.languages),
    invite.defaultLang,
    pack(invite.copy),
    pack(invite.foods),
    pack(invite.times),
    invite.whatsapp,
    invite.callmebotKey,
    invite.id,
    invite.userId,
  )
  if (!changes(result)) fail(404, 'not_found')
}

export async function deleteInvite(db: Db, id: string, userId: string) {
  const result = await run(db, 'delete from invites where id = ? and user_id = ?', id, userId)
  if (!changes(result)) fail(404, 'not_found')
}

export async function countResponses(db: Db, inviteId: string) {
  const row = await one<{ total: number }>(db, 'select count(*) as total from responses where invite_id = ?', inviteId)
  return Number(row?.total) || 0
}

export async function findResponse(db: Db, id: string, inviteId: string) {
  if (!id) return null
  const row = await one(db, 'select * from responses where id = ? and invite_id = ?', id, inviteId)
  return row ? mapResponse(row) : null
}

export async function insertResponse(db: Db, response: InviteResponse) {
  await run(
    db,
    `insert into responses (
      id, invite_id, lang, no_attempts, date, time, food_id, answers, callmebot_ok, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    response.id,
    response.inviteId,
    response.lang,
    response.noAttempts,
    response.date,
    response.time,
    response.foodId,
    pack(response.answers),
    bit(response.callmebotOk),
    response.createdAt,
    response.updatedAt,
  )
}

export async function updateResponse(db: Db, response: InviteResponse) {
  await run(
    db,
    `update responses set
      lang = ?,
      no_attempts = ?,
      date = ?,
      time = ?,
      food_id = ?,
      answers = ?,
      updated_at = ?
    where id = ? and invite_id = ?`,
    response.lang,
    response.noAttempts,
    response.date,
    response.time,
    response.foodId,
    pack(response.answers),
    response.updatedAt,
    response.id,
    response.inviteId,
  )
}

export async function markCallmebot(db: Db, id: string) {
  await run(db, 'update responses set callmebot_ok = 1 where id = ?', id)
}

export async function slugTaken(db: Db, slug: string) {
  const row = await one(db, 'select 1 as found from invites where slug = ?', slug)
  return Boolean(row)
}

export async function takenSlugs(db: Db, inviteId: string) {
  const rows = await many<{ slug: string }>(db, 'select slug from invites where id <> ?', inviteId)
  return rows.map(row => String(row.slug))
}
