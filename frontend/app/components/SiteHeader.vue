<script setup lang="ts">
const { t } = useLocale()
const { user, loaded, refresh, logout } = useSession()

onMounted(() => {
  if (!loaded.value) refresh()
})
</script>

<template>
  <header class="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
    <NuxtLink to="/" class="font-display text-3xl leading-none tracking-tight">{{ t.brand }}</NuxtLink>
    <div class="flex flex-wrap items-center justify-end gap-2">
      <LangSwitch />
      <template v-if="loaded && user">
        <NuxtLink to="/panel" class="btn-soft text-sm">{{ t.panel }}</NuxtLink>
        <NuxtLink to="/juntos" class="btn-soft text-sm">{{ t.watchTab }}</NuxtLink>
        <button type="button" class="btn-soft text-sm" @click="logout">{{ t.logout }}</button>
      </template>
      <template v-else-if="loaded">
        <NuxtLink to="/login" class="btn-soft text-sm">{{ t.login }}</NuxtLink>
        <NuxtLink to="/registro" class="btn-yes text-sm">{{ t.register }}</NuxtLink>
      </template>
    </div>
  </header>
</template>
