<script setup>
const props = defineProps({
  category: { type: String, default: null },
  size:     { type: String, default: 'md' },   // 'md' | 'lg' | 'xl'
  // Optional per-star hover text, lowest band first: [1 star, 2 stars, 3 stars]
  tooltips: { type: Array, default: () => [] },
  // Set where the band is already written out next to the stars, so a screen
  // reader is not told the same thing twice. Where it is not — the summary
  // cards name the dimension, not its band — leave this off, or the band is
  // conveyed by colour alone and never reaches anyone not looking at it.
  decorative: { type: Boolean, default: false },
})

const { t } = useI18n({ useScope: 'global' })

// Single source of truth for how a methodology band renders as stars.
const CATEGORY_STARS = {
  excellent:         3,
  very_good:         2,
  good:              1,
  needs_improvement: 0,
}

const lit = computed(() => CATEGORY_STARS[props.category] ?? 0)

// 'needs_improvement' -> 'categoryNeedsImprovement', as elsewhere on the page
const bandLabel = computed(() => (props.category
  ? t('category' + props.category.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase()))
  : null))

// One name for the row of stars, rather than three identical '★' characters
// read out in turn with no indication of which are lit.
const label = computed(() =>
  bandLabel.value ? t('ariaStars', { band: bandLabel.value, lit: lit.value }) : null)

const starClass = n => ['stars__star', { 'stars__star--lit': n <= lit.value }]
</script>

<template>
  <span
    class="stars" :class="`stars--${size}`"
    v-bind="decorative || !label
      ? { 'aria-hidden': 'true' }
      : { role: 'img', 'aria-label': label }"
  >
    <template v-for="n in 3" :key="n">
      <BTooltip v-if="tooltips[n - 1]" :title="tooltips[n - 1]" placement="top" noninteractive>
        <template #target>
          <span :class="[starClass(n), 'stars__star--help']">★</span>
        </template>
      </BTooltip>
      <span v-else :class="starClass(n)">★</span>
    </template>
  </span>
</template>

<style scoped>
.stars { white-space: nowrap; line-height: 1; display: inline-flex; gap: 1px }
.stars__star { color: var(--grey-20); cursor: default; transition: color .15s ease }
.stars__star--lit { color: var(--green-50) }
.stars--md { font-size: 1rem }
.stars--lg { font-size: 1.6rem; gap: 3px }
.stars--xl { font-size: 2.6rem; gap: 5px }

/* Hovering a star previews it in green — including unearned ones, which shows
   what the band would look like once its threshold is met. */
.stars__star--help:hover {
  color: var(--green-50);
  animation: star-pulse 1.1s ease-in-out infinite;
}

@keyframes star-pulse {
  0%, 100% { opacity: 1 }
  50%      { opacity: .4 }
}

@media (prefers-reduced-motion: reduce) {
  .stars__star--help:hover { animation: none }
}
</style>
