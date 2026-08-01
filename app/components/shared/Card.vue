<script setup>
defineProps({
  title:   { type: String,  default: null },
  accent:  { type: String,  default: null },   // 'blue' | 'green' | 'orange'
  flat:    { type: Boolean, default: false },
  flush:   { type: Boolean, default: false },  // no padding/border-top (for table sections)
  loading: { type: Boolean, default: false },
})
</script>

<template>
  <div :class="[
    'iati-card',
    title   && 'iati-card--header',
    accent  && `iati-card--accent-${accent}`,
    flat    && 'iati-card--flat',
    flush   && 'iati-card--flush',
    loading && 'iati-card--loading',
  ]">
    <div v-if="title" class="iati-card__header">
      <h3>{{ title }}</h3>
      <slot name="actions" />
    </div>
    <slot />
  </div>
</template>
