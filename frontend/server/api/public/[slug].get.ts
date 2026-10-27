import { ensureInvite } from '#shared/defaults'
import { fail, findInviteBySlug, sqlFor } from '../../utils/db'
import { toPublicInvite } from '../../utils/invites'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''
  const invite = await findInviteBySlug(await sqlFor(event), slug)
  if (!invite) fail(404, 'not_found')
  if (!invite.active) fail(403, 'paused')
  ensureInvite(invite)
  return { invite: toPublicInvite(invite) }
})
