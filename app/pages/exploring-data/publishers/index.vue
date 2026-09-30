<script setup>
definePageMeta({ active: 'exploring' })
const { t } = useI18n({ useScope: 'global' })

const { public: { dashboardBase: BASE } } = useRuntimeConfig()
const C = {
  teal90: '#155366', teal70: '#448093', teal50: '#73adbf',
  orange: '#ff7264', green: '#00c497', blue: '#06dbe4',
  grey20: '#dadada', grey60: '#686868',
}
const TYPE_COLORS = [C.green, C.teal90, C.blue, C.orange, C.teal70, '#9b59b6', '#e67e22', '#1abc9c', '#e74c3c', '#3498db', '#95a5a6', '#f39c12', '#2ecc71', C.teal50]


const [
  { data: pubsTimeRaw },
  { data: pubTypesRaw },
  { data: pubsTableRaw },
  { data: pubsScalar },
] = await Promise.all([
  useFetch(`${BASE}/generated/img/aggregate/publishers.csv`, { responseType: 'text' }),
  useFetch(`${BASE}/generated/img/aggregate/publisher_types.csv`, { responseType: 'text' }),
  useFetch(`${BASE}/generated/data/csv/publishers.csv`, { responseType: 'text' }),
  useFetch(`${BASE}/stats/current/aggregated/publishers.json`),
])

const pubsSeries = computed(() =>
  pubsTimeRaw.value ? toMonthly(parseCSV(pubsTimeRaw.value), 'date', 'value') : []
)

const pubTypesParsed = computed(() => {
  if (!pubTypesRaw.value) return { series: [], types: [] }
  const rows = parseCSV(pubTypesRaw.value)
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

// Chart.js datasets
const totalChartData = computed(() => ({
  labels: pubsSeries.value.map(d => d.date),
  datasets: [{
    label: 'Reporting Orgs',
    data: pubsSeries.value.map(d => d.value),
    borderColor: C.teal90,
    backgroundColor: 'rgba(21,83,102,0.08)',
    fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2,
  }],
}))

const byTypeChartData = computed(() => {
  const { series, types } = pubTypesParsed.value
  return {
    labels: series.map(d => d.date),
    datasets: types.map((type, i) => ({
      label: type,
      data: series.map(d => d[type] || 0),
      borderColor: TYPE_COLORS[i % TYPE_COLORS.length],
      backgroundColor: 'transparent',
      fill: false, tension: 0.3, pointRadius: 0, borderWidth: 1.5,
    })),
  }
})

const baseOpts = {
  responsive: true, maintainAspectRatio: false, animation: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 10 }, color: C.grey60, maxRotation: 0 } },
    y: { beginAtZero: true, grid: { color: C.grey20 }, ticks: { font: { size: 10 }, color: C.grey60 } },
  },
}

const byTypeOpts = {
  ...baseOpts,
  plugins: {
    legend: { display: true, position: 'bottom', labels: { boxWidth: 16, font: { size: 10 }, padding: 8 } },
    tooltip: { mode: 'index', intersect: false },
  },
}

// Table state
const search = ref('')
const filterType = ref('')
const sortBy = ref([{ key: 'name', order: 'asc' }])
const PER_PAGE = 50
const currentPage = ref(1)

function cleanType(raw) {
  if (!raw) return ''
  const m = raw.match(/^\d+\s*-\s*(.+)$/)
  return m ? m[1] : raw
}

function hqCode(hq) { return hq ? hq.split(' - ')[0] : '—' }

function fmtSize(bytes) {
  const n = Number(bytes)
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} kB`
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`
  return `${(n / 1073741824).toFixed(1)} GB`
}

const pubsTable = computed(() =>
  pubsTableRaw.value
    ? parseCSV(pubsTableRaw.value).map(row => ({
        name:          row['Publisher Name'],
        slug:          row['Publisher Short Name'],
        activities:    Number(row['Activities']) || 0,
        organisations: Number(row['Organisations']) || 0,
        files:         Number(row['Files']) || 0,
        totalSize:     Number(row['Total File Size']) || 0,
        hq:            row['HQ Country'],
        orgType:       cleanType(row['Organisation Type']),
      }))
    : []
)

const orgTypes = computed(() => {
  const types = new Set(pubsTable.value.map(r => r.orgType).filter(Boolean))
  return [...types].sort()
})

const filtered = computed(() => {
  let rows = pubsTable.value
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    rows = rows.filter(r =>
      r.name?.toLowerCase().includes(q) ||
      r.slug?.toLowerCase().includes(q)
    )
  }
  if (filterType.value) {
    rows = rows.filter(r => r.orgType === filterType.value)
  }
  return rows
})

watch([search, filterType], () => { currentPage.value = 1 })

const FIELDS = [
  { key: 'name',          label: 'Reporting Org Name', sortable: true },
  { key: 'slug',          label: 'Short Name',          sortable: true },
  { key: 'activities',    label: 'Activities',          sortable: true, class: 'num' },
  { key: 'organisations', label: 'Orgs',                sortable: true, class: 'num' },
  { key: 'files',         label: 'Files',               sortable: true, class: 'num' },
  { key: 'totalSize',     label: 'Total Size',          sortable: true, class: 'num' },
  { key: 'hq',            label: 'HQ',                  sortable: true },
  { key: 'orgType',       label: 'Type',                sortable: true },
]
</script>

<template>
  <div>
    <Crumbs :path="[
      { label: t('breadPublishingQuality'), href: '#' },
      { label: t('exploreBreadcrumb'), href: '/exploring-data' },
      { label: 'Publishers' }
    ]" />
    <TitleBar eyebrow="Exploring Data" title="IATI Reporting Orgs">
      <template #meta>
        <span>How many organisations are publishing IATI data?</span>
        <span v-if="pubsScalar"><strong>{{ pubsScalar.toLocaleString() }}</strong> reporting orgs</span>
      </template>
    </TitleBar>

    <main class="main">
      <!-- Two charts side-by-side -->
      <BRow gutter-x="3" gutter-y="3" class="mb-sm">
        <BCol cols="12" md="6"><Card>
          <h3>Reporting Orgs</h3>
          <p class="iati-card__subtitle">Number of organisations publishing IATI data over time.</p>
          <div v-if="!pubsSeries.length" class="loading">Loading…</div>
          <div v-else class="chart" style="height: 260px">
            <LineChart :data="totalChartData" :options="baseOpts" />
          </div>
        </Card></BCol>

        <BCol cols="12" md="6"><Card>
          <h3>Reporting Orgs by type</h3>
          <p class="iati-card__subtitle">Various types of organisations publishing IATI data.</p>
          <div v-if="!pubTypesParsed.series.length" class="loading">Loading…</div>
          <div v-else class="chart" style="height: 340px">
            <LineChart :data="byTypeChartData" :options="byTypeOpts" />
          </div>
        </Card></BCol>
      </BRow>

      <!-- Publisher table -->
      <Card title="List of current active IATI Reporting Orgs">
        <template #actions>
          <a :href="`${BASE}/generated/data/csv/publishers.csv`" target="_blank">(This table as CSV)</a>
        </template>

        <!-- Filters -->
        <div class="filter-bar">
          <div>
            <label>Search by name or short name</label>
            <input v-model="search" type="text" placeholder="e.g. USAID or us-gov-1" />
          </div>
          <div>
            <label>Organisation type</label>
            <select v-model="filterType">
              <option value="">All types</option>
              <option v-for="tp in orgTypes" :key="tp" :value="tp">{{ tp }}</option>
            </select>
          </div>
          <div class="filter-count">{{ filtered.length.toLocaleString() }} reporting orgs</div>
        </div>

        <!-- Table -->
        <div class="iati-table">
        <BTable
          :items="filtered"
          :fields="FIELDS"
          v-model:sort-by="sortBy"
          :per-page="PER_PAGE"
          :current-page="currentPage"
          :busy="!pubsTable.length"
        >
          <template #table-busy>
            <div class="loading" style="padding: 40px">Loading…</div>
          </template>
          <template #cell(name)="{ value, item }">
            <span class="org">
              <NuxtLink :to="`/exploring-data/publishers/${item.slug}`" style="color: var(--teal-70); text-decoration: none">{{ value }}</NuxtLink>
            </span>
          </template>
          <template #cell(slug)="{ value }">
            <span style="font-size: .82rem; color: var(--grey-70); font-family: monospace">{{ value }}</span>
          </template>
          <template #cell(activities)="{ value }">{{ value || '—' }}</template>
          <template #cell(organisations)="{ value }">{{ value || '—' }}</template>
          <template #cell(files)="{ value }">{{ value || '—' }}</template>
          <template #cell(totalSize)="{ value }">{{ fmtSize(value) }}</template>
          <template #cell(hq)="{ value }">
            <abbr :title="value" style="text-decoration: none; cursor: default">{{ hqCode(value) }}</abbr>
          </template>
        </BTable>
        </div>

        <!-- Pagination -->
        <div v-if="filtered.length > PER_PAGE" class="iati-card-footer iati-card-footer--center">
          <BPagination
            v-model="currentPage"
            :total-rows="filtered.length"
            :per-page="PER_PAGE"
            align="center"
          />
        </div>
        <div v-else-if="pubsTable.length" class="iati-card-footer">
          <p>
            Files = Activity Datasets + Organisation Datasets.
            <a :href="`${BASE}/stats/current/inverted-publisher/activity_files.json`" target="_blank">(J)</a>
          </p>
        </div>
      </Card>
    </main>
  </div>
</template>
