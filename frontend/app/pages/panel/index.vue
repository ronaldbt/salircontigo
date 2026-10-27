<script setup lang="ts">
import { formatInviteDate } from '#shared/defaults'
import { fill } from '#shared/i18n'
import type { InviteKind, InviteResponse, Lang } from '#shared/types'

definePageMeta({ middleware: 'auth' })

type InviteCard = {
  id: string
  name: string
  slug: string
  kind: InviteKind
  active: boolean
  languages: Lang[]
  defaultLang: Lang
  createdAt: string
  responses: number
  latest: InviteResponse | null
}

const { t, locale } = useLocale()
const draftName = ref('')
const draftKind = ref<InviteKind>('date')
const pending = ref(false)
const message = ref('')
const copiedId = ref('')

const { data, refresh } = await useFetch<{
  invites: InviteCard[]
  remaining: number
  maxInvites: number
}>('/api/invites')

const remaining = computed(() => data.value?.remaining ?? 0)

function latestLine(invite: InviteCard) {
  if (!invite.latest) return t.value.noResponses
  const lang = locale.value
  const bits = [invite.kind === 'sorry' ? t.value.forgave : t.value.saidYes]
  if (invite.latest.date) bits.push(formatInviteDate(invite.latest.date, lang))
  if (invite.latest.time) bits.push(invite.latest.time)
  return bits.join(' · ')
}

async function createInvite() {
  pending.value = true
  message.value = ''
  try {
    const result = await $fetch<{ invite: { id: string } }>('/api/invites', {
      method: 'POST',
      body: { name: draftName.value, lang: locale.value, kind: draftKind.value },
    })
    await navigateTo(`/panel/${result.invite.id}`)
  }
  catch (error) {
    message.value = explainError(error, t.value.errors)
    await refresh()
  }
  finally {
    pending.value = false
  }
}

async function copyLink(invite: InviteCard) {
  const url = `${location.origin}/i/${invite.slug}`
  await navigator.clipboard.writeText(url)
  copiedId.value = invite.id
}

useHead({ title: 'Salircontigo' })
</script>

<template>
  <main class="mx-auto w-full max-w-3xl px-4 pb-16">
    <AccountTabs />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-4xl">{{ t.panel }}</h1>
        <p class="mt-1 text-sm font-bold text-wine/70">
          {{ fill(t.remaining, { n: remaining, max: data?.maxInvites || 3 }) }}
        </p>
      </div>
    </div>

    <form v-if="remaining > 0" class="card-panel mb-5" @submit.prevent="createInvite">
      <div class="mb-4 grid gap-2 sm:grid-cols-2">
        <button type="button" class="rounded-2xl border px-4 py-3 text-left" :class="draftKind === 'date' ? 'border-pink-400 bg-white shadow-[0_0_0_3px_rgba(251,113,133,0.2)]' : 'border-rose-100 bg-white/70'" @click="draftKind = 'date'">
          <span class="block font-extrabold">{{ t.templateDate }}</span>
          <span class="mt-1 block text-xs font-semibold text-wine/70">{{ t.templateDateHint }}</span>
        </button>
        <button type="button" class="rounded-2xl border px-4 py-3 text-left" :class="draftKind === 'sorry' ? 'border-pink-400 bg-white shadow-[0_0_0_3px_rgba(251,113,133,0.2)]' : 'border-rose-100 bg-white/70'" @click="draftKind = 'sorry'">
          <span class="block font-extrabold">{{ t.templateSorry }}</span>
          <span class="mt-1 block text-xs font-semibold text-wine/70">{{ t.templateSorryHint }}</span>
        </button>
      </div>
      <label class="field">
        {{ t.inviteName }}
        <input v-model="draftName" type="text" required minlength="2" :placeholder="t.inviteNameHint">
      </label>
      <p class="mt-2 text-xs text-wine/60">{{ t.inviteNameHint }}</p>
      <p v-if="message" class="mt-2 text-sm font-bold text-rose-500">{{ message }}</p>
      <button class="btn-yes mt-4" type="submit" :disabled="pending">{{ t.newInvite }}</button>
    </form>
    <p v-else class="card-panel mb-5 text-sm font-bold">{{ t.noneLeft }}</p>

    <p v-if="!data?.invites.length" class="text-sm text-wine/70">{{ t.empty }}</p>

    <div class="grid gap-3">
      <article v-for="invite in data?.invites" :key="invite.id" class="card-panel">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-display text-2xl leading-tight">{{ invite.name }}</h2>
            <p class="mt-1 text-sm text-wine/70">/i/{{ invite.slug }}</p>
            <p class="mt-2 text-sm font-bold">{{ latestLine(invite) }}</p>
            <p class="text-xs uppercase tracking-wide text-wine/50">
              {{ invite.kind === 'sorry' ? t.templateSorry : t.templateDate }}
              · {{ invite.languages.join(' · ') }}
              <span v-if="!invite.active"> · {{ t.paused }}</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink :to="`/panel/${invite.id}`" class="btn-soft text-sm">{{ t.edit }}</NuxtLink>
            <NuxtLink :to="`/i/${invite.slug}`" target="_blank" class="btn-soft text-sm">{{ t.open }}</NuxtLink>
            <button type="button" class="btn-soft text-sm" @click="copyLink(invite)">
              {{ copiedId === invite.id ? t.copied : t.copyLink }}
            </button>
          </div>
        </div>
        <p class="mt-3 text-xs font-bold uppercase tracking-wide text-rose-400">
          {{ t.responses }}: {{ invite.responses }}
        </p>
      </article>
    </div>
  </main>
</template>
