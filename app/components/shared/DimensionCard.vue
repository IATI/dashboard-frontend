<script setup>
const props = defineProps({
  label:    { type: String, required: true },
  category: { type: String, default: null },
  // Sub-metrics (components) shown alongside the dimension band.
  // Each: { label, display, category, tooltips }
  metrics:  { type: Array, default: () => [] },
  // Anchor of this dimension's panel further down the page, e.g. '#dimension-coverage'
  href:     { type: String, default: null },
})

/**
 * Scroll to the panel rather than jumping, and move focus with it so the link
 * behaves for a keyboard or screen reader the way a plain anchor would.
 *
 * The markup is a real anchor, so if this never runs — no JS, or the target is
 * missing — the browser still navigates to it.
 */
function jump(event) {
  if (!props.href) return
  const el = document.querySelector(props.href)
  if (!el) return

  event.preventDefault()
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
  // Keep the link shareable, and the back button working.
  history.pushState(null, '', props.href)
}
</script>

<template>
  <Card flat class="dimension-card">
    <div class="dimension-card__body">
      <div class="dimension-card__band">
        <Stars :category="category" size="lg" />
        <p class="dimension-card__label">
          <a v-if="href" :href="href" class="dimension-card__link" @click="jump">{{ label }}</a>
          <template v-else>{{ label }}</template>
        </p>
      </div>

      <ul v-if="metrics.length" class="dimension-card__metrics">
        <li v-for="m in metrics" :key="m.label" class="dimension-card__metric">
          <span class="dimension-card__metric-label">{{ m.label }}</span>
          <!-- Value and stars travel together: when the row runs out of room
               they wrap onto their own line rather than the value breaking
               mid-phrase ("1.6 / quarters"). -->
          <span class="dimension-card__metric-score">
            <span class="dimension-card__metric-value">{{ m.display }}</span>
            <Stars :category="m.category" size="md" :tooltips="m.tooltips || []" />
          </span>
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

/* Inherits the label's styling; underlined only on hover so the cards stay calm */
.dimension-card__link {
  color: inherit;
  text-decoration: none;
}
.dimension-card__link:hover,
.dimension-card__link:focus-visible {
  text-decoration: underline;
  color: var(--teal-80);
}
.dimension-card__label {
  font-family: "Hanken Grotesk", system-ui, sans-serif;
  font-weight: 700;
  /* 12px floor: .72rem rendered at 11.5px */
  font-size: .75rem;
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
  /* Flex rather than fixed columns: a three-column grid squeezes the value
     column until long values wrap mid-phrase. */
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 10px;
  font-size: .78rem;
  line-height: 1.3;
}
.dimension-card__metric-score {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;   /* stays right-aligned, on its own line or sharing one */
  flex-shrink: 0;
  white-space: nowrap;
}
.dimension-card__metric-label { color: var(--grey-70); min-width: 0 }
.dimension-card__metric-value {
  font-weight: 700;
  color: var(--teal-90);
  font-variant-numeric: tabular-nums;
}

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
