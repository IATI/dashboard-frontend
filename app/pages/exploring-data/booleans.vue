<script setup>
definePageMeta({ active: 'exploring' })
const { t } = useI18n({ useScope: 'global' })

const { public: { dashboardBase: BASE } } = useRuntimeConfig()

const { data: booleansData } = await useFetch(`${BASE}/stats/current/aggregated/boolean_values.json`)

const ATTR_LABELS = {
  '@humanitarian': 'Humanitarian (@humanitarian)',
  '@linked-data-default': 'Linked Data Default (@linked-data-default)',
  '@secondary-reporter': 'Secondary Reporter (@secondary-reporter)',
  '@scope': 'Scope (@scope)',
  '@significance': 'Significance (@significance)',
  '@tied-status': 'Tied Status (@tied-status)',
  '@default-tied-status': 'Default Tied Status (@default-tied-status)',
}

const C = {
  teal90: '#155366', teal70: '#448093', teal50: '#73adbf',
  orange: '#ff7264', green: '#00c497', blue: '#06dbe4',
  grey20: '#dadada', grey60: '#686868',
}

const SEG_COLORS = [C.teal90, C.orange, C.green, C.blue, C.teal50, '#9b59b6', '#e67e22', '#95a5a6']

const attributes = computed(() => {
  const data = booleansData.value
  if (!data) return []
  return Object.entries(data).map(([attr, valueCounts]) => {
    const total = Object.values(valueCounts).reduce((s, v) => s + Number(v), 0)
    const entries = Object.entries(valueCounts)
      .map(([val, count]) => ({ val, count: Number(count) }))
      .sort((a, b) => b.count - a.count)
    return { attr, label: ATTR_LABELS[attr] ?? attr, total, entries }
  })
})

function chartData(entries) {
  return {
    labels: [''],
    datasets: entries.map((e, i) => ({
      label: e.val,
      data: [e.count],
      backgroundColor: SEG_COLORS[i % SEG_COLORS.length],
      borderWidth: 0,
    })),
  }
}

const chartOpts = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { display: true, position: 'bottom', labels: { boxWidth: 14, font: { size: 11 }, padding: 10 } },
    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()}` } },
  },
  scales: {
    x: { stacked: true, grid: { color: C.grey20 }, ticks: { font: { size: 10 }, color: C.grey60 } },
    y: { stacked: true, display: false },
  },
}
</script>

<template>
  <div>
    <Crumbs :path="[
      { label: t('breadPublishingQuality'), href: '#' },
      { label: t('exploreBreadcrumb'), href: '/exploring-data' },
      { label: t('exploreBooleansTitle') }
    ]" />
    <TitleBar :eyebrow="t('exploreEyebrow')" :title="t('exploreBooleansTitle')">
      <template #meta>
        <span>{{ t('exploreBooleansSubtitle') }}</span>
      </template>
    </TitleBar>

    <main class="main">
      <Card loading v-if="!attributes.length">Loading…</Card>

      <div v-else class="col">
        <Card v-for="a in attributes" :key="a.attr">
          <h3 style="font-size: .95rem">{{ a.label }}</h3>
          <p class="sub">{{ a.total.toLocaleString() }} total uses</p>
          <div style="height: 120px">
            <BarChart :data="chartData(a.entries)" :options="chartOpts" />
          </div>
        </Card>
      </div>
    </main>
  </div>
</template>
