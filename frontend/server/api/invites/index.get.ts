import { MAX_INVITES } from '#shared/types'
import { listInviteSummaries, sqlFor } from '../../utils/db'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const invites = await listInviteSummaries(await sqlFor(event), user.id)

  return {
    invites,
    remaining: Math.max(0, MAX_INVITES - user.invitesCreated),
    maxInvites: MAX_INVITES,
  }
})
