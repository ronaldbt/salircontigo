import { requireUser } from '../../utils/auth'
import { sqlFor } from '../../utils/db'
import { createRoom } from '../../utils/watch'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const code = await createRoom(await sqlFor(event), user.id, user.name)
  return { code }
})
