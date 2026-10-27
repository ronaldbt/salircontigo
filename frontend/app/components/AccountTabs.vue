<script setup lang="ts">
const { t } = useLocale()
const route = useRoute()
const invites = computed(() => route.path.startsWith('/panel'))
const watching = computed(() => route.path.startsWith('/juntos'))
</script>

<template>
  <nav class="mb-5 flex gap-2">
    <NuxtLink to="/panel" class="rounded-full px-4 py-2 text-sm font-extrabold" :class="invites ? 'bg-white text-wine shadow' : 'text-wine/60'">
      {{ t.invitesTab }}
    </NuxtLink>
    <NuxtLink to="/juntos" class="rounded-full px-4 py-2 text-sm font-extrabold" :class="watching ? 'bg-white text-wine shadow' : 'text-wine/60'">
      {{ t.watchTab }}
    </NuxtLink>
  </nav>
</template>
