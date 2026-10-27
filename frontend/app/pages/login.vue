<script setup lang="ts">
definePageMeta({ middleware: 'guest' })

const { t } = useLocale()
const route = useRoute()
const email = ref('')
const password = ref('')
const pending = ref(false)
const message = ref('')

function nextPath() {
  const next = String(route.query.next ?? '')
  if (!next.startsWith('/') || next.startsWith('//')) return '/panel'
  return next
}

async function submit() {
  pending.value = true
  message.value = ''
  try {
    const me = await $fetch<{ user: { id: string } }>('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    const { user, loaded } = useSession()
    const full = await $fetch<{ user: typeof user.value }>('/api/auth/me')
    user.value = full.user
    loaded.value = true
    void me
    await navigateTo(nextPath())
  }
  catch (error) {
    message.value = explainError(error, t.value.errors)
  }
  finally {
    pending.value = false
  }
}

useHead({ title: 'Citasi' })
</script>

<template>
  <main class="mx-auto flex min-h-[70dvh] w-full max-w-md items-center px-4 py-6">
    <form class="card-invite" @submit.prevent="submit">
      <h1 class="text-center font-display text-4xl">{{ t.login }}</h1>
      <label class="field mt-6">
        {{ t.email }}
        <input v-model="email" type="email" autocomplete="email" required>
      </label>
      <label class="field mt-4">
        {{ t.password }}
        <input v-model="password" type="password" autocomplete="current-password" required>
      </label>
      <p v-if="message" class="mt-3 text-sm font-bold text-rose-500">{{ message }}</p>
      <button class="btn-wide mt-5" type="submit" :disabled="pending">{{ t.login }}</button>
      <p class="mt-4 text-center text-sm">
        <NuxtLink to="/registro" class="font-extrabold text-rose-500">{{ t.noAccount }}</NuxtLink>
      </p>
    </form>
  </main>
</template>
