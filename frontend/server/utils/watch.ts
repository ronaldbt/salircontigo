import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import type { WatchMessage, WatchRole, WatchState } from '#shared/types'
import { readSession, sessionSecret } from './auth'
import { fail, findUserById, sqlFor, type Db } from './db'
import { clearLive } from './live-hub'

const COOKIE = 'salircontigo_watch'

type RoomRow = {
  id: string
  code: string
  host_id: string
  host_name: string
  guest_name: string
  guest_token: string
  generation: number
  sharer: string
  offer: string
  answer: string
  created_at: string
}

function id() {
  return crypto.randomUUID().replace(/-/g, '')
}

async function one<T>(db: Db, query: string, ...args: unknown[]) {
  const statement = db.prepare(query)
  return (args.length ? statement.bind(...args) : statement).first<T>()
}

async function many<T>(db: Db, query: string, ...args: unknown[]) {
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

function sign(event: H3Event, body: string) {
  return createHmac('sha256', sessionSecret(event)).update(body).digest('base64url')
}

function readGuest(event: H3Event) {
  const token = getCookie(event, COOKIE)
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = sign(event, body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as { code?: string, token?: string, name?: string, exp?: number }
    if (!payload.code || !payload.token || !payload.name || !payload.exp || payload.exp < Date.now()) return null
    return { code: payload.code, token: payload.token, name: payload.name }
  }
  catch {
    return null
  }
}

function setGuest(event: H3Event, code: string, token: string, name: string) {
  const body = Buffer.from(JSON.stringify({
    code,
    token,
    name,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  })).toString('base64url')
  setCookie(event, COOKIE, `${body}.${sign(event, body)}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  })
}

function asSharer(value: string): 'host' | 'guest' | '' {
  return value === 'host' || value === 'guest' ? value : ''
}

async function roomByCode(db: Db, code: string) {
  return one<RoomRow>(db, 'select * from watch_rooms where code = ?', code)
}

export async function openRoom(event: H3Event, code: string) {
  const db = await sqlFor(event)
  const room = await roomByCode(db, code)
  if (!room) fail(404, 'not_found')
  const session = readSession(getCookie(event, 'salircontigo_session'), event)
  const user = session ? await findUserById(db, session.userId) : null
  const guest = readGuest(event)
  let role: WatchRole = ''
  if (user && user.id === room.host_id) role = 'host'
  else if (guest && guest.code === room.code && guest.token === room.guest_token && room.guest_token) role = 'guest'
  const name = role === 'host' ? room.host_name : role === 'guest' ? room.guest_name : ''
  return { db, room, role, name }
}

async function snapshot(db: Db, room: RoomRow, role: WatchRole, name: string): Promise<WatchState> {
  const joined = role === 'host' || role === 'guest'
  const state: WatchState = {
    joined,
    role,
    name,
    hostName: room.host_name,
    guestName: room.guest_name,
    code: room.code,
    generation: joined ? Number(room.generation) : 0,
    sharer: joined ? asSharer(room.sharer) : '',
    offer: joined ? String(room.offer || '') : '',
    answer: joined ? String(room.answer || '') : '',
    candidates: [],
    messages: [],
  }
  if (!joined) return state
  const ice = await many<{ id: number, sender: string, payload: string }>(
    db,
    'select id, sender, payload from watch_ice where room_id = ? and generation = ? order by id desc limit 40',
    room.id,
    room.generation,
  )
  state.candidates = ice.reverse().flatMap((row) => {
    if (row.sender !== 'host' && row.sender !== 'guest') return []
    return [{ id: Number(row.id), sender: row.sender, payload: String(row.payload) }]
  })
  const messages = await many<{ id: string, author: string, body: string, created_at: string }>(
    db,
    'select id, author, body, created_at from watch_messages where room_id = ? order by created_at desc limit 80',
    room.id,
  )
  state.messages = messages.reverse().map(row => ({
    id: String(row.id),
    author: String(row.author),
    body: String(row.body),
    createdAt: String(row.created_at),
  }))
  return state
}

export async function watchState(event: H3Event, code: string) {
  const { db, room, role, name } = await openRoom(event, code)
  return snapshot(db, room, role, name)
}

export async function listRooms(db: Db, hostId: string) {
  const rows = await many<{ code: string, guest_name: string, created_at: string }>(
    db,
    'select code, guest_name, created_at from watch_rooms where host_id = ? order by created_at desc limit 8',
    hostId,
  )
  return rows.map(row => ({
    code: String(row.code),
    guestName: String(row.guest_name || ''),
    createdAt: String(row.created_at),
  }))
}

export async function createRoom(db: Db, hostId: string, hostName: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = id().slice(0, 10)
    try {
      await run(
        db,
        'insert into watch_rooms (id, code, host_id, host_name, created_at) values (?, ?, ?, ?, ?)',
        id(),
        code,
        hostId,
        hostName.slice(0, 40),
        new Date().toISOString(),
      )
      return code
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? '')
      if (!/unique constraint failed/i.test(message)) throw error
    }
  }
  fail(500, 'error')
}

export async function joinRoom(event: H3Event, code: string, rawName: string) {
  const name = rawName.trim().slice(0, 40)
  if (name.length < 2) fail(400, 'needs_name')
  const { db, room, role } = await openRoom(event, code)
  if (role === 'host') return snapshot(db, room, role, room.host_name)
  if (role === 'guest') return snapshot(db, room, role, room.guest_name)
  const token = id()
  const claimed = await run(
    db,
    'update watch_rooms set guest_name = ?, guest_token = ? where id = ? and guest_token = ?',
    name,
    token,
    room.id,
    '',
  )
  if (!changes(claimed)) fail(409, 'room_taken')
  setGuest(event, room.code, token, name)
  const next = await roomByCode(db, code)
  if (!next) fail(404, 'not_found')
  return snapshot(db, next, 'guest', name)
}

function requireMember(role: WatchRole) {
  if (role !== 'host' && role !== 'guest') fail(401, 'unauthorized')
  return role
}

export async function guardRoom(event: H3Event, code: string) {
  const opened = await openRoom(event, code)
  requireMember(opened.role)
  return opened
}

export async function signalRoom(event: H3Event, code: string, kind: string, payload: string, generation: number) {
  const { db, room, role } = await openRoom(event, code)
  const member = requireMember(role)
  if (kind === 'start') {
    const result = await run(
      db,
      `update watch_rooms
       set generation = generation + 1, sharer = ?, offer = '', answer = ''
       where id = ?`,
      member,
      room.id,
    )
    if (!changes(result)) fail(404, 'not_found')
    await run(db, 'delete from watch_ice where room_id = ?', room.id)
    clearLive(code)
    const next = await roomByCode(db, code)
    return { generation: Number(next?.generation || 0) }
  }
  if (kind === 'stop') {
    const stopped = await run(
      db,
      `update watch_rooms
       set generation = generation + 1, sharer = '', offer = '', answer = ''
       where id = ? and sharer = ?`,
      room.id,
      member,
    )
    if (changes(stopped)) await run(db, 'delete from watch_ice where room_id = ? and generation = ?', room.id, room.generation)
    if (changes(stopped)) clearLive(code)
    return { generation: Number(room.generation) + (changes(stopped) ? 1 : 0) }
  }
  if (!Number.isInteger(generation) || generation !== Number(room.generation) || !room.sharer) fail(409, 'invalid')
  if (kind === 'offer') {
    if (member !== room.sharer || payload.length < 20 || payload.length > 20000) fail(400, 'invalid')
    await run(db, 'update watch_rooms set offer = ? where id = ? and generation = ? and sharer = ?', payload, room.id, generation, member)
    return { ok: true }
  }
  if (kind === 'answer') {
    if (member === room.sharer || payload.length < 20 || payload.length > 20000) fail(400, 'invalid')
    await run(db, 'update watch_rooms set answer = ? where id = ? and generation = ?', payload, room.id, generation)
    return { ok: true }
  }
  if (kind === 'ice') {
    if (payload.length < 2 || payload.length > 2000) fail(400, 'invalid')
    await run(
      db,
      'insert into watch_ice (room_id, generation, sender, payload) values (?, ?, ?, ?)',
      room.id,
      generation,
      member,
      payload,
    )
    return { ok: true }
  }
  fail(400, 'invalid')
}

export async function postMessage(event: H3Event, code: string, rawBody: string): Promise<WatchMessage> {
  const body = rawBody.trim().slice(0, 400)
  if (!body) fail(400, 'invalid')
  const { db, room, role, name } = await openRoom(event, code)
  requireMember(role)
  const message: WatchMessage = {
    id: id(),
    author: name,
    body,
    createdAt: new Date().toISOString(),
  }
  await run(
    db,
    'insert into watch_messages (id, room_id, author, body, created_at) values (?, ?, ?, ?, ?)',
    message.id,
    room.id,
    message.author,
    message.body,
    message.createdAt,
  )
  return message
}
