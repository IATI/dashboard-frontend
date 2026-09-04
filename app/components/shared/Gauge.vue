<script setup>
const props = defineProps({
  pct:     { type: Number, required: true },
  color:   { type: String, default: 'var(--teal-70)' },
  label:   { type: String, default: '' },
  showPct: { type: Boolean, default: true },
  size:    { type: String, default: '120px' },
})

const stars = computed(() => {
  if (props.pct >= 80) return 3
  if (props.pct >= 60) return 2
  if (props.pct >= 50) return 1
  return 0
})
</script>

<template>
  <div class="gauge-block">
    <div class="gauge" :style="{ '--p': pct, '--c': color, '--size': size }">
      <span v-if="showPct" class="gauge__value">{{ pct }}%</span>
    </div>
    <div class="gauge-block__caption">
      <div class="gauge-block__stars">
        <span
          v-for="n in 3" :key="n"
          class="gauge-block__star"
          :class="{ 'gauge-block__star--lit': n <= stars }"
        >★</span>
      </div>
      <p v-if="label" class="gauge-block__label">{{ label }}</p>
    </div>
  </div>
</template>
