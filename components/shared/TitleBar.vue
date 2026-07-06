<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, default: '' },
})
</script>

<template>
  <section class="titlebar">
    <div class="titlebar__inner">
      <p class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <div v-if="$slots.meta" class="meta">
        <slot name="meta" />
      </div>
    </div>
  </section>
</template>
