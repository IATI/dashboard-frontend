<script setup>
const props = defineProps({
  pct:     { type: Number, required: true },
  variant: { type: String, default: undefined },  // 'good' | 'warn' | 'bad'
  label:   { type: String, default: undefined },  // '' hides it; omit for "42%"
  height:  { type: String, default: '1.15rem' },
  // What the bar measures. Required for the progressbar to have an accessible
  // name — without one it is announced as a bare percentage with no subject.
  ariaLabel: { type: String, default: undefined },
})

// Our band names mapped onto Bootstrap's contextual variants. A variant that is
// already a Bootstrap one is passed through untouched.
const VARIANTS = { good: 'success', warn: 'warning', bad: 'danger' }

const barVariant = computed(() =>
  props.variant ? (VARIANTS[props.variant] ?? props.variant) : undefined,
)
const value = computed(() => Math.min(100, Math.max(0, props.pct || 0)))
const showLabel = computed(() => props.label !== '')
const displayLabel = computed(() =>
  props.label !== undefined ? props.label : `${Math.round(props.pct || 0)}%`,
)
</script>

<template>
  <div class="check-score">
    <BProgress class="check-score__bar" :max="100" :height="height" :aria-label="ariaLabel">
      <BProgressBar :value="value" :variant="barVariant" />
    </BProgress>
    <span v-if="showLabel" class="check-score__pct">{{ displayLabel }}</span>
  </div>
</template>
