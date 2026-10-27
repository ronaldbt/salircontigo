import { signalRoom } from '../../../utils/watch'

export default defineEventHandler(async (event) => {
  const code = String(getRouterParam(event, 'code') || '')
  const body = await readBody(event)
  return signalRoom(
    event,
    code,
    String(body?.kind ?? ''),
    String(body?.payload ?? ''),
    Number(body?.generation),
  )
})
