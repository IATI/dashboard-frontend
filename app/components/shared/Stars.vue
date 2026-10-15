<script setup>
const props = defineProps({
  category: { type: String, default: null },
  size:     { type: String, default: 'md' },   // 'sm' | 'md' | 'lg' | 'xl'
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

// Position, for whoever wants to stagger them. Only the hero card does; see
// iati-quality.scss. Set here because the index is not available from CSS.
const starStyle = n => ({ '--star-index': n - 1 })
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
          <span :class="[starClass(n), 'stars__star--help']" :style="starStyle(n)"><svg class="stars__glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg></span>
        </template>
      </BTooltip>
      <span v-else :class="starClass(n)" :style="starStyle(n)"><svg class="stars__glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg></span>
    </template>
  </span>
</template>

<style scoped>
.stars { white-space: nowrap; line-height: 1; display: inline-flex; gap: 1px }

/* A drawn star, not the ★ character. Nothing here sets a font for it, so each
   browser fell back to a different one and sized the glyph differently —
   Firefox's came out noticeably smaller than Chrome's. An SVG is the same
   everywhere, takes its colour from the span through currentColor, and still
   scales with the font-size the size modifiers set. */
/* green-70, not green-50: where a star group is the only thing carrying the
   band — the metric rows inside the summary cards — it is a meaningful graphic,
   and WCAG 1.4.11 wants 3:1 against the white behind it. green-50 is 2.25:1,
   green-70 is 3.96:1 and the nearest rung that clears it. */
.stars__star {
  color: var(--grey-20);
  cursor: default;
  transition: color .15s ease;
  display: inline-flex;
}
.stars__star--lit { color: var(--color-green-70) }

.stars__glyph {
  width: 1em;
  height: 1em;
  fill: currentColor;
  display: block;
}

/* An unearned star keeps its pale fill but gains an outline: at 1.4:1 the fill
   alone is close to invisible, and on a nought-star band there would be nothing
   perceivable at all. The outline is grey-50, 3.74:1, so the shape reads while
   still looking empty rather than filled. */
.stars__star:not(.stars__star--lit) .stars__glyph {
  stroke: var(--color-grey-50);
  stroke-width: 1;
}
/* sm: inside a table cell or a header, where the stars label a column rather
   than report a score */
.stars--sm { font-size: .8rem; gap: 1px }
.stars--md { font-size: 1rem }
.stars--lg { font-size: 1.6rem; gap: 3px }
.stars--xl { font-size: 2.6rem; gap: 5px }

/* Hovering a star previews it in green — including unearned ones, which shows
   what the band would look like once its threshold is met. */
.stars__star--help:hover {
  color: var(--color-green-70);
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
