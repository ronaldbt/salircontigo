import { deleteInvite, sqlFor } from '../../utils/db'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id') || ''
  await deleteInvite(await sqlFor(event), id, user.id)
  return { ok: true }
})
