<script setup lang="ts">
import { fill } from '#shared/i18n'
import type { WatchState } from '#shared/types'

const { t } = useLocale()
const route = useRoute()
const code = computed(() => String(route.params.code || ''))
const guestName = ref('')
const draft = ref('')
const copied = ref(false)
const joinError = ref('')
const joining = ref(false)
const chat = ref<HTMLElement | null>(null)

const { data, error } = await useFetch<WatchState>(() => `/api/watch/${code.value}`)
const {
  remoteVideo,
  sharing,
  needsSound,
  linkState,
  notice,
  remoteStream,
  watching,
  startShare,
  stopShare,
  send: sendMessage,
  enableSound,
  pull,
} = useWatchParty(data)

const statusLabel = computed(() => {
  if (watching.value || (linkState.value === 'connected' && remoteStream.value)) return t.value.watchLive
  if (data.value?.sharer) return t.value.watchConnecting
  if (data.value?.role === 'host' && !data.value.guestName) return t.value.watchWaiting
  return t.value.watchWaitingShare
})

const presence = computed(() => {
  if (!data.value) return ''
  if (data.value.role === 'host') return data.value.guestName ? `${t.value.watchGuestHere}: ${data.value.guestName}` : t.value.watchAlone
  return data.value.hostName
})

const requestUrl = useRequestURL()
const roomLink = computed(() => `${requestUrl.origin}/juntos/${code.value}`)

const shareError = computed(() => {
  if (notice.value === 'watchNoMedia') return t.value.watchNoMedia
  if (notice.value === 'watchShareFailed') return t.value.watchShareFailed
  if (notice.value === 'watchIceFailed') return t.value.watchIceFailed
  return ''
})

async function join() {
  joining.value = true
  joinError.value = ''
  try {
    data.value = await $fetch<WatchState>(`/api/watch/${code.value}/join`, {
      method: 'POST',
      body: { name: guestName.value },
    })
    await pull()
  }
  catch (cause) {
    joinError.value = explainError(cause, t.value.errors)
  }
  finally {
    joining.value = false
  }
}

async function send() {
  const text = draft.value
  draft.value = ''
  try {
    await sendMessage(text)
  }
  catch (cause) {
    draft.value = text
    joinError.value = explainError(cause, t.value.errors)
  }
}

async function copyLink() {
  await navigator.clipboard.writeText(roomLink.value)
  copied.value = true
}

watch(() => data.value?.messages.length, async () => {
  await nextTick()
  if (chat.value) chat.value.scrollTop = chat.value.scrollHeight
})

useHead({ title: 'Salircontigo' })
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 pb-10">
    <AccountTabs />

    <p v-if="error" class="card-panel">{{ explainError(error, t.errors) }}</p>

    <form v-else-if="data && !data.joined" class="card-panel max-w-md" @submit.prevent="join">
      <h1 class="font-display text-4xl">{{ t.watchJoin }}</h1>
      <p class="mt-2 text-sm font-bold text-wine/70">{{ fill(t.watchJoinLead, { name: data.hostName }) }}</p>
      <label class="field mt-4">
        {{ t.watchJoinName }}
        <input v-model="guestName" required minlength="2" maxlength="40" autocomplete="nickname">
      </label>
      <p v-if="joinError" class="mt-2 text-sm font-bold text-rose-500">{{ joinError }}</p>
      <button class="btn-yes mt-4" type="submit" :disabled="joining">{{ t.watchJoinButton }}</button>
    </form>

    <div v-else-if="data" class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section class="overflow-hidden rounded-[28px] bg-white shadow-[0_18px_50px_rgba(176,96,136,0.12)]">
        <div class="relative aspect-video bg-black">
          <video ref="remoteVideo" autoplay playsinline class="h-full w-full object-contain" :muted="sharing || needsSound" />
          <div v-if="!remoteStream && !sharing && !watching" class="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-bold text-white/80">
            {{ statusLabel }}
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 px-4 py-3">
          <button class="btn-yes text-sm" type="button" @click="sharing ? stopShare() : startShare()">
            {{ sharing ? t.watchStop : t.watchShare }}
          </button>
          <button class="btn-soft text-sm" type="button" @click="copyLink">
            {{ copied ? t.watchCopied : t.watchCopy }}
          </button>
          <button v-if="needsSound" class="btn-soft text-sm" type="button" @click="enableSound">
            {{ t.watchSound }}
          </button>
        </div>
        <div class="px-4 pb-3">
          <p class="text-xs font-extrabold uppercase tracking-wide text-rose-400">{{ t.watchLinkLabel }}</p>
          <p class="mt-1 break-all text-sm font-bold text-wine">{{ roomLink }}</p>
        </div>
        <p v-if="shareError" class="px-4 pb-2 text-sm font-bold text-rose-500">{{ shareError }}</p>
        <p class="bg-rose-50 px-4 py-3 text-xs font-semibold leading-relaxed text-wine/70">{{ t.watchDrm }}</p>
      </section>

      <aside class="card-panel flex h-[min(70vh,640px)] min-h-80 flex-col">
        <h1 class="font-display text-3xl leading-none">{{ t.watchChat }}</h1>
        <p class="mt-1 text-xs font-extrabold uppercase tracking-wide text-rose-400">{{ presence }}</p>
        <div ref="chat" class="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          <p v-for="message in data.messages" :key="message.id" class="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold">
            <span class="mb-0.5 block text-xs font-extrabold text-rose-400">{{ message.author }}</span>
            {{ message.body }}
          </p>
        </div>
        <form class="mt-3 flex min-w-0 gap-2" @submit.prevent="send">
          <input v-model="draft" class="soft-input min-w-0 flex-1" maxlength="400" :placeholder="t.watchChatPlaceholder">
          <button class="btn-yes shrink-0 text-sm" type="submit" :disabled="!draft.trim()">{{ t.watchSend }}</button>
        </form>
        <p v-if="joinError" class="mt-2 text-sm font-bold text-rose-500">{{ joinError }}</p>
      </aside>
    </div>
  </main>
</template>
