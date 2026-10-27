import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { MAX_INVITES, type PublicUser, type User } from '#shared/types'
import { fail, findUserById, sqlFor } from './db'

const COOKIE = 'salircontigo_session'

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const passwordHash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex')
  return { passwordHash, salt }
}

export function verifyPassword(password: string, hash: string, salt: string) {
  const next = pbkdf2Sync(password, salt, 120000, 32, 'sha256')
  const prev = Buffer.from(hash, 'hex')
  if (next.length !== prev.length) return false
  return timingSafeEqual(next, prev)
}

export function sessionSecret(event?: H3Event) {
  return event?.context.cloudflare?.env?.NUXT_SESSION_SECRET
    || process.env.NUXT_SESSION_SECRET
    || useRuntimeConfig().sessionSecret
    || 'salircontigo-dev-secret-change-me'
}

export function signSession(userId: string, event?: H3Event) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30
  const body = Buffer.from(JSON.stringify({ userId, exp })).toString('base64url')
  const sig = createHmac('sha256', sessionSecret(event)).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function readSession(token?: string, event?: H3Event) {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', sessionSecret(event)).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as { userId?: string, exp?: number }
    if (!payload.userId || !payload.exp || payload.exp < Date.now()) return null
    return { userId: payload.userId, exp: payload.exp }
  }
  catch {
    return null
  }
}

export function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    invitesCreated: user.invitesCreated,
    maxInvites: MAX_INVITES,
    remaining: Math.max(0, MAX_INVITES - user.invitesCreated),
  }
}

export function setSessionCookie(event: H3Event, userId: string) {
  setCookie(event, COOKIE, signSession(userId, event), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production',
  })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, COOKIE, { path: '/' })
}

export async function requireUser(event: H3Event) {
  const session = readSession(getCookie(event, COOKIE), event)
  if (!session) fail(401, 'unauthorized')
  const user = await findUserById(await sqlFor(event), session.userId)
  if (!user) fail(401, 'unauthorized')
  return user
}
