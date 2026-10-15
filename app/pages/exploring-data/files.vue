<script setup>
definePageMeta({ active: 'exploring' })
const { t } = useI18n({ useScope: 'global' })

// Two bases, because the dashboard serves these from two places. The /api and
// /stats endpoints send Access-Control-Allow-Origin and are reached directly;
// the /generated/* files are static, served by Apache, and send no CORS header,
// so they alone still go through the proxy. Point generatedBase at
// dashboardBase once that changes and the proxy can be retired.
const { public: { dashboardBase: BASE, generatedBase: GENERATED } } = useRuntimeConfig()
const C = { teal90: '#155366', orange: '#ff7264', green: '#00c497', grey20: '#dadada', grey60: '#686868' }


const [
  { data: fileSizeRaw },
  { data: actFilesRaw },
  { data: orgFilesRaw },
  { data: binsData },
] = await Promise.all([
  useFetch(`${GENERATED}/generated/img/aggregate/file_size.csv`, { responseType: 'text' }),
  useFetch(`${GENERATED}/generated/img/aggregate/activity_files.csv`, { responseType: 'text' }),
  useFetch(`${GENERATED}/generated/img/aggregate/organisation_files.csv`, { responseType: 'text' }),
  useFetch(`${BASE}/stats/current/aggregated/file_size_bins.json`),
])

const fileSizeSeries = computed(() =>
  fileSizeRaw.value ? toMonthly(parseCSV(fileSizeRaw.value), 'date', 'value').map(d => ({ ...d, value: d.value / 1e9 })) : []
)
const actFilesSeries = computed(() =>
  actFilesRaw.value ? toMonthly(parseCSV(actFilesRaw.value), 'date', 'value') : []
)
const orgFilesSeries = computed(() =>
  orgFilesRaw.value ? toMonthly(parseCSV(orgFilesRaw.value), 'date', 'value') : []
)

const latestSize = computed(() => fileSizeSeries.value.at(-1))
const latestActFiles = computed(() => actFilesSeries.value.at(-1))
const latestOrgFiles = computed(() => orgFilesSeries.value.at(-1))

const BIN_ORDER = ['<1MB', '1-5MB', '5-10MB', '10-20MB', '>20MB']

function makeLineData(series, color, label) {
  return {
    labels: series.map(d => d.date),
    datasets: [{
      label,
      data: series.map(d => d.value),
      borderColor: color,
      backgroundColor: `${color}15`,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
    }],
  }
}

const fileSizeChartData = computed(() => makeLineData(fileSizeSeries.value, C.orange, 'Total size (GB)'))
const actFilesChartData = computed(() => makeLineData(actFilesSeries.value, C.teal90, 'Activity datasets'))
const orgFilesChartData = computed(() => makeLineData(orgFilesSeries.value, C.green, 'Organisation datasets'))

const binsChartData = computed(() => {
  const bins = binsData.value
  if (!bins) return { labels: [], datasets: [{ data: [] }] }
  const entries = BIN_ORDER.map(k => ({ label: k, count: bins[k] ?? 0 })).filter(e => e.count > 0)
  return {
    labels: entries.map(e => e.label),
    datasets: [{ label: 'Datasets', data: entries.map(e => e.count), backgroundColor: C.teal90, borderRadius: 3 }],
  }
})

const lineOpts = (yLabel) => ({
  responsive: true, maintainAspectRatio: false, animation: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { maxTicksLimit: 14, font: { size: 10 }, color: C.grey60, maxRotation: 0 } },
    y: {
      beginAtZero: true, grid: { color: C.grey20 },
      ticks: { font: { size: 10 }, color: C.grey60, callback: yLabel },
    },
  },
})

const sizeOpts = lineOpts(v => `${v.toFixed(0)} GB`)
const countOpts = lineOpts(v => v >= 1e3 ? `${Math.round(v / 1e3)}K` : v)

const binsOpts = {
  responsive: true, maintainAspectRatio: false, animation: false, indexAxis: 'y',
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: C.grey20 }, ticks: { font: { size: 10 }, color: C.grey60 } },
    y: { grid: { display: false }, ticks: { font: { size: 11 }, color: C.grey60 } },
  },
}

function fmtGB(gb) { return gb ? `${gb.toFixed(1)} GB` : '—' }
</script>

<template>
  <div>
    <Crumbs :path="[
      { label: t('breadPublishingQuality'), href: '/' },
      { label: t('exploreBreadcrumb'), href: '/exploring-data' },
      { label: t('exploreFilesTitle') }
    ]" />
    <TitleBar :eyebrow="t('exploreEyebrow')" :title="t('exploreFilesTitle')">
      <template #meta>
        <span>{{ t('exploreFilesSubtitle') }}</span>
      </template>
    </TitleBar>

    <main class="main">
      <!-- Scalar stats -->
      <BRow cols="1" cols-md="3" gutter-x="3" gutter-y="3" class="mb-sm">
        <BCol><Card accent="blue">
          <p class="iati-card__subtitle">{{ t('exploreTotalFileSize') }}</p>
          <div class="bignum good">
            {{ latestSize ? fmtGB(latestSize.value) : '…' }}
            <small>{{ latestSize?.date ?? '' }}</small>
          </div>
        </Card></BCol>
        <BCol><Card>
          <p class="iati-card__subtitle">{{ t('exploreActivityFiles') }}</p>
          <div class="bignum">{{ latestActFiles ? latestActFiles.value.toLocaleString() : '…' }}</div>
        </Card></BCol>
        <BCol><Card>
          <p class="iati-card__subtitle">{{ t('exploreOrgFiles') }}</p>
          <div class="bignum">{{ latestOrgFiles ? latestOrgFiles.value.toLocaleString() : '…' }}</div>
        </Card></BCol>
      </BRow>

      <!-- Total dataset size -->
      <Card class="mb-sm">
        <h3>{{ t('exploreTotalFileSize') }}</h3>
        <p class="iati-card__subtitle">Total size of all datasets in GB, over time.</p>
        <div v-if="!fileSizeSeries.length" class="loading">Loading…</div>
        <div v-else class="chart" style="height: 260px">
          <LineChart :data="fileSizeChartData" :options="sizeOpts" />
        </div>
      </Card>

      <!-- Activity datasets chart -->
      <Card class="mb-sm">
        <h3>{{ t('exploreActivityFiles') }}</h3>
        <p class="iati-card__subtitle">Count of total number of activity datasets over time.</p>
        <div v-if="!actFilesSeries.length" class="loading">Loading…</div>
        <div v-else class="chart" style="height: 220px">
          <LineChart :data="actFilesChartData" :options="countOpts" />
        </div>
      </Card>

      <!-- Organisation datasets chart -->
      <Card class="mb-sm">
        <h3>{{ t('exploreOrgFiles') }}</h3>
        <p class="iati-card__subtitle">Count of total number of organisation datasets over time.</p>
        <div v-if="!orgFilesSeries.length" class="loading">Loading…</div>
        <div v-else class="chart" style="height: 220px">
          <LineChart :data="orgFilesChartData" :options="countOpts" />
        </div>
      </Card>

      <!-- File size distribution -->
      <Card>
        <h3>{{ t('exploreFileSizeDist') }}</h3>
        <p class="iati-card__subtitle">Current number of datasets in each file-size bracket.</p>
        <div v-if="!binsData" class="loading">Loading…</div>
        <div v-else class="chart" style="height: 200px">
          <BarChart :data="binsChartData" :options="binsOpts" />
        </div>
      </Card>
    </main>
  </div>
</template>
