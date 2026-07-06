<script setup>
defineProps({
  title: { type: String, required: true },
  blurb: { type: String, default: '' },
})
</script>

<template>
  <div style="display: flex; align-items: baseline; gap: 14px; margin: 22px 0 10px">
    <h2 style="font-size: 1.35rem; margin: 0; color: var(--teal-90)">{{ title }}</h2>
    <span style="font-size: .88rem; color: var(--grey-60); font-style: italic">{{ blurb }}</span>
  </div>
</template>
