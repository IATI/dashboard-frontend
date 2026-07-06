<script setup>
const props = defineProps({
  pct: { type: Number, required: true },
  variant: { type: String, default: undefined },
  label: { type: String, default: undefined },
})

const cls = computed(() => 'bar bar--lg' + (props.variant ? ' bar--' + props.variant : ''))
const width = computed(() => Math.min(100, Math.max(0, props.pct)) + '%')
const displayLabel = computed(() => (props.label !== undefined ? props.label : Math.round(props.pct) + '%'))
</script>

<template>
  <div :class="cls">
    <span :style="{ width }" />
    <span class="bar__label">{{ displayLabel }}</span>
  </div>
</template>
