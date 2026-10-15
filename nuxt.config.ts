export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    // The indicator descriptions live beside these, in
    // i18n/locales/indicators.<lang>.json, but are NOT registered here —
    // useIndicatorHelp imports them directly. They describe the IATI Standard
    // and so contain element names like reporting-org/@ref, which vue-i18n's
    // message compiler rejects as malformed linked messages.
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
      // Serves both /stats/*.json and the newer /api/* endpoints. These now send
      // Access-Control-Allow-Origin: *, so the browser reaches them directly and
      // the CORS proxy that used to stand in front of them is gone.
      dashboardBase: 'https://dev2.dashboard.iatistandard.org',
      // The /generated/* files are static, served by Apache rather than the
      // application, and send no CORS header — so these alone still need the
      // proxy. Point this at dashboardBase and the proxy can be retired
      // completely; until then only the exploring-data activities page uses it.
      generatedBase: 'https://black-math-8c4c.dashboard-cors-proxy.workers.dev',
      // Accounts that see every organisation rather than only their own, for
      // the people running the consultation. Comma- or space-separated, and
      // overridable with NUXT_PUBLIC_ALL_ORGS_EMAILS so the list can be changed
      // without a release.
      //
      // Not a secret, and not capable of being one: like everything in
      // runtimeConfig.public this ships in the client bundle, so these
      // addresses are readable by anyone who looks. See useAccess for what this
      // does and does not achieve.
      allOrgsEmails: [
        'mark@brough.io',
        'yemesrach.workie@undp.org',
        'rohini.simbodyal@undp.org',
        'jaimie.grant@undp.org',
      ].join(','),
      // IATI Account SSO (Asgardeo/WSO2). Defaults are the ones the IATI SPA
      // example publishes; override per environment with NUXT_PUBLIC_AUTH_*.
      //
      // Asgardeo matches signInRedirectURL exactly, and it is derived at runtime
      // from the app's own origin, so every origin this is served from has to be
      // registered against the client: http://localhost:3000/ for development
      // and the deployed URL for production.
      auth: {
        clientId: 'nXxAqpsEf4sucq12XfjXWwUWYzMa',
        baseUrl:  'https://api.eu.asgardeo.io/t/iati',
        // `email` is needed for the all-organisations list, which matches on
        // the address: `profile` alone does not carry an email claim, so
        // without it there is nothing to match. `ryd` scopes are what let the
        // access token read which reporting organisations the user administers.
        scope:    'openid profile email ryd ryd:reporting_org',
      },
      // Register Your Data — the source of which publishers a user may
      // administer, and so the thing that decides what a signed-in publisher
      // sees. Enforces an origin allowlist, so the origin the site is served
      // from has to be registered with RYD as well.
      //
      // BEFORE GOING LIVE: switch to the production instance,
      // https://api.registeryourdata.iatistandard.org (the same host without
      // the dev. prefix), either here or with NUXT_PUBLIC_RYD_BASE in
      // deploy.yml.
      //
      // Checked 2026-10-15: a CORS preflight from https://iati.github.io is
      // answered by the dev instance and NOT by the production one, so that
      // origin is registered against dev only. Switching before it is
      // registered against production would refuse every publisher's lookup
      // before the request was even sent — which, because the lookup is what
      // scopes a publisher to their own organisations, locks every publisher
      // out. Register the origin first, then switch.
      rydBase: 'https://dev.api.registeryourdata.iatistandard.org',
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
