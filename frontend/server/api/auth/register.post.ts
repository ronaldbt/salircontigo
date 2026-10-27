import { MAX_INVITES, isLang } from '#shared/types'
import { fail, insertUser, sqlFor } from '../../utils/db'
import { hashPassword, publicUser, setSessionCookie } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = String(body?.name ?? '').trim()
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')

  if (name.length < 2 || name.length > 40) fail(400, 'invalid_name')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'invalid_email')
  if (password.length < 6 || password.length > 80) fail(400, 'weak_password')

  const { passwordHash, salt } = hashPassword(password)
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
    salt,
    invitesCreated: 0,
    createdAt: new Date().toISOString(),
  }
  await insertUser(await sqlFor(event), user)

  setSessionCookie(event, user.id)
  return { user: publicUser(user), maxInvites: MAX_INVITES, lang: isLang(body?.lang) ? body.lang : 'es' }
})
