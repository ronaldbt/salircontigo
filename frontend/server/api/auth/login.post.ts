import { fail, findUserByEmail, sqlFor } from '../../utils/db'
import { publicUser, setSessionCookie, verifyPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')
  if (!email || !password) fail(400, 'invalid_credentials')

  const user = await findUserByEmail(await sqlFor(event), email)
  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) fail(400, 'invalid_credentials')

  setSessionCookie(event, user.id)
  return { user: publicUser(user) }
})
