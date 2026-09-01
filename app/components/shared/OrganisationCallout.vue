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
      <h4>{{ title }}</h4>
      <slot />
    </div>
  </div>
</template>
