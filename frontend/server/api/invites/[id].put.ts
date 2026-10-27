import type { Invite } from '#shared/types'
import { ensureInvite } from '#shared/defaults'
import { fail, findInviteForUser, saveInvite, sqlFor, takenSlugs } from '../../utils/db'
import { requireUser } from '../../utils/auth'
import { applyInviteUpdate } from '../../utils/invites'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody<Partial<Invite>>(event)
  const sql = await sqlFor(event)
  const invite = await findInviteForUser(sql, id, user.id)
  if (!invite) fail(404, 'not_found')
  ensureInvite(invite)
  applyInviteUpdate(invite, body, await takenSlugs(sql, invite.id))
  await saveInvite(sql, invite)
  return { invite }
})
