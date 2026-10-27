<script setup lang="ts">
definePageMeta({ middleware: 'guest' })

const { t, locale } = useLocale()
const name = ref('')
const email = ref('')
const password = ref('')
const pending = ref(false)
const message = ref('')

async function submit() {
  pending.value = true
  message.value = ''
  try {
    const result = await $fetch<{ user: { id: string, name: string, email: string, invitesCreated: number, maxInvites: number, remaining: number } }>('/api/auth/register', {
      method: 'POST',
      body: { name: name.value, email: email.value, password: password.value, lang: locale.value },
    })
    const { user, loaded } = useSession()
    user.value = result.user
    loaded.value = true
    await navigateTo('/panel')
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
      <h1 class="text-center font-display text-4xl">{{ t.register }}</h1>
      <label class="field mt-6">
        {{ t.yourName }}
        <input v-model="name" type="text" autocomplete="name" required>
      </label>
      <label class="field mt-4">
        {{ t.email }}
        <input v-model="email" type="email" autocomplete="email" required>
      </label>
      <label class="field mt-4">
        {{ t.password }}
        <input v-model="password" type="password" autocomplete="new-password" minlength="6" required>
      </label>
      <p v-if="message" class="mt-3 text-sm font-bold text-rose-500">{{ message }}</p>
      <button class="btn-wide mt-5" type="submit" :disabled="pending">{{ t.create }}</button>
      <p class="mt-4 text-center text-sm">
        <NuxtLink to="/login" class="font-extrabold text-rose-500">{{ t.haveAccount }}</NuxtLink>
      </p>
    </form>
  </main>
</template>
