import { postMessage } from '../../../utils/watch'

export default defineEventHandler(async (event) => {
  const code = String(getRouterParam(event, 'code') || '')
  const body = await readBody(event)
  return postMessage(event, code, String(body?.body ?? ''))
})