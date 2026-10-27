export const LANGS = ['es', 'en', 'pt'] as const
export type Lang = (typeof LANGS)[number]

export const MAX_INVITES = 3

export type InviteKind = 'date' | 'sorry'

export type PromptKind = 'question' | 'choice' | 'closer'

export type LangCopy = {
  question: string
  yes: string
  no: string
  niceTry: string
  whenTitle: string
  pickDay: string
  pickTime: string
  timePlaceholder: string
  confirmDate: string
  foodTitle: string
  foodHint: string
  letter: string
  ps: string
  whatsappCta: string
  sentNote: string
  playTitle: string
  playNext: string
  playFinish: string
  answerPlaceholder: string
}

export type FoodItem = {
  id: string
  emoji: string
  labels: Record<Lang, string>
}

export type PromptOption = {
  id: string
  labels: Record<Lang, string>
}

export type PlayPrompt = {
  id: string
  kind: PromptKind
  text: Record<Lang, string>
  options: PromptOption[]
}

export type PlayAnswer = {
  promptId: string
  value: string
}

export type InviteSteps = {
  date: boolean
  food: boolean
  letter: boolean
  play: boolean
}

export type Invite = {
  id: string
  userId: string
  slug: string
  name: string
  photoUrl: string
  active: boolean
  kind: InviteKind
  steps: InviteSteps
  prompts: PlayPrompt[]
  languages: Lang[]
  defaultLang: Lang
  copy: Record<Lang, LangCopy>
  foods: FoodItem[]
  times: string[]
  whatsapp: string
  callmebotKey: string
  createdAt: string
}

export type PublicInvite = Omit<Invite, 'userId' | 'callmebotKey'> & {
  hasWhatsapp: boolean
  hasAutoNotify: boolean
}

export type InviteResponse = {
  id: string
  inviteId: string
  lang: Lang
  noAttempts: number
  date: string
  time: string
  foodId: string
  answers: PlayAnswer[]
  callmebotOk: boolean
  createdAt: string
  updatedAt: string
}

export type User = {
  id: string
  name: string
  email: string
  passwordHash: string
  salt: string
  invitesCreated: number
  createdAt: string
}

export type PublicUser = {
  id: string
  name: string
  email: string
  invitesCreated: number
  maxInvites: number
  remaining: number
}

export type DbShape = {
  users: User[]
  invites: Invite[]
  responses: InviteResponse[]
}

export function isLang(value: unknown): value is Lang {
  return value === 'es' || value === 'en' || value === 'pt'
}

export type WatchRole = 'host' | 'guest' | ''

export type WatchMessage = {
  id: string
  author: string
  body: string
  createdAt: string
}

export type WatchIce = {
  id: number
  sender: 'host' | 'guest'
  payload: string
}

export type WatchState = {
  joined: boolean
  role: WatchRole
  name: string
  hostName: string
  guestName: string
  code: string
  generation: number
  sharer: 'host' | 'guest' | ''
  offer: string
  answer: string
  candidates: WatchIce[]
  messages: WatchMessage[]
}

export function isInviteKind(value: unknown): value is InviteKind {
  return value === 'date' || value === 'sorry'
}
