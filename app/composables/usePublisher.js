import methodology from '~~/sample-data/methodology.json'

// Coverage figures come from a separate published dataset. It sends
// Access-Control-Allow-Origin: *, so it is fetched directly, not via the proxy.
const COVERAGE_BASE = 'https://iati.github.io/dashboard-coverage/data/publishers'

/**
 * Fetches one reporting organisation from the dashboard API by its short_name
 * (the `[slug]` in /publishers/[slug]), e.g. 'usaid', 'afdb', 'ec-intpa'.
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

  const { data, error, status } = useAsyncData(
    () => `publisher:${shortName.value}:${stats ? 'stats' : 'basic'}`,
    () => $fetch(`${BASE}/api/reporting-orgs/${shortName.value}.json`, {
      query: stats ? { show_stats: 1 } : undefined,
    }),
    { watch: [shortName], default: () => null, transform: raw => adaptPublisher(raw, methodology) },
  )

  return { publisher: data, error, status }
}

/**
 * Fetches the published coverage and disaggregation figures for one publisher.
 * Returns null (rather than throwing) for publishers absent from the dataset.
 *
 * @param {import('vue').Ref<string>|string} slug
 */
export function useCoverage(slug) {
  const shortName = computed(() => unref(slug))

  const { data, error, status } = useAsyncData(
    () => `coverage:${shortName.value}`,
    () => $fetch(`${COVERAGE_BASE}/${shortName.value}.json`).catch(() => null),
    { watch: [shortName], default: () => null, transform: adaptCoverage },
  )

  return { coverage: data, error, status }
}
