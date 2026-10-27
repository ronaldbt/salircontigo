import { fail } from '../../utils/db'
import { publicUser, requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (!user) fail(401, 'unauthorized')
  return { user: publicUser(user) }
})
