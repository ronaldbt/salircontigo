<script setup lang="ts">
import { defaultCopy } from '#shared/defaults'
import { isLang } from '#shared/types'

const { locale, t } = useLocale()
const { user, loaded } = useSession()
const accepted = ref(false)

const copy = computed(() => defaultCopy()[isLang(locale.value) ? locale.value : 'es'])

useHead({ title: 'Salircontigo' })
</script>

<template>
  <main class="mx-auto flex w-full max-w-xl flex-col items-center px-4 pb-16 text-center">
    <p class="text-xs font-extrabold uppercase tracking-[0.22em] text-rose-400">{{ t.heroKicker }}</p>
    <h1 class="mt-2 font-display text-6xl leading-none">salircontigo</h1>
    <p class="mt-4 max-w-md text-lg leading-relaxed text-wine/80">{{ t.heroText }}</p>
    <p class="mt-2 max-w-md text-sm leading-relaxed text-wine/70">{{ t.heroMore }}</p>

    <div class="card-invite mt-8 text-center">
      <div class="mx-auto mb-5 h-28 w-28 overflow-hidden rounded-[22px] bg-[#f6ebe4] shadow-inner">
        <img src="/pug.svg" alt="" class="h-full w-full object-cover">
      </div>
      <h2 class="font-display text-[1.7rem] leading-tight">
        <span aria-hidden="true">🌸 </span>{{ copy.question }}<span aria-hidden="true"> 🌸</span>
      </h2>
      <p v-if="accepted" class="mt-4 text-sm font-bold text-rose-400">{{ t.demoYes }}</p>
      <div class="mt-6 flex items-center justify-center gap-3">
        <button v-if="!accepted" type="button" class="btn-yes" @click="accepted = true">
          {{ copy.yes }} ♥
        </button>
        <RunawayButton>{{ copy.no }}</RunawayButton>
      </div>
    </div>

    <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
      <NuxtLink v-if="loaded && user" to="/panel" class="btn-yes">{{ t.panel }}</NuxtLink>
      <template v-else-if="loaded">
        <NuxtLink to="/registro" class="btn-yes">{{ t.register }}</NuxtLink>
        <NuxtLink to="/login" class="btn-soft">{{ t.login }}</NuxtLink>
      </template>
    </div>
    <p class="mt-4 text-sm text-wine/60">{{ t.heroNote }}</p>
  </main>
</template>
