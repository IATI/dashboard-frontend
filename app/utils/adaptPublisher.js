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

      // Checked before any arithmetic: `null * 100` is 0 in JavaScript, so a
      // component the API could not measure would otherwise become a real 0
      // here and render as "0%  Needs improvement" beside "No tests available".
      if (comp.value === null || comp.value === undefined) continue
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

    // Nothing measurable in the whole dimension — leave it out rather than
    // showing an empty panel with a band on it.
    if (!Object.keys(components).length) continue

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

  // Whether this publisher has anything to be compared against. Detected three
  // ways because the upstream convention changed: it used to report
  // `coverage: null`, and now reports `coverage: 0` with `no_reference: true`.
  // A 0 under that flag is an absence of a measurement, not a measured zero, so
  // treating it as a score would mark ~660 publishers down for not appearing in
  // any register. Checking all three keeps old and new files working.
  const hasReference = c.no_reference !== true
    && c.reference_source != null
    && c.coverage != null

  // Show the spending figure the ratio was actually computed from, so the three
  // numbers on the panel agree. dashboard-coverage has dropped the net basis
  // (IATI/dashboard-coverage f992f49) and coverage is gross for every source,
  // which is what the missing-basis branch resolves to.
  //
  // The net branch is kept until the API picks that up: the dashboard refreshes
  // coverage_by_slug.json once a night, so for now it still serves net-based
  // ratios for a handful of entities, and pairing one of those with the gross
  // figure would reintroduce the mismatch this was written to fix.
  const grossUsd = c.iati_spending_usd ?? null
  const netUsd = c.iati_net_spending_usd ?? null
  const spendingUsd = c.coverage_basis === 'net' ? (netUsd ?? grossUsd) : (grossUsd ?? netUsd)

  const reference = adaptReferenceYear(c.reference_year)

  return {
    hasReference,
    coveragePercent:   hasReference && c.coverage != null ? Math.round(c.coverage * 100) : null,
    coverageBasis:     c.coverage_basis ?? null,
    iatiSpendingUsd:   spendingUsd,
    referenceValueUsd: c.reference_value_usd ?? null,
    referenceCurrency: c.reference_currency ?? null,
    // The same two figures before conversion.
    //
    // iati_currency is NOT the publisher's reporting currency. CDFD, which
    // dashboard-coverage counts IATI spending from, exposes only value_usd and
    // value_eur — value_gbp returns "Invalid aggregate" — so it is whichever of
    // those two was used. A Dutch charity's EUR reference matches one of them
    // and is compared natively; a UK charity's GBP reference cannot be, so its
    // £362.6m is converted to $469.2m and compared against a USD total.
    //
    // Where the pair is EUR, the USD conversion differs from the chart's: the
    // coverage dataset applies one rate for the reference period while CDFD
    // converts each transaction at its own date. Oxfam Novib is 124,905,528 EUR
    // either way, $146.8m at 1.175 against $139.3m at CDFD's dated rates.
    iatiSpending:      c.iati_spending ?? null,
    iatiCurrency:      c.iati_currency ?? null,
    referenceValue:    c.reference_value ?? null,
    referenceSource:   c.reference_source ?? null,
    referenceEntity:   c.reference_entity ?? null,
    referenceEntityId: c.reference_entity_id ?? null,
    referenceYear:     reference.year,
    referencePeriodEnd: reference.periodEnd,
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

/**
 * reference_year is not always a year. The charity registers report the end of
 * each organisation's own accounting period — "2025-03-31T00:00:00" for Oxfam
 * GB — because those periods do not line up with calendar years. Keep both: the
 * year for the inline label, the exact date for the detail panel.
 */
function adaptReferenceYear(value) {
  if (value === null || value === undefined) return { year: null, periodEnd: null }
  if (typeof value === 'number') return { year: value, periodEnd: null }

  const text = String(value)
  if (/^\d{4}$/.test(text)) return { year: Number(text), periodEnd: null }

  // Read off the string rather than through Date. "2025-03-31T00:00:00" carries
  // no timezone, so parsing it lands in local time and converting back to UTC
  // moves it a day in any zone ahead of UTC — 31 March became 30 March here.
  // It is a calendar date, not an instant, so keep it as one.
  const date = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (date) {
    const [, year, month, day] = date
    return { year: Number(year), periodEnd: `${year}-${month}-${day}` }
  }
  return { year: null, periodEnd: null }
}

/** The most recent "YYYY-MM" key in an update series, or null if it is empty. */
function latestMonth(series) {
  const months = Object.keys(series ?? {}).filter(k => /^\d{4}-\d{2}$/.test(k))
  return months.length ? months.sort().at(-1) : null
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
 * The Gherkin checks, from stats.gherkin_tests_hierarchy_exclusions.
 *
 * Was gherkin_tests_current, which the API no longer returns, then plain
 * gherkin_tests. A third variant, gherkin_tests_rm_current_step, sits beside
 * them and is not used. See gherkinRows for why the exclusions variant is the
 * one to read.
 *
 * Shape is { "<group id>": { "<Test name>": { None, True, False } } }, where the
 * group id's leading section number is the methodology component it belongs to:
 * 1.x organisation, 2.x basic, 3.x financial, 4.x advanced. That numbering is
 * intrinsic to the ids, so no separate mapping table is needed.
 *
 * `None` counts activities the check does not apply to, so the denominator is
 * True + False — scoring against the full activity count would penalise a
 * publisher for checks that were never relevant to its data.
 *
 * Note the denominators are still every activity rather than the current ones:
 * AfDB has 5,366 activities and 1,220 current, and the widest check counts
 * 5,366. Whatever "current" means upstream, it is not yet applied here.
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

/**
 * Orders indicators by their number, section by section.
 *
 * Comparing the ids as strings put 2.10 before 2.2, because "2.1" sorts before
 * "2.2" one character at a time. Array.prototype.sort is stable and this
 * compares only the number, so the checks within one indicator stay in the
 * order the API listed them — sorting those by name once put the organisation
 * budget's checks in the order one / three / two.
 */
function byIndicatorNumber(a, b) {
  const parts = id => String(id).split('_')[0].split('.').map(Number)
  const x = parts(a.groupId), y = parts(b.groupId)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1)
    if (d) return Number.isNaN(d) ? String(a.groupId).localeCompare(String(b.groupId)) : d
  }
  return 0
}

/** The shared parts of a row, however the check was measured. */
function testGroupMeta(groupId) {
  return {
    groupId,
    group: humaniseGroupId(groupId),
    component: COMPONENT_BY_SECTION[Number(groupId.split('.')[0])] ?? null,
  }
}

/**
 * The Gherkin checks, counted pass / fail / not-applicable per activity.
 *
 * Read from gherkin_tests_hierarchy_exclusions, which respects the exclusions a
 * publisher has agreed — FCDO, for instance, is not assessed on aid type for
 * its hierarchy 1 activities. The two properties are identical for a publisher
 * with no exclusions; where there are some, the plain gherkin_tests would
 * report the publisher against activities it was agreed not to be assessed on.
 * It is kept as a fallback for a publisher the new property is missing for,
 * which would otherwise show no checks at all.
 *
 * The exclusions variant also lists the indicators calculated outside Gherkin
 * (3.3 and 4.7) as empty objects. Those are skipped, since
 * comprehensiveness_new_non_gherkin is where their real figures live.
 */
function gherkinRows(stats) {
  const rows = []
  const groups = stats.gherkin_tests_hierarchy_exclusions ?? stats.gherkin_tests ?? {}
  const nonGherkin = stats.comprehensiveness_new_non_gherkin ?? {}

  for (const [groupId, tests] of Object.entries(groups)) {
    // Not a check — it reports how many activities count as current
    if (groupId === 'current_data') continue
    if (groupId in nonGherkin) continue
    const meta = testGroupMeta(groupId)

    for (const [name, counts] of Object.entries(tests ?? {})) {
      const passed = counts?.True ?? 0
      const failed = counts?.False ?? 0
      const denominator = passed + failed
      rows.push({
        ...meta,
        id: `${groupId}::${name}`,
        name,
        notApplicable: counts?.None ?? 0,
        numerator: passed,
        denominator,
        value: denominator ? Math.round((100 * passed) / denominator) : null,
      })
    }
  }
  return rows
}

/**
 * The checks that are not expressed as Gherkin scenarios, from
 * stats.comprehensiveness_new_non_gherkin.
 *
 * Four indicators are calculated this way rather than activity by activity:
 * 1.5 country strategy or MoU, 1.8 country budgets, 3.3 traceability and
 * 4.7 organisation identifiers. They slot into the same components as the rest,
 * by the same section numbering in their ids.
 *
 * Shape is { "<group id>": { "<Test name>": <ratio|null> } } — a proportion
 * already, not a pass / fail count, so there is no denominator to show. `ratio`
 * marks them so the expanded row does not offer a meaningless "0.68 of 1".
 *
 * A null ratio is the API saying the check does not apply to this publisher,
 * which is how an organisation type that is only assessed for traceability in
 * one direction comes through: the World Bank reports downward traceability and
 * null upward. Those are given a zero denominator, the same as a Gherkin check
 * with nothing to assess, which keeps them out of the indicator's average
 * rather than counting as a failure.
 */
function nonGherkinRows(stats) {
  const rows = []
  for (const [groupId, tests] of Object.entries(stats.comprehensiveness_new_non_gherkin ?? {})) {
    const meta = testGroupMeta(groupId)

    for (const [name, ratio] of Object.entries(tests ?? {})) {
      const measured = typeof ratio === 'number' && Number.isFinite(ratio)
      rows.push({
        ...meta,
        id: `${groupId}::${name}`,
        name,
        ratio: true,
        notApplicable: 0,
        numerator: measured ? ratio : 0,
        denominator: measured ? 1 : 0,
        value: measured ? Math.round(100 * ratio) : null,
      })
    }
  }
  return rows
}

function adaptTests(stats) {
  return [...gherkinRows(stats), ...nonGherkinRows(stats)].sort(byIndicatorNumber)
}

/** The parts of `stats` we actually use, renamed and typed consistently. */
function adaptStats(stats, methodology) {
  return {
    activityCount:             stats.activities ?? null,
    // Identifiers used by more than one activity, counted across ALL of this
    // publisher's files. The Validator's own uniqueness rule (1.1.2) only looks
    // within a single document, so a duplicate split across two files passes
    // there and shows up only here.
    duplicateIdentifiers:      Object.keys(stats.publisher_duplicate_identifiers ?? {}).length,
    datasetCount:              stats.activity_files ?? null,
    organisationFiles:         stats.organisation_files ?? null,
    transactionTotal:          stats.transaction_total ?? null,
    fileSizeBytes:             stats.file_size ?? null,

    // Shape of the dataset: how deep the activity hierarchy goes, which version(s)
    // are published, and the span of dates the data covers.
    hierarchyLevels: Object.keys(stats.hierarchies ?? {}).map(Number).filter(Boolean).sort(),
    // Indicator id -> the hierarchy level it is not assessed at for this
    // publisher, as agreed with them. Arrives with the level as a string.
    // Empty for most publishers.
    hierarchyExclusions: Object.fromEntries(
      Object.entries(stats.hierarchy_exclusions ?? {})
        .map(([indicator, level]) => [indicator, String(level)])
        .filter(([, level]) => level),
    ),
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

    // Per-document Validator counts, which are what the availability panel
    // draws its bars from.
    validationSummary: adaptValidationSummary(stats.validation_summary_precalc),

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
    // The month this publisher last updated a file, from the same update history
    // the frequency verdict is derived from — "YYYY-MM", or null when there is
    // no history at all. This is when they last PUBLISHED, which is a different
    // question from how current the data is (timelag) or when money last moved
    // (mostRecentTransactionDate).
    lastPublished: latestMonth(stats.frequency_old?.updates_per_month),

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
      // groupId as well as the display name: the name is humanised from the id
      // and gets reworded, so anything keyed on an indicator — its description,
      // for one — needs the id that does not move.
      rows.set(key, {
        id: key,
        groupId: test.groupId ?? null,
        indicator: key,
        component: test.component,
        tests: [],
      })
    }
    rows.get(key).tests.push(test)
  }
  // Average only the tests that had something to assess. A check with a zero
  // denominator applies to none of this publisher's activities — adaptTests
  // gives it a null value — and counting it dragged the indicator down as if it
  // had scored zero: WFP's "Country or region" read 67% off 100%, 100% and a
  // check for regions, which it reports none of.
  return [...rows.values()].map(row => {
    const scored = row.tests.filter(t => t.denominator > 0)
    return {
      ...row,
      // null, not 0, when nothing applied: "not assessed" is not "failed".
      value: scored.length
        ? Math.round(scored.reduce((sum, t) => sum + t.value, 0) / scored.length)
        : null,
    }
  })
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

/**
 * Validator findings for one publisher, from stats.validation_summary_precalc.
 *
 * Replaces an 814KB cross-origin file from dashboard-coverage that was fetched
 * on every publisher page for these counts alone, together with the staleness,
 * unreadability and source-failure handling that reading a separately-built
 * file required. The API publishes the per-document counts now, in the same
 * payload as everything else, so all of that goes.
 *
 * `documents_with_*` answers "is this publisher OK?"; the bare severity counts
 * count instances and only say how bad — one publisher has 144 affected
 * documents and 292,726 instances.
 *
 * An empty object means nothing could be checked rather than nothing being
 * wrong: a publisher whose only file failed to download reports `{}`, not
 * zeros. That comes back null, so the page leaves the measures unstated instead
 * of showing a clean bill of health.
 */
function adaptValidationSummary(raw) {
  const documents = raw?.documents ?? null
  if (!documents) return null

  return {
    documents,
    documentsWithCritical: raw.documents_with_critical ?? 0,
    documentsWithError:    raw.documents_with_error ?? 0,
    critical: raw.critical ?? 0,
    error:    raw.error ?? 0,
    warning:  raw.warning ?? 0,
    advisory: raw.advisory ?? 0,
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
