<script setup>
defineProps({
  label:    { type: String, required: true },
  category: { type: String, default: null },
  // Sub-metrics (components) shown alongside the dimension band.
  // Each: { label, display, category, isBoolean, boolValue }
  metrics:  { type: Array, default: () => [] },
})
</script>

<template>
  <Card flat class="dimension-card">
    <div class="dimension-card__body">
      <div class="dimension-card__band">
        <Stars :category="category" size="lg" />
        <p class="dimension-card__label">{{ label }}</p>
      </div>

      <ul v-if="metrics.length" class="dimension-card__metrics">
        <li v-for="m in metrics" :key="m.label" class="dimension-card__metric">
          <span class="dimension-card__metric-label">{{ m.label }}</span>
          <span
            class="dimension-card__metric-value"
            :class="{
              'dimension-card__metric-value--yes': m.isBoolean && m.boolValue,
              'dimension-card__metric-value--no':  m.isBoolean && !m.boolValue,
            }"
          >{{ m.display }}</span>
          <Stars :category="m.category" size="md" :tooltips="m.tooltips || []" />
        </li>
      </ul>
    </div>
  </Card>
</template>

<style scoped>
.dimension-card { padding: 14px }

/* Narrow screens: band above, sub-metrics below */
.dimension-card__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dimension-card__band { display: flex; flex-direction: column; gap: 8px }
.dimension-card__label {
  font-family: "Hanken Grotesk", system-ui, sans-serif;
  font-weight: 700;
  font-size: .72rem;
  letter-spacing: .4px;
  text-transform: uppercase;
  color: var(--grey-60);
  margin: 0;
}

.dimension-card__metrics {
  list-style: none;
  margin: 0;
  padding: 12px 0 0;
  border-top: 1px solid var(--grey-20);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dimension-card__metric {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 10px;
  font-size: .78rem;
  line-height: 1.3;
}
.dimension-card__metric-label { color: var(--grey-70) }
.dimension-card__metric-value {
  font-weight: 700;
  color: var(--teal-90);
  font-variant-numeric: tabular-nums;
}
.dimension-card__metric-value--yes { color: var(--green-50) }
.dimension-card__metric-value--no  { color: var(--red-50) }

/* Large screens: band on the left, sub-metrics to its right */
@media (min-width: 992px) {
  .dimension-card__body {
    flex-direction: row;
    align-items: flex-start;
    gap: 14px;
  }
  /* Fixed basis so the divider lines up across all four cards */
  .dimension-card__band { flex: 0 0 120px }
  .dimension-card__metrics {
    flex: 1;
    min-width: 0;
    border-top: none;
    border-left: 1px solid var(--grey-20);
    padding: 2px 0 0 14px;
  }
}
</style>
