import { ensureInvite } from '#shared/defaults'
import { fail, findInviteForUser, listResponses, sqlFor } from '../../utils/db'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id') || ''
  const sql = await sqlFor(event)
  const invite = await findInviteForUser(sql, id, user.id)
  if (!invite) fail(404, 'not_found')
  ensureInvite(invite)
  const responses = await listResponses(sql, invite.id)
  return { invite, responses }
})
