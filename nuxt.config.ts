export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    locales: [
      { code: 'en', language: 'en-GB', file: 'en.json', name: 'English' },
      { code: 'fr', language: 'fr-FR', file: 'fr.json', name: 'Français' },
    ],
    defaultLocale: 'en',
    langDir: 'locales',
    strategy: 'no_prefix',
  },
  runtimeConfig: {
    public: {
      dashboardBase: 'https://dashboard.iatistandard.org',
    },
  },
  vite: {
    optimizeDeps: {
      include: ['bootstrap-vue-next', 'chart.js', 'vue-chartjs', 'papaparse'],
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['import', 'if-function', 'global-builtin', 'color-functions'],
        },
      },
    },
  },
  compatibilityDate: '2026-08-01',
  app: {
    head: {
      title: 'IATI Publishing Quality',
    },
  },
  components: {
    dirs: [{ path: '~/components', pathPrefix: false }],
  },
  nitro: {
    prerender: {
      fallback: '404.html',
    },
  },
})
