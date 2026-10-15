/**
 * Plain-language descriptions of what the assessment measures.
 *
 * One source, two readers: the (?) tooltips beside each indicator on an
 * organisation's page, and the table on /about. The text lives in
 * i18n/locales/indicators.<lang>.json so the whole set can be read and revised
 * together; this composable is only the lookup.
 *
 * Those files sit beside the locale files but are imported here rather than
 * registered with @nuxtjs/i18n. The descriptions name IATI Standard elements —
 * reporting-org/@ref, activity-status/@code — and vue-i18n's message compiler
 * reads a bare @ as a linked-message marker and refuses the string outright. A
 * static import skips the compiler, which also lets the keys be the real
 * indicator ids. The cost is that these strings cannot interpolate or
 * pluralise; none of them need to.
 */
import en from '~~/i18n/locales/indicators.en.json'
import fr from '~~/i18n/locales/indicators.fr.json'

const BY_LOCALE = { en, fr }

/**
 * The framework's indicators, in its own order, grouped by the component they
 * score. Hard-coded rather than read from a publisher's results because this is
 * the framework, not one organisation's data: 1.5, 1.8, 3.3 and 4.7 are not yet
 * returned by the API, and a component's indicators should still be listed for a
 * publisher that happens to score none of them.
 *
 * Ids come from IATI/dashboard-tests, where each is a .feature filename, and
 * IATI-Stats keys its output on the same name. Earlier ids that have since been
 * withdrawn — the eight separate 4.8.x documents indicators, the split
 * 2.3.1/2.3.2, and 4.2_location_activity_scope_exclusion — are deliberately
 * absent.
 */
export const FRAMEWORK_INDICATORS = [
  { component: 'organisation_fields', ids: [
    '1.1_organisation_strategy',
    '1.2_annual_report',
    '1.3_allocation_policy',
    '1.4_procurement_policy',
    '1.5_country_strategy_or_mou',
    '1.6_audit',
    '1.7_organisation_budget',
    '1.8_country_budgets',
  ] },
  { component: 'basic_fields', ids: [
    '2.1_reporting_organisation',
    '2.2_iati_identifier',
    '2.3_implementing_organisation',
    '2.4_title',
    '2.5_description',
    '2.6_current_status',
    '2.7_dates',
    '2.8_sector',
    '2.9_country_or_region',
    '2.10_aid_type',
    '2.11_flow_type',
    '2.12_finance_type',
    '2.13_tied_status',
  ] },
  { component: 'financial_fields', ids: [
    '3.1_commitments',
    '3.2_disbursements_and_expenditures',
    '3.3_traceability',
    '3.4_project_budgets',
  ] },
  { component: 'advanced_fields', ids: [
    '4.1_contact_info',
    '4.2_location',
    '4.3_capital_spend',
    '4.4_recipient_language',
    '4.5_results',
    '4.6_conditions',
    '4.7_organisation_identifiers',
    '4.8_documents',
  ] },
]

/** '2.4_title' -> '2.4', for display beside the name. */
export const indicatorNumber = id => id.split('_')[0]

export function useIndicatorHelp() {
  const { locale } = useI18n({ useScope: 'global' })

  // English is the fallback for a locale with no file of its own, and for any
  // single description a translation has not reached yet.
  const messages = computed(() => BY_LOCALE[locale.value] ?? en)

  /**
   * Look a description up, falling back through English to null.
   *
   * Null rather than a placeholder: the caller decides how an undescribed
   * indicator looks, and a tooltip that says nothing is worse than no tooltip.
   */
  const lookup = (section, id) => {
    if (!id) return null
    return messages.value[section]?.[id] ?? en[section]?.[id] ?? null
  }

  return {
    /** What an indicator measures. */
    indicatorHelp: id => lookup('indicatorHelp', id),
    /** Any caveat on it — a pending calculation, a provisional threshold. */
    indicatorNote: id => lookup('indicatorNote', id),
    /** What a component — or a dimension's component, such as coverage — measures. */
    componentHelp: id => lookup('componentHelp', id),
    /**
     * An indicator's display name. Held in the file rather than humanised from
     * the id, which produced "Iati identifier" and could not be translated.
     */
    indicatorName: id => lookup('indicatorName', id),
  }
}
