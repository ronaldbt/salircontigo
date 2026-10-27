<script setup lang="ts">
import { defaultDatePrompts, foodLabel, formatInviteDate } from '#shared/defaults'
import { fill } from '#shared/i18n'
import { LANGS, isLang, type Invite, type InviteResponse, type Lang, type PlayPrompt } from '#shared/types'

definePageMeta({ middleware: 'auth' })

const { t, locale } = useLocale()
const route = useRoute()
const id = computed(() => String(route.params.id))
const tab = ref<'content' | 'answers'>('content')
const editLang = ref<Lang>('es')
const form = ref<Invite | null>(null)
const responses = ref<InviteResponse[]>([])
const pending = ref(false)
const notice = ref('')
const tone = ref<'ok' | 'bad'>('ok')
const copied = ref(false)

const { data, error } = await useFetch<{ invite: Invite, responses: InviteResponse[] }>(() => `/api/invites/${id.value}`)

if (data.value) {
  form.value = structuredClone(toRaw(data.value.invite))
  responses.value = data.value.responses
  editLang.value = form.value.defaultLang
}

const link = computed(() => form.value ? `/i/${form.value.slug}` : '')

function say(text: string, kind: 'ok' | 'bad' = 'ok') {
  notice.value = text
  tone.value = kind
}

function toggleLang(lang: Lang) {
  if (!form.value) return
  const has = form.value.languages.includes(lang)
  if (has && form.value.languages.length === 1) return
  const next = has
    ? form.value.languages.filter(item => item !== lang)
    : [...form.value.languages, lang]
  form.value.languages = LANGS.filter(item => next.includes(item))
  if (!form.value.languages.includes(form.value.defaultLang)) {
    form.value.defaultLang = form.value.languages[0]
  }
  if (!form.value.languages.includes(editLang.value)) editLang.value = form.value.defaultLang
}

function addFood() {
  if (!form.value || form.value.foods.length >= 8) return
  form.value.foods.push({
    id: `f${Date.now().toString(36)}`,
    emoji: '🍽️',
    labels: { es: 'Nuevo', en: 'New', pt: 'Novo' },
  })
}

function removeFood(foodId: string) {
  if (!form.value || form.value.foods.length <= 1) return
  form.value.foods = form.value.foods.filter(item => item.id !== foodId)
}

function addTime() {
  if (!form.value || form.value.times.length >= 12) return
  const candidate = ['17:00', '18:00', '19:00', '20:00', '21:00', '12:00'].find(item => !form.value?.times.includes(item)) || '18:30'
  form.value.times.push(candidate)
}

function removeTime(index: number) {
  if (!form.value || form.value.times.length <= 1) return
  form.value.times.splice(index, 1)
}

function togglePlay(event: Event) {
  if (!form.value) return
  const on = (event.target as HTMLInputElement).checked
  form.value.steps.play = on
  if (on && form.value.prompts.length === 0) {
    form.value.prompts = defaultDatePrompts()
  }
}

function addPrompt() {
  if (!form.value || form.value.prompts.length >= 12) return
  form.value.prompts.push({
    id: `p${Date.now().toString(36)}`,
    kind: 'question',
    text: { es: 'Nueva pregunta', en: 'New question', pt: 'Nova pergunta' },
    options: [],
  })
}

function removePrompt(index: number) {
  form.value?.prompts.splice(index, 1)
}

function ensureOptions(prompt: PlayPrompt) {
  if (prompt.kind === 'question') return
  while (prompt.options.length < 2) addOption(prompt)
}

function addOption(prompt: PlayPrompt) {
  if (prompt.options.length >= 4) return
  prompt.options.push({
    id: `o${Math.random().toString(36).slice(2, 8)}`,
    labels: { es: 'Opción', en: 'Option', pt: 'Opção' },
  })
}

function removeOption(prompt: PlayPrompt, optionId: string) {
  if (prompt.options.length <= 2) return
  prompt.options = prompt.options.filter(option => option.id !== optionId)
}

function answerText(item: InviteResponse, promptId: string) {
  if (!form.value) return ''
  const answer = item.answers?.find(row => row.promptId === promptId)
  const prompt = form.value.prompts.find(row => row.id === promptId)
  if (!answer || !prompt) return ''
  const option = prompt.options.find(row => row.id === answer.value)
  const value = option ? (option.labels[item.lang] || option.labels.es) : answer.value
  return `${prompt.text[item.lang] || prompt.text.es}: ${value}`
}

function onPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !form.value) return
  if (!file.type.startsWith('image/') || file.size > 600_000) {
    say(t.value.errors.photo_large, 'bad')
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const result = String(reader.result || '')
    if (!form.value) return
    if (result.length > 900_000) {
      say(t.value.errors.photo_large, 'bad')
      return
    }
    form.value.photoUrl = result
  }
  reader.readAsDataURL(file)
}

async function save() {
  if (!form.value) return false
    pending.value = true
    notice.value = ''
    form.value.slug = form.value.slug.trim().toLowerCase()
    try {
    const result = await $fetch<{ invite: Invite }>(`/api/invites/${id.value}`, {
      method: 'PUT',
      body: form.value,
    })
    form.value = structuredClone(result.invite)
    if (!form.value.languages.includes(editLang.value)) editLang.value = form.value.defaultLang
    say(t.value.saved, 'ok')
    return true
  }
  catch (error) {
    say(explainError(error, t.value.errors), 'bad')
    return false
  }
  finally {
    pending.value = false
  }
}

async function testWhatsapp() {
  const ok = await save()
  if (!ok) return
  pending.value = true
  try {
    await $fetch(`/api/invites/${id.value}/test-whatsapp`, { method: 'POST' })
    say(t.value.testOk, 'ok')
  }
  catch (error) {
    say(explainError(error, t.value.errors), 'bad')
  }
  finally {
    pending.value = false
  }
}

async function copyLink() {
  if (!link.value) return
  await navigator.clipboard.writeText(`${location.origin}${link.value}`)
  copied.value = true
}

async function removeInvite() {
  if (!confirm(t.value.deleteConfirm)) return
  await $fetch(`/api/invites/${id.value}`, { method: 'DELETE' })
  await navigateTo('/panel')
}

function foodLine(item: InviteResponse) {
  if (!form.value || !item.foodId) return ''
  return foodLabel(form.value.foods, item.foodId, item.lang)
}

useHead({ title: 'Citasi' })
</script>

<template>
  <main class="mx-auto w-full max-w-3xl px-4 pb-24">
    <NuxtLink to="/panel" class="text-sm font-extrabold text-rose-500">← {{ t.back }}</NuxtLink>

    <p v-if="error" class="card-panel mt-4">{{ explainError(error, t.errors) }}</p>

    <form v-else-if="form" class="mt-4" @submit.prevent="save">
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="font-display text-4xl leading-none">{{ form.name }}</h1>
          <p class="mt-2 text-sm text-wine/70">{{ link }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-soft text-sm" @click="copyLink">{{ copied ? t.copied : t.copyLink }}</button>
          <a class="btn-soft text-sm" :href="link" target="_blank" rel="noopener">{{ t.preview }}</a>
        </div>
      </div>

      <div class="mb-4 flex gap-2">
        <button type="button" class="rounded-full px-4 py-2 text-sm font-extrabold" :class="tab === 'content' ? 'bg-white text-wine shadow' : 'text-wine/60'" @click="tab = 'content'">
          {{ t.content }}
        </button>
        <button type="button" class="rounded-full px-4 py-2 text-sm font-extrabold" :class="tab === 'answers' ? 'bg-white text-wine shadow' : 'text-wine/60'" @click="tab = 'answers'">
          {{ t.answers }} ({{ responses.length }})
        </button>
      </div>

      <p v-if="notice" class="mb-3 text-sm font-bold" :class="tone === 'ok' ? 'text-emerald-600' : 'text-rose-500'">{{ notice }}</p>

      <div v-if="tab === 'answers'" class="grid gap-3">
        <p v-if="!responses.length" class="card-panel text-sm">{{ t.noResponses }}</p>
        <article v-for="item in responses" :key="item.id" class="card-panel">
          <div class="flex items-center justify-between gap-3">
            <strong>{{ form.kind === 'sorry' ? t.forgave : t.saidYes }}</strong>
            <span class="text-xs font-extrabold uppercase">{{ item.lang }}</span>
          </div>
          <p v-if="item.date" class="mt-2 text-sm">{{ t.date }}: {{ formatInviteDate(item.date, locale) }}</p>
          <p v-if="item.time" class="text-sm">{{ t.time }}: {{ item.time }}</p>
          <p v-if="foodLine(item)" class="text-sm">{{ t.food }}: {{ foodLine(item) }}</p>
          <p v-if="!item.date && !item.time && !item.foodId" class="mt-2 text-sm text-wine/60">{{ t.missingPlan }}</p>
          <p v-for="line in (item.answers || []).map(answer => answerText(item, answer.promptId)).filter(Boolean)" :key="line" class="mt-1 text-sm">{{ line }}</p>
          <p v-if="item.noAttempts" class="mt-2 text-sm">{{ fill(t.triedNo, { n: item.noAttempts }) }}</p>
          <p v-if="form.whatsapp" class="mt-1 text-sm font-bold">{{ item.callmebotOk ? t.notified : t.notNotified }}</p>
          <p class="mt-2 text-xs text-wine/50">{{ t.when }}: {{ new Date(item.createdAt).toLocaleString(locale) }}</p>
        </article>
      </div>

      <div v-else class="grid gap-4">
        <section class="card-panel grid gap-4">
          <p class="text-sm font-extrabold text-rose-500">{{ form.kind === 'sorry' ? t.templateSorry : t.templateDate }}</p>
          <label class="field">
            {{ t.inviteName }}
            <input v-model="form.name" required minlength="2">
          </label>
          <label class="field">
            {{ t.slug }}
            <input v-model="form.slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" minlength="3">
          </label>
          <label class="flex items-center gap-2 text-sm font-extrabold">
            <input v-model="form.active" type="checkbox">
            {{ t.active }}
          </label>
        </section>

        <section class="card-panel grid gap-3">
          <h2 class="font-display text-2xl">{{ t.whatsapp }}</h2>
          <label class="field">
            {{ t.whatsappNumber }}
            <input v-model="form.whatsapp" type="tel" inputmode="tel" placeholder="5215512345678" autocomplete="tel">
          </label>
          <p class="text-sm leading-relaxed text-wine/70">{{ t.whatsappHelp }}</p>
          <label class="field">
            {{ t.callmebot }}
            <input v-model="form.callmebotKey" type="text" autocomplete="off">
          </label>
          <p class="text-sm leading-relaxed text-wine/70">{{ t.callmebotHelp }}</p>
          <button type="button" class="btn-soft w-fit text-sm" :disabled="pending" @click="testWhatsapp">{{ t.testWhatsapp }}</button>
        </section>

        <section class="card-panel">
          <h2 class="font-display text-2xl">{{ t.steps }}</h2>
          <p class="mt-1 text-sm text-wine/70">{{ t.stepAsk }}</p>
          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            <label class="flex items-center gap-2 rounded-2xl border border-rose-100 bg-white px-3 py-3 text-sm font-extrabold">
              <input v-model="form.steps.date" type="checkbox"> {{ t.stepDate }}
            </label>
            <label class="flex items-center gap-2 rounded-2xl border border-rose-100 bg-white px-3 py-3 text-sm font-extrabold">
              <input v-model="form.steps.food" type="checkbox"> {{ t.stepFood }}
            </label>
            <label class="flex items-center gap-2 rounded-2xl border border-rose-100 bg-white px-3 py-3 text-sm font-extrabold">
              <input v-model="form.steps.letter" type="checkbox"> {{ t.stepLetter }}
            </label>
            <label v-if="form.kind === 'date'" class="flex items-center gap-2 rounded-2xl border border-rose-100 bg-white px-3 py-3 text-sm font-extrabold">
              <input :checked="form.steps.play" type="checkbox" @change="togglePlay"> {{ t.stepPlay }}
            </label>
          </div>
        </section>

        <section class="card-panel">
          <h2 class="font-display text-2xl">{{ t.languages }}</h2>
          <div class="mt-3 flex flex-wrap gap-2">
            <label v-for="lang in LANGS" :key="lang" class="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-extrabold">
              <input type="checkbox" :checked="form.languages.includes(lang)" @change="toggleLang(lang)">
              {{ t.langNames[lang] }}
            </label>
          </div>
          <label class="field mt-4">
            {{ t.defaultLang }}
            <select v-model="form.defaultLang" class="select-field">
              <option v-for="lang in form.languages" :key="lang" :value="lang">{{ t.langNames[lang] }}</option>
            </select>
          </label>
        </section>

        <section class="card-panel">
          <h2 class="font-display text-2xl">{{ t.photo }}</h2>
          <div class="mt-3 flex items-center gap-4">
            <img :src="form.photoUrl || '/pug.svg'" alt="" class="h-24 w-24 rounded-2xl object-cover">
            <div class="grid gap-2">
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onPhoto">
              <button v-if="form.photoUrl" type="button" class="text-left text-sm font-extrabold text-rose-500" @click="form.photoUrl = ''">
                {{ t.photoHint }}
              </button>
            </div>
          </div>
          <label class="field mt-4">
            {{ t.photoUrl }}
            <input
              :value="form.photoUrl.startsWith('data:') ? '' : form.photoUrl"
              type="text"
              placeholder="https://"
              @input="form.photoUrl = ($event.target as HTMLInputElement).value"
            >
          </label>
          <p class="mt-2 text-xs text-wine/60">{{ t.photoHint }}</p>
        </section>

        <section class="card-panel">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="font-display text-2xl">{{ t.texts }}</h2>
            <div class="flex gap-1">
              <button
                v-for="lang in form.languages"
                :key="lang"
                type="button"
                class="rounded-full px-3 py-1 text-xs font-extrabold uppercase"
                :class="editLang === lang ? 'bg-rose-500 text-white' : 'bg-white'"
                @click="editLang = lang"
              >
                {{ lang }}
              </button>
            </div>
          </div>
          <div v-if="isLang(editLang)" class="mt-4 grid gap-3">
            <label class="field">{{ t.question }}<textarea v-model="form.copy[editLang].question" /></label>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="field">{{ t.yes }}<input v-model="form.copy[editLang].yes"></label>
              <label class="field">{{ t.no }}<input v-model="form.copy[editLang].no"></label>
            </div>
            <label class="field">{{ t.niceTry }}<input v-model="form.copy[editLang].niceTry"></label>
            <label class="field">{{ t.whenTitle }}<input v-model="form.copy[editLang].whenTitle"></label>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="field">{{ t.pickDay }}<input v-model="form.copy[editLang].pickDay"></label>
              <label class="field">{{ t.pickTime }}<input v-model="form.copy[editLang].pickTime"></label>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="field">{{ t.timePlaceholder }}<input v-model="form.copy[editLang].timePlaceholder"></label>
              <label class="field">{{ t.confirmDate }}<input v-model="form.copy[editLang].confirmDate"></label>
            </div>
            <label class="field">{{ t.foodTitle }}<input v-model="form.copy[editLang].foodTitle"></label>
            <label class="field">{{ t.foodHint }}<input v-model="form.copy[editLang].foodHint"></label>
            <label class="field">
              {{ t.letter }}
              <textarea v-model="form.copy[editLang].letter" />
            </label>
            <p class="text-xs text-wine/60">{{ t.letterHint }}</p>
            <label class="field">{{ t.ps }}<textarea v-model="form.copy[editLang].ps" /></label>
            <label class="field">{{ t.whatsappCta }}<input v-model="form.copy[editLang].whatsappCta"></label>
            <label class="field">{{ t.sentNote }}<input v-model="form.copy[editLang].sentNote"></label>
            <template v-if="form.kind === 'date'">
              <label class="field">{{ t.stepPlay }}<input v-model="form.copy[editLang].playTitle"></label>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="field">{{ t.playNextLabel }}<input v-model="form.copy[editLang].playNext"></label>
                <label class="field">{{ t.answerPlaceholder }}<input v-model="form.copy[editLang].answerPlaceholder"></label>
              </div>
              <label class="field">{{ t.playFinishLabel }}<input v-model="form.copy[editLang].playFinish"></label>
            </template>
          </div>
        </section>

        <section v-if="form.kind === 'date'" class="card-panel">
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-display text-2xl">{{ t.prompts }}</h2>
            <button type="button" class="btn-soft text-sm" @click="addPrompt">{{ t.addPrompt }}</button>
          </div>
          <p class="mt-2 text-sm text-wine/70">{{ t.promptsHint }}</p>
          <div class="mt-3 grid gap-3">
            <article v-for="(prompt, index) in form.prompts" :key="prompt.id" class="rounded-2xl border border-rose-100 bg-white p-3">
              <div class="flex items-center justify-between gap-2">
                <select v-model="prompt.kind" class="soft-input select-field" @change="ensureOptions(prompt)">
                  <option value="question">{{ t.kindQuestion }}</option>
                  <option value="choice">{{ t.kindChoice }}</option>
                  <option value="closer">{{ t.kindCloser }}</option>
                </select>
                <button type="button" class="text-sm font-extrabold text-rose-500" @click="removePrompt(index)">×</button>
              </div>
              <textarea v-model="prompt.text[editLang]" class="soft-input mt-2" rows="2" />
              <div v-if="prompt.kind !== 'question'" class="mt-2 grid gap-2">
                <div v-for="option in prompt.options" :key="option.id" class="flex items-center gap-2">
                  <input v-model="option.labels[editLang]" class="soft-input">
                  <button type="button" class="text-sm font-extrabold text-rose-500" @click="removeOption(prompt, option.id)">×</button>
                </div>
                <button type="button" class="text-left text-sm font-extrabold text-rose-500" @click="addOption(prompt)">{{ t.addOption }}</button>
              </div>
            </article>
          </div>
        </section>

        <section class="card-panel">
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-display text-2xl">{{ t.foods }}</h2>
            <button type="button" class="btn-soft text-sm" @click="addFood">{{ t.addFood }}</button>
          </div>
          <div class="mt-3 grid gap-2">
            <div v-for="food in form.foods" :key="food.id" class="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
              <input v-model="food.emoji" class="soft-input text-center" maxlength="8">
              <input v-model="food.labels[editLang]" class="soft-input">
              <button type="button" class="text-sm font-extrabold text-rose-500" @click="removeFood(food.id)">×</button>
            </div>
          </div>
        </section>

        <section class="card-panel">
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-display text-2xl">{{ t.times }}</h2>
            <button type="button" class="btn-soft text-sm" @click="addTime">{{ t.addTime }}</button>
          </div>
          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            <div v-for="(_, index) in form.times" :key="index" class="flex items-center gap-2">
              <input v-model="form.times[index]" class="soft-input" type="time" required>
              <button type="button" class="text-sm font-extrabold text-rose-500" @click="removeTime(index)">×</button>
            </div>
          </div>
        </section>

        <button type="button" class="text-sm font-extrabold text-rose-500" @click="removeInvite">{{ t.delete }}</button>
      </div>

      <div class="sticky bottom-3 mt-4">
        <button class="btn-wide" type="submit" :disabled="pending">{{ pending ? t.loading : t.save }}</button>
      </div>
    </form>
  </main>
</template>
