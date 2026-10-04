<script setup>
/**
 * A dimension's band, named and starred, for a panel's kicker row.
 *
 * The stars alone do not say which band they represent, and the panels are far
 * enough apart that counting them is work. Naming it mirrors the component
 * panels inside Comprehensiveness, which show their score and band the same way.
 *
 * No percentage here: a dimension's band is a joint function of its components
 * rather than a single number, so there is nothing to show.
 */
defineProps({
  category: { type: String, required: true },
  tooltips: { type: Array, default: () => [] },
})

const { t } = useI18n({ useScope: 'global' })

// 'needs_improvement' -> 'categoryNeedsImprovement', matching the page's keys
const label = category =>
  t('category' + category.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase()))
</script>

<template>
  <span class="dimension-band">
    <span class="dimension-band__label">{{ label(category) }}</span>
    <Stars :category="category" size="md" :tooltips="tooltips" />
  </span>
</template>

<style scoped>
.dimension-band {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* Reads as a label beside the stars, not as part of the panel heading */
.dimension-band__label {
  font-family: "Hanken Grotesk", system-ui, sans-serif;
  font-weight: 400;
  font-size: .82rem;
  color: var(--grey-60);
  white-space: nowrap;
}

/* Narrow screens: the stars carry it, the word is the first thing to go */
@media (max-width: 575.98px) {
  .dimension-band__label { display: none }
}
</style>
