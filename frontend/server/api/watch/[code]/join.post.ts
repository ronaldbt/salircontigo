import { joinRoom } from '../../../utils/watch'

export default defineEventHandler(async (event) => {
  const code = String(getRouterParam(event, 'code') || '')
  const body = await readBody(event)
  return joinRoom(event, code, String(body?.name ?? ''))
})
