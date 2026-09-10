import Papa from 'papaparse'

/**
 * Publishing frequency for every publisher, from the dashboard's
 * timeliness_frequency.csv (~200KB, ~2,100 rows, one row per publisher).
 *
 * It is a single file covering everyone rather than a per-publisher endpoint, so
 * it is fetched once and cached under a shared key — every page asking for it
 * reuses the same parsed result rather than re-downloading.
 *
 * Served from the dashboard, which sends no CORS headers, so browser-side
 * requests go through the proxy in NUXT_PUBLIC_DASHBOARD_BASE.
 */
const FREQUENCY_CSV = '/generated/data/csv/timeliness_frequency.csv'
const TIMELAG_CSV   = '/generated/data/csv/timeliness_timelag.csv'

export function useTimelinessFrequency() {
  const { public: { dashboardBase: BASE } } = useRuntimeConfig()

  const { data, error, status } = useAsyncData(
    'timeliness-frequency',
    async () => {
      const csv = await $fetch(`${BASE}${FREQUENCY_CSV}`, { responseType: 'text' })
      const { data: rows } = Papa.parse(csv, { header: true, skipEmptyLines: true })
      return adaptFrequencyRows(rows)
    },
    { default: () => ({}) },
  )

  const { data: timelag } = useAsyncData(
    'timeliness-timelag',
    async () => {
      const csv = await $fetch(`${BASE}${TIMELAG_CSV}`, { responseType: 'text' })
      const { data: rows } = Papa.parse(csv, { header: true, skipEmptyLines: true })
      return adaptTimelagRows(rows)
    },
    { default: () => ({}) },
  )

  /** Frequency record for one publisher, by registry id (the page slug). */
  function frequencyFor(slug) {
    return data.value?.[unref(slug)] ?? null
  }

  /** Time-lag record (transactions reported per month) for one publisher. */
  function timelagFor(slug) {
    return timelag.value?.[unref(slug)] ?? null
  }

  return { frequencies: data, frequencyFor, timelagFor, error, status }
}
