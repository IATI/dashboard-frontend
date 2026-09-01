<script setup>
const props = defineProps({
  label:   { type: String, required: true },
  pct:     { type: Number, required: true },
  history: { type: Array,  default: () => [58, 62, 68, 74, 79, 81] },
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
    <div :class="`bignum ${level}`">
      {{ pct }}<span class="dimension-card__unit">%</span>
      <small>{{ label }}</small>
    </div>
    <div class="dimension-card__footer">
      <div class="spark">
        <span v-for="(h, i) in history" :key="i" :style="{ height: h * 0.4 + 'px' }" />
      </div>
      <div>
        <span
          v-for="n in 3" :key="n"
          class="dimension-card__star"
          :class="{ 'dimension-card__star--lit': n <= stars }"
        >★</span>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.dimension-card { padding: 14px }
.dimension-card__unit { font-size: 1.2rem }
.dimension-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 10px;
}
.dimension-card__star { font-size: 1.1rem; color: var(--grey-20) }
.dimension-card__star--lit { color: var(--green-50) }
</style>
