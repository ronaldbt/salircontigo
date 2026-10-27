import { requireUser } from '../../utils/auth'
import { sqlFor } from '../../utils/db'
import { listRooms } from '../../utils/watch'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { rooms: await listRooms(await sqlFor(event), user.id) }
})
