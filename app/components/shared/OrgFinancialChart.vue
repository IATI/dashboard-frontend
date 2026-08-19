<script setup>
const props = defineProps({
  orgId: { type: String, required: true },
})

const C = {
  budget: '#2b3e4e',
  spending: '#73adbf',
  grey20: '#dadada',
  grey60: '#686868',
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
          borderRadius: 3,
          categoryPercentage: 0.85,
          barPercentage: 0.9,
        },
        {
          label: 'Disbursement + Expenditure',
          data: years.map(y => (byYear[y]?.['value_usd.sum_3-4'] ?? 0) / 1e9),
          backgroundColor: C.spending,
          borderRadius: 3,
          categoryPercentage: 0.85,
          barPercentage: 0.9,
        },
      ],
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { font: { size: 12 }, color: C.grey60, boxWidth: 14, padding: 16 },
    },
    tooltip: {
      callbacks: {
        label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}bn`,
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 12, weight: '600' }, color: C.grey60 } },
    y: {
      beginAtZero: true,
      grid: { color: C.grey20 },
      ticks: { font: { size: 10 }, color: C.grey60, callback: v => `$${v}bn` },
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
      <div style="height: 280px; position: relative">
        <BarChart :data="chartData" :options="chartOptions" />
      </div>
      <p style="font-size: .8rem; color: var(--grey-60); margin: 10px 0 0">
        This chart shows both budgets and spending for the previous three years, the current year, and the next three years.
        Source: <a href="https://countrydata.iatistandard.org/" target="_blank" rel="noopener">countrydata.iatistandard.org</a>.
      </p>
    </template>
  </div>
</template>
