<script setup>
defineProps({
  variant: { type: String, default: '' },   // 'good' | 'info' | '' (default = warn)
  icon:    { type: String, default: '!' },
  title:   { type: String, required: true },
})
</script>

<template>
  <div :class="['callout', variant]">
    <div class="ic">{{ icon }}</div>
    <div>
      <!-- h3: this sits inside a Card, whose kicker or title is the h2 -->
      <h3>{{ title }}</h3>
      <slot />
    </div>
  </div>
</template>
