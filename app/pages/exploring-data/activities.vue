<script setup>
definePageMeta({ active: 'exploring' })
const { t } = useI18n({ useScope: 'global' })

const { public: { dashboardBase: BASE } } = useRuntimeConfig()

// Colours matching the design system (CSS vars don't work in Chart.js)
const C = {
  teal90: '#155366', teal70: '#448093', teal50: '#73adbf',
  orange: '#ff7264', green: '#00c497', blue: '#06dbe4',
  grey20: '#dadada', grey60: '#686868',
}
const TYPE_COLORS = [C.teal90, C.orange, C.green, C.blue, C.teal70, '#9b59b6', '#e67e22', '#1abc9c', '#e74c3c', '#3498db', '#95a5a6', '#f39c12', '#2ecc71', C.teal50]


const [
  { data: activitiesRaw },
  { data: uniqueRaw },
  { data: byTypeRaw },
] = await Promise.all([
  useFetch(`${BASE}/generated/img/aggregate/activities.csv`, { responseType: 'text' }),
  useFetch(`${BASE}/generated/img/aggregate/unique_identifiers.csv`, { responseType: 'text' }),
  useFetch(`${BASE}/generated/img/aggregate/activities_per_publisher_type.csv`, { responseType: 'text' }),
])

const totalSeries = computed(() => activitiesRaw.value ? toMonthly(parseCSV(activitiesRaw.value), 'date', 'value') : [])
const uniqueSeries = computed(() => uniqueRaw.value ? toMonthly(parseCSV(uniqueRaw.value), 'date', 'value') : [])

const byTypeParsed = computed(() => {
  if (!byTypeRaw.value) return { series: [], types: [] }
  const rows = parseCSV(byTypeRaw.value)
  const types = Object.keys(rows[0] || {}).filter(k => k !== 'date')
  const monthly = {}
  for (const r of rows) {
    const mon = r.date?.slice(0, 7)
    if (!mon) continue
    if (!monthly[mon]) { monthly[mon] = { date: mon }; types.forEach(tp => { monthly[mon][tp] = 0 }) }
    types.forEach(tp => { monthly[mon][tp] = Number(r[tp] || 0) })
  }
  return { series: Object.values(monthly).sort((a, b) => a.date.localeCompare(b.date)), types }
})

const latestTotal = computed(() => totalSeries.value.at(-1))
const latestUnique = computed(() => uniqueSeries.value.at(-1))

function fmtN(n) { return n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n?.toLocaleString() ?? '—' }

// Chart.js Y-axis tick formatter
const yFmt = v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : v

const baseLineOpts = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: {
      grid: { display: false },
      ticks: { maxTicksLimit: 14, font: { size: 10 }, color: C.grey60, maxRotation: 0 },
    },
    y: {
      beginAtZero: true,
      grid: { color: C.grey20 },
      ticks: { font: { size: 10 }, color: C.grey60, callback: yFmt },
    },
  },
}

const totalChartData = computed(() => ({
  labels: totalSeries.value.map(d => d.date),
  datasets: [{
    label: 'Total activities',
    data: totalSeries.value.map(d => d.value),
    borderColor: C.teal90,
    backgroundColor: 'rgba(21,83,102,0.08)',
    fill: true,
    tension: 0.3,
    pointRadius: 0,
    borderWidth: 2,
  }],
}))

const uniqueChartData = computed(() => ({
  labels: uniqueSeries.value.map(d => d.date),
  datasets: [{
    label: 'Unique activities',
    data: uniqueSeries.value.map(d => d.value),
    borderColor: C.green,
    backgroundColor: 'rgba(0,196,151,0.08)',
    fill: true,
    tension: 0.3,
    pointRadius: 0,
    borderWidth: 2,
  }],
}))

const byTypeChartData = computed(() => {
  const { series, types } = byTypeParsed.value
  return {
    labels: series.map(d => d.date),
    datasets: types.map((type, i) => ({
      label: type,
      data: series.map(d => d[type] || 0),
      borderColor: TYPE_COLORS[i % TYPE_COLORS.length],
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 1.5,
    })),
  }
})

const byTypeOpts = {
  ...baseLineOpts,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { boxWidth: 20, font: { size: 11 }, padding: 12 },
    },
    tooltip: { mode: 'index', intersect: false },
  },
}
</script>

<template>
  <div>
    <Crumbs :path="[
      { label: t('breadPublishingQuality'), href: '/' },
      { label: t('exploreBreadcrumb'), href: '/exploring-data' },
      { label: t('exploreActivitiesTitle') }
    ]" />
    <TitleBar :eyebrow="t('exploreEyebrow')" :title="t('exploreActivitiesTitle')">
      <template #meta>
        <span>{{ t('exploreActivitiesSubtitle') }}</span>
        <span v-if="latestTotal"><strong>{{ latestTotal.date }}</strong></span>
      </template>
    </TitleBar>

    <main class="main">
      <!-- Headline stats -->
      <BRow gutter-x="3" gutter-y="3" class="mb-sm">
        <BCol cols="12" md="6"><Card accent="blue">
          <p class="iati-card__subtitle">{{ t('exploreTotal') }}</p>
          <div class="bignum good">
            {{ latestTotal ? fmtN(latestTotal.value) : '…' }}
            <small>total activities (including duplicates)</small>
          </div>
        </Card></BCol>
        <BCol cols="12" md="6"><Card>
          <p class="iati-card__subtitle">Unique Activities</p>
          <div class="bignum">
            {{ latestUnique ? fmtN(latestUnique.value) : '…' }}
            <small>deduplicated by iati-identifier</small>
          </div>
        </Card></BCol>
      </BRow>

      <!-- Total activities chart -->
      <Card class="mb-sm">
        <h3>Total activities</h3>
        <p class="iati-card__subtitle">Total count of activities across all reporting orgs, over time. Includes activities with duplicate iati-identifier.</p>
        <div v-if="!totalSeries.length" class="loading">Loading…</div>
        <div v-else class="chart" style="height: 260px">
          <LineChart :data="totalChartData" :options="baseLineOpts" />
        </div>
      </Card>

      <!-- Unique activities chart -->
      <Card class="mb-sm">
        <h3>Unique Activities</h3>
        <p class="iati-card__subtitle">Total count of unique activities across all reporting orgs, over time. Excludes duplicate iati-identifier values.</p>
        <div v-if="!uniqueSeries.length" class="loading">Loading…</div>
        <div v-else class="chart" style="height: 260px">
          <LineChart :data="uniqueChartData" :options="baseLineOpts" />
        </div>
      </Card>

      <!-- By publisher type chart -->
      <Card>
        <h3>{{ t('exploreByType') }}</h3>
        <p class="iati-card__subtitle">Count of all activities, aggregated by reporting org type, over time.</p>
        <div v-if="!byTypeParsed.series.length" class="loading">Loading…</div>
        <div v-else class="chart" style="height: 320px">
          <LineChart :data="byTypeChartData" :options="byTypeOpts" />
        </div>
      </Card>
    </main>
  </div>
</template>
