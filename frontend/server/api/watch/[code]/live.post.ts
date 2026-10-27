import { guardRoom } from '../../../utils/watch'
import { pushLive } from '../../../utils/live-hub'

export default defineEventHandler(async (event) => {
  const code = String(getRouterParam(event, 'code') || '')
  await guardRoom(event, code)
  setHeader(event, 'cache-control', 'no-store')
  const raw = await readRawBody(event, false)
  if (!raw?.length || raw.length > 4_000_000) return { ok: false }
  const mime = String(getHeader(event, 'x-salircontigo-mime') || '').slice(0, 80)
  pushLive(code, new Uint8Array(raw), mime)
  return { ok: true }
})
