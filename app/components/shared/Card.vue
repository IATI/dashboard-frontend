<script setup>
defineProps({
  title:   { type: String,  default: null },   // h3 title; pairs with kicker as inline block, or alone as header-bar
  kicker:  { type: String,  default: null },   // eyebrow / sub text above title
  accent:  { type: String,  default: null },   // 'blue' | 'green' | 'orange'
  flat:    { type: Boolean, default: false },
  flush:   { type: Boolean, default: false },  // no padding/border-top (for table sections)
  loading: { type: Boolean, default: false },
})
</script>

<template>
  <div :class="[
    'iati-card',
    title && !kicker && 'iati-card--header',
    accent  && `iati-card--accent-${accent}`,
    flat    && 'iati-card--flat',
    flush   && 'iati-card--flush',
    loading && 'iati-card--loading',
  ]">
    <div v-if="title && !kicker" class="iati-card__header">
      <h3>{{ title }}</h3>
      <slot name="actions" />
    </div>
    <template v-if="kicker">
      <p class="sub">{{ kicker }}</p>
      <h3 v-if="title">{{ title }}</h3>
    </template>
    <slot />
  </div>
</template>
