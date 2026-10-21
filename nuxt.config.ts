export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n', '@nuxtjs/plausible'],
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
      dashboardBase: 'https://dev2-dashboard.iatistandard.org',
      // The /generated/* files are static, served by Apache rather than the
      // application, and send no Access-Control-Allow-Origin — so a browser
      // cannot fetch them cross-origin at all. They used to go through a CORS
      // proxy; that proxy fronted the old dev2.dashboard host and returns 530
      // now that it is gone, so this points at the dashboard directly.
      //
      // That means the five exploring-data pages that read these CSVs cannot
      // load them until /generated/ sends the header, or a working proxy is put
      // back here. Those pages are behind ?full and the all-organisations list,
      // so no publisher meets the failure.
      generatedBase: 'https://dev2-dashboard.iatistandard.org',
      // The "Development version — data may be incomplete, provisional, or
      // include fictional placeholder text" notice across the top of every
      // page. Off by default now that publishers are being invited in.
      //
      // Turn it back on by setting this to true, or without a code change with
      // NUXT_PUBLIC_SHOW_DEV_BANNER=true in the environment (deploy.yml sets
      // the build's environment). Nuxt coerces the string, so "true" and "1"
      // both work and anything else leaves it off.
      showDevBanner: false,
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
        'bee.webb@opendataservices.coop',
        'emma.clegg@opendataservices.coop',
        'steven.flower@opendataservices.coop',
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
      // sees. If this call is refused the site cannot scope anyone, and every
      // publisher is locked out of their own assessment rather than
      // over-served, so pointing it at the wrong instance is not a soft
      // failure.
      //
      // RYD enforces an origin allowlist, and the two instances allow
      // different origins, so which one to use depends on where the site is
      // served from. Checked 2026-10-15 by CORS preflight:
      //
      //   origin                                    production   dev
      //   https://preview-dashboard.iatistandard.org   allowed    allowed
      //   https://iati.github.io                       refused    allowed
      //   http://localhost:<port>                      refused    refused
      //
      // Production is the default because that is what a real deployment
      // should read. The GitHub Pages build overrides it to dev in deploy.yml,
      // because iati.github.io is only allowed there. Get iati.github.io
      // registered against production and that override can go.
      //
      // Note localhost is on neither allowlist, so RYD cannot be reached in
      // local development on either setting; an account on allOrgsEmails still
      // works, because that is checked before RYD.
      //
      // To check which instance a build points at, grep .output/public after
      // `npm run generate` — that inlines the value. `nuxt build` does not:
      // it leaves NUXT_PUBLIC_* to be read when the server starts, so the
      // bundle shows the default whatever the environment says.
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
  // Plausible, as iatistandard.org already uses: cookieless, no personal data,
  // and so no consent banner. The module rather than a plain script tag because
  // this is a single-page app — a script tag would record the first load and
  // miss every navigation after it.
  //
  // Events are attributed to whatever hostname the site is served from, so each
  // one has to exist as a site in the Plausible account or its events are
  // silently discarded. Override with NUXT_PUBLIC_PLAUSIBLE_DOMAIN to report
  // two deployments as one site, or NUXT_PUBLIC_PLAUSIBLE_ENABLED=false to turn
  // tracking off for a build.
  plausible: {
    // Pageviews are sent by plugins/plausible-pageviews.client.js instead, so
    // that the OpenID parameters the sign-in redirect leaves in the URL are not
    // reported to the analytics service.
    autoPageviews: false,
    // Matches the extensions iatistandard.org loads
    // (script.file-downloads.outbound-links.js).
    autoOutboundTracking: true,
    fileDownloads: true,
    // localhost is ignored by the tracker itself; this is for `nuxt preview`
    // and anything else served from the machine under another name.
    ignoredHostnames: ['localhost', '127.0.0.1'],
  },
  nitro: {
    prerender: {
      // @ts-ignore — not in Nitro types but processed at runtime for SPA fallback
      fallback: '404.html',
    },
  },
})
