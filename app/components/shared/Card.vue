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
      <h2>{{ title }}</h2>
      <slot name="actions" />
    </div>
    <template v-if="kicker">
      <!-- The kicker is this card's heading when there is no title under it,
           which is how every dimension panel uses it. With a title it is an
           eyebrow above that title, and the title is the heading instead. -->
      <div v-if="$slots['kicker-actions']" class="iati-card__kicker-row">
        <component :is="title ? 'p' : 'h2'" class="iati-card__subtitle">{{ kicker }}</component>
        <slot name="kicker-actions" />
      </div>
      <component v-else :is="title ? 'p' : 'h2'" class="iati-card__subtitle">{{ kicker }}</component>
      <h2 v-if="title">{{ title }}</h2>
    </template>
    <slot />
  </div>
</template>
