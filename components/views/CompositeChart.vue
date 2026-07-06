<script setup>
const props = defineProps({
  data: { type: Array, required: true },
})

const W = 1180, H = 260
const pad = { l: 36, r: 16, t: 14, b: 32 }
const innerW = W - pad.l - pad.r
const innerH = H - pad.t - pad.b

function xs(i) { return pad.l + (i / (props.data.length - 1)) * innerW }
function ys(v) { return pad.t + innerH - (v / 100) * innerH }

function linePath(key) {
  return props.data.map((row, i) => `${i === 0 ? 'M' : 'L'}${xs(i)},${ys(row[key])}`).join(' ')
}

function areaPath(key) {
  const last = props.data.length - 1
  return linePath(key) + ` L${xs(last)},${ys(0)} L${xs(0)},${ys(0)} Z`
}

const gridLines = [0, 25, 50, 75, 100]
const series = [
  { key: 'availability', color: 'var(--green-50)', dash: '4 3', fill: false },
  { key: 'char',   color: 'var(--teal-50)',  dash: '4 3', fill: false },
  { key: 'value',  color: 'var(--orange-50)', dash: '4 3', fill: false },
  { key: 'v',      color: 'var(--teal-90)',  dash: null,  fill: true, stroke: 3 },
]
</script>

<template>
  <svg
    :viewBox="`0 0 ${W} ${H}`"
    width="100%"
    style="display: block; background: #fafafa; border: 1px solid var(--grey-20)"
  >
    <!-- Grid -->
    <g v-for="g in gridLines" :key="g">
      <line :x1="pad.l" :x2="W - pad.r" :y1="ys(g)" :y2="ys(g)" stroke="var(--grey-20)" :stroke-dasharray="g === 0 ? '' : '2 3'" />
      <text :x="4" :y="ys(g) + 4" font-size="10" fill="var(--grey-60)">{{ g }}%</text>
    </g>

    <!-- X labels (every other) -->
    <text
      v-for="(row, i) in data"
      v-if="i % 2 === 0"
      :key="i"
      :x="xs(i)"
      :y="H - 12"
      font-size="10"
      fill="var(--grey-60)"
      text-anchor="middle"
    >{{ row.m }}</text>

    <!-- Series lines -->
    <g v-for="s in series" :key="s.key">
      <path v-if="s.fill" :d="areaPath(s.key)" :fill="s.color" opacity=".08" />
      <path :d="linePath(s.key)" fill="none" :stroke="s.color" :stroke-width="s.stroke ?? 2" :stroke-dasharray="s.dash ?? ''" />
    </g>

    <!-- End markers -->
    <g v-for="s in series" :key="'dot-' + s.key">
      <circle
        :cx="xs(data.length - 1)"
        :cy="ys(data[data.length - 1][s.key])"
        r="4"
        :fill="s.color"
      />
      <text
        :x="xs(data.length - 1) + 8"
        :y="ys(data[data.length - 1][s.key]) + 4"
        font-size="11"
        font-weight="700"
        :fill="s.color"
      >{{ data[data.length - 1][s.key] }}</text>
    </g>
  </svg>
</template>
