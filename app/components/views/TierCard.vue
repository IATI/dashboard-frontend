<script setup>
const props = defineProps({
  tone: { type: String, default: 'ok' },
  title: { type: String, required: true },
  value: { type: [String, Number], required: true },
  label: { type: String, required: true },
  trend: { type: String, default: '' },
  sparkData: { type: Array, default: () => [] },
  hint: { type: String, default: '' },
  unit: { type: String, default: '%' },
})

const colorMap = {
  good: { fg: 'var(--green-90)', ring: 'var(--green-50)' },
  ok:   { fg: 'var(--teal-90)',  ring: 'var(--teal-70)' },
  warn: { fg: 'var(--orange-90)', ring: 'var(--orange-50)' },
  info: { fg: 'var(--teal-90)',  ring: 'var(--blue-50)' },
}

const c = computed(() => colorMap[props.tone] || colorMap.ok)
const trendUp = computed(() => props.trend?.startsWith('+'))
const trendDown = computed(() => props.trend?.startsWith('−'))
const trendColor = computed(() =>
  trendUp.value ? 'var(--green-90)' : trendDown.value ? 'var(--orange-90)' : 'var(--grey-60)'
)
</script>

<template>
  <div class="iati-card" :style="{ borderTopColor: c.ring }">
    <p class="iati-card__subtitle">{{ title }}</p>
    <div class="spread" style="align-items: flex-end">
      <div>
        <div :style="{ fontFamily: 'Hanken Grotesk', fontWeight: '800', fontSize: '2.4rem', color: c.fg, lineHeight: '1' }">
          {{ value }}<span v-if="unit" :style="{ fontSize: '1.1rem', color: 'var(--grey-60)' }">{{ unit }}</span>
        </div>
        <div style="font-size: .78rem; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; color: var(--grey-60); margin-top: 6px">{{ label }}</div>
      </div>
      <MiniSpark v-if="sparkData.length" :data="sparkData" :color="c.ring" />
    </div>
    <div v-if="trend || hint" class="spread" style="margin-top: 10px; font-size: .82rem; color: var(--grey-70)">
      <span v-if="trend" :style="{ fontWeight: '700', color: trendColor }">
        {{ trendUp ? '▲' : trendDown ? '▼' : '●' }} {{ trend }} pp vs 12 mo
      </span>
      <span v-if="hint" style="color: var(--grey-60); font-size: .78rem; text-align: right; flex: 1; margin-left: 8px">{{ hint }}</span>
    </div>
  </div>
</template>
