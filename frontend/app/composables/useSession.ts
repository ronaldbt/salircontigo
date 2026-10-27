import type { PublicUser } from '#shared/types'

export function useSession() {
  const user = useState<PublicUser | null>('citasi-user', () => null)
  const loaded = useState('citasi-user-loaded', () => false)

  async function refresh() {
    try {
      const me = await $fetch<{ user: PublicUser }>('/api/auth/me')
      user.value = me.user
    }
    catch {
      user.value = null
    }
    finally {
      loaded.value = true
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    loaded.value = true
    await navigateTo('/')
  }

  return { user, loaded, refresh, logout }
}
