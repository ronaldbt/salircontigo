<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { t } = useLocale()
const pending = ref(false)
const message = ref('')

const { data, refresh } = await useFetch<{
  rooms: { code: string, guestName: string, createdAt: string }[]
}>('/api/watch')

async function createRoom() {
  pending.value = true
  message.value = ''
  try {
    const room = await $fetch<{ code: string }>('/api/watch', { method: 'POST' })
    await navigateTo(`/juntos/${room.code}`)
  }
  catch (error) {
    message.value = explainError(error, t.value.errors)
    await refresh()
  }
  finally {
    pending.value = false
  }
}

useHead({ title: 'Salircontigo' })
</script>

<template>
  <main class="mx-auto w-full max-w-3xl px-4 pb-16">
    <AccountTabs />
    <h1 class="font-display text-4xl">{{ t.watchTitle }}</h1>
    <p class="mt-2 max-w-xl text-sm font-bold text-wine/70">{{ t.watchLead }}</p>
    <button class="btn-yes mt-5" type="button" :disabled="pending" @click="createRoom">{{ t.watchCreate }}</button>
    <p v-if="message" class="mt-3 text-sm font-bold text-rose-500">{{ message }}</p>

    <p v-if="!data?.rooms.length" class="mt-8 text-sm text-wine/70">{{ t.watchEmpty }}</p>
    <div v-else class="mt-8 grid gap-3">
      <article v-for="room in data.rooms" :key="room.code" class="card-panel flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-display text-2xl">/juntos/{{ room.code }}</h2>
          <p class="mt-1 text-sm font-bold text-wine/70">
            {{ room.guestName ? `${t.watchGuestHere}: ${room.guestName}` : t.watchAlone }}
          </p>
        </div>
        <NuxtLink :to="`/juntos/${room.code}`" class="btn-soft text-sm">{{ t.watchOpen }}</NuxtLink>
      </article>
    </div>
  </main>
</template>
