<script setup lang="ts">
import { LANGS, type Lang } from '#shared/types'

const { locale, setLocale, t } = useLocale()

function choose(lang: Lang) {
  setLocale(lang)
}
</script>

<template>
  <div class="flex rounded-full bg-white/80 p-1 text-xs font-extrabold shadow-sm">
    <button
      v-for="lang in LANGS"
      :key="lang"
      type="button"
      class="rounded-full px-2.5 py-1 uppercase"
      :class="locale === lang ? 'bg-rose-500 text-white' : 'text-wine/70'"
      :aria-pressed="locale === lang"
      @click="choose(lang)"
    >
      {{ lang }}
      <span class="sr-only">{{ t.langNames[lang] }}</span>
    </button>
  </div>
</template>
