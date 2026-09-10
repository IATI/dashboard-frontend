<script setup>
const props = defineProps({
  orgId: { type: String, required: true },
})

const C = {
  budget:   '#155366',   // teal-90
  spending: '#73adbf',   // teal-50
  grid:     '#ececec',
  axis:     '#8a8a8a',
  label:    '#686868',
}

const CDFD_BASE = 'https://data.countrydata.iatistandard.org/api'

const now = new Date().getFullYear()
const years = Array.from({ length: 7 }, (_, i) => String(now - 3 + i))

const loading = ref(true)
const error = ref(null)
const chartData = ref(null)

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

    const byYear = Object.fromEntries(json.cells.map(c => [c['year.year'], c]))

    chartData.value = {
      labels: years,
      datasets: [
        {
          label: 'Budget',
          data: years.map(y => (byYear[y]?.['value_usd.sum_budget'] ?? 0) / 1e9),
          backgroundColor: C.budget,
          borderRadius: { topLeft: 3, topRight: 3 },
          borderSkipped: false,
          maxBarThickness: 34,
          categoryPercentage: 0.7,
          barPercentage: 0.88,
        },
        {
          label: 'Disbursement + Expenditure',
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
      callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtBn(ctx.parsed.y)}` },
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

onMounted(load)
watch(() => props.orgId, load)
</script>

<template>
  <div>
    <div v-if="loading" style="padding: 40px 0; text-align: center; color: var(--grey-60); font-size: .9rem">
      Loading financial data…
    </div>
    <div v-else-if="error" style="padding: 20px 0; color: var(--red-50); font-size: .9rem">
      Could not load data: {{ error }}
    </div>
    <template v-else>
      <div style="height: 260px; position: relative">
        <BarChart :data="chartData" :options="chartOptions" />
      </div>
      <p style="font-size: .8rem; color: var(--grey-60); margin: 10px 0 0">
        This chart shows both budgets and spending for the previous three years, the current year, and the next three years.
        Source: <a href="https://countrydata.iatistandard.org/" target="_blank" rel="noopener">countrydata.iatistandard.org</a>.
      </p>
    </template>
  </div>
</template>
