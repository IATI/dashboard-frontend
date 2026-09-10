// Published by dashboard-coverage, which sends Access-Control-Allow-Origin: *,
// so both are fetched directly rather than through the dashboard proxy.
const COVERAGE_DATA = 'https://iati.github.io/dashboard-coverage/data'

/**
 * Download failures and Validator findings for one publisher.
 *
 * Both are single files covering every publisher (~284KB and ~814KB), so each is
 * fetched once under a shared key and reused across pages rather than per slug.
 *
 * Absence of a slug means "no known issues" — never "the fetch failed" — so the
 * adapters return null verdicts when the data is stale, unreadable, or missing,
 * and the page leaves those components unstated rather than asserting a pass.
 */
export function useAvailabilityData(slug) {
  const shortName = computed(() => unref(slug))

  const { data: downloadsRaw } = useAsyncData(
    'download-errors',
    () => $fetch(`${COVERAGE_DATA}/download_errors.json`),
    { default: () => null },
  )
  const { data: validationRaw } = useAsyncData(
    'validation-errors',
    () => $fetch(`${COVERAGE_DATA}/validation_errors.json`),
    { default: () => null },
  )

  const downloads  = computed(() => adaptDownloadErrors(downloadsRaw.value, shortName.value))
  const validation = computed(() => adaptValidationErrors(validationRaw.value, shortName.value))

  return { downloads, validation }
}
