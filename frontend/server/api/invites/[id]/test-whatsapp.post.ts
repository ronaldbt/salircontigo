import { fail, findInviteForUser, sqlFor } from '../../../utils/db'
import { requireUser } from '../../../utils/auth'
import { sendCallmebot } from '../../../utils/invites'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id') || ''
  const invite = await findInviteForUser(await sqlFor(event), id, user.id)
  if (!invite) fail(404, 'not_found')
  if (!invite.whatsapp || !invite.callmebotKey) fail(400, 'whatsapp_missing')

  const ok = await sendCallmebot(
    invite.whatsapp,
    'Salircontigo — mensaje de prueba. Si lees esto, el aviso funciona.',
    invite.callmebotKey,
  )
  if (!ok) fail(400, 'notify_failed')
  return { ok: true }
})
