<script setup>
defineProps({
  name: { type: String, required: true },
  hint: { type: String, default: '' },
  pct: { type: Number, required: true },
  variant: { type: String, default: undefined },
})
</script>

<template>
  <div class="ind">
    <div class="name">{{ name }}<small v-if="hint">{{ hint }}</small></div>
    <div class="meter"><Bar :pct="pct" :variant="variant" label="" height=".6rem" /></div>
    <div class="pct">{{ Math.round(pct) }}%</div>
  </div>
</template>
