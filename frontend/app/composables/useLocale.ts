import { getUi } from '#shared/i18n'
import { isLang, type Lang } from '#shared/types'

export function useLocale() {
  const locale = useCookie<Lang>('salircontigo_lang', {
    default: () => 'es',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  if (!isLang(locale.value)) locale.value = 'es'

  const t = computed(() => getUi(isLang(locale.value) ? locale.value : 'es'))

  function setLocale(lang: Lang) {
    locale.value = lang
  }

  return { locale, t, setLocale }
}
