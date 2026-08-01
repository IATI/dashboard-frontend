<script setup>
const props = defineProps({
  pct: { type: Number, required: true },
  color: { type: String, required: true },
  label: { type: String, required: true },
  sub: { type: String, default: '' },
  trend: { type: String, default: '' },
  big: { type: Boolean, default: false },
})

const size = computed(() => props.big ? 160 : 120)
const stroke = computed(() => props.big ? 14 : 12)
const r = computed(() => (size.value - stroke.value) / 2)
const c = computed(() => 2 * Math.PI * r.value)
const dash = computed(() => c.value * (props.pct / 100))
const trendUp = computed(() => props.trend?.startsWith('+'))
const trendDown = computed(() => props.trend?.startsWith('−'))
const trendColor = computed(() =>
  trendUp.value ? 'var(--green-90)' : trendDown.value ? 'var(--orange-90)' : 'var(--grey-60)'
)
</script>

<template>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 8px">
    <div :style="{ position: 'relative', width: size + 'px', height: size + 'px' }">
      <svg :width="size" :height="size" style="transform: rotate(-90deg)">
        <circle :cx="size/2" :cy="size/2" :r="r" fill="none" stroke="var(--grey-20)" :stroke-width="stroke" />
        <circle :cx="size/2" :cy="size/2" :r="r" fill="none" :stroke="color" :stroke-width="stroke"
          :stroke-dasharray="`${dash} ${c - dash}`" stroke-linecap="butt" />
      </svg>
      <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center">
        <div :style="{ fontFamily: 'Hanken Grotesk', fontWeight: '800', fontSize: big ? '2.1rem' : '1.6rem', color: 'var(--grey-90)', lineHeight: '1' }">
          {{ pct }}<span :style="{ fontSize: big ? '1.1rem' : '.9rem', color: 'var(--grey-60)' }">%</span>
        </div>
        <div v-if="sub" style="font-size: .68rem; color: var(--grey-60); font-weight: 600; letter-spacing: .4px; text-transform: uppercase; margin-top: 4px">{{ sub }}</div>
      </div>
    </div>
    <div style="text-align: center">
      <div style="font-family: Hanken Grotesk; font-weight: 700; font-size: .95rem; color: var(--teal-90)">{{ label }}</div>
      <div v-if="trend" :style="{ fontSize: '.78rem', color: trendColor, fontWeight: '700', marginTop: '2px' }">
        {{ trendUp ? '▲' : trendDown ? '▼' : '●' }} {{ trend }} pp vs 12 mo
      </div>
    </div>
  </div>
</template>
