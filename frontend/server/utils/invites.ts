import type { FoodItem, Invite, InviteResponse, LangCopy, PlayPrompt, PublicInvite } from '#shared/types'
import { isLang, LANGS } from '#shared/types'
import { ensureInvite, foodLabel, formatInviteDate, renderTemplate } from '#shared/defaults'
import { fail } from './db'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function clip(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max)
}

function slugify(name: string) {
  const base = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
  return `${base || 'cita'}-${randomId().slice(0, 4)}`
}

export function randomId() {
  return crypto.randomUUID().replace(/-/g, '')
}

export function makeSlug(name: string) {
  return slugify(name)
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '').slice(0, 15)
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

export async function sendCallmebot(phone: string, text: string, apikey: string) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
    const body = await res.text()
    return res.ok && !/\berror\b|invalid|not found|apikey/i.test(body)
  }
  catch {
    return false
  }
}

export function toPublicInvite(invite: Invite): PublicInvite {
  const { userId: _userId, callmebotKey, ...rest } = invite
  return {
    ...rest,
    whatsapp: '',
    hasWhatsapp: Boolean(invite.whatsapp),
    hasAutoNotify: Boolean(invite.whatsapp && invite.callmebotKey),
  }
}

function cleanPhoto(value: unknown) {
  const photo = String(value ?? '').trim()
  if (!photo) return ''
  if (photo.startsWith('data:image/')) {
    if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(photo)) fail(400, 'invalid')
    if (photo.length > 900_000) fail(400, 'photo_large')
    return photo
  }
  let url: URL
  try {
    url = new URL(photo)
  }
  catch {
    fail(400, 'invalid')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') fail(400, 'invalid')
  if (photo.length > 2000) fail(400, 'invalid')
  return photo
}

function cleanCopy(input: unknown, fallback: LangCopy): LangCopy {
  const source = (input && typeof input === 'object' ? input : {}) as Partial<LangCopy>
  return {
    question: clip(source.question || fallback.question, 180),
    yes: clip(source.yes || fallback.yes, 24),
    no: clip(source.no || fallback.no, 24),
    niceTry: clip(source.niceTry || fallback.niceTry, 120),
    whenTitle: clip(source.whenTitle || fallback.whenTitle, 180),
    pickDay: clip(source.pickDay || fallback.pickDay, 80),
    pickTime: clip(source.pickTime || fallback.pickTime, 80),
    timePlaceholder: clip(source.timePlaceholder || fallback.timePlaceholder, 80),
    confirmDate: clip(source.confirmDate || fallback.confirmDate, 80),
    foodTitle: clip(source.foodTitle || fallback.foodTitle, 180),
    foodHint: clip(source.foodHint || fallback.foodHint, 80),
    letter: clip(source.letter || fallback.letter, 500),
    ps: clip(source.ps || fallback.ps, 400),
    whatsappCta: clip(source.whatsappCta || fallback.whatsappCta, 80),
    sentNote: clip(source.sentNote || fallback.sentNote, 180),
    playTitle: clip(source.playTitle || fallback.playTitle, 120),
    playNext: clip(source.playNext || fallback.playNext, 40),
    playFinish: clip(source.playFinish || fallback.playFinish, 180),
    answerPlaceholder: clip(source.answerPlaceholder || fallback.answerPlaceholder, 80),
  }
}

function cleanPrompts(input: unknown, fallback: PlayPrompt[]): PlayPrompt[] {
  if (!Array.isArray(input)) return fallback
  const prompts: PlayPrompt[] = []
  for (const item of input.slice(0, 12)) {
    if (!item || typeof item !== 'object') continue
    const row = item as Partial<PlayPrompt>
    const id = clip(row.id, 24).toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!id || prompts.some(prompt => prompt.id === id)) continue
    const kind = row.kind === 'choice' || row.kind === 'closer' ? row.kind : 'question'
    const text = {} as PlayPrompt['text']
    for (const lang of LANGS) text[lang] = clip(row.text?.[lang], 180) || id
    const options: PlayPrompt['options'] = []
    if (kind !== 'question' && Array.isArray(row.options)) {
      for (const option of row.options.slice(0, 4)) {
        const optionId = clip(option?.id, 24).toLowerCase().replace(/[^a-z0-9-]/g, '')
        if (!optionId || options.some(saved => saved.id === optionId)) continue
        const labels = {} as PlayPrompt['options'][number]['labels']
        for (const lang of LANGS) labels[lang] = clip(option?.labels?.[lang], 80) || optionId
        options.push({ id: optionId, labels })
      }
    }
    if (kind !== 'question' && options.length < 2) continue
    prompts.push({ id, kind, text, options: kind === 'question' ? [] : options })
  }
  return prompts
}

function cleanFoods(input: unknown, fallback: FoodItem[]): FoodItem[] {
  if (!Array.isArray(input) || input.length === 0) return fallback
  const foods: FoodItem[] = []
  for (const item of input.slice(0, 8)) {
    if (!item || typeof item !== 'object') continue
    const row = item as Partial<FoodItem>
    const id = clip(row.id, 24).toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!id || foods.some(item => item.id === id)) continue
    const labels = {} as FoodItem['labels']
    for (const lang of LANGS) {
      labels[lang] = clip(row.labels?.[lang], 40) || id
    }
    foods.push({
      id,
      emoji: clip(row.emoji, 8) || '🍽️',
      labels,
    })
  }
  return foods.length ? foods : fallback
}

export function applyInviteUpdate(invite: Invite, input: Partial<Invite>, slugs: string[]) {
  ensureInvite(invite)
  const name = clip(input.name, 60)
  if (name.length < 2) fail(400, 'invalid_name')

  const slug = clip(input.slug, 48).toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3) fail(400, 'invalid')
  if (slugs.includes(slug)) fail(400, 'slug_taken')

  const languages = (Array.isArray(input.languages) ? input.languages : []).filter(isLang)
  const uniqueLangs = [...new Set(languages)]
  if (!uniqueLangs.length) fail(400, 'invalid')
  const defaultLang = isLang(input.defaultLang) && uniqueLangs.includes(input.defaultLang)
    ? input.defaultLang
    : uniqueLangs[0]

  const steps = input.steps || invite.steps
  const times = (Array.isArray(input.times) ? input.times : invite.times)
    .map(item => clip(item, 5))
    .filter(item => TIME_RE.test(item))
  const uniqueTimes = [...new Set(times)].slice(0, 12)
  if (!uniqueTimes.length) fail(400, 'invalid')

  const whatsapp = normalizePhone(String(input.whatsapp ?? ''))
  if (whatsapp && (whatsapp.length < 8 || whatsapp.length > 15)) fail(400, 'invalid')
  const callmebotKey = clip(input.callmebotKey, 80)
  if (callmebotKey && !whatsapp) fail(400, 'whatsapp_missing')

  const copy = { ...invite.copy }
  for (const lang of LANGS) {
    copy[lang] = cleanCopy(input.copy?.[lang], invite.copy[lang])
  }

  invite.name = name
  invite.slug = slug
  invite.photoUrl = cleanPhoto(input.photoUrl)
  invite.active = input.active !== false
  invite.steps = {
    date: Boolean(steps.date),
    food: Boolean(steps.food),
    letter: Boolean(steps.letter),
    play: invite.kind === 'date' && Boolean(steps.play),
  }
  invite.prompts = invite.kind === 'sorry' ? [] : cleanPrompts(input.prompts, invite.prompts)
  invite.languages = uniqueLangs
  invite.defaultLang = defaultLang
  invite.copy = copy
  invite.foods = cleanFoods(input.foods, invite.foods)
  invite.times = uniqueTimes
  invite.whatsapp = whatsapp
  invite.callmebotKey = callmebotKey
  return invite
}

export function messageFor(invite: Invite, response: Pick<InviteResponse, 'lang' | 'date' | 'time' | 'foodId' | 'answers'>) {
  const lang = response.lang
  const yes = invite.kind === 'sorry'
    ? { es: 'Te perdonaron', en: 'They forgave you', pt: 'Te perdoaram' }[lang]
    : { es: 'Dijeron que sí', en: 'They said yes', pt: 'Disseram que sim' }[lang]
  const labels = {
    es: { day: 'Día', time: 'Hora', plan: 'Plan' },
    en: { day: 'Day', time: 'Time', plan: 'Plan' },
    pt: { day: 'Dia', time: 'Hora', plan: 'Plano' },
  }[lang]
  const lines = [`Salircontigo — ${yes}`]
  if (response.date) lines.push(`${labels.day}: ${formatInviteDate(response.date, lang)}`)
  if (response.time) lines.push(`${labels.time}: ${response.time}`)
  const plan = foodLabel(invite.foods, response.foodId, lang)
  if (plan) lines.push(`${labels.plan}: ${plan}`)
  for (const answer of response.answers || []) {
    const prompt = invite.prompts.find(item => item.id === answer.promptId)
    if (!prompt || !answer.value) continue
    const option = prompt.options.find(item => item.id === answer.value)
    lines.push(`${prompt.text[lang]}: ${option ? option.labels[lang] : answer.value}`)
  }
  return lines.join('\n')
}

export function letterText(invite: Invite, response: Pick<InviteResponse, 'lang' | 'date' | 'time' | 'foodId'>) {
  const lang = response.lang
  const fallback = { es: 'pronto', en: 'soon', pt: 'já' }[lang]
  return renderTemplate(invite.copy[lang].letter, {
    time: response.time || fallback,
    date: formatInviteDate(response.date, lang),
    food: foodLabel(invite.foods, response.foodId, lang),
  })
}

export function isTime(value: string) {
  return TIME_RE.test(value)
}
