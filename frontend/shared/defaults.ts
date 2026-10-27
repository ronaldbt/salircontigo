import type { FoodItem, Invite, InviteKind, Lang, LangCopy, PlayPrompt } from './types'

const copy: Record<Lang, LangCopy> = {
  es: {
    question: '¿Quieres salir conmigo?',
    yes: 'SÍ',
    no: 'NO',
    niceTry: 'ese botón no se deja',
    whenTitle: 'Entonces… ¿cuándo puedes?',
    pickDay: 'Elige un día',
    pickTime: '¿A qué hora?',
    timePlaceholder: 'Elige una hora…',
    confirmDate: 'Confirmar cita',
    foodTitle: '¿Qué se te antoja? ✨',
    foodHint: 'elige el vibe',
    letter: 'qué bueno que no dijiste que no. te paso a buscar a las {time} 🚗',
    ps: 'P.D. la gente normal manda un mensaje. yo armé una página, en la hora del almuerzo, para ti. no es gran cosa.',
    whatsappCta: 'Avisarle por WhatsApp',
    sentNote: 'Ya le avisamos. Ahora solo falta el día.',
    playTitle: 'Para acercarnos un poco',
    playNext: 'Siguiente',
    playFinish: 'Listo. Ahora nos toca acercarnos.',
    answerPlaceholder: 'Escríbelo aquí…',
  },
  en: {
    question: 'Will you go on a date with me?',
    yes: 'YES',
    no: 'NO',
    niceTry: 'that button has other plans',
    whenTitle: 'So... when are you free?',
    pickDay: 'Pick a Day',
    pickTime: 'What Time?',
    timePlaceholder: 'Select a time...',
    confirmDate: 'Set the date',
    foodTitle: 'What are we feeling? ✨',
    foodHint: 'pick your vibe',
    letter: "glad you didn't say no. be ready by {time}, I'm coming to get you 🚗",
    ps: 'P.S. normal people text. I made a website, during lunch, for you. no big deal.',
    whatsappCta: 'Text them on WhatsApp',
    sentNote: 'They already know. Now you just show up.',
    playTitle: 'To get a little closer',
    playNext: 'Next',
    playFinish: 'Done. Now we get closer.',
    answerPlaceholder: 'Write it here...',
  },
  pt: {
    question: 'Quer sair comigo?',
    yes: 'SIM',
    no: 'NÃO',
    niceTry: 'esse botão não se deixa',
    whenTitle: 'Então… quando você pode?',
    pickDay: 'Escolhe um dia',
    pickTime: 'Que horas?',
    timePlaceholder: 'Escolhe um horário…',
    confirmDate: 'Confirmar encontro',
    foodTitle: 'O que estamos a fim? ✨',
    foodHint: 'escolhe o clima',
    letter: 'ainda bem que você não disse não. passo aí às {time} 🚗',
    ps: 'P.S. gente normal manda mensagem. eu fiz um site, na hora do almoço, pra você. não é nada demais.',
    whatsappCta: 'Avisar no WhatsApp',
    sentNote: 'A pessoa já sabe. Agora é só chegar o dia.',
    playTitle: 'Para chegar um pouco mais perto',
    playNext: 'Próxima',
    playFinish: 'Pronto. Agora a gente se aproxima.',
    answerPlaceholder: 'Escreve aqui…',
  },
}

const sorryCopy: Record<Lang, LangCopy> = {
  es: {
    question: '¿Me perdonas?',
    yes: 'SÍ',
    no: 'NO',
    niceTry: 'ese botón tampoco quiere un no',
    whenTitle: 'Déjame compensarte. ¿Cuándo puedes?',
    pickDay: 'Elige un día',
    pickTime: '¿A qué hora paso?',
    timePlaceholder: 'Elige una hora…',
    confirmDate: 'Quiero verte',
    foodTitle: '¿Con qué empiezo a remediarlo?',
    foodHint: 'elige cómo',
    letter: 'gracias por no irte. el {date} a las {time} voy a hacerlo bien 🤍',
    ps: 'P.D. no basta con decirlo. por eso armé esto, para empezar de nuevo contigo.',
    whatsappCta: 'Decirle que sí',
    sentNote: 'Ya lo sabe. Ahora toca acercarse de nuevo.',
    playTitle: 'Para volver a acercarnos',
    playNext: 'Siguiente',
    playFinish: 'Perdón aceptado. Ahora, despacito, más cerca.',
    answerPlaceholder: 'Dilo con calma…',
  },
  en: {
    question: 'Will you forgive me?',
    yes: 'YES',
    no: 'NO',
    niceTry: 'that button will not take a no',
    whenTitle: 'Let me make it up to you. When are you free?',
    pickDay: 'Pick a day',
    pickTime: 'What time should I come?',
    timePlaceholder: 'Select a time...',
    confirmDate: 'I want to see you',
    foodTitle: 'How should I start making this right?',
    foodHint: 'pick a way',
    letter: 'thank you for staying. on {date} at {time} I am going to do this right 🤍',
    ps: 'P.S. saying it is not enough. so I made this, to start again with you.',
    whatsappCta: 'Tell them yes',
    sentNote: 'They already know. Now you get close again.',
    playTitle: 'To find our way back',
    playNext: 'Next',
    playFinish: 'Forgiven. Now, slowly, a little closer.',
    answerPlaceholder: 'Say it gently...',
  },
  pt: {
    question: 'Você me perdoa?',
    yes: 'SIM',
    no: 'NÃO',
    niceTry: 'esse botão também não aceita um não',
    whenTitle: 'Deixa eu compensar. Quando você pode?',
    pickDay: 'Escolhe um dia',
    pickTime: 'Que horas eu passo?',
    timePlaceholder: 'Escolhe um horário…',
    confirmDate: 'Quero te ver',
    foodTitle: 'Por onde eu começo a consertar?',
    foodHint: 'escolhe como',
    letter: 'obrigado por não ir embora. no dia {date} às {time} eu vou fazer direito 🤍',
    ps: 'P.S. falar não basta. por isso eu fiz isso, para começar de novo com você.',
    whatsappCta: 'Dizer que sim',
    sentNote: 'A pessoa já sabe. Agora é hora de se aproximar de novo.',
    playTitle: 'Para voltar a ficar perto',
    playNext: 'Próxima',
    playFinish: 'Perdão aceito. Agora, devagar, mais perto.',
    answerPlaceholder: 'Diz com calma…',
  },
}

const foods: FoodItem[] = [
  { id: 'pizza', emoji: '🍕', labels: { es: 'Pizza', en: 'Pizza', pt: 'Pizza' } },
  { id: 'sushi', emoji: '🍣', labels: { es: 'Sushi', en: 'Sushi', pt: 'Sushi' } },
  { id: 'burgers', emoji: '🍔', labels: { es: 'Hamburguesas', en: 'Burgers', pt: 'Hambúrguer' } },
  { id: 'pasta', emoji: '🍝', labels: { es: 'Pasta', en: 'Pasta', pt: 'Massa' } },
  { id: 'tacos', emoji: '🌮', labels: { es: 'Tacos', en: 'Tacos', pt: 'Tacos' } },
  { id: 'ramen', emoji: '🍜', labels: { es: 'Ramen', en: 'Ramen', pt: 'Ramen' } },
]

function text(es: string, en: string, pt: string): Record<Lang, string> {
  return { es, en, pt }
}

function prompt(id: string, kind: PlayPrompt['kind'], lines: Record<Lang, string>, options: PlayPrompt['options'] = []): PlayPrompt {
  return { id, kind, text: lines, options }
}

function option(id: string, es: string, en: string, pt: string) {
  return { id, labels: text(es, en, pt) }
}

const datePrompts: PlayPrompt[] = [
  prompt('beach', 'choice', text('¿Playa o ciudad?', 'Beach or city?', 'Praia ou cidade?'), [
    option('beach', 'Playa', 'Beach', 'Praia'),
    option('city', 'Ciudad', 'City', 'Cidade'),
  ]),
  prompt('cook', 'choice', text('¿Cocinamos juntos o te cocino yo?', 'We cook together, or I cook for you?', 'A gente cozinha junto ou eu cozinho pra você?'), [
    option('together', 'Juntos', 'Together', 'Juntos'),
    option('foryou', 'Tú me cocinas', 'You cook for me', 'Você cozinha pra mim'),
  ]),
  prompt('unknown', 'question', text('Una cosa que todavía no sé de ti', 'One thing I still do not know about you', 'Uma coisa que eu ainda não sei de você')),
  prompt('song', 'question', text('¿Qué canción debería sonar cuando nos veamos?', 'What song should be playing when we meet?', 'Que música deveria tocar quando a gente se vir?')),
  prompt('closer', 'closer', text('Elige cómo nos acercamos un poco', 'Pick how we get a little closer', 'Escolhe como a gente se aproxima um pouco'), [
    option('hug', 'Un abrazo largo', 'A long hug', 'Um abraço longo'),
    option('hands', 'Tomarnos de la mano', 'Holding hands', 'Dar as mãos'),
    option('look', 'Decirte algo bonito, mirándote', 'Saying something sweet, looking at you', 'Dizer algo bonito, olhando pra você'),
  ]),
  prompt('step', 'closer', text('Si esta cita es un primer paso, ¿cuál das?', 'If this date is a first step, which one do you take?', 'Se esse encontro é um primeiro passo, qual você dá?'), [
    option('sit', 'Sentarme más cerca', 'Sitting closer', 'Sentar mais perto'),
    option('secret', 'Contarte un secreto pequeño', 'Telling you a tiny secret', 'Contar um segredo pequeno'),
    option('yours', 'Dejar que elijas tú el siguiente', 'Letting you pick what comes next', 'Deixar você escolher o próximo'),
  ]),
]

const sorryPrompts: PlayPrompt[] = [
  prompt('need', 'question', text('¿Qué necesitas que yo entienda?', 'What do you need me to understand?', 'O que você precisa que eu entenda?')),
  prompt('pace', 'choice', text('¿Hablamos ahora o primero te escucho?', 'Do we talk now, or do I listen first?', 'A gente conversa agora ou eu escuto primeiro?'), [
    option('talk', 'Hablemos', 'Let us talk', 'Vamos conversar'),
    option('listen', 'Primero escúchame', 'Listen to me first', 'Me escuta primeiro'),
  ]),
  prompt('fair', 'question', text('¿Qué haría que esto se sienta justo?', 'What would make this feel fair?', 'O que faria isso parecer justo?')),
  prompt('again', 'closer', text('¿Cómo quieres que empecemos de nuevo?', 'How do you want us to start again?', 'Como você quer que a gente recomece?'), [
    option('hug', 'Un abrazo', 'A hug', 'Um abraço'),
    option('quiet', 'Un rato en silencio, juntos', 'A quiet moment together', 'Um tempo em silêncio, juntos'),
    option('slow', 'Una disculpa dicha despacio', 'An apology said slowly', 'Um pedido dito devagar'),
  ]),
]

const sorryFoods: FoodItem[] = [
  { id: 'coffee', emoji: '☕', labels: text('Café', 'Coffee', 'Café') },
  { id: 'flowers', emoji: '💐', labels: text('Flores', 'Flowers', 'Flores') },
  { id: 'ice', emoji: '🍨', labels: text('Helado', 'Ice cream', 'Sorvete') },
  { id: 'dinner', emoji: '🍽️', labels: text('Cena', 'Dinner', 'Jantar') },
  { id: 'walk', emoji: '🌙', labels: text('Un paseo', 'A walk', 'Um passeio') },
  { id: 'note', emoji: '💌', labels: text('Una carta', 'A letter', 'Uma carta') },
]

export function defaultCopy(): Record<Lang, LangCopy> {
  return structuredClone(copy)
}

export function defaultSorryCopy(): Record<Lang, LangCopy> {
  return structuredClone(sorryCopy)
}

export function defaultDatePrompts(): PlayPrompt[] {
  return structuredClone(datePrompts)
}

export function defaultSorryPrompts(): PlayPrompt[] {
  return structuredClone(sorryPrompts)
}

export function defaultSorryFoods(): FoodItem[] {
  return structuredClone(sorryFoods)
}

export function ensureInvite(invite: Invite): Invite {
  const kind: InviteKind = invite.kind === 'sorry' ? 'sorry' : 'date'
  const base = kind === 'sorry' ? sorryCopy : copy
  invite.kind = kind
  invite.steps = {
    date: invite.steps?.date !== false,
    food: invite.steps?.food !== false,
    letter: invite.steps?.letter !== false,
    play: kind === 'date' && Boolean(invite.steps?.play),
  }
  invite.prompts = Array.isArray(invite.prompts) ? invite.prompts : []
  invite.copy = invite.copy || defaultCopy()
  for (const lang of ['es', 'en', 'pt'] as const) {
    invite.copy[lang] = { ...base[lang], ...invite.copy[lang] }
  }
  return invite
}

export function defaultFoods(): FoodItem[] {
  return structuredClone(foods)
}

export function defaultTimes(): string[] {
  return ['17:00', '18:00', '19:00', '20:00', '21:00']
}

export function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
}

export function formatInviteDate(iso: string, lang: Lang) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const locale = lang === 'pt' ? 'pt-BR' : lang
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(date)
}

export function foodLabel(foodsList: FoodItem[], foodId: string, lang: Lang) {
  const food = foodsList.find(item => item.id === foodId)
  if (!food) return ''
  return `${food.emoji} ${food.labels[lang] || food.labels.es}`.trim()
}

export function blankInvite(partial: Pick<Invite, 'id' | 'userId' | 'slug' | 'name' | 'defaultLang'>, kind: InviteKind = 'date'): Invite {
  const sorry = kind === 'sorry'
  return {
    ...partial,
    photoUrl: '',
    active: true,
    kind: sorry ? 'sorry' : 'date',
    steps: { date: true, food: true, letter: true, play: !sorry },
    languages: ['es', 'en', 'pt'],
    copy: sorry ? defaultSorryCopy() : defaultCopy(),
    foods: sorry ? defaultSorryFoods() : defaultFoods(),
    prompts: sorry ? [] : defaultDatePrompts(),
    times: defaultTimes(),
    whatsapp: '',
    callmebotKey: '',
    createdAt: new Date().toISOString(),
  }
}
