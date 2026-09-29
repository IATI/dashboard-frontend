/**
 * Total IATI spending for one reporting organisation in its most recent complete
 * year, from the Country Development Finance Data cube.
 *
 * "Spending" is transaction types 3 and 4 (disbursement + expenditure), matching
 * the series OrgFinancialChart plots. Commitments and budgets are excluded.
 *
 * CDFD sends Access-Control-Allow-Origin: *, so it is fetched directly rather
 * than through the dashboard proxy.
 */
const CDFD_BASE = 'https://data.countrydata.iatistandard.org/api'
const SPEND_TYPES = ['3', '4']

// How far back to look for a complete year with figures. The current year is
// always partial, so the newest candidate is last year; 112 of the ~630 orgs in
// the cube have figures for the year before that but not for the latest one, so
// looking back a little keeps a figure on the page for them. Which year was used
// is always displayed alongside the number.
const YEARS_BACK = 3

// Dimensions in a babbage cut are separated by `|`, alternatives within one
// dimension by `;`. Getting that wrong does not error — the API quietly returns
// unfiltered totals — so the two are built separately here.
const cut = parts => Object.entries(parts)
  .map(([dim, values]) => `${dim}:${[].concat(values).map(v => `"${v}"`).join(';')}`)
  .join('|')

/**
 * @param {import('vue').Ref<string>|string} orgId organisation_identifier, e.g. 'US-GOV-1'
 */
export function useCdfdSpending(orgId) {
  const id = computed(() => unref(orgId))

  const { data, error, status } = useAsyncData(
    () => `cdfd-spending:${id.value}`,
    async () => {
      if (!id.value) return null

      const latestComplete = new Date().getFullYear() - 1
      const years = Array.from({ length: YEARS_BACK }, (_, i) => String(latestComplete - i))

      const url = new URL(`${CDFD_BASE}/babbage/cubes/iatiline/aggregate/`)
      url.searchParams.set('drilldown', 'year.year')
      url.searchParams.set('aggregates', 'value_usd.sum')
      url.searchParams.set('cut', cut({
        'reporting_organisation.code': id.value,
        'year': years,
        'transaction_type.code': SPEND_TYPES,
      }))
      url.searchParams.set('pagesize', String(YEARS_BACK))

      const json = await $fetch(url.toString()).catch(() => null)
      const byYear = Object.fromEntries(
        (json?.cells ?? []).map(c => [String(c['year.year']), c['value_usd.sum'] ?? 0]),
      )

      // `years` runs newest first, so the first hit is the most recent complete
      // year the publisher actually reported.
      const year = years.find(y => byYear[y] > 0)
      return year ? { year: Number(year), usd: byYear[year] } : null
    },
    {
      watch: [id],
      default: () => null,
      // The password gate mounts the page during hydration, and useAsyncData
      // skips fetching while hydrating when it finds no SSR payload — so the
      // request would never be made at all. Fetch on the client explicitly.
      server: false,
    },
  )

  return { spending: data, error, status }
}
