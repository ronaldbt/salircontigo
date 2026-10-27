import { guardRoom } from '../../../utils/watch'
import { readLive } from '../../../utils/live-hub'

export default defineEventHandler(async (event) => {
  const code = String(getRouterParam(event, 'code') || '')
  await guardRoom(event, code)
  setHeader(event, 'cache-control', 'no-store')
  const after = Number(getQuery(event).after ?? -1)
  return readLive(code, Number.isFinite(after) ? after : -1)
})
