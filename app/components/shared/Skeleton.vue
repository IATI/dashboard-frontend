<script setup>
/**
 * A placeholder block for content that has not arrived yet.
 *
 * The publisher page fetches everything on the client — the stats payload alone
 * is ~380KB — so without these the page spends its first moments showing empty
 * headings and labels with nothing after them, which reads as broken rather
 * than as loading.
 *
 * Hidden from assistive technology: the region that contains it carries
 * aria-busy, which is what should be announced. A screen reader does not need
 * to hear about the grey rectangles.
 */
defineProps({
  width:  { type: String, default: '100%' },
  height: { type: String, default: '1rem' },
})
</script>

<template>
  <span class="skeleton" :style="{ width, height }" aria-hidden="true" />
</template>

<style scoped>
.skeleton {
  display: block;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--grey-10) 25%,
    var(--grey-20) 37%,
    var(--grey-10) 63%
  );
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  from { background-position: 100% 50% }
  to   { background-position: 0 50% }
}

/* Still a visible placeholder, just not a moving one */
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; background: var(--grey-10) }
}
</style>
