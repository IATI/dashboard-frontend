// Adapter over the dashboard's /api/reporting-orgs/{slug}.json?show_stats=1 payload.
//
// That payload is ~300KB of raw counts with names and shapes that follow the
// dashboard's internals rather than our methodology. Everything in the app reads
// the normalised output of this module instead, so when the API changes — or the
// assessment layer lands and supplies the shape in sample-data/publishing-quality.json
// directly — only this file has to change.
//
// Pure functions, no fetching: pass in the raw payload, get plain objects back.

// stats.timelag is a display string; map it onto the methodology's enum values.
const TIMELAG_TO_VALUE = {
  'one month':          'one_month',
  'a quarter':          'one_quarter',
  'six months':         'six_months',
  'one year':           'one_year',
  'more than one year': 'more_than_one_year',
}

// timeliness_frequency.csv's Frequency column, mapped onto methodology values.
const FREQUENCY_TO_VALUE = {
  'monthly':          'monthly',
  'quarterly':        'quarterly',
  'six-monthly':      'six_monthly',
  'annual':           'annually',
  'less than annual': 'less_than_annual',
}

// Ordering for enum comparisons — higher is better.
const ENUM_RANK = {
  one_month: 5, monthly: 5,
  one_quarter: 4, quarterly: 4,
  six_months: 3, six_monthly: 3,
  one_year: 2, annually: 2,
  more_than_one_year: 1, less_than_annual: 1,
}

const BANDS_BEST_FIRST = ['excellent', 'very_good', 'good']

/**
 * Which methodology band a raw value earns.
 * A band with no threshold is automatically earned (see methodology.json).
 * Returns null when the component is unknown to the methodology.
 */
export function deriveCategory(componentId, value, methodology) {
  const meta = methodology?.components?.[componentId]
  if (!meta || value === null || value === undefined) return null

  const thresholds = meta.thresholds ?? {}
  for (const band of BANDS_BEST_FIRST) {
    if (!(band in thresholds)) return band
    const threshold = thresholds[band]
    if (meta.unit === 'percent' || meta.unit === 'count') {
      if (value >= threshold) return band
    } else if (meta.unit === 'boolean') {
      if (value === threshold) return band
    } else if (meta.unit === 'enum') {
      if ((ENUM_RANK[value] ?? 0) >= (ENUM_RANK[threshold] ?? 0)) return band
    }
  }
  return 'needs_improvement'
}

/**
 * Index timeliness_frequency.csv by publisher registry id (which is the page
 * slug). Monthly columns are the update counts behind the Frequency verdict.
 */
export function adaptFrequencyRows(rows = []) {
  const byPublisher = {}
  for (const row of rows) {
    const slug = row['Publisher Registry Id']
    if (!slug) continue
    const label = row.Frequency ?? null
    byPublisher[slug] = {
      label,
      value: FREQUENCY_TO_VALUE[String(label ?? '').toLowerCase()] ?? null,
      firstPublished: row['First published'] ?? null,
      updatesByMonth: Object.fromEntries(
        Object.entries(row)
          .filter(([key]) => /^\d{4}-\d{2}$/.test(key))
          .map(([key, count]) => [key, Number(count) || 0]),
      ),
    }
  }
  return byPublisher
}

/**
 * Index timeliness_timelag.csv by publisher registry id.
 *
 * Distinct from the frequency CSV despite the identical column layout: those
 * monthly numbers count file UPDATES, these count TRANSACTIONS reported with a
 * date in that month. A publisher can update monthly while its data stops months
 * short — the trailing zeros here are what produce a long time lag.
 */
export function adaptTimelagRows(rows = []) {
  const byPublisher = {}
  for (const row of rows) {
    const slug = row['Publisher Registry Id']
    if (!slug) continue
    byPublisher[slug] = {
      label: row['Time lag'] ?? null,
      transactionsByMonth: Object.fromEntries(
        Object.entries(row)
          .filter(([key]) => /^\d{4}-\d{2}$/.test(key))
          .map(([key, count]) => [key, Number(count) || 0]),
      ),
    }
  }
  return byPublisher
}

/** Identity fields for the page header. */
function adaptIdentity(raw) {
  return {
    shortName:        raw.short_name ?? null,
    name:             raw.human_readable_name ?? null,
    iatiIdentifier:   raw.organisation_identifier ?? null,
    organisationType: raw.organisation_type ?? null,
    datasetCount:     raw.dataset_count ?? null,
    website:          raw.website ?? null,
  }
}

/**
 * The Gherkin checks, from stats.gherkin_tests_current.
 *
 * Shape is { "<group id>": { "<Test name>": { None, True, False } } }, where the
 * group id's leading section number is the methodology component it belongs to:
 * 1.x organisation, 2.x basic, 3.x financial, 4.x advanced. That numbering is
 * intrinsic to the ids, so no separate mapping table is needed.
 *
 * `None` counts activities the check does not apply to, so the denominator is
 * True + False — scoring against the full activity count would penalise a
 * publisher for checks that were never relevant to its data.
 */
const COMPONENT_BY_SECTION = {
  1: 'organisation_fields',
  2: 'basic_fields',
  3: 'financial_fields',
  4: 'advanced_fields',
}

/** '4.8.7_performance_and_evaluation' -> 'Performance and evaluation' */
function humaniseGroupId(groupId) {
  const words = groupId.replace(/^[\d.]+_/, '').replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function adaptTests(stats) {
  const groups = stats.gherkin_tests_current ?? {}
  const rows = []

  for (const [groupId, tests] of Object.entries(groups)) {
    // Not a check — it reports how many activities count as current
    if (groupId === 'current_data') continue

    const section = Number(groupId.split('.')[0])
    const component = COMPONENT_BY_SECTION[section] ?? null
    const group = humaniseGroupId(groupId)

    for (const [name, counts] of Object.entries(tests ?? {})) {
      const passed = counts?.True ?? 0
      const failed = counts?.False ?? 0
      const denominator = passed + failed
      rows.push({
        id: `${groupId}::${name}`,
        groupId,
        group,
        name,
        component,
        notApplicable: counts?.None ?? 0,
        numerator: passed,
        denominator,
        value: denominator ? Math.round((100 * passed) / denominator) : null,
      })
    }
  }

  return rows.sort((a, b) => a.groupId.localeCompare(b.groupId) || a.name.localeCompare(b.name))
}

/** The parts of `stats` we actually use, renamed and typed consistently. */
function adaptStats(stats) {
  return {
    activityCount:             stats.activities ?? null,
    datasetCount:              stats.activity_files ?? null,
    organisationFiles:         stats.organisation_files ?? null,
    transactionTotal:          stats.transaction_total ?? null,
    fileSizeBytes:             stats.file_size ?? null,

    // Shape of the dataset: how deep the activity hierarchy goes, which version(s)
    // are published, and the span of dates the data covers.
    hierarchyLevels: Object.keys(stats.hierarchies ?? {}).map(Number).filter(Boolean).sort(),
    activitiesByHierarchy: stats.hierarchies ?? null,
    versions: Object.keys(stats.versions ?? {}).sort(),
    earliestDate: stats.date_extremes?.min?.overall ?? null,
    latestDate:   stats.date_extremes?.max?.overall ?? null,

    mostRecentTransactionDate: stats.most_recent_transaction_date ?? null,

    // Display string, plus its methodology enum equivalent
    timelag:      stats.timelag ?? null,
    timelagValue: TIMELAG_TO_VALUE[String(stats.timelag ?? '').toLowerCase()] ?? null,

    // `validation` only carries the outcomes that occurred, so an absent
    // `fail` key means nothing failed — not that the data is missing.
    validation: {
      pass: stats.validation?.pass ?? 0,
      fail: stats.validation?.fail ?? 0,
    },

    tests: adaptTests(stats),
  }
}

/**
 * Normalise a raw reporting-org payload.
 * `stats` is null unless the request was made with ?show_stats=1.
 */
export function adaptPublisher(raw, methodology) {
  if (!raw) return null
  return {
    identity: adaptIdentity(raw),
    stats: raw.stats ? adaptStats(raw.stats) : null,
  }
}

/**
 * Mean pass rate of the checks belonging to each comprehensiveness component.
 * Components with no checks (organisation_fields is assessed from the
 * organisation file, not activities) are absent from the result.
 */
export function summariseChecksByComponent(tests = []) {
  const buckets = {}
  for (const test of tests) {
    if (!test.component || test.value === null) continue
    ;(buckets[test.component] ??= []).push(test.value)
  }
  return Object.fromEntries(
    Object.entries(buckets).map(([component, values]) => [
      component,
      Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
    ]),
  )
}

/**
 * Collapse the flat check list into one row per indicator.
 *
 * Several checks can test the same indicator — Location has two, Title has two —
 * so the indicator's score is the mean of its tests, with the tests kept on the
 * row so the UI can drill into them.
 */
export function groupTestsByIndicator(tests = []) {
  const rows = new Map()
  for (const test of tests) {
    const key = test.group ?? test.name
    if (!rows.has(key)) {
      rows.set(key, { id: key, indicator: key, component: test.component, tests: [] })
    }
    rows.get(key).tests.push(test)
  }
  return [...rows.values()].map(row => ({
    ...row,
    value: Math.round(row.tests.reduce((sum, t) => sum + t.value, 0) / row.tests.length),
  }))
}

/**
 * Normalise a record from the dashboard-coverage dataset
 * (iati.github.io/dashboard-coverage/data/publishers/{slug}.json).
 *
 * `coverage.coverage` is a ratio, not a percentage — 1.146 means IATI spending is
 * 114.6% of the CRS reference — so it is scaled here rather than at each use site.
 */
export function adaptCoverage(raw) {
  if (!raw) return null
  const coverage = raw.coverage ?? {}
  const disaggregation = raw.disaggregation ?? {}

  return {
    coveragePercent:   coverage.coverage != null ? Math.round(coverage.coverage * 100) : null,

    // How the comparison was made
    coverageBasis:     coverage.coverage_basis ?? null,        // 'net' | 'gross'
    iatiSpendingUsd:   coverage.iati_net_spending_usd ?? coverage.iati_spending_usd ?? null,
    iatiCurrency:      coverage.iati_currency ?? null,
    referenceValueUsd: coverage.reference_value_usd ?? null,
    referenceCurrency: coverage.reference_currency ?? null,
    referenceSource:   coverage.reference_source ?? null,      // e.g. 'crs'
    referenceEntity:   coverage.reference_entity ?? null,
    referenceEntityId: coverage.reference_entity_id ?? null,
    referenceYear:     coverage.reference_year ?? null,

    // >1 when several IATI publishers are compared against the same reference
    // entity, which makes any single publisher's share hard to read on its own.
    publishersSharingReference: coverage.publishers_sharing_reference ?? null,

    // Quarters in which the publisher reported, averaged per year — out of 4.
    quartersPerYear: disaggregation.quarters_per_year ?? null,
    quartersByYear:  disaggregation.quarters_by_year ?? null,
    totalQuarters:   disaggregation.total_quarters ?? null,
    yearsReporting:  disaggregation.years_reporting ?? null,

    generatedAt: raw.generated_at ?? null,
  }
}

/**
 * Download failures for one publisher, from dashboard-coverage's download_errors.json.
 *
 * Absence from `publishers` means "no known failures", not "no data" — hence the
 * staleness gate: this file's own age is always 0 (it rebuilds daily), but its
 * UPSTREAM once silently froze for 19 months, during which it would have kept
 * reporting healthy. `source_age_days` is the field that catches that, so the
 * verdict is withheld rather than guessed when the upstream is stale.
 */
const MAX_SOURCE_AGE_DAYS = 7

/** Whole days since an ISO timestamp, or null if unparseable. */
function daysSince(iso) {
  if (!iso) return null
  const then = Date.parse(String(iso).replace(' ', 'T'))
  return Number.isNaN(then) ? null : Math.floor((Date.now() - then) / 86_400_000)
}

export function adaptDownloadErrors(raw, slug) {
  if (!raw?.publishers) return null
  const sourceAgeDays = raw.source_age_days ?? null
  const stale = sourceAgeDays != null && sourceAgeDays > MAX_SOURCE_AGE_DAYS
  const errors = raw.publishers[unref(slug)] ?? []

  return {
    stale,
    sourceAgeDays,
    ageDays:         raw.age_days ?? daysSince(raw.generated),
    refreshed:       raw.refreshed ?? null,
    generated:       raw.generated ?? null,
    datasetsChecked: raw.datasets_checked ?? null,
    errors,
    // null = cannot say
    downloadable: stale ? null : errors.length === 0,
  }
}

/**
 * Validator findings for one publisher, from dashboard-coverage's
 * validation_errors.json (refreshed weekly, so a looser age gate).
 *
 * `documents_with_*` answers "is this publisher OK?"; `total_*` counts instances
 * and is only useful for severity — one publisher has 140 affected documents but
 * 832,258 instances. A publisher whose documents could not be read carries a
 * non-null `error` and must not read as a pass.
 */
// How stale a file may be before its verdicts are withheld, by refresh cadence.
// A weekly file legitimately reaches 6-7 days old just before each run, so it
// needs more headroom than a daily one.
const MAX_AGE_DAYS_BY_CADENCE = { daily: 7, weekly: 10 }
const MAX_AGE_DAYS_DEFAULT = 10

export function adaptValidationErrors(raw, slug) {
  if (!raw?.publishers) return null
  // `generated` is the fallback for age_days; both are published now, and they agree.
  const ageDays = raw.age_days ?? daysSince(raw.generated)
  const refreshed = raw.refreshed ?? null
  const maxAge = MAX_AGE_DAYS_BY_CADENCE[refreshed] ?? MAX_AGE_DAYS_DEFAULT
  const stale = ageDays != null && ageDays > maxAge
  // A spike in publishers_failed means the Validator API was struggling during
  // the run, not that publishers' data changed. Treat the whole file as suspect
  // rather than telling dozens of publishers their documents are unreadable.
  const failed = raw.publishers_failed ?? 0
  const sourceSuspect = failed > 30

  const record = raw.publishers[unref(slug)] ?? null
  const unreadable = Boolean(record?.error) && !sourceSuspect

  // Documents the Validator actually assessed. When every document is
  // undownloadable the zero counts mean "nothing was checked", not "nothing was
  // wrong" — 64 publishers are in exactly that state, and reading their zeros as
  // a pass would score a publisher whose files all 404 as flawless.
  // documents_assessed is published now; the subtraction is the same number and
  // keeps this working against older copies of the file.
  const assessed = record?.documents_assessed
    ?? ((record?.documents ?? 0) - (record?.undownloadable ?? 0))
  const usable = Boolean(record) && !stale && !unreadable && !sourceSuspect && assessed > 0

  return {
    stale,
    ageDays,
    refreshed,
    generated:  raw.generated ?? null,
    unreadable,
    sourceSuspect,
    publishersFailed: failed,
    readError:  record?.error ?? null,
    documents:            record?.documents ?? null,
    documentsAssessed:    record ? assessed : null,
    undownloadable:       record?.undownloadable ?? null,
    // undownloadable splits two ways: the Validator tried and failed, or has no
    // record of trying. Only the first is the publisher's problem to fix.
    downloadFailed:       record?.download_failed ?? null,
    neverFetched:         record?.never_fetched ?? null,
    // Two count styles, because they answer different questions: documents_with_*
    // for "is this publisher OK?", total_* for how bad. One publisher has 140
    // affected documents but 832,258 instances.
    severities: ['critical', 'error', 'warning', 'advisory'].map(level => ({
      level,
      documents: record?.[`documents_with_${level}`] ?? null,
      instances: record?.[`total_${level}`] ?? null,
    })),
    documentsWithCritical: record?.documents_with_critical ?? null,
    documentsWithError:    record?.documents_with_error ?? null,
    totalCritical:         record?.total_critical ?? null,
    totalError:            record?.total_error ?? null,
    // null = cannot say (stale, unreadable, or publisher absent)
    noCriticalErrors: usable ? record.documents_with_critical === 0 : null,
    noErrors:         usable ? record.documents_with_error === 0 : null,
  }
}

/**
 * The measures we can derive from real data today, in the shape the assessment
 * API will eventually return (see sample-data/publishing-quality.json).
 *
 * Partial by design — it covers only the components the current sources support.
 * The page merges it over its placeholder data. Once the assessment layer exists,
 * this is deleted and its payload used as-is.
 *
 * @param {object} sources { publisher, coverage } — both already adapted
 */
export function toAssessmentFragment({ publisher, coverage, frequency, downloads, validation }, methodology) {
  const stats = publisher?.stats
  const dimensions = {}

  const component = (id, value, detail) => ({
    value,
    category: deriveCategory(id, value, methodology),
    ...(detail ? { detail } : {}),
  })

  // Availability: the Validator's own findings beat the dashboard's pass counts,
  // which carry no severity split. Components stay absent when unknowable.
  const availability = {}
  if (downloads?.downloadable !== null && downloads?.downloadable !== undefined) {
    availability.downloadable = component('downloadable', downloads.downloadable, {
      failing_datasets: downloads.errors.length,
      source_age_days:  downloads.sourceAgeDays,
    })
  }
  if (validation?.noCriticalErrors !== null && validation?.noCriticalErrors !== undefined) {
    availability.no_critical_errors = component('no_critical_errors', validation.noCriticalErrors, {
      documents_with_critical: validation.documentsWithCritical,
      total_critical:          validation.totalCritical,
      documents:               validation.documents,
    })
  }
  if (validation?.noErrors !== null && validation?.noErrors !== undefined) {
    availability.no_errors = component('no_errors', validation.noErrors, {
      documents_with_error: validation.documentsWithError,
      total_error:          validation.totalError,
      documents:            validation.documents,
    })
  }
  if (Object.keys(availability).length) dimensions.availability = { components: availability }

  if (stats) {

    const timelinessComponents = {}
    if (stats.timelagValue) {
      timelinessComponents.timeliness =
        component('timeliness', stats.timelagValue, { source_value: stats.timelag })
    }
    if (frequency?.value) {
      timelinessComponents.frequency =
        component('frequency', frequency.value, { source_value: frequency.label })
    }
    if (Object.keys(timelinessComponents).length) {
      dimensions.timeliness = { components: timelinessComponents }
    }

    // Comprehensiveness components are the mean pass rate of their checks.
    // Organisation checks are the 1.x section of the same list.
    const allChecks = stats.tests
    const byComponent = summariseChecksByComponent(allChecks)
    const comprehensiveness = {}
    for (const [id, value] of Object.entries(byComponent)) {
      comprehensiveness[id] = component(id, value, {
        checks: allChecks.filter(test => test.component === id).length,
      })
    }
    if (Object.keys(comprehensiveness).length) {
      dimensions.comprehensiveness = { components: comprehensiveness }
    }
  }

  if (coverage) {
    const components = {}
    if (coverage.coveragePercent != null) {
      components.coverage = component('coverage', coverage.coveragePercent, {
        iati_spend_usd:      coverage.iatiSpendingUsd,
        reference_spend_usd: coverage.referenceValueUsd,
        reference_source:    coverage.referenceSource,
        reference_year:      coverage.referenceYear,
      })
    }
    if (coverage.quartersPerYear != null) {
      components.disaggregation = component('disaggregation', coverage.quartersPerYear, {
        quarters_by_year: coverage.quartersByYear,
        years_reporting:  coverage.yearsReporting,
      })
    }
    if (Object.keys(components).length) dimensions.coverage = { components }
  }

  for (const [id, dim] of Object.entries(dimensions)) {
    const category = deriveDimensionCategory(id, dim.components, methodology)
    if (category) dim.category = category
  }

  if (!Object.keys(dimensions).length) return null
  return { dimensions, overall: { category: deriveOverallCategory(dimensions) } }
}

/**
 * The overall band from the dimension bands.
 *
 * The methodology does not specify how dimensions combine into an overall
 * verdict, so — as with dimensions whose rule is unstated — the weakest
 * dimension decides. Revisit once the paper settles this.
 */
export function deriveOverallCategory(dimensions = {}) {
  const ladder = ['needs_improvement', 'good', 'very_good', 'excellent']
  const ranks = Object.values(dimensions)
    .map(dim => ladder.indexOf(dim.category))
    .filter(rank => rank >= 0)
  return ranks.length ? ladder[Math.min(...ranks)] : null
}

/**
 * A dimension's band from its components' values.
 *
 * Timeliness has an explicit rule in the methodology (a joint function of both
 * components, not an aggregate of their bands). For the others the methodology
 * does not yet specify how components combine, so the weakest component decides
 * — a publisher is not "excellent" at coverage while failing disaggregation.
 * Revisit once the paper settles this.
 */
export function deriveDimensionCategory(dimensionId, components = {}, methodology) {
  if (dimensionId === 'timeliness') {
    const lag  = components.timeliness?.value
    const freq = components.frequency?.value
    if (!lag || !freq) return null
    const top = v => ENUM_RANK[v] === 5              // one month / monthly
    const mid = v => ENUM_RANK[v] === 4              // one quarter / quarterly
    if (top(lag) && top(freq)) return 'excellent'
    if ((mid(lag) && mid(freq)) || top(lag) || top(freq)) return 'good'
    return 'needs_improvement'
  }

  const ladder = ['needs_improvement', 'good', 'very_good', 'excellent']
  const ranks = Object.values(components)
    .map(c => ladder.indexOf(c.category))
    .filter(rank => rank >= 0)
  return ranks.length ? ladder[Math.min(...ranks)] : null
}
