<script setup>
import methodology from '~~/sample-data/methodology.json'

definePageMeta({ active: 'org' })
const { t, locale } = useI18n({ useScope: 'global' })
const route = useRoute()
const slug = route.params.slug

// Real data, keyed on the slug (the API's short_name).
//
// Deliberately not awaited: a top-level await makes this component suspend, and
// the password gate mounts the page behind a v-if — together those left the page
// rendering with no publisher data at all. The 404 is raised from a watcher.
const { data: publisher, error: publisherError } = usePublisher(slug, { stats: true })
watch(publisherError, err => { if (err) showError(err) }, { immediate: true })

// Everything on this page is fetched client-side, so there is a real window
// where the publisher is neither loaded nor failed. Without saying so the page
// renders empty headings and labels with nothing after them.
const loading = computed(() => !publisher.value && !publisherError.value)

// The Validator file lands after the stats, so the availability panel is held
// back until both are in rather than appearing with one bar and growing to
// three. Everything else on the page depends only on the stats.
const availabilityLoading = computed(() => loading.value || validationPending.value)

// A reporting organisation that has not published an activity file yet. Most of
// this page is derived from activities, so rather than leaving it to be inferred
// from empty panels, say so and point at the guidance.
const noActivities = computed(() => stats.value != null && !stats.value.activityCount)

/**
 * Published once, but not for a long time.
 *
 * Two years, not one: plenty of organisations publish annually, and flagging
 * them the month before their yearly update would be wrong. The threshold is
 * not finely balanced either way — across a 120-publisher sample the population
 * splits in two, 43% having published within the year and 42% not for over
 * three years, with little in between.
 */
const STALE_AFTER_MONTHS = 24

const monthsSincePublished = computed(() => {
  const last = stats.value?.lastPublished
  if (!last) return null
  const [y, m] = last.split('-').map(Number)
  const now = new Date()
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
})

// Only for publishers that did start: one with no activity file gets the other
// callout, and telling them to resume would be wrong.
// Activities published, but no transactions at all. Worth saying, because the
// time lag below is computed from transaction dates and so cannot mean anything
// for these publishers — all seven in a 120-publisher sample come back as
// "More than one year", which is the bottom of the scale rather than a finding.
const noTransactions = computed(() =>
  stats.value != null && stats.value.activityCount > 0 && !stats.value.transactionTotal,
)

const publishingStopped = computed(() =>
  !noActivities.value
  && monthsSincePublished.value !== null
  && monthsSincePublished.value > STALE_AFTER_MONTHS,
)

// Whole years, for the heading. Always at least 2, since that is the threshold.
const yearsSincePublished = computed(() =>
  monthsSincePublished.value === null ? null : Math.floor(monthsSincePublished.value / 12),
)

const lastPublishedLabel = computed(() => {
  const last = stats.value?.lastPublished
  if (!last) return null
  const [y, m] = last.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1))
    .toLocaleDateString(locale.value, { month: 'long', year: 'numeric', timeZone: 'UTC' })
})
const publishGuidanceUrl = computed(() =>
  `https://iatistandard.org/${locale.value}/guidance/publishing-data/how-to-publish-data/`,
)

// Only the Validator findings now: download failures arrive with the stats.
const { validation, pending: validationPending } = useAvailabilityData(slug)

// With the rest of the site out of reach, "Publishing Quality" has nowhere to
// go — a crumb that redirects straight back is worse than plain text.
const { full: fullSite } = usePreviewScope()
const { lookup: organisationTypeName } = useCodelist('OrganisationType')

const identity = computed(() => publisher.value?.identity ?? null)
const stats    = computed(() => publisher.value?.stats ?? null)
// Coverage and update frequency used to need their own fetches (a JSON dataset
// and a CSV of every publisher); the stats payload now carries both.
const coverage = computed(() => stats.value?.coverage ?? null)

const orgName = computed(() => identity.value?.name ?? '')
const orgType = computed(() => organisationTypeName(identity.value?.organisationType))

const mostRecentTransaction = computed(() => {
  const iso = stats.value?.mostRecentTransactionDate
  if (!iso) return null
  return new Date(iso).toLocaleDateString(locale.value, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
})

// Activity-level checks. BTable handles sorting; each group opens best-first.
const tests = computed(() => stats.value?.tests ?? [])
const testsSortBy = ref([{ key: 'value', order: 'desc' }])
const expandedIndicators = ref([])

const INDICATOR_FIELDS = computed(() => [
  // Not empty: an unnamed column header reads as blank when navigating a table
  { key: 'expand',    label: t('orgColExpand'),    thStyle: { width: '34px' } },
  { key: 'indicator', label: t('orgColIndicator'), sortable: true },
  { key: 'value',     label: t('orgColScore'),     sortable: true, thStyle: { width: '140px' } },
])

// One row per indicator (averaging its tests), grouped by the comprehensiveness
// component those indicators contribute to.
const CHECK_COMPONENT_ORDER = [
  'organisation_fields', 'basic_fields', 'financial_fields', 'advanced_fields',
]

// Display order of components within a dimension. The order the API happens to
// return them in is incidental, and the summary cards at the top of the page
// were listing timeliness before frequency while the panel below listed them the
// other way round. Components not named here keep the order they arrive in.
const COMPONENT_ORDER = {
  // Frequency first — how often files change — then how current the data is,
  // matching the timeliness panel.
  timeliness:        ['frequency', 'timeliness'],
  availability:      ['downloadable', 'no_critical_errors', 'no_errors'],
  coverage:          ['coverage', 'disaggregation'],
  comprehensiveness: CHECK_COMPONENT_ORDER,
}

function orderedComponents(dimensionId, components = {}) {
  const order = COMPONENT_ORDER[dimensionId] ?? []
  const rank = id => (order.indexOf(id) === -1 ? order.length : order.indexOf(id))
  return Object.entries(components).sort(([a], [b]) => rank(a) - rank(b))
}
// Organisation checks are the 1.x section of the same list now
const allChecks = computed(() => tests.value)
// NB: indicatorGroups is declared further down, after dimensionBands, since it
// reads component bands from it.

// Availability at a glance: how many datasets could not be fetched, and how many
// documents the Validator flagged. null means "cannot say" (stale or unassessed)
// rather than zero — the panel renders those as an em dash.
// The Validator keys its organisation pages on the same short name we use as
// the page slug, so the counts in this panel link straight through to the
// findings behind them.
const validatorUrl = computed(() => `https://validator.iatistandard.org/organisation/${slug}`)

const availabilityStats = computed(() => {
  const d = stats.value?.downloads
  const v = validation.value
  const rows = []

  // Every bar is a full-width split: green for the share that is fine, then the
  // problem share in red/amber. So a clean measure reads as a solid green bar and
  // a bad one as a solid coloured one, rather than an empty track either way.
  const measure = ({ key, label, affected, total, variant }) => ({
    key, label, variant, affected, total,
    ok: affected === 0,
    value: affected === 0 ? t('availNone') : t('availNFiles', { n: affected.toLocaleString() }),
    okPct:       total ? Math.round(((total - affected) / total) * 100) : null,
    affectedPct: total ? Math.round((affected / total) * 100) : null,
    note: total ? t('availOfChecked', { n: total.toLocaleString() }) : null,
  })

  // Download failures now come from the stats payload, which breaks them down
  // per file: its counts sum to the publisher's whole file set, so numerator and
  // denominator come from the same place. That avoids the mismatch the registry's
  // dataset_count used to give (UNFPA: 124 registered against 130 failures).
  if (d?.files) {
    rows.push(measure({
      key: 'failed', label: t('availDownloadErrors'),
      affected: d.failed, total: d.files, variant: 'bad',
    }))
  }
  if (v?.documentsAssessed) {
    rows.push(measure({ key: 'critical', label: t('availCritical'),
      affected: v.documentsWithCritical, total: v.documentsAssessed, variant: 'bad' }))
    rows.push(measure({ key: 'errors', label: t('availErrors'),
      affected: v.documentsWithError, total: v.documentsAssessed, variant: 'bad' }))
  }
  return rows
})

// Timeliness: how often files are updated, and how current the data in them is.
// The two month series measure different things — updates vs transactions
// reported — so both are shown rather than treating one as a proxy.
const timelinessPanel = computed(() => {
  if (!stats.value) return null
  const freq = stats.value.frequency

  const updates = Object.entries(freq?.updatesByMonth ?? {}).sort(([a], [b]) => a.localeCompare(b))
  const txns    = Object.entries(stats.value.transactionsByMonth ?? {}).sort(([a], [b]) => a.localeCompare(b))
  const peak    = Math.max(1, ...txns.map(([, n]) => n))

  return {
    frequency: freq?.value ? t(labelKey('value', freq.value)) : freq?.label ?? null,
    // IATI-Stats derives timelag purely from transaction_months_with_year, so
    // with no transactions it falls through to the worst band. Withhold it
    // rather than report the bottom of a scale nothing was measured against.
    timeLag: stats.value.transactionTotal
      ? (stats.value.timelagValue
          ? t(labelKey('value', stats.value.timelagValue))
          : stats.value.timelag)
      : null,
    timeLagMeasurable: Boolean(stats.value.transactionTotal),
    updates:      updates.map(([month, n]) => ({ month, active: n > 0, count: n })),
    monthsActive: updates.filter(([, n]) => n > 0).length,
    txns:         txns.map(([month, n]) => ({ month, count: n, pct: Math.round((n / peak) * 100) })),
    monthsWithData: txns.filter(([, n]) => n > 0).length,
  }
})

// Shape of the published dataset, for the panel beside the spending chart.
function fmtBytes(n) {
  if (!n) return null
  const units = [[1e9, 'GB'], [1e6, 'MB'], [1e3, 'KB']]
  for (const [size, suffix] of units) {
    if (n >= size) return `${(n / size).toFixed(n / size >= 10 ? 0 : 1)} ${suffix}`
  }
  return `${n} B`
}

const datasetFacts = computed(() => {
  const st = stats.value
  if (!st) return []
  const levels = st.hierarchyLevels ?? []
  const rows = []

  const add = (label, value) => { if (value) rows.push({ label, value }) }
  add(t('orgDsActivities'),   st.activityCount?.toLocaleString())
  add(t('orgDsTransactions'), st.transactionTotal?.toLocaleString())
  add(t('orgDsFiles'),        st.datasetCount?.toLocaleString())
  add(t('orgDsHierarchy'),    levels.length
    ? (levels.length === 1 ? t('orgDsOneLevel') : t('orgDsLevels', { n: levels.length }))
    : null)
  add(t('orgDsDateRange'), st.earliestDate && st.latestDate
    ? `${st.earliestDate.slice(0, 4)} – ${st.latestDate.slice(0, 4)}`
    : null)
  add(t('orgDsVersion'), st.versions?.join(', '))
  add(t('orgDsSize'),    fmtBytes(st.fileSizeBytes))
  return rows
})

// Compact USD, e.g. 37461372036 -> "$37.5bn"
function fmtUsd(value) {
  if (value == null) return '—'
  const units = [[1e12, 'tn'], [1e9, 'bn'], [1e6, 'm'], [1e3, 'k']]
  for (const [size, suffix] of units) {
    if (Math.abs(value) >= size) return `$${(value / size).toFixed(1)}${suffix}`
  }
  return `$${Math.round(value)}`
}

const coverageDetails = ref(false)

const referencePeriodEndLabel = computed(() => {
  const d = coverage.value?.referencePeriodEnd
  if (!d) return null
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
    .toLocaleDateString(locale.value, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
})

const coverageGenerated = computed(() => {
  const iso = coverage.value?.generatedAt
  if (!iso) return null
  return new Date(iso).toLocaleDateString(locale.value, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
})

// A check with nothing to assess says what it found none of. Organisation
// checks are counted against organisation records, every other component
// against activities — confirmed by their denominators (USAID: 2 organisations
// against 56,577 activities).
const notApplicableLabel = component =>
  t(component === 'organisation_fields' ? 'orgTestNoOrganisations' : 'orgTestNoActivities')

function testVariant(pct) {
  if (pct >= 80) return 'success'
  if (pct >= 40) return 'warning'
  return 'danger'
}

const overall           = computed(() => assessed.value.overall ?? null)
const publisherID       = computed(() => identity.value?.iatiIdentifier ?? '')

// Headline spending figure. Declared after publisherID because it keys off it.
// This is deliberately not coverage.iatiSpendingUsd: that figure is pinned to
// whichever year the comparison dataset covers (2024 for USAID), because its job
// is to be the numerator of the coverage ratio. The headline wants the most
// recent complete year instead, so it comes straight from CDFD.
const { spending } = useCdfdSpending(publisherID)


// Dimensions are keyed by id in the API; display order is a presentation concern
const DIMENSION_ORDER = ['availability', 'timeliness', 'coverage', 'comprehensiveness']

// Dimensions with a panel further down the page, which the summary cards link to.
const PANEL_DIMENSIONS = new Set(DIMENSION_ORDER)

// API ids are snake_case; i18n keys are the same id camel-cased behind a prefix,
// e.g. ('sub', 'passes_validation') -> 'subPassesValidation'
const labelKey = (prefix, id) =>
  prefix + id.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase())

// Counts whose number means nothing on its own. Disaggregation is quarters per
// year, so "1.6" alone reads as a score out of something unstated.
const COMPONENT_UNIT = { disaggregation: 'unitQuarters' }

function displayValue(id, value) {
  if (typeof value === 'boolean') return value ? '✓' : '✗'
  if (typeof value === 'string')  return t(labelKey('value', value))
  if (COMPONENT_UNIT[id])         return t(COMPONENT_UNIT[id], value)
  return methodology.components[id]?.unit === 'percent' ? `${value}%` : String(value)
}

// Star position -> the band you reach by clearing it
const STAR_BANDS = ['good', 'very_good', 'excellent']

// Hover text for each of a component's three stars, from the methodology thresholds.
// A band with no threshold is not required to earn that star.
function starTooltips(id) {
  const meta = methodology.components[id]
  return STAR_BANDS.map(band => {
    const threshold = meta?.thresholds?.[band]
    if (threshold === undefined) return t('starNotRequired')
    if (meta.unit === 'percent') return t('starRequiresPercent', { value: threshold })
    if (meta.unit === 'count')   return t('starRequiresCount',   { value: threshold })
    if (meta.unit === 'boolean') return t('starRequiresPass')
    return t('starRequiresValue', { value: t(labelKey('value', threshold)) })
  })
}

// The assessment comes scored from the API. Only timeliness is still adjusted
// here — see toAssessmentFragment. The download and validation files are still
// fetched, but now only for the availability panel's file counts, which the
// assessment does not carry.
const assessed = computed(() => {
  const fragment = toAssessmentFragment({ publisher: publisher.value }, methodology)
  return {
    overall: fragment?.overall?.category ? fragment.overall : null,
    ...(fragment?.dimensions ?? {}),
  }
})

const bandFor = id => dimensionBands.value?.[id]?.category ?? null

// A dimension that earns no stars gets a tinted card, so it is visible while
// scrolling rather than only on reading the stars.
const NO_STAR_BANDS = new Set(['needs_improvement'])
const cardTone = id => (NO_STAR_BANDS.has(bandFor(id)) ? 'iati-card--flag' : null)

// The methodology sets thresholds per component, not per dimension, so a
// dimension's stars name the band each one represents instead of a requirement.
const dimensionStarTooltips = () =>
  STAR_BANDS.map(band => t(labelKey('category', band)))

const componentBandFor = (dimensionId, componentId) =>
  dimensionBands.value?.[dimensionId]?.components?.[componentId]?.category ?? null

const componentValueFor = (dimensionId, componentId) =>
  dimensionBands.value?.[dimensionId]?.components?.[componentId]?.value ?? null

const dimensionBands = computed(() =>
  Object.fromEntries(Object.entries(assessed.value).filter(([k]) => k !== 'overall')),
)

// One row per indicator (averaging its tests), grouped by the comprehensiveness
// component those indicators contribute to. Declared here rather than beside the
// other check helpers because it reads component bands from dimensionBands.
const indicatorGroups = computed(() => {
  const rows = groupTestsByIndicator(allChecks.value)
  return CHECK_COMPONENT_ORDER
    // A component with neither a score nor any checks was not assessed; an
    // empty panel saying "No tests available" is noise, not information.
    .filter(id => componentBandFor('comprehensiveness', id) || rows.some(r => r.component === id))
    .map(id => ({
    key: id,
    label: t(labelKey('sub', id)),
    category: componentBandFor('comprehensiveness', id),
    // The score behind the stars. Taken from the assessment, not averaged from
    // the table below: the API scores the component from
    // comprehensiveness_new_by_component, which is not the mean of these rows.
    value: componentValueFor('comprehensiveness', id),
    items: rows.filter(row => row.component === id),
  }))
})

const dimensions = computed(() =>
  DIMENSION_ORDER.filter(id => dimensionBands.value[id]).map(id => {
    const dim = dimensionBands.value[id]
    return {
      key:      id,
      label:    t(labelKey('dim', id)),
      category: dim.category,
      // Only link to a dimension that actually rendered a panel below.
      href:     PANEL_DIMENSIONS.has(id) ? `#dimension-${id}` : null,
      metrics:  orderedComponents(id, dim.components).map(([cid, c]) => ({
        label:    t(labelKey('sub', cid)),
        display:  displayValue(cid, c.value),
        category: c.category,
        tooltips: starTooltips(cid),
      })),
    }
  })
)
</script>

<template>
  <div>
    <Crumbs :path="[
      { label: t('breadPublishingQuality'), href: fullSite ? '/' : null },
      { label: t('navOrganisations'), href: '/organisations' },
      { label: orgName },
    ]" />
    <TitleBar :eyebrow="t('orgEyebrow')" :title="orgName">
      <template #meta>
        <Skeleton v-if="loading" width="18rem" height="1.1rem" />
        <span v-if="publisherID"><strong>{{ t('orgReportingID') }}</strong> {{ publisherID }}</span>
        <span v-if="orgType"><strong>{{ t('orgType') }}</strong> {{ orgType }}</span>
        <span v-if="mostRecentTransaction">
          <strong>{{ t('orgMostRecentTransaction') }}</strong> {{ mostRecentTransaction }}
        </span>
        <span v-if="spending">
          <strong>{{ t('orgIatiSpendYear', { year: spending.year }) }}</strong>
          {{ fmtUsd(spending.usd) }}
        </span>
      </template>
    </TitleBar>

    <main class="main" :aria-busy="loading">
      <OrganisationCallout
        v-if="noActivities" class="mb"
        heading-level="h2" variant="info" icon="i"
        :title="t('orgNoActivitiesTitle')"
      >
        <p>{{ t('orgNoActivitiesText', { name: orgName }) }}</p>
        <p class="mt-sm">
          <a :href="publishGuidanceUrl" target="_blank" rel="noopener">
            {{ t('orgNoActivitiesLink') }}
          </a>
        </p>
      </OrganisationCallout>

      <OrganisationCallout
        v-if="noTransactions" class="mb"
        heading-level="h2" variant="info" icon="i"
        :title="t('orgNoTxnTitle')"
      >
        <p>{{ t('orgNoTxnText', { name: orgName, n: stats.activityCount.toLocaleString() }) }}</p>
        <p class="mt-sm">
          <a :href="publishGuidanceUrl" target="_blank" rel="noopener">
            {{ t('orgStoppedLink') }}
          </a>
        </p>
      </OrganisationCallout>

      <OrganisationCallout
        v-if="publishingStopped" class="mb"
        heading-level="h2" variant="info" icon="i"
        :title="t('orgStoppedTitle', yearsSincePublished)"
      >
        <p>{{ t('orgStoppedText', { name: orgName, date: lastPublishedLabel }) }}</p>
        <p class="mt-sm">
          <a :href="publishGuidanceUrl" target="_blank" rel="noopener">
            {{ t('orgStoppedLink') }}
          </a>
        </p>
      </OrganisationCallout>

      <!-- Hero — score + alerts -->
      <BRow gutter-x="4" class="mb-sm">
        <BCol cols="12" md="12"><Card :kicker="t('orgOverallQuality')">
          <div v-if="loading" class="hero-metrics">
            <div class="hero-metrics__overall">
              <Skeleton width="150px" height="150px" />
            </div>
            <div class="hero-metrics__cards">
              <Card v-for="n in 4" :key="n" flat class="dimension-card">
                <Skeleton width="60%" height="1.4rem" />
                <Skeleton width="100%" height="3.2rem" class="mt-sm" />
              </Card>
            </div>
          </div>
          <div v-else class="hero-metrics">
            <div class="hero-metrics__overall">
              <div v-if="overall" class="hero-metrics__badge">
                <Stars :category="overall.category" size="xl" />
                <p class="hero-metrics__category">{{ t(labelKey('category', overall.category)) }}</p>
              </div>
            </div>
            <div class="hero-metrics__cards">
              <DimensionCard
                v-for="dim in dimensions" :key="dim.key"
                :label="dim.label"
                :category="dim.category"
                :metrics="dim.metrics"
                :href="dim.href"
              />
            </div>
          </div>
          </Card>
        </BCol>
      </BRow>

      <BRow gutter-x="3" gutter-y="3" class="mt">
        <BCol cols="12" lg="8">
          <Card :kicker="t('orgSummaryTitle')">
            <OrgFinancialChart v-if="publisherID" :org-id="publisherID" />
          </Card>
        </BCol>
        <BCol v-if="loading" cols="12" lg="4">
          <Card :kicker="t('orgDatasetTitle')">
            <Skeleton v-for="n in 6" :key="n" height="1.1rem" class="mt-sm" />
          </Card>
        </BCol>
        <BCol v-else-if="datasetFacts.length" cols="12" lg="4">
          <Card :kicker="t('orgDatasetTitle')">
            <dl class="dataset-facts">
              <template v-for="fact in datasetFacts" :key="fact.label">
                <dt>{{ fact.label }}</dt>
                <dd>{{ fact.value }}</dd>
              </template>
            </dl>
          </Card>
        </BCol>
      </BRow>

      <!-- Prioritised issues -->
      <!-- Prioritised issues — hidden while it is still placeholder data -->
      <Card v-if="false" class="mt" :kicker="t('orgIssuesTitle')">
        <div class="iati-table">
        <table>
          <thead>
            <tr>
              <th style="width: 50px">#</th>
              <th>{{ t('orgColIssue') }}</th>
              <th>{{ t('orgColWhy') }}</th>
              <th style="width: 140px">{{ t('orgColCurrent') }}</th>
              <th style="width: 130px">{{ t('orgColTrend') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="num">1</td>
              <td class="org">{{ t('orgIssue1n') }}<small>{{ t('orgIssue1s') }}</small></td>
              <td>{{ t('orgIssue1w') }}</td>
              <td><Bar :pct="6" variant="bad" /></td>
              <td><span class="heat heat-1">−2</span></td>
            </tr>
            <tr>
              <td class="num">2</td>
              <td class="org">{{ t('orgIssue2n') }}<small>{{ t('orgIssue2s') }}</small></td>
              <td>{{ t('orgIssue2w') }}</td>
              <td><Bar :pct="12" variant="bad" /></td>
              <td><span class="heat heat-1">−4</span></td>
            </tr>
            <tr>
              <td class="num">3</td>
              <td class="org">{{ t('orgIssue3n') }}<small>{{ t('orgIssue3s') }}</small></td>
              <td>{{ t('orgIssue3w') }}</td>
              <td><Bar :pct="22" variant="bad" /></td>
              <td><span class="heat heat-3">±0</span></td>
            </tr>
            <tr>
              <td class="num">4</td>
              <td class="org">{{ t('orgIssue4n') }}<small>{{ t('orgIssue4s') }}</small></td>
              <td>{{ t('orgIssue4w') }}</td>
              <td><Bar :pct="0" variant="bad" /></td>
              <td><span class="heat heat-0">N/A</span></td>
            </tr>
            <tr>
              <td class="num">5</td>
              <td class="org">{{ t('orgIssue5n') }}</td>
              <td>{{ t('orgIssue5w') }}</td>
              <td><Bar :pct="48" variant="warn" /></td>
              <td><span class="heat heat-4">+3</span></td>
            </tr>
          </tbody>
        </table>
        </div>
      </Card>

      <!-- Coverage vs reference -->
      <!-- Availability — headline counts only; the detail lives in the source files -->
      <!-- While the stats payload is in flight, stand the four panels up with
           their real headings so the page does not reflow as each arrives. -->
      <template v-if="availabilityLoading && !loading">
        <Card class="mt" :kicker="t('dimAvailability')">
          <Skeleton height="1rem" class="mt-sm" />
          <Skeleton width="80%" height="1rem" class="mt-sm" />
          <Skeleton height="2.4rem" class="mt-sm" />
        </Card>
      </template>
      <template v-if="loading">
        <Card v-for="dim in DIMENSION_ORDER" :key="dim" class="mt" :kicker="t(labelKey('dim', dim))">
          <Skeleton height="1rem" class="mt-sm" />
          <Skeleton width="80%" height="1rem" class="mt-sm" />
          <Skeleton height="2.4rem" class="mt-sm" />
        </Card>
      </template>

      <Card v-if="availabilityStats.length && !availabilityLoading" :class="['mt', cardTone('availability')]" :kicker="t('dimAvailability')" :id="`dimension-availability`" tabindex="-1">
        <template v-if="bandFor('availability')" #kicker-actions>
          <DimensionBand :category="bandFor('availability')" :tooltips="dimensionStarTooltips()" />
        </template>
        <div class="measure-grid measure-grid--3 mt-sm">
          <div v-for="stat in availabilityStats" :key="stat.key" class="measure">
            <div class="measure__head">
              <span class="measure__label">{{ stat.label }}</span>
              <span class="measure__value" :class="stat.ok ? 'is-ok' : `is-${stat.variant}`">
                {{ stat.value }}
              </span>
            </div>
            <div v-if="stat.okPct !== null" class="avail-bar">
              <!-- BTooltip renders its target unwrapped, so the flex sizing has to go
                   on the target itself — on the BTooltip it lands on the popover. -->
              <BTooltip
                v-if="stat.okPct > 0"
                :title="t('availTipOk', { n: (stat.total - stat.affected).toLocaleString(), total: stat.total.toLocaleString() })"
                placement="top" noninteractive
              >
                <template #target>
                  <BProgress
                    :max="100" height="1rem" class="avail-bar__seg"
                    :style="{ flex: `${stat.okPct} 0 0%` }"
                    :aria-label="t('availTipOk', {
                      n: (stat.total - stat.affected).toLocaleString(),
                      total: stat.total.toLocaleString(),
                    })"
                  >
                    <BProgressBar :value="100" variant="success" />
                  </BProgress>
                </template>
              </BTooltip>
              <BTooltip
                v-if="stat.affectedPct > 0"
                :title="t('availTipAffected', { n: stat.affected.toLocaleString(), total: stat.total.toLocaleString() })"
                placement="top" noninteractive
              >
                <template #target>
                  <BProgress
                    :max="100" height="1rem" class="avail-bar__seg"
                    :style="{ flex: `${stat.affectedPct} 0 0%` }"
                    :aria-label="t('availTipAffected', {
                      n: stat.affected.toLocaleString(),
                      total: stat.total.toLocaleString(),
                    })"
                  >
                    <BProgressBar :value="100" :variant="stat.variant === 'warn' ? 'warning' : 'danger'" />
                  </BProgress>
                </template>
              </BTooltip>
            </div>
            <p v-if="stat.note" class="measure__note">{{ stat.note }}</p>
          </div>
        </div>

        <p class="coverage-note mt-sm">
          <a :href="validatorUrl" target="_blank" rel="noopener">{{ t('availValidatorLink') }}</a>
        </p>
      </Card>

      <!-- Timeliness — update cadence and how current the data is -->
      <Card v-if="timelinessPanel" :class="['mt', cardTone('timeliness')]" :kicker="t('dimTimeliness')" :id="`dimension-timeliness`" tabindex="-1">
        <template v-if="bandFor('timeliness')" #kicker-actions>
          <DimensionBand :category="bandFor('timeliness')" :tooltips="dimensionStarTooltips()" />
        </template>

        <div class="measure-grid mt-sm">
          <!-- Each measure sits with the evidence behind it: frequency is how
               often files change, time lag is how current the data in them is. -->
          <!-- Gated on the verdict, not on the month strip below it: a
               publisher with no updates in the last twelve months still has a
               frequency, and hiding the measure left an empty panel. -->
          <div v-if="timelinessPanel.frequency" class="measure">
            <div class="measure__head">
              <span class="measure__label">{{ t('orgTlFrequency') }}</span>
              <span class="measure__value">{{ timelinessPanel.frequency }}</span>
            </div>
            <div v-if="timelinessPanel.updates.length" class="month-strip__cells">
              <BTooltip
                v-for="m in timelinessPanel.updates" :key="m.month"
                :title="`${m.month} — ${t('orgTlUpdatesCount', { n: m.count })}`"
                placement="top" noninteractive
              >
                <template #target>
                  <span class="month-strip__cell" :class="{ 'is-active': m.active }" />
                </template>
              </BTooltip>
            </div>
            <p v-if="timelinessPanel.updates.length" class="measure__note">
              {{ t('orgTlUpdates') }} · {{ t('orgTlOfMonths', { n: timelinessPanel.monthsActive }) }}
            </p>
            <p v-else class="measure__note">{{ t('orgTlNoUpdates') }}</p>
          </div>

          <div v-if="timelinessPanel.timeLag || !timelinessPanel.timeLagMeasurable" class="measure">
            <div class="measure__head">
              <span class="measure__label">{{ t('orgTlTimeLag') }}</span>
              <span v-if="timelinessPanel.timeLag" class="measure__value">{{ timelinessPanel.timeLag }}</span>
              <span v-else class="measure__value measure__value--muted">{{ t('orgTlNotMeasurable') }}</span>
            </div>
            <div v-if="timelinessPanel.txns.length" class="month-strip__bars">
              <BTooltip
                v-for="m in timelinessPanel.txns" :key="m.month"
                :title="`${m.month} — ${t('orgTlTxnsCount', { n: m.count.toLocaleString() })}`"
                placement="top" noninteractive
              >
                <template #target>
                  <span class="month-strip__bar" :style="{ height: Math.max(3, m.pct) + '%' }" />
                </template>
              </BTooltip>
            </div>
            <p v-if="timelinessPanel.txns.length" class="measure__note">
              {{ t('orgTlTransactions') }} · {{ t('orgTlOfMonths', { n: timelinessPanel.monthsWithData }) }}
            </p>
            <p v-else class="measure__note">{{ t('orgTlNoTransactions') }}</p>
          </div>
        </div>

        <p v-if="mostRecentTransaction" class="coverage-note">
          {{ t('orgMostRecentTransaction') }}: {{ mostRecentTransaction }}
        </p>

      </Card>

      <!-- Coverage vs reference — real figures from the dashboard-coverage dataset -->
      <Card
        v-if="coverage && (coverage.hasReference || coverage.quartersByYear)"
        :class="['mt', cardTone('coverage')]" :kicker="t('dimCoverage')"
        :id="`dimension-coverage`" tabindex="-1"
      >
        <template v-if="bandFor('coverage')" #kicker-actions>
          <DimensionBand :category="bandFor('coverage')" :tooltips="dimensionStarTooltips()" />
        </template>
        <div class="measure-grid mt-sm">
          <!-- Coverage: IATI spending against the reference total.
               94 of the 381 publishers with a reference source have no
               reference figure at all — 80 of them Dutch publishers that carry
               nl_charities as a source but are not in the CBF register. There
               is nothing to compare against, which is not the same as scoring
               zero, so the measure says so rather than showing a bar. -->
          <div v-if="!coverage.hasReference" class="measure">
            <div class="measure__head">
              <span class="measure__label">{{ t('subCoverage') }}</span>
            </div>
            <p class="measure__note">{{ t('orgCovNoReference') }}</p>
            <p class="measure__note mt-sm">{{ t('orgCovNoReferenceDetail') }}</p>
            <p class="measure__note mt-sm">
              <a href="https://iati.github.io/dashboard-coverage/methodology.html" target="_blank" rel="noopener">
                {{ t('orgCovMethodology') }}
              </a>
            </p>
          </div>
          <div v-else class="measure">
            <div class="measure__head">
              <span class="measure__label">{{ t('subCoverage') }}</span>
              <span class="measure__value">{{ coverage.coveragePercent }}%</span>
            </div>
            <Bar
              :pct="coverage.coveragePercent" variant="good" label="" height="1rem"
              :aria-label="t('ariaCoverageBar', { pct: coverage.coveragePercent })"
            />
            <p class="measure__note measure__note--split">
              <span>
                {{ t('orgCovOfReference', {
                  spend: fmtUsd(coverage.iatiSpendingUsd),
                  reference: fmtUsd(coverage.referenceValueUsd),
                }) }}
                <!-- The year the reference figure is for. 131 of 381 publishers
                     have none — every nl_charities one, plus a few UK/US
                     charities — so it is omitted rather than shown empty. -->
                <template v-if="coverage.referenceYear">· {{ coverage.referenceYear }}</template>
              </span>
              <button type="button" class="link-button" @click="coverageDetails = true">
                {{ t('orgCovMoreDetails') }}
              </button>
            </p>
            <!-- Where several organisations sit under one reference figure, each
                 is divided by the whole of it. UN (Secretariat) reads 0.013%
                 across four publishers, which reads as a fault unless this is
                 said next to the number rather than inside the modal. -->
            <p v-if="coverage.publishersSharingReference > 1" class="measure__note">
              {{ t('orgCovShared', { n: coverage.publishersSharingReference }) }}
            </p>
          </div>

          <!-- Disaggregation: quarters actually reported in, by year -->
          <div v-if="coverage.quartersByYear" class="measure">
            <div class="measure__head">
              <span class="measure__label">{{ t('subDisaggregation') }}</span>
              <span class="measure__value">
                {{ t('orgCovQuartersValue', { n: coverage.quartersPerYear }) }}
              </span>
            </div>
            <div class="quarter-grid">
              <div v-for="(n, year) in coverage.quartersByYear" :key="year" class="quarter-grid__year">
                <span class="quarter-grid__cells">
                  <BTooltip
                    v-for="q in 4" :key="q"
                    :title="q <= n
                      ? t('covQuarterReported', { quarter: `Q${q}`, year })
                      : t('covQuarterNone', { quarter: `Q${q}`, year })"
                    placement="top" noninteractive
                  >
                    <template #target>
                      <span class="quarter-grid__cell" :class="{ 'is-active': q <= n }" />
                    </template>
                  </BTooltip>
                </span>
                <span class="quarter-grid__label">{{ year }}</span>
              </div>
            </div>
            <p class="measure__note">
              {{ t('orgCovQuartersNote', {
                n: coverage.totalQuarters,
                total: (coverage.yearsReporting || 0) * 4,
                years: t('orgCovYearsCount', coverage.yearsReporting || 0),
              }) }}
            </p>
          </div>
        </div>


        <!-- BModal teleports to <body>, outside .iati-design-system--enabled, so
             neither the design system's styles nor our overrides reach it. Put
             the wrapper class on the modal itself rather than restyling it. -->
        <BModal
          v-model="coverageDetails"
          :title="t('orgCovDetailsTitle')"
          modal-class="iati-design-system--enabled"
        >
          <template #footer>
            <button type="button" class="iati-button" @click="coverageDetails = false">
              {{ t('orgCovClose') }}
            </button>
          </template>
          <dl class="coverage-meta">
            <div class="coverage-meta__entity">
              <dt>{{ t('orgCovEntity') }}</dt>
              <dd>{{ coverage.referenceEntity }}</dd>
            </div>
            <div class="coverage-meta__row">
              <div>
                <dt>{{ t('orgCovSource') }}</dt>
                <dd>{{ t(labelKey('coverageSource', coverage.referenceSource)) }}</dd>
              </div>
              <!-- The charity registers report each organisation's own
                   accounting period rather than a calendar year, so name the
                   period end when there is one. -->
              <div v-if="coverage.referencePeriodEnd">
                <dt>{{ t('orgCovPeriodEnd') }}</dt>
                <dd>{{ referencePeriodEndLabel }}</dd>
              </div>
              <div v-else-if="coverage.referenceYear">
                <dt>{{ t('orgCovYear') }}</dt>
                <dd>{{ coverage.referenceYear }}</dd>
              </div>
              <div>
                <dt>{{ t('orgCovCurrency') }}</dt>
                <dd>{{ coverage.referenceCurrency }}</dd>
              </div>
              <div v-if="coverage.coverageBasis">
                <dt>{{ t('orgCovBasis') }}</dt>
                <dd>{{ t(labelKey('coverageBasis', coverage.coverageBasis)) }}</dd>
              </div>
            </div>
            <div class="coverage-meta__row">
              <div>
                <dt>{{ t('orgCovIatiLabel') }}</dt>
                <dd>{{ fmtUsd(coverage.iatiSpendingUsd) }}</dd>
              </div>
              <div>
                <dt>{{ t('orgCovRefLabel') }}</dt>
                <dd>{{ fmtUsd(coverage.referenceValueUsd) }}</dd>
              </div>
            </div>
          </dl>

          <p v-if="coverage.publishersSharingReference > 1" class="coverage-note mt-sm">
            {{ t('orgCovShared', { n: coverage.publishersSharingReference }) }}
          </p>
          <p v-if="coverageGenerated" class="coverage-note">
            {{ t('orgCovGenerated', { date: coverageGenerated }) }}
          </p>
          <!-- What this modal cannot cover: which period each source compares,
               gross vs net, the EU handling, and why a zero with no reference is
               not a measured zero. Complements methodology.json, which describes
               the scoring thresholds rather than how the number is derived. -->
          <p class="coverage-note">
            <a href="https://iati.github.io/dashboard-coverage/methodology.html" target="_blank" rel="noopener">
              {{ t('orgCovMethodology') }}
            </a>
          </p>
        </BModal>

      </Card>
      <!-- Activity checks, straight from stats.gherkin_tests_current -->
      <Card v-if="tests.length" :class="['mt', cardTone('comprehensiveness')]" :kicker="t('dimComprehensiveness')" :id="`dimension-comprehensiveness`" tabindex="-1">
        <template v-if="bandFor('comprehensiveness')" #kicker-actions>
          <DimensionBand :category="bandFor('comprehensiveness')" :tooltips="dimensionStarTooltips()" />
        </template>
        <div class="comprehensiveness-grid mt-sm">
        <div v-for="group in indicatorGroups" :key="group.key" class="comprehensiveness-grid__panel">
          <div class="indicator-group-heading">
            <span>{{ group.label }}</span>
            <span v-if="group.category" class="indicator-group-heading__score">
              <span v-if="group.value !== null" class="indicator-group-heading__pct">{{ group.value }}%</span>
              <span class="indicator-group-heading__band">{{ t(labelKey('category', group.category)) }}</span>
              <Stars
                :category="group.category" size="md"
                :tooltips="starTooltips(group.key)"
              />
            </span>
          </div>
          <p v-if="!group.items.length" class="coverage-note">{{ t('orgNoTests') }}</p>
          <div v-else class="iati-table iati-table--compact">
            <BTable
              small
              :items="group.items"
              :fields="INDICATOR_FIELDS"
              v-model:sort-by="testsSortBy"
              v-model:expanded-items="expandedIndicators"
              primary-key="id"
            >
              <!-- Named for a screen reader, but the word itself would wrap
                   badly in a 34px column, so it is visually hidden. -->
              <template #head(expand)="{ label }">
                <span class="visually-hidden">{{ label }}</span>
              </template>
              <template #cell(expand)="{ toggleExpansion, expansionShowing }">
                <button
                  type="button" class="expander"
                  :aria-expanded="expansionShowing"
                  :aria-label="t('orgShowTests')"
                  @click="toggleExpansion()"
                >{{ expansionShowing ? '▾' : '▸' }}</button>
              </template>
              <template #cell(indicator)="{ item }">
                <span class="org">{{ item.indicator }}</span>
              </template>
              <template #cell(value)="{ item }">
                <div v-if="item.value === null" class="check-score">
                  <span class="check-score__na">{{ notApplicableLabel(item.component) }}</span>
                </div>
                <div v-else class="check-score">
                  <BProgress
                    class="check-score__bar" :max="100" height=".9rem"
                    :aria-label="t('ariaIndicatorBar', { name: item.indicator, pct: item.value })"
                  >
                    <BProgressBar :value="item.value" :variant="testVariant(item.value)" />
                  </BProgress>
                  <span class="check-score__pct">{{ item.value }}%</span>
                </div>
              </template>
              <template #row-expansion="{ item }">
                <ul class="test-list">
                  <li v-for="test in item.tests" :key="test.id" class="test-list__item">
                    <span class="test-list__name">{{ test.name }}</span>
                    <!-- Each check has its own denominator: `None` excludes the
                         activities it does not apply to, so this is not the
                         publisher's activity count and varies check to check. -->
                    <span
                      v-if="test.denominator"
                      class="test-list__count"
                      :title="test.notApplicable
                        ? t('orgTestExcluded', { n: test.notApplicable.toLocaleString() })
                        : undefined"
                    >
                      {{ t('orgTestCount', {
                        n: test.numerator.toLocaleString(),
                        total: test.denominator.toLocaleString(),
                      }) }}
                    </span>
                    <div class="test-list__score">
                      <!-- Nothing this check applies to: "0 of 0" and a bare "%"
                           read as a failure rather than as not assessed. -->
                      <div v-if="!test.denominator" class="check-score">
                        <span class="check-score__na">{{ notApplicableLabel(test.component) }}</span>
                      </div>
                      <div v-else class="check-score">
                        <BProgress
                          class="check-score__bar" :max="100" height=".7rem"
                          :aria-label="t('ariaIndicatorBar', { name: test.name, pct: test.value })"
                        >
                          <BProgressBar :value="test.value" :variant="testVariant(test.value)" />
                        </BProgress>
                        <span class="check-score__pct">{{ test.value }}%</span>
                      </div>
                    </div>
                  </li>
                </ul>
              </template>
            </BTable>
          </div>
        </div>
        </div>
      </Card>

    </main>
  </div>
</template>
