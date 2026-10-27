export default defineNuxtRouteMiddleware(async () => {
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const { user, loaded } = useSession()
  try {
    const me = await $fetch<{ user: typeof user.value }>('/api/auth/me', { headers })
    user.value = me.user
    loaded.value = true
    return navigateTo('/panel')
  }
  catch {
    user.value = null
    loaded.value = true
  }
})
