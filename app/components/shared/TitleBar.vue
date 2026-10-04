<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title:   { type: String, default: '' },
})

// The bar sits above <main>, so without a name its contents belong to no
// landmark at all. A <section> with an accessible name IS a landmark, so naming
// it by its own heading fixes that without moving it inside <main> — which
// would mean restructuring every page that uses it.
const headingId = useId()
</script>

<template>
  <section class="titlebar" :aria-labelledby="headingId">
    <div class="titlebar__inner">
      <p v-if="eyebrow" class="titlebar__eyebrow">{{ eyebrow }}</p>
      <h1 :id="headingId" class="titlebar__title">{{ title }}</h1>
      <div v-if="$slots.meta" class="titlebar__meta">
        <slot name="meta" />
      </div>
    </div>
  </section>
</template>
