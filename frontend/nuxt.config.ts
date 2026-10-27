// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@nuxt/eslint'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: {
    host: '127.0.0.1',
    port: 3004,
  },
  runtimeConfig: {
    sessionSecret: 'citasi-dev-secret-change-me',
  },
  nitro: {
    preset: process.env.CF_PAGES ? 'cloudflare_pages' : undefined,
    prerender: {
      autoSubfolderIndex: false,
    },
    cloudflare: {
      nodeCompat: true,
    },
  },
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
    viewer: false,
  },
  app: {
    head: {
      title: 'Citasi',
      htmlAttrs: { lang: 'es' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Una invitación para salir. Si dicen que no, el botón se escapa.' },
        { name: 'theme-color', content: '#fde8f3' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,520;9..144,650&family=Nunito:wght@400;600;700;800&display=swap' },
      ],
    },
  },
})
