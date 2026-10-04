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

/**
 * The API scores each timeliness component on a 0-4 ordinal, and bands it on the
 * ladder below — read off the value/category pairs its own components carry.
 * frequency_old's verdict maps onto the same scale, so a component rebuilt from
 * it is directly comparable with the timelag component beside it.
 */
/**
 * Ordinal back to the named value, for the two components the API scores that
 * way. Everything downstream — the methodology thresholds, displayValue, the
 * star tooltips — works in named values, so "3" has to come back as
 * 'one_quarter' rather than being rendered as a bare number.
 *
 * Verified against stats.timelag and frequency_new over 30 publishers: every
 * ordinal 0-4 round-trips to the string the API itself displays.
 */
const ORDINAL_VALUE = {
  timelag:   ['more_than_one_year', 'one_year', 'six_months', 'one_quarter', 'one_month'],
  frequency: ['less_than_annual', 'annually', 'six_monthly', 'quarterly', 'monthly'],
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

// The API scores the assessment itself now. Its component ids differ from the
// methodology file's, so map them once here rather than renaming either side.
const COMPONENT_ID = {
  basic: 'basic_fields',
  advanced: 'advanced_fields',
  financials: 'financial_fields',
  organisation: 'organisation_fields',
  timelag: 'timeliness',
  no_critical: 'no_critical_errors',
  no_error: 'no_errors',
}

// Values arrive on three different scales: ratios for coverage and the
// comprehensiveness components, a plain count for disaggregation, and a band
// number (0-3) for timelag and frequency, whose readable value is an enum.
const AS_PERCENT = new Set(['coverage', 'basic', 'advanced', 'financials', 'organisation'])

/**
 * The scored assessment, straight from stats.assessment_new.
 *
 * Replaces deriving bands in the client from methodology thresholds: the API
 * is now authoritative, so the scale and the aggregation rules live in one
 * place instead of being reimplemented here.
 *
 * Availability is absent from the API's assessment, so it is still derived —
 * see toAssessmentFragment.
 */
function adaptAssessment(stats, methodology) {
  const raw = stats.assessment_new
  if (!raw?.dimensions) return null

  const dimensions = {}
  for (const [dimId, dim] of Object.entries(raw.dimensions)) {
    // A dimension the API could not score at all comes through as null (e.g.
    // coverage, for a publisher with no spending figures to compare against).
    if (!dim) continue

    const components = {}
    for (const [rawId, comp] of Object.entries(dim.components ?? {})) {
      const id = COMPONENT_ID[rawId] ?? rawId
      const scale = ORDINAL_VALUE[rawId]
      // Band the exact value but display it rounded: 98.51% shows as "99%",
      // and banding the rounded figure would hand it the 99% star it has not
      // earned.
      const exact = scale ? (scale[comp.value] ?? null)
        : AS_PERCENT.has(rawId) ? comp.value * 100
        : comp.value
      // The API's own band is used as-is. Checked against the methodology for
      // every dimension: coverage, comprehensiveness and availability agree.
      // Timeliness does not, and is corrected in toAssessmentFragment.
      components[id] = {
        value: AS_PERCENT.has(rawId) ? Math.round(exact) : exact,
        category: comp.category ?? null,
      }
    }
    dimensions[dimId] = { category: dim.category ?? null, components }
  }

  return { overall: { category: raw.overall?.category ?? null }, dimensions }
}

/** Coverage and disaggregation, now carried in the stats payload. */
function adaptCoverageFromStats(stats) {
  const raw = stats.coverage_dict_from_external_repo
  if (!raw?.coverage) return null
  const c = raw.coverage
  const d = raw.disaggregation ?? {}

  return {
    coveragePercent:   c.coverage != null ? Math.round(c.coverage * 100) : null,
    coverageBasis:     c.coverage_basis ?? null,
    iatiSpendingUsd:   c.iati_net_spending_usd ?? c.iati_spending_usd ?? null,
    referenceValueUsd: c.reference_value_usd ?? null,
    referenceCurrency: c.reference_currency ?? null,
    referenceSource:   c.reference_source ?? null,
    referenceEntity:   c.reference_entity ?? null,
    referenceEntityId: c.reference_entity_id ?? null,
    referenceYear:     c.reference_year ?? null,
    publishersSharingReference: c.publishers_sharing_reference ?? null,
    quartersPerYear: d.quarters_per_year ?? null,
    quartersByYear:  d.quarters_by_year ?? null,
    totalQuarters:   d.total_quarters ?? null,
    yearsReporting:  d.years_reporting ?? null,
  }
}

/** The most recent `count` months of a { 'YYYY-MM': n } series, oldest first. */
function recentMonths(series, count = 12) {
  const months = Object.keys(series ?? {}).sort()
  if (!months.length) return {}
  // Walk back `count` calendar months from the latest, filling gaps with zero:
  // the series omits months with no activity, and the strip needs every slot.
  const [y, m] = months[months.length - 1].split('-').map(Number)
  const out = {}
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    out[key] = series[key] ?? 0
  }
  return out
}

/**
 * Files that failed to download, out of all files the publisher has registered.
 * Returns null when the key is absent, so the panel can leave it unstated
 * rather than claiming zero failures.
 */
function adaptDownloadsByType(byType) {
  if (!byType || typeof byType !== 'object') return null
  const entries = Object.entries(byType).filter(([, n]) => typeof n === 'number')
  if (!entries.length) return null

  const files  = entries.reduce((sum, [, n]) => sum + n, 0)
  const failed = entries.filter(([type]) => type !== 'null').reduce((sum, [, n]) => sum + n, 0)

  return {
    files,
    failed,
    // Reasons, worst first, for the tooltip — e.g. { http_non_200: 130 }.
    byType: Object.fromEntries(entries.filter(([type]) => type !== 'null').sort((a, b) => b[1] - a[1])),
  }
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
function adaptStats(stats, methodology) {
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
    // download_errors_by_type is a per-FILE breakdown: the `null` key counts
    // files that downloaded cleanly, every other key a failure reason. The
    // values therefore sum to the publisher's whole file set — which is the
    // right denominator, and a larger one than activity_files, since that counts
    // only the files the dashboard could actually parse (UNFPA: 124 vs 254).
    downloads: adaptDownloadsByType(stats.download_errors_by_type),

    timelag:      stats.timelag ?? null,
    timelagValue: TIMELAG_TO_VALUE[String(stats.timelag ?? '').toLowerCase()] ?? null,

    // `validation` only carries the outcomes that occurred, so an absent
    // `fail` key means nothing failed — not that the data is missing.
    validation: {
      pass: stats.validation?.pass ?? 0,
      fail: stats.validation?.fail ?? 0,
    },

    tests: adaptTests(stats),

    // Now supplied by the API rather than fetched separately or derived here
    assessment: adaptAssessment(stats, methodology),
    coverage:   adaptCoverageFromStats(stats),
    // frequency_old, not frequency_new. Checked against the published
    // timeliness_frequency.csv across 11 publishers: old matched 11/11, new
    // 7/11 — new under-reports recent updates for AfDB, World Bank, EC-INTPA
    // and Sida, all of which publish monthly. Revisit when new is fixed.
    frequency: {
      label: stats.frequency_old?.frequency ?? null,
      value: FREQUENCY_TO_VALUE[String(stats.frequency_old?.frequency ?? '').toLowerCase()] ?? null,
      updatesByMonth: recentMonths(stats.frequency_old?.updates_per_month),
    },
    transactionsByMonth: recentMonths(stats.transaction_months_with_year),
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
    stats: raw.stats ? adaptStats(raw.stats, methodology) : null,
  }
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
 * Upstream timestamps arrive in two shapes: ISO 8601, and a space-separated
 * variant ("2026-09-10 03:46:45+00:00"). Normalise so consumers see one format.
 */
function toIso(value) {
  if (!value) return null
  const parsed = Date.parse(String(value).replace(' ', 'T'))
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
}

/** Whole days since a timestamp, or null if unparseable. */
function daysSince(value) {
  const iso = toIso(value)
  return iso === null ? null : Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
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
  // Derived from the timestamp, not the file's own age_days: that value is only
  // correct when written, so a failed rebuild reports 0 while the data ages.
  const ageDays = daysSince(raw.generated) ?? raw.age_days ?? null
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
    generated:  toIso(raw.generated),
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
 * Availability, the one dimension the API does not score.
 *
 * Everything else — coverage, timeliness, comprehensiveness, and the overall
 * band — now comes scored from stats.assessment_new, so this merges the two
 * rather than deriving anything the API already decided.
 *
 * @param {object} sources { publisher, downloads, validation }
 */
export function toAssessmentFragment({ publisher }, methodology) {
  const scored = publisher?.stats?.assessment ?? null
  const dimensions = { ...(scored?.dimensions ?? {}) }

  const component = (id, value, detail) => ({
    value,
    category: deriveCategory(id, value, methodology),
    ...(detail ? { detail } : {}),
  })

  // Timeliness is the one dimension the API gets wrong, in two ways: it scores
  // frequency from frequency_new, which under-reports monthly publishers (see
  // adaptStats), and it bands the dimension on a four-point scale when the
  // methodology defines only three — any `very_good` is wrong by construction.
  // So frequency is rescored from frequency_old and the dimension re-derived
  // from the methodology's joint rule.
  const frequency = publisher?.stats?.frequency
  if (dimensions.timeliness && frequency?.value) {
    const components = {
      ...dimensions.timeliness.components,
      frequency: component('frequency', frequency.value, { source_value: frequency.label }),
    }
    dimensions.timeliness = {
      components,
      category: deriveTimeliness(components.timeliness?.value, components.frequency?.value),
    }
  }

  if (!Object.keys(dimensions).length) return null

  // Weakest dimension overall: the API's own overall excludes availability, and
  // is built on the timeliness band corrected above.
  const overall = { category: weakestBand(Object.values(dimensions).map(d => d.category)) }

  return { dimensions, overall }
}

const BAND_LADDER = ['needs_improvement', 'good', 'very_good', 'excellent']

/** The lowest of the given bands, ignoring anything unrecognised. */
function weakestBand(bands) {
  const ranks = bands.map(b => BAND_LADDER.indexOf(b)).filter(r => r >= 0)
  return ranks.length ? BAND_LADDER[Math.min(...ranks)] : null
}

/**
 * Timeliness, from the methodology's joint rule (IATI-Stats#195):
 *
 *   both monthly / one month                              -> excellent
 *   both at least quarterly / a quarter, OR either one
 *   monthly / one month                                   -> good
 *   otherwise                                             -> needs_improvement
 *
 * Deliberately a joint function of the two values rather than an aggregate of
 * their individual bands: the rule awards `good` when EITHER component is top,
 * which taking the weakest band would never do. Note it defines no `very_good`
 * for this dimension.
 */
export function deriveTimeliness(timelag, frequency) {
  const top = v => ENUM_RANK[v] === 5          // one month / monthly
  const mid = v => ENUM_RANK[v] === 4          // a quarter / quarterly
  if (!timelag || !frequency) return null
  if (top(timelag) && top(frequency)) return 'excellent'
  if ((mid(timelag) || top(timelag)) && (mid(frequency) || top(frequency))) return 'good'
  if (top(timelag) || top(frequency)) return 'good'
  return 'needs_improvement'
}
