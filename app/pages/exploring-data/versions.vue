<script setup>
definePageMeta({ active: 'exploring' })
const { t } = useI18n({ useScope: 'global' })

const { public: { dashboardBase: BASE } } = useRuntimeConfig()
const C = { teal90: '#155366', teal50: '#73adbf', grey20: '#dadada', grey60: '#686868' }

const EXPECTED = ['1.01','1.02','1.03','1.04','1.05','2.01','2.02','2.03']

const { data: versionsData } = await useFetch(`${BASE}/stats/current/inverted-publisher/versions.json`)

function versionSort(a, b) {
  const [ma, pa] = (a || '0.0').split('.').map(Number)
  const [mb, pb] = (b || '0.0').split('.').map(Number)
  return ma !== mb ? ma - mb : pa - pb
}

const allVersions = computed(() => {
  const data = versionsData.value
  if (!data) return []
  return Object.keys(data).sort(versionSort)
})

const expectedVersions = computed(() =>
  allVersions.value.filter(v => EXPECTED.includes(v))
)
const otherVersions = computed(() =>
  allVersions.value.filter(v => !EXPECTED.includes(v))
)

function pubCount(v) {
  return versionsData.value ? Object.keys(versionsData.value[v] || {}).length : 0
}

function pubList(v) {
  return versionsData.value ? Object.keys(versionsData.value[v] || {}) : []
}

// Chart.js bar chart for expected versions
const barChartData = computed(() => ({
  labels: expectedVersions.value,
  datasets: [{
    label: 'Publishers',
    data: expectedVersions.value.map(pubCount),
    backgroundColor: expectedVersions.value.map(v => v.startsWith('2') ? C.teal90 : C.teal50),
    borderRadius: 3,
  }],
}))

const barOpts = {
  responsive: true, maintainAspectRatio: false, animation: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} publishers` } } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 12, weight: '600' }, color: C.grey60 } },
    y: { beginAtZero: true, grid: { color: C.grey20 }, ticks: { font: { size: 10 }, color: C.grey60 } },
  },
}

const showAll = ref({})
const PREVIEW_COUNT = 10
function toggleAll(v) { showAll.value = { ...showAll.value, [v]: !showAll.value[v] } }
</script>

<template>
  <div>
    <Crumbs :path="[
      { label: t('breadPublishingQuality'), href: '/' },
      { label: t('exploreBreadcrumb'), href: '/exploring-data' },
      { label: t('exploreVersionsTitle') }
    ]" />
    <TitleBar :eyebrow="t('exploreEyebrow')" :title="t('exploreVersionsTitle')">
      <template #meta>
        <span>{{ t('exploreVersionsSubtitle') }}</span>
      </template>
    </TitleBar>

    <main class="main">
      <Card loading v-if="!versionsData">Loading…</Card>

      <template v-else>
        <!-- Bar chart: expected versions -->
        <Card class="mb-sm">
          <h3>Reporting orgs per version</h3>
          <p class="iati-card__subtitle">Count of reporting orgs using each expected IATI version.</p>
          <div class="chart" style="height: 260px">
            <BarChart :data="barChartData" :options="barOpts" />
          </div>
        </Card>

        <!-- Publisher card gallery — expected versions -->
        <Card class="mb-sm">
          <h3>Reporting orgs by version — expected</h3>
          <p class="iati-card__subtitle" style="margin: 0 0 20px">
            Listing of reporting orgs per IATI version.
            <a :href="`${BASE}/stats/current/inverted-publisher/versions.json`" target="_blank" style="font-size: .8rem">(JSON)</a>
          </p>
          <BRow cols="2" cols-lg="4" gutter-x="3" gutter-y="3">
            <BCol v-for="v in expectedVersions" :key="v">
              <div class="panel">
                <h4>
                  {{ v }}
                  <span style="font-family: sans-serif; font-size: .78rem; font-weight: 400; color: var(--grey-60)"> · {{ pubCount(v) }}</span>
                </h4>
                <ul>
                  <li v-for="pub in pubList(v).slice(0, showAll[v] ? undefined : PREVIEW_COUNT)" :key="pub">{{ pub }}</li>
                </ul>
                <button
                  v-if="pubList(v).length > PREVIEW_COUNT"
                  @click="toggleAll(v)"
                  class="btn-link"
                >{{ showAll[v] ? 'Show less' : `+${pubList(v).length - PREVIEW_COUNT} more` }}</button>
              </div>
            </BCol>
          </BRow>
        </Card>

        <!-- Other / non-standard versions -->
        <Card v-if="otherVersions.length">
          <h3>Reporting orgs by version — non-standard</h3>
          <p class="iati-card__subtitle" style="margin: 0 0 20px">Reporting organisations using a non-recognised version string.</p>
          <BRow cols="2" cols-lg="4" gutter-x="3" gutter-y="3">
            <BCol v-for="v in otherVersions" :key="v">
              <div class="panel">
                <h4 class="warn">
                  {{ v || '(blank)' }}
                  <span style="font-family: sans-serif; font-size: .78rem; font-weight: 400; color: var(--grey-60)"> · {{ pubCount(v) }}</span>
                </h4>
                <ul>
                  <li v-for="pub in pubList(v).slice(0, showAll[v] ? undefined : PREVIEW_COUNT)" :key="pub">{{ pub }}</li>
                </ul>
                <button
                  v-if="pubList(v).length > PREVIEW_COUNT"
                  @click="toggleAll(v)"
                  class="btn-link"
                >{{ showAll[v] ? 'Show less' : `+${pubList(v).length - PREVIEW_COUNT} more` }}</button>
              </div>
            </BCol>
          </BRow>
        </Card>
      </template>
    </main>
  </div>
</template>
