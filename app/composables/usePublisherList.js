/**
 * Every reporting organisation, for the /publishers index.
 *
 * One request for all ~2,100 (the API pages at 25 by default, so page_size is
 * raised past the total). The response is ~1.9MB and takes several seconds, so
 * it is cached under a shared key and reused rather than refetched per visit.
 *
 * The trailing slash matters: /api/reporting-orgs without it 301s.
 *
 * `stats` is omitted (no show_stats), so this is metadata only.
 */
export function usePublisherList() {
  const { public: { dashboardBase: BASE } } = useRuntimeConfig()

  const { data, error, status } = useAsyncData(
    'publisher-list',
    () => $fetch(`${BASE}/api/reporting-orgs/`, { query: { page_size: 9999 } }),
    {
      default: () => [],
      server: false,
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

  return { publishers: data, error, status }
}
