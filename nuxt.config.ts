export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n', '@nuxtjs/plausible'],
  i18n: {
    // indicators.<lang>.json sits beside these but is deliberately not
    // registered: vue-i18n's compiler rejects the element names in it. See
    // useIndicatorHelp.
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
      // Serves /api/* and /stats/*, both with Access-Control-Allow-Origin: *.
      dashboardBase: 'https://dev2-dashboard.iatistandard.org',
      // Separate from dashboardBase because /generated/* sends no
      // Access-Control-Allow-Origin, so a browser cannot fetch it cross-origin.
      // The exploring-data CSVs will not load until that changes or a proxy is
      // put here.
      generatedBase: 'https://dev2-dashboard.iatistandard.org',
      // The "Development version" notice across the top of every page.
      // NUXT_PUBLIC_SHOW_DEV_BANNER=true turns it on without a code change.
      showDevBanner: false,
      // Accounts that see every organisation rather than only their own.
      // Comma-separated, and overridable with NUXT_PUBLIC_ALL_ORGS_EMAILS, so
      // an account can be added for a deployment without a code change. Ships
      // in the client bundle, so it cannot hold anything secret.
      allOrgsEmails: 'mark@brough.io',
      // IATI Account SSO (Asgardeo/WSO2), overridable with NUXT_PUBLIC_AUTH_*.
      // The redirect URL is the app's own origin, matched exactly, so every
      // origin this is served from must be registered against the client —
      // including http://localhost:3000/ for development.
      auth: {
        clientId: 'nXxAqpsEf4sucq12XfjXWwUWYzMa',
        baseUrl:  'https://api.eu.asgardeo.io/t/iati',
        // `email` for the all-organisations list, which matches on the address
        // and gets no email claim from `profile` alone; `ryd` for reading which
        // organisations the user administers.
        scope:    'openid profile email ryd ryd:reporting_org',
      },
      // Register Your Data decides which organisations a signed-in publisher
      // sees, so a refused call locks publishers out rather than over-serving
      // them. Each instance allows different origins: iati.github.io is allowed
      // on dev only, which is why deploy.yml overrides this for the Pages
      // build, and localhost on neither, so publishers cannot be scoped locally.
      rydBase: 'https://api.registeryourdata.iatistandard.org',
    },
  },
  vite: {
    optimizeDeps: {
      include: ['bootstrap-vue-next', 'chart.js', 'vue-chartjs', 'papaparse', '@asgardeo/auth-spa'],
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
        // Remove when the dashboard goes public. On a GitHub Pages project
        // site this tag, not robots.txt, is what works: crawlers read
        // robots.txt only from the domain root.
        { name: 'robots', content: 'noindex, nofollow, noarchive' },
        { name: 'googlebot', content: 'noindex, nofollow' },
      ],
    },
  },
  components: {
    dirs: [{ path: '~/components', pathPrefix: false }],
  },
  // Cookieless, so no consent banner. Events are attributed to the hostname the
  // site is served from, which must exist as a site in the Plausible account or
  // they are silently discarded; NUXT_PUBLIC_PLAUSIBLE_DOMAIN overrides that.
  plausible: {
    // Sent by plugins/plausible-pageviews.client.js instead, which strips the
    // OpenID parameters the sign-in redirect leaves in the URL.
    autoPageviews: false,
    autoOutboundTracking: true,
    fileDownloads: true,
    ignoredHostnames: ['localhost', '127.0.0.1'],
  },
  nitro: {
    prerender: {
      // @ts-ignore — not in Nitro types but processed at runtime for SPA fallback
      fallback: '404.html',
    },
  },
})
