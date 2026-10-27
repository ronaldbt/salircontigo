<script setup lang="ts">
import { foodLabel, formatInviteDate, renderTemplate } from '#shared/defaults'
import { isLang, type Lang, type PublicInvite } from '#shared/types'

definePageMeta({ layout: 'blush' })

type Step = 'ask' | 'date' | 'food' | 'letter' | 'play' | 'done'

const route = useRoute()
const { t } = useLocale()
const slug = computed(() => String(route.params.slug))

const { data, error } = await useFetch<{ invite: PublicInvite }>(() => `/api/public/${slug.value}`)
const invite = computed(() => data.value?.invite ?? null)

const requested = route.query.lang
const lang = ref<Lang>(
  invite.value && isLang(requested) && invite.value.languages.includes(requested)
    ? requested
    : invite.value?.defaultLang || 'es',
)

const step = ref<Step>('ask')
const choice = reactive({ date: '', time: '', foodId: '' })
const answers = reactive<Record<string, string>>({})
const promptIndex = ref(0)
const noAttempts = ref(0)
const responseId = ref('')
const submitting = ref(false)
const formError = ref('')
const whatsappUrl = ref('')
const notified = ref(false)
const photoFailed = ref(false)

const copy = computed(() => {
  if (!invite.value) return null
  return invite.value.copy[lang.value] || invite.value.copy[invite.value.defaultLang]
})

const sequence = computed<Step[]>(() => {
  const steps: Step[] = ['ask']
  if (!invite.value) return steps
  if (invite.value.steps.date) steps.push('date')
  if (invite.value.steps.food) steps.push('food')
  if (invite.value.steps.letter) steps.push('letter')
  if (invite.value.steps.play && invite.value.prompts.length) steps.push('play')
  const last = steps[steps.length - 1]
  if (last === 'play' || last === 'ask') steps.push('done')
  return steps
})

const currentPrompt = computed(() => invite.value?.prompts[promptIndex.value] || null)
const hasPlay = computed(() => sequence.value.includes('play'))

const today = computed(() => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
})

const shownDate = computed(() => choice.date || today.value)

const dayNum = computed(() => Number(shownDate.value.slice(8, 10)))

const monthLabel = computed(() => {
  const [year, month, day] = shownDate.value.split('-').map(Number)
  const locale = lang.value === 'pt' ? 'pt-BR' : lang.value
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, month - 1, day))
})

const letter = computed(() => {
  if (!invite.value || !copy.value) return ''
  const fallback = { es: 'pronto', en: 'soon', pt: 'já' }[lang.value]
  return renderTemplate(copy.value.letter, {
    time: choice.time || fallback,
    date: formatInviteDate(choice.date, lang.value),
    food: foodLabel(invite.value.foods, choice.foodId, lang.value),
  })
})

const selectedFood = computed(() => invite.value ? foodLabel(invite.value.foods, choice.foodId, lang.value) : '')

const status = computed(() => error.value?.statusCode || 0)

watch(() => invite.value?.photoUrl, () => {
  photoFailed.value = false
})

watch(invite, (value) => {
  if (value && !choice.time && value.times.length) choice.time = value.times[0]
}, { immediate: true })

async function save(finalize: boolean) {
  if (!invite.value) return false
  submitting.value = true
  formError.value = ''
  try {
    const result = await $fetch<{ id: string, whatsappUrl: string, callmebotOk: boolean }>(`/api/public/${slug.value}/respond`, {
      method: 'POST',
      body: {
        responseId: responseId.value,
        lang: lang.value,
        noAttempts: noAttempts.value,
        date: choice.date,
        time: choice.time,
        foodId: choice.foodId,
        answers: Object.entries(answers).filter(([, value]) => value).map(([promptId, value]) => ({ promptId, value })),
        finalize,
      },
    })
    responseId.value = result.id
    if (finalize) {
      whatsappUrl.value = result.whatsappUrl
      notified.value = result.callmebotOk
    }
    return true
  }
  catch (err) {
    formError.value = explainError(err, t.value.errors)
    return false
  }
  finally {
    submitting.value = false
  }
}

async function advance(from: Step) {
  const following = sequence.value[sequence.value.indexOf(from) + 1]
  const next = following || (from === 'letter' ? from : 'done')
  const finishing = !following || following === 'done' || (following === 'letter' && !sequence.value.includes('play'))
  const ok = await save(finishing)
  if (!ok || next === from) return
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  step.value = next
}

async function nextPrompt() {
  if (!invite.value) return
  if (promptIndex.value < invite.value.prompts.length - 1) {
    const ok = await save(false)
    if (ok) promptIndex.value += 1
    return
  }
  advance('play')
}

useHead(computed(() => ({
  title: copy.value ? `${copy.value.question} · Citasi` : 'Citasi',
})))
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center px-4 py-16">
    <NuxtLink to="/" class="absolute left-4 top-4 z-20 font-display text-2xl text-wine/80">citasi</NuxtLink>

    <div v-if="invite && invite.languages.length > 1" class="absolute right-4 top-4 z-20 flex rounded-full bg-white/80 p-1 text-xs font-extrabold shadow-sm">
      <button
        v-for="item in invite.languages"
        :key="item"
        type="button"
        class="rounded-full px-2.5 py-1 uppercase"
        :class="lang === item ? 'bg-rose-500 text-white' : 'text-wine/70'"
        @click="lang = item"
      >
        {{ item }}
      </button>
    </div>

    <div v-if="error" class="card-invite text-center">
      <h1 class="font-display text-3xl">{{ status === 403 ? t.paused : t.missing }}</h1>
      <NuxtLink to="/" class="btn-yes mt-6 inline-flex">{{ t.home }}</NuxtLink>
    </div>

    <div v-else-if="invite && copy" class="card-invite">
      <Transition name="rise" mode="out-in" :duration="280">
        <div v-if="step === 'ask'" key="ask" class="text-center">
          <div class="mx-auto mb-5 h-28 w-28 overflow-hidden rounded-[22px] bg-[#f6ebe4] shadow-inner">
            <img
              :src="photoFailed || !invite.photoUrl ? '/pug.svg' : invite.photoUrl"
              :alt="copy.question"
              class="h-full w-full object-cover"
              @error="photoFailed = true"
            >
          </div>
          <h1 class="font-display text-[1.7rem] leading-tight">
            <span aria-hidden="true">🌸 </span>{{ copy.question }}<span aria-hidden="true"> 🌸</span>
          </h1>
          <p v-if="noAttempts >= 3" class="mt-3 text-sm font-bold text-fuchsia-400">{{ copy.niceTry }}</p>
          <div class="mt-6 flex items-center justify-center gap-3">
            <button type="button" class="btn-yes" :disabled="submitting" @click="advance('ask')">
              {{ copy.yes }} ♥
            </button>
            <RunawayButton @flee="noAttempts += 1">{{ copy.no }}</RunawayButton>
          </div>
        </div>

        <div v-else-if="step === 'date'" key="date">
          <div class="mb-4 flex items-end justify-center gap-2">
            <div class="grid h-14 w-14 place-items-center rounded-2xl bg-white leading-none shadow-sm ring-1 ring-rose-100">
              <span class="text-[10px] font-extrabold uppercase tracking-wide text-rose-500">{{ monthLabel }}</span>
              <span class="-mt-0.5 font-display text-xl text-wine">{{ dayNum }}</span>
            </div>
            <span class="text-2xl" aria-hidden="true">🐾</span>
          </div>
          <h1 class="text-center font-display text-[1.7rem] leading-tight">{{ copy.whenTitle }}</h1>
          <label class="mt-5 block text-sm font-extrabold">
            {{ copy.pickDay }}
            <input v-model="choice.date" class="soft-input mt-1" type="date" :min="today" required>
          </label>
          <label class="mt-4 block text-sm font-extrabold">
            {{ copy.pickTime }}
            <select v-model="choice.time" class="soft-input select-field mt-1">
              <option value="" disabled>{{ copy.timePlaceholder }}</option>
              <option v-for="time in invite.times" :key="time" :value="time">{{ time }}</option>
            </select>
          </label>
          <button class="btn-wide mt-5" type="button" :disabled="!choice.date || !choice.time || submitting" @click="advance('date')">
            {{ copy.confirmDate }}
          </button>
        </div>

        <div v-else-if="step === 'food'" key="food">
          <h1 class="text-center font-display text-[1.7rem] leading-tight">{{ copy.foodTitle }}</h1>
          <p class="mt-1 text-center text-sm text-wine/60">{{ copy.foodHint }}</p>
          <div class="mt-5 grid grid-cols-3 gap-3">
            <button
              v-for="food in invite.foods"
              :key="food.id"
              type="button"
              class="flex flex-col items-center gap-2 rounded-2xl border bg-white px-2 py-4 text-sm font-bold"
              :class="choice.foodId === food.id ? 'border-pink-400 shadow-[0_0_0_3px_rgba(251,113,133,0.25)]' : 'border-rose-100'"
              @click="choice.foodId = food.id"
            >
              <span class="text-4xl">{{ food.emoji }}</span>
              <span>{{ food.labels[lang] || food.labels.es }}</span>
            </button>
          </div>
          <button class="btn-wide mt-5" type="button" :disabled="!choice.foodId || submitting" @click="advance('food')">
            {{ selectedFood || copy.foodHint }}
          </button>
        </div>

        <div v-else-if="step === 'play' && currentPrompt" key="play">
          <p class="text-center text-xs font-extrabold uppercase tracking-[0.18em] text-rose-400">
            {{ promptIndex + 1 }} / {{ invite.prompts.length }}
          </p>
          <p v-if="currentPrompt.kind === 'closer'" class="mt-2 text-center text-sm font-bold text-rose-400">{{ copy.playTitle }}</p>
          <h1 class="mt-2 text-center font-display text-[1.55rem] leading-tight">{{ currentPrompt.text[lang] || currentPrompt.text.es }}</h1>
          <textarea
            v-if="currentPrompt.kind === 'question'"
            v-model="answers[currentPrompt.id]"
            class="soft-input mt-4"
            rows="3"
            :placeholder="copy.answerPlaceholder"
          />
          <div v-else class="mt-4 grid gap-2">
            <button
              v-for="option in currentPrompt.options"
              :key="option.id"
              type="button"
              class="rounded-2xl border px-4 py-3 text-left text-sm font-bold"
              :class="answers[currentPrompt.id] === option.id ? 'border-pink-400 bg-rose-50 shadow-[0_0_0_3px_rgba(251,113,133,0.2)]' : 'border-rose-100 bg-white'"
              @click="answers[currentPrompt.id] = option.id"
            >
              {{ option.labels[lang] || option.labels.es }}
            </button>
          </div>
          <button class="btn-wide mt-5" type="button" :disabled="!answers[currentPrompt.id]?.trim() || submitting" @click="nextPrompt">
            {{ promptIndex === invite.prompts.length - 1 ? copy.playFinish : copy.playNext }}
          </button>
        </div>

        <div v-else key="end" class="text-center">
          <template v-if="step === 'letter'">
            <p class="font-display text-[1.65rem] leading-snug text-[#5c2a3c]">{{ letter }}</p>
            <p class="mt-4 text-sm italic leading-relaxed text-[#a18490]">{{ copy.ps }}</p>
            <p class="mt-4 tracking-[0.35em] text-pink-400" aria-hidden="true">♥ ♥ ♥ ♥ ♥</p>
            <button v-if="hasPlay" class="btn-wide mt-5" type="button" :disabled="submitting" @click="advance('letter')">
              {{ copy.playTitle }}
            </button>
          </template>
          <template v-else>
            <p class="font-display text-4xl">{{ copy.yes }} ♥</p>
            <p v-if="hasPlay" class="mt-3 text-sm font-bold text-rose-400">{{ copy.playFinish }}</p>
          </template>
          <p v-if="notified" class="mt-4 text-sm font-bold text-rose-400">{{ copy.sentNote }}</p>
          <a
            v-if="whatsappUrl"
            :href="whatsappUrl"
            target="_blank"
            rel="noopener"
            class="btn-wide mt-5"
          >
            {{ copy.whatsappCta }}
          </a>
        </div>
      </Transition>
      <p v-if="formError" class="mt-4 text-center text-sm font-bold text-rose-500">{{ formError }}</p>
    </div>
  </div>
</template>
