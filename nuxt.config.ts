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
      // Serves both /stats/*.json and the newer /api/* endpoints.
      // Sends no CORS headers, so browser-side fetches go via the Cloudflare
      // proxy instead — set NUXT_PUBLIC_DASHBOARD_BASE (see .env and deploy.yml).
      dashboardBase: 'https://dev2.dashboard.iatistandard.org',
      // Deterrent only — this ships in the client bundle and is trivially found.
      // It exists to stop people stumbling across a provisional dashboard, not to
      // protect anything. Override with NUXT_PUBLIC_SITE_PASSWORD; set it empty
      // to disable the gate entirely.
      sitePassword: 'development',
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
      meta: [
        // Keep the preview out of search results while it is provisional.
        // On a GitHub Pages PROJECT site this tag — not robots.txt — is what
        // actually works: crawlers only read robots.txt from the domain root
        // (iati.github.io/robots.txt), so one served under /dashboard-frontend/
        // is ignored. Remove both when the dashboard goes public.
        { name: 'robots', content: 'noindex, nofollow, noarchive' },
        { name: 'googlebot', content: 'noindex, nofollow' },
      ],
    },
  },
  components: {
    dirs: [{ path: '~/components', pathPrefix: false }],
  },
  nitro: {
    prerender: {
      // @ts-ignore — not in Nitro types but processed at runtime for SPA fallback
      fallback: '404.html',
    },
  },
})
