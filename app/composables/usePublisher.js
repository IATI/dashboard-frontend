import methodology from '~~/sample-data/methodology.json'


/**
 * Fetches one reporting organisation from the dashboard API by its short_name
 * (the `[slug]` in /organisations/[slug]), e.g. 'usaid', 'afdb', 'ec-intpa'.
 *
 * The dashboard sends no CORS headers, so browser-side requests go through the
 * Cloudflare proxy configured in NUXT_PUBLIC_DASHBOARD_BASE. Server-side renders
 * hit it directly.
 *
 * With `stats: true` the response is ~300KB — the whole raw stats blob — so it is
 * requested only where those numbers are actually used. Either way the payload is
 * normalised through adaptPublisher() rather than being read field-by-field.
 *
 * @param {import('vue').Ref<string>|string} slug
 * @param {{ stats?: boolean }} options
 */
export function usePublisher(slug, options = {}) {
  const { stats = false } = options
  const { public: { dashboardBase: BASE } } = useRuntimeConfig()
  const shortName = computed(() => unref(slug))

  // Returned as the AsyncData object so callers can `await` it: awaiting makes a
  // fatal error thrown in the handler surface as a 404 page before first render,
  // rather than being captured into `error` and leaving a blank page behind.
  // Callers read `.data` (see the publisher page).
  return useAsyncData(
    () => `publisher:${shortName.value}:${stats ? 'stats' : 'basic'}`,
    async () => {
      const raw = await $fetch(`${BASE}/api/reporting-orgs/${shortName.value}.json`, {
        query: stats ? { show_stats: 1 } : undefined,
      }).catch(() => null)

      if (!raw) {
        throw createError({
          statusCode: 404,
          statusMessage: `Publisher "${shortName.value}" not found`,
          fatal: true,
        })
      }
      return raw
    },
    {
      watch: [shortName],
      default: () => null,
      transform: raw => adaptPublisher(raw, methodology),
      // The password gate mounts the page during hydration, and useAsyncData
      // skips fetching while hydrating when it finds no SSR payload — so the
      // request was never made at all. Fetch on the client explicitly.
      server: false,
    },
  )
}

