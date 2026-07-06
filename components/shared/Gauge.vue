<script setup>
const props = defineProps({
  pct: { type: Number, required: true },
  color: { type: String, default: 'var(--teal-70)' },
  label: { type: String, default: '' },
  showPct: { type: Boolean, default: true },
})

const stars = computed(() => {
  if (props.pct >= 80) return 3
  if (props.pct >= 60) return 2
  if (props.pct >= 50) return 1
  return 0
})
</script>

<template>
  <div class="gauge" :style="{ '--p': pct, '--c': color }">
    <div class="v">
      <div id="stars" style="white-space: nowrap">
        <span v-for="n in 3" :key="n" :style="{ color: n <= stars ? 'var(--green-50)' : 'var(--grey-20)', fontSize: '.9rem' }">★</span>
        </div>
      <small>{{ label }}</small></div>
  </div>
</template>
