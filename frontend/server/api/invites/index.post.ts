import { isInviteKind, isLang } from '#shared/types'
import { blankInvite } from '#shared/defaults'
import { fail, reserveInvite, slugTaken, sqlFor } from '../../utils/db'
import { requireUser } from '../../utils/auth'
import { makeSlug } from '../../utils/invites'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)
  const name = String(body?.name ?? '').trim()
  if (name.length < 2 || name.length > 60) fail(400, 'invalid_name')
  const lang = isLang(body?.lang) ? body.lang : 'es'
  const kind = isInviteKind(body?.kind) ? body.kind : 'date'
  const sql = await sqlFor(event)

  let slug = makeSlug(name)
  for (let attempt = 0; attempt < 5 && await slugTaken(sql, slug); attempt += 1) slug = makeSlug(name)
  const invite = await reserveInvite(sql, user.id, blankInvite({
    id: crypto.randomUUID(),
    userId: user.id,
    slug,
    name,
    defaultLang: lang,
  }, kind))

  return { invite }
})
