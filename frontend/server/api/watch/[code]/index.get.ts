import { watchState } from '../../../utils/watch'

export default defineEventHandler(async (event) => {
  const code = String(getRouterParam(event, 'code') || '')
  return watchState(event, code)
})
