<script setup>
const props = defineProps({
  label:   { type: String, required: true },
  pct:     { type: Number, required: true },
  // Sub-metrics shown alongside the headline score.
  // Each: { label: String, value: Number (rendered as %) | Boolean (rendered as ✓/✗) }
  metrics: { type: Array, default: () => [] },
})

const level = computed(() => props.pct >= 80 ? 'good' : 'warn')
const stars = computed(() => {
  if (props.pct >= 90) return 3
  if (props.pct >= 60) return 2
  if (props.pct >= 40) return 1
  return 0
})
</script>

<template>
  <Card flat class="dimension-card">
    <div class="dimension-card__body">
      <div class="dimension-card__score">
        <div :class="`bignum ${level}`">
          {{ pct }}<span class="dimension-card__unit">%</span>
          <small>{{ label }}</small>
        </div>
        <div class="dimension-card__stars">
          <span
            v-for="n in 3" :key="n"
            class="dimension-card__star"
            :class="{ 'dimension-card__star--lit': n <= stars }"
          >★</span>
        </div>
      </div>

      <ul v-if="metrics.length" class="dimension-card__metrics">
        <li v-for="m in metrics" :key="m.label" class="dimension-card__metric">
          <span class="dimension-card__metric-label">{{ m.label }}</span>
          <span
            v-if="typeof m.value === 'boolean'"
            class="dimension-card__metric-flag"
            :class="m.value ? 'dimension-card__metric-flag--yes' : 'dimension-card__metric-flag--no'"
          >{{ m.value ? '✓' : '✗' }}</span>
          <span v-else class="dimension-card__metric-value">{{ m.value }}%</span>
        </li>
      </ul>
    </div>
  </Card>
</template>

<style scoped>
.dimension-card { padding: 14px }
.dimension-card__unit { font-size: 1.2rem }

/* Narrow screens: score above, sub-metrics below */
.dimension-card__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dimension-card__stars { margin-top: 8px }
.dimension-card__star { font-size: 1.1rem; color: var(--grey-20) }
.dimension-card__star--lit { color: var(--green-50) }

.dimension-card__metrics {
  list-style: none;
  margin: 0;
  padding: 12px 0 0;
  border-top: 1px solid var(--grey-20);
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.dimension-card__metric {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-size: .78rem;
  line-height: 1.3;
}
.dimension-card__metric-label { color: var(--grey-70) }
.dimension-card__metric-value {
  font-weight: 700;
  color: var(--teal-90);
  font-variant-numeric: tabular-nums;
}
.dimension-card__metric-flag { font-weight: 700; line-height: 1 }
.dimension-card__metric-flag--yes { color: var(--green-50) }
.dimension-card__metric-flag--no  { color: var(--red-50) }

/* Large screens: score on the left, sub-metrics to its right */
@media (min-width: 992px) {
  .dimension-card__body {
    flex-direction: row;
    align-items: flex-start;
    gap: 14px;
  }
  /* Fixed basis so the divider lines up across all four cards */
  .dimension-card__score { flex: 0 0 120px }
  .dimension-card__metrics {
    flex: 1;
    min-width: 0;
    border-top: none;
    border-left: 1px solid var(--grey-20);
    padding: 2px 0 0 14px;
  }
}
</style>
