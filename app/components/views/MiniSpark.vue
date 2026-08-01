<script setup>
const props = defineProps({
  data: { type: Array, required: true },
  color: { type: String, required: true },
  height: { type: Number, default: 28 },
  width: { type: Number, default: 120 },
})

const pts = computed(() => {
  const max = Math.max(...props.data, 1)
  const min = Math.min(...props.data)
  return props.data.map((v, i) => {
    const x = (i / (props.data.length - 1)) * props.width
    const y = props.height - ((v - min) / (max - min || 1)) * props.height
    return `${x},${y}`
  }).join(' ')
})

const lastY = computed(() => {
  const max = Math.max(...props.data, 1)
  const min = Math.min(...props.data)
  const last = props.data[props.data.length - 1]
  return props.height - ((last - min) / (max - min || 1)) * props.height
})
</script>

<template>
  <svg :width="width" :height="height" style="display: block">
    <polyline :points="pts" fill="none" :stroke="color" stroke-width="2" />
    <circle :cx="width" :cy="lastY" r="3" :fill="color" />
  </svg>
</template>
