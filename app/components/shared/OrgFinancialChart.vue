<script setup>
const props = defineProps({
  orgId: { type: String, required: true },
})

// Country Development Finance Data keys an organisation's page on the same
// organisation identifier the spending query uses — 44000 for the World Bank,
// XM-DAC-46002 for AfDB.
const cdfdUrl = computed(() =>
  `https://countrydata.iatistandard.org/data/reporting-organisation/${encodeURIComponent(props.orgId)}/`)

const C = {
  budget:   '#155366',   // teal-90
  spending: '#73adbf',   // teal-50
  grid:     '#ececec',
  axis:     '#8a8a8a',
  label:    '#686868',
}

const CDFD_BASE = 'https://data.countrydata.iatistandard.org/api'

const now = new Date().getFullYear()
// A seven-year window, three back and three forward. The empty-state message
// says "no RECENT budget or spending data" because of this: an organisation
// with older figures has published data, just none that falls in here.
const years = Array.from({ length: 7 }, (_, i) => String(now - 3 + i))

const { t } = useI18n({ useScope: 'global' })

const loading = ref(true)
const error = ref(null)
const chartData = ref(null)
// CDFD returns no cells at all for an organisation with nothing published, which
// otherwise renders as a full set of axes with nothing on them.
const hasData = ref(false)

async function load() {
  loading.value = true
  error.value = null

  const yearCut = years.map(y => `"${y}"`).join(';')
  const cut = `reporting_organisation.code:"${props.orgId}"|year:${yearCut}`
  const rollup = `transaction_type.code:[["budget"],["3","4"]]`

  const url = new URL(`${CDFD_BASE}/babbage/cubes/iatiline/aggregate/`)
  url.searchParams.set('drilldown', 'year.year')
  url.searchParams.set('aggregates', 'value_usd.sum')
  url.searchParams.set('cut', cut)
  url.searchParams.set('rollup', rollup)
  url.searchParams.set('order', 'year.year:asc')
  url.searchParams.set('pagesize', '1048576')
  url.searchParams.set('page', '1')

  try {
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()

    const cells = json.cells ?? []
    const byYear = Object.fromEntries(cells.map(c => [c['year.year'], c]))
    // Zero everywhere is as empty as no cells: both draw a blank chart.
    hasData.value = cells.some(c =>
      (c['value_usd.sum_budget'] || 0) !== 0 || (c['value_usd.sum_3-4'] || 0) !== 0,
    )

    chartData.value = {
      labels: years,
      datasets: [
        {
          label: t('orgChartBudgetShort'),
          data: years.map(y => (byYear[y]?.['value_usd.sum_budget'] ?? 0) / 1e9),
          backgroundColor: C.budget,
          borderRadius: { topLeft: 3, topRight: 3 },
          borderSkipped: false,
          maxBarThickness: 34,
          categoryPercentage: 0.7,
          barPercentage: 0.88,
        },
        {
          // Short in the legend, which has little room; the tooltip has space
          // to say what "spending" is made of.
          label: t('orgChartSpendingShort'),
          tooltipLabel: t('orgChartSpendingLong'),
          data: years.map(y => (byYear[y]?.['value_usd.sum_3-4'] ?? 0) / 1e9),
          backgroundColor: C.spending,
          borderRadius: { topLeft: 3, topRight: 3 },
          borderSkipped: false,
          maxBarThickness: 34,
          categoryPercentage: 0.7,
          barPercentage: 0.88,
        },
      ],
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// Values arrive in billions; show sub-billion figures in millions rather than
// as "$0.04bn", which reads as nothing.
function fmtBn(v) {
  if (!v) return '$0'
  return Math.abs(v) < 1 ? `$${Math.round(v * 1000)}m` : `$${v.toFixed(v < 10 ? 1 : 0)}bn`
}

const FONT = '"Nunito Sans", system-ui, sans-serif'

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  layout: { padding: { top: 8 } },
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        font: { size: 12, family: FONT },
        color: C.label, boxWidth: 10, boxHeight: 10, usePointStyle: true,
        pointStyle: 'rectRounded', padding: 18,
      },
    },
    tooltip: {
      backgroundColor: '#fff',
      titleColor: '#1c1c1c',
      bodyColor: '#3c3c3c',
      borderColor: C.grid,
      borderWidth: 1,
      padding: 10,
      displayColors: true,
      usePointStyle: true,
      titleFont: { family: FONT, weight: '700' },
      bodyFont: { family: FONT },
      // fmtUsd, not fmtBn: the tooltip is read against the "IATI spending"
      // figure in the page title, and the two disagreed — $16bn here against
      // $16.2bn there. Note fmtUsd below already takes BILLIONS, which is the
      // unit the datasets are in, so nothing is converted here. The axis keeps
      // fmtBn, where a decimal on every tick is noise rather than precision.
      callbacks: {
        label: ctx => ` ${ctx.dataset.tooltipLabel ?? ctx.dataset.label}: ${fmtUsd(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { color: C.grid },
      ticks: { font: { size: 12, weight: '600', family: FONT }, color: C.label },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: C.grid, drawTicks: false },
      ticks: {
        font: { size: 11, family: FONT }, color: C.axis, padding: 8,
        maxTicksLimit: 5, callback: fmtBn,
      },
    },
  },
}

// Values are held in billions for the chart; present them as currency here.
// Takes BILLIONS, not dollars — the datasets are divided by 1e9 before they
// reach the chart. Named the same as the page's own fmtUsd, which takes dollars.
const fmtUsd = v => {
  const n = v * 1e9
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}bn`
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}m`
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}k`
  return `$${Math.round(n)}`
}

/**
 * The chart's contents as rows, for the visually-hidden table below it.
 *
 * A canvas is opaque to a screen reader, and tooltips need a pointer, so the
 * figures are also published as a real table. The table is the accessible
 * equivalent; the aria-label on the canvas is only the summary.
 */
const chartRows = computed(() => {
  const d = chartData.value
  if (!d) return []
  return d.labels.map((year, i) => ({
    year,
    budget: d.datasets[0].data[i] ?? 0,
    spending: d.datasets[1].data[i] ?? 0,
  }))
})

const chartSummary = computed(() => {
  const rows = chartRows.value
  if (!rows.length) return t('orgChartNoData')
  const sum = key => rows.reduce((total, r) => total + r[key], 0)
  return t('orgChartAlt', {
    from: rows[0].year,
    to: rows[rows.length - 1].year,
    budget: fmtUsd(sum('budget')),
    spending: fmtUsd(sum('spending')),
  })
})

onMounted(load)
watch(() => props.orgId, load)
</script>

<template>
  <div>
    <p v-if="loading" class="org-chart__state">{{ t('orgChartLoading') }}</p>
    <p v-else-if="error" class="org-chart__state org-chart__state--error">
      {{ t('orgChartError', { error }) }}
    </p>
    <p v-else-if="!hasData" class="org-chart__state">{{ t('orgChartNoData') }}</p>
    <template v-else>
      <!-- role="img" with a name: the canvas is otherwise an unlabelled
           graphic, and its contents are unreachable to a screen reader. -->
      <div class="org-chart__canvas" role="img" :aria-label="chartSummary">
        <BarChart :data="chartData" :options="chartOptions" />
      </div>
      <!-- The wrapper carries visually-hidden, not the table: a table cannot be
           shrunk to 1px, because its used width is at least its min-content
           width, so the class left it 913px wide and absolutely positioned,
           which pushed the document's scroll width past the viewport and left
           a wide empty margin down the right of every narrow screen. A block
           wrapper does shrink, and its overflow:hidden clips the table inside
           it. The table keeps its own markup so it is still a table to a
           screen reader. -->
      <div class="visually-hidden">
        <table>
          <caption>{{ chartSummary }}</caption>
          <thead>
            <tr>
              <th scope="col">{{ t('orgChartYear') }}</th>
              <th scope="col">{{ t('orgChartBudget') }}</th>
              <th scope="col">{{ t('orgChartSpending') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in chartRows" :key="row.year">
              <th scope="row">{{ row.year }}</th>
              <td>{{ fmtUsd(row.budget) }}</td>
              <td>{{ fmtUsd(row.spending) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="org-chart__note">
        {{ t('orgChartNote') }}
        {{ t('orgChartSource') }}
        <!-- Straight to this organisation's own page, keyed by the same
             identifier the figures are queried with, rather than the site's
             front door. -->
        <a :href="cdfdUrl" target="_blank" rel="noopener">countrydata.iatistandard.org</a>.
      </p>
    </template>
  </div>
</template>

<style scoped>
.org-chart__state {
  padding: 32px 0;
  text-align: center;
  color: var(--grey-60);
  font-size: .9rem;
  margin: 0;
}
.org-chart__state--error { color: var(--red-50); text-align: left; padding: 20px 0 }
.org-chart__canvas { height: 260px; position: relative }
.org-chart__note { font-size: .8rem; color: var(--grey-60); margin: 10px 0 0 }
</style>
