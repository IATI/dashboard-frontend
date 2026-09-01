<script setup>
definePageMeta({ active: 'exploring' })
const { t } = useI18n({ useScope: 'global' })

const { public: { dashboardBase: BASE } } = useRuntimeConfig()
const C = { teal90: '#155366', orange: '#ff7264', grey20: '#dadada', grey60: '#686868' }


const [
  { data: aggData },
  { data: invertedData },
  { data: timeSeriesRaw },
] = await Promise.all([
  useFetch(`${BASE}/stats/current/aggregated/publisher_has_org_file.json`),
  useFetch(`${BASE}/stats/current/inverted-publisher/publisher_has_org_file.json`),
  useFetch(`${BASE}/generated/img/aggregate/publisher_has_org_file.csv`, { responseType: 'text' }),
])

const stats = computed(() => {
  const d = aggData.value
  if (!d) return null
  const yes = d.yes ?? 0
  const no = d.no ?? 0
  const total = yes + no
  return { yes, no, total, yesPct: total ? Math.round((yes / total) * 100) : 0, noPct: total ? Math.round((no / total) * 100) : 0 }
})

// Publishers without org file (sorted alphabetically)
const missingPublishers = computed(() => {
  const d = invertedData.value
  if (!d) return []
  const noList = d.no ?? d['false'] ?? []
  return Array.isArray(noList)
    ? [...noList].sort()
    : Object.keys(noList).sort()
})

// Time series: tracks publishers WITHOUT org file over time (CSV column is "no")
const noSeries = computed(() =>
  timeSeriesRaw.value ? toMonthly(parseCSV(timeSeriesRaw.value), 'date', 'no') : []
)

const latestNo = computed(() => noSeries.value.at(-1))

// Chart.js doughnut
const doughnutData = computed(() => ({
  labels: [t('exploreHasOrgFile'), t('exploreNoOrgFile')],
  datasets: [{
    data: stats.value ? [stats.value.yes, stats.value.no] : [0, 0],
    backgroundColor: [C.teal90, C.orange],
    hoverOffset: 4,
  }],
}))

const doughnutOpts = {
  responsive: true, maintainAspectRatio: false, animation: false,
  plugins: {
    legend: { display: true, position: 'bottom', labels: { font: { size: 12 }, padding: 16 } },
    tooltip: { callbacks: { label: ctx => ` ${ctx.parsed} publishers (${ctx.label})` } },
  },
}

// Time series chart
const tsData = computed(() => ({
  labels: noSeries.value.map(d => d.date),
  datasets: [{
    label: 'Publishers without org file',
    data: noSeries.value.map(d => d.value),
    borderColor: C.orange,
    backgroundColor: 'rgba(255,114,100,0.08)',
    fill: true,
    tension: 0.3,
    pointRadius: 0,
    borderWidth: 2,
  }],
}))

const tsOpts = {
  responsive: true, maintainAspectRatio: false, animation: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { maxTicksLimit: 14, font: { size: 10 }, color: C.grey60, maxRotation: 0 } },
    y: { beginAtZero: true, grid: { color: C.grey20 }, ticks: { font: { size: 10 }, color: C.grey60 } },
  },
}

const showAll = ref(false)
const PREVIEW = 40
</script>

<template>
  <div>
    <Crumbs :path="[
      { label: t('breadPublishingQuality'), href: '#' },
      { label: t('exploreBreadcrumb'), href: '/exploring-data' },
      { label: t('exploreOrgTitle') }
    ]" />
    <TitleBar :eyebrow="t('exploreEyebrow')" :title="t('exploreOrgTitle')">
      <template #meta>
        <span>{{ t('exploreOrgSubtitle') }}</span>
      </template>
    </TitleBar>

    <main class="main">
      <Card loading v-if="!stats">Loading…</Card>

      <template v-else>
        <!-- Headline stats + doughnut -->
        <BRow gutter-x="3" gutter-y="3" class="mb-sm">
          <!-- Stat cards -->
          <BCol cols="12" md="6"><div class="col" style="gap: 12px">
            <Card>
              <p class="iati-card__subtitle">Reporting orgs without an organisation dataset</p>
              <div class="bignum warn" style="font-size: 2.8rem">
                {{ stats.no.toLocaleString() }}
                <small>{{ stats.noPct }}% of all publishers</small>
              </div>
            </Card>
            <Card accent="blue">
              <p class="iati-card__subtitle">{{ t('exploreHasOrgFile') }}</p>
              <div class="bignum good">
                {{ stats.yes.toLocaleString() }}
                <small>{{ stats.yesPct }}% of all publishers</small>
              </div>
            </Card>
            <Card>
              <p class="iati-card__subtitle">Total publishers</p>
              <div class="bignum">{{ stats.total.toLocaleString() }}</div>
            </Card>
          </div></BCol>

          <!-- Doughnut -->
          <BCol cols="12" md="6"><Card style="display: flex; align-items: center; justify-content: center">
            <div class="chart" style="height: 260px; width: 100%">
              <DoughnutChart :data="doughnutData" :options="doughnutOpts" />
            </div>
          </Card></BCol>
        </BRow>

        <!-- Time series: count without org file over time -->
        <Card class="mb-sm">
          <h3>Reporting orgs without an organisation dataset, over time</h3>
          <p class="iati-card__subtitle">Count of reporting orgs without an organisation file, over time.</p>
          <div v-if="!noSeries.length" class="loading">Loading…</div>
          <div v-else class="chart" style="height: 240px">
            <LineChart :data="tsData" :options="tsOpts" />
          </div>
        </Card>

        <!-- Publisher list -->
        <Card>
          <h3>
            List of reporting orgs without an organisation dataset
            <span style="font-weight: 400; font-size: .85rem; color: var(--grey-60)">({{ missingPublishers.length }})</span>
          </h3>
          <p class="iati-card__subtitle">
            The following reporting orgs do not have an organisation dataset registered.
            <a :href="`${BASE}/stats/current/inverted-publisher/publisher_has_org_file.json`" target="_blank" style="font-size: .8rem">(JSON)</a>
          </p>
          <div v-if="!missingPublishers.length" class="loading" style="padding: 0">Loading…</div>
          <ul v-else class="pub-list">
            <li v-for="pub in (showAll ? missingPublishers : missingPublishers.slice(0, PREVIEW))" :key="pub">{{ pub }}</li>
          </ul>
          <button
            v-if="missingPublishers.length > PREVIEW"
            @click="showAll = !showAll"
            class="btn-show-more"
          >{{ showAll ? 'Show less' : `Show all ${missingPublishers.length} publishers` }}</button>
        </Card>
      </template>
    </main>
  </div>
</template>
