// Published by dashboard-coverage, which sends Access-Control-Allow-Origin: *,
// so both are fetched directly rather than through the dashboard proxy.
const COVERAGE_DATA = 'https://iati.github.io/dashboard-coverage/data'

/**
 * Validator findings for one publisher.
 *
 * A single ~814KB file covering every publisher, so it is fetched once under a
 * shared key and reused across pages rather than per slug.
 *
 * This is the last thing the page needs from outside the stats payload, and it
 * is needed only for the per-file counts behind the availability bars — the
 * pass/fail verdicts themselves come scored from the API. It can go once the
 * Validator exposes documents_with_critical / documents_with_error
 * (IATI/validator-services#546).
 *
 * Absence of a slug means "no known issues" — never "the fetch failed" — so the
 * adapter returns null verdicts when the data is stale, unreadable, or missing,
 * and the page leaves those components unstated rather than asserting a pass.
 */
export function useAvailabilityData(slug) {
  const shortName = computed(() => unref(slug))

  const { data: validationRaw, status } = useAsyncData(
    'validation-errors',
    () => $fetch(`${COVERAGE_DATA}/validation_errors.json`),
    { default: () => null, server: false },
  )

  const validation = computed(() => adaptValidationErrors(validationRaw.value, shortName.value))

  // This file is ~814KB and arrives after the stats, so the availability panel
  // would otherwise render with its download bar alone and then grow to three.
  const pending = computed(() => status.value === 'idle' || status.value === 'pending')

  return { validation, pending }
}
