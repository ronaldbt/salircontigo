import { isLang } from '#shared/types'
import type { InviteResponse, PlayAnswer } from '#shared/types'
import { ensureInvite } from '#shared/defaults'
import {
  countResponses,
  fail,
  findInviteBySlug,
  findResponse,
  insertResponse,
  markCallmebot,
  sqlFor,
  updateResponse,
} from '../../../utils/db'
import { messageFor, sendCallmebot, waLink } from '../../../utils/invites'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''
  const body = await readBody(event)
  const sql = await sqlFor(event)
  const invite = await findInviteBySlug(sql, slug)
  if (!invite) fail(404, 'not_found')
  if (!invite.active) fail(403, 'paused')
  ensureInvite(invite)

  const lang = isLang(body?.lang) && invite.languages.includes(body.lang) ? body.lang : invite.defaultLang
  const date = invite.steps.date ? String(body?.date ?? '').slice(0, 10) : ''
  const time = invite.steps.date ? String(body?.time ?? '').slice(0, 5) : ''
  const foodId = invite.steps.food ? String(body?.foodId ?? '').slice(0, 24) : ''
  const noAttempts = Math.max(0, Math.min(500, Math.floor(Number(body?.noAttempts) || 0)))

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(400, 'invalid')
  if (time && !invite.times.includes(time)) fail(400, 'invalid')
  if (foodId && !invite.foods.some(item => item.id === foodId)) fail(400, 'invalid')
  const answers: PlayAnswer[] = []
  if (Array.isArray(body?.answers)) {
    for (const row of body.answers.slice(0, 12)) {
      const prompt = invite.prompts.find(item => item.id === String(row?.promptId ?? ''))
      if (!prompt) continue
      const raw = String(row?.value ?? '').trim().slice(0, 280)
      const value = prompt.kind === 'question'
        ? raw
        : (prompt.options.some(option => option.id === raw) ? raw : '')
      if (value) answers.push({ promptId: prompt.id, value })
    }
  }
  if (body?.finalize && invite.steps.date && (!date || !time)) fail(400, 'invalid')
  if (body?.finalize && invite.steps.food && !foodId) fail(400, 'invalid')
  if (body?.finalize && invite.steps.play && invite.prompts.some(prompt => !answers.some(answer => answer.promptId === prompt.id))) {
    fail(400, 'invalid')
  }

  const now = new Date().toISOString()
  const responseId = String(body?.responseId ?? '')
  let response = await findResponse(sql, responseId, invite.id)
  if (!response) {
    if (await countResponses(sql, invite.id) >= 100) fail(400, 'invalid')
    response = {
      id: crypto.randomUUID(),
      inviteId: invite.id,
      lang,
      noAttempts,
      date,
      time,
      foodId,
      answers,
      callmebotOk: false,
      createdAt: now,
      updatedAt: now,
    } satisfies InviteResponse
    await insertResponse(sql, response)
  }
  else {
    response.lang = lang
    response.noAttempts = noAttempts
    response.date = date
    response.time = time
    response.foodId = foodId
    response.answers = answers
    response.updatedAt = now
    await updateResponse(sql, response)
  }

  const prepared = {
    id: response.id,
    finalize: Boolean(body?.finalize),
    phone: invite.whatsapp,
    key: invite.callmebotKey,
    alreadySent: response.callmebotOk,
    message: messageFor(invite, response),
  }

  let callmebotOk = prepared.alreadySent
  if (prepared.finalize && prepared.phone && prepared.key && !callmebotOk) {
    callmebotOk = await sendCallmebot(prepared.phone, prepared.message, prepared.key)
    if (callmebotOk) await markCallmebot(await sqlFor(event), prepared.id)
  }

  const whatsappUrl = prepared.finalize && prepared.phone && !callmebotOk
    ? waLink(prepared.phone, prepared.message)
    : ''

  return { id: prepared.id, whatsappUrl, callmebotOk }
})
