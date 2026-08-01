<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title:   { type: String, default: '' },
})
</script>

<template>
  <section class="titlebar">
    <div class="titlebar__inner">
      <p v-if="eyebrow" class="titlebar__eyebrow">{{ eyebrow }}</p>
      <h1 class="titlebar__title">{{ title }}</h1>
      <div v-if="$slots.meta" class="titlebar__meta">
        <slot name="meta" />
      </div>
    </div>
  </section>
</template>
