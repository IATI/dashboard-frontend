// IATI codelists, served by Code for IATI. Sends Access-Control-Allow-Origin: *,
// so these are fetched directly rather than through the dashboard CORS proxy.
const CODELIST_BASE = 'https://codelists.codeforiati.org/api/json'

/**
 * Loads an IATI codelist in the active language and exposes a code -> name lookup.
 *
 * Refetches whenever the locale changes, so switching to French swaps the names
 * without a reload. Nuxt caches by key, so several components asking for the same
 * codelist share a single request.
 *
 *   const { lookup } = useCodelist('OrganisationType')
 *   lookup('40')  // 'Multilateral'  (en) / 'Multilatéral' (fr)
 *
 * @param {string} name Codelist name, e.g. 'OrganisationType'
 */
export function useCodelist(name) {
  const { locale } = useI18n({ useScope: 'global' })

  const { data, error, status } = useAsyncData(
    `codelist:${name}`,
    () => $fetch(`${CODELIST_BASE}/${locale.value}/${name}.json`),
    { watch: [locale], default: () => null },
  )

  // { '10': 'Government', '40': 'Multilateral', ... }
  const map = computed(() =>
    Object.fromEntries((data.value?.data ?? []).map(item => [String(item.code), item.name])),
  )

  /** Name for a code, falling back to the raw code so nothing renders blank. */
  function lookup(code) {
    if (code === null || code === undefined || code === '') return ''
    return map.value[String(code)] ?? String(code)
  }

  return { map, lookup, error, status }
}
