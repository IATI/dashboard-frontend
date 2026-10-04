/**
 * Every reporting organisation, for the /organisations index.
 *
 * One request for all ~2,100 (the API pages at 25 by default, so page_size is
 * raised past the total). The response is ~1.9MB and takes several seconds, so
 * it is fetched once per session and reused.
 *
 * Sharing a key is not enough for that on its own: useAsyncData re-runs its
 * handler whenever a component mounts, so every visit to the index refetched
 * the whole list. getCachedData returns what is already in the payload, which
 * makes a return visit instant. The list changes rarely — a new reporting
 * organisation, a renamed one — so `refresh` is exposed for the cases where
 * someone needs it sooner.
 *
 * The trailing slash matters: /api/reporting-orgs without it 301s.
 *
 * `stats` is omitted (no show_stats), so this is metadata only.
 */
export function usePublisherList() {
  const { public: { dashboardBase: BASE } } = useRuntimeConfig()

  // Survives remounts alongside the cached payload, so the page can say how old
  // the list is rather than implying it was just loaded.
  const fetchedAt = useState('publisher-list-fetched-at', () => null)

  const { data, error, status, refresh } = useAsyncData(
    'publisher-list',
    async () => {
      const res = await $fetch(`${BASE}/api/reporting-orgs/`, { query: { page_size: 9999 } })
      fetchedAt.value = Date.now()
      return res
    },
    {
      default: () => [],
      server: false,
      // Reuse what the first visit fetched instead of asking again.
      getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
      transform: res => (res?.results ?? []).map(row => ({
        slug:           row.short_name,
        name:           row.human_readable_name,
        iatiIdentifier: row.organisation_identifier,
        // 28 rows have no type and 67 no dataset count — keep them null so the
        // table can show a dash rather than sorting them as zero
        organisationType: row.organisation_type || null,
        datasetCount:     row.dataset_count ?? null,
        hqCountry:        row.hq_country || null,
        firstPublished:   row.first_publication_date || null,
      })),
    },
  )

  return { publishers: data, error, status, refresh, fetchedAt }
}
